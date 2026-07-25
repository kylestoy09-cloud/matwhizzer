#!/usr/bin/env python3
"""
scripts/import_bullet_csv.py

Import tournament bouts from bullet-format CSV exports into MatWhizzer.

Usage:
  python scripts/import_bullet_csv.py --json-out FILE <csv_file>
  python scripts/import_bullet_csv.py --dry-run <csv_file>

Bullet format columns:
  tournament, weight, round, winner, winner_school, winner_record,
  method_phrase, loser, loser_school, loser_record, method_detail

Key differences from pipe_csv format:
- No tw_id columns — wrestler matching is name+school only
- method is split: method_phrase (human phrase) + method_detail (parseable)
- Bye rows have method_phrase='received a bye' and loser='' — skipped
- winner_record / loser_record columns present but not stored

Options:
  --json-out FILE       Write parsed+matched data to FILE (no DB writes).
                        Upload the resulting JSON at /admin/import-tournament.
                        This is the preferred path — use it.
  --dry-run             Show what would be imported; make no DB writes.
  --allow-direct-write  Bypass review and write directly to the DB.
                        Only use if the review UI is genuinely unavailable.
                        The review path exists to catch school mismatches like
                        Haddon Twp Hgh School → Ewing (Bart Payne 2025, 22 bouts);
                        use it.

Tournaments already in the DB (from RTF imports) are skipped for bouts —
their tournament rows are still confirmed/created.
"""

from __future__ import annotations

import argparse
import csv
import os
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from typing import Optional

try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv(**_):  # type: ignore[misc]
        pass

try:
    from supabase import create_client, Client
except ImportError:
    print("ERROR: supabase-py not installed. Run: pip install supabase python-dotenv")
    sys.exit(1)

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _SCRIPT_DIR)
from import_tournament import (  # noqa: E402
    SchoolMatcher,
    WrestlerMatcher,
    _normalize_round,
    _parse_result,
)


# ── Constants ──────────────────────────────────────────────────────────────────

SEASON = "2025-26"
SOURCE_FORMAT = "bullet"

# Tournaments that already have bouts from RTF imports — skip bout insertion.
_SKIP_BOUT_IMPORT: set[str] = {
    "Beast of the East",                    # 809 bouts in DB
    "Robin Leff Tournament 2025",           # 553 bouts in DB
    "Central Regional Golden Eagle Classic", # 152 bouts in DB
    "Ronald Bond Wrestling Tournament",     # 109 bouts in DB
    "Caldwell Tournament",                  # 156 bouts in DB
    "Pete Adams Memorial",                  # 165 bouts in DB
}

# Best-estimate dates for new tournaments (all December 2025).
# [EST] = estimated — verify before publishing.
_TOURNAMENT_META: dict[str, dict] = {
    # Already in DB (confirm dates won't change):
    "Beast of the East":                    {"start": "2025-12-20", "end": "2025-12-21"},
    "Robin Leff Tournament 2025":           {"start": "2025-12-21"},
    "Central Regional Golden Eagle Classic": {"start": "2025-12-20"},
    "Ronald Bond Wrestling Tournament":     {"start": "2025-12-27"},
    "Caldwell Tournament":                  {"start": "2025-12-28"},
    "Pete Adams Memorial":                  {"start": "2025-12-28"},
    # New tournaments:
    "Bart Payne HT Holiday Tournament":     {"start": "2025-12-27"},          # [EST]
    "Holmdel Holiday Tournament":           {"start": "2025-12-28"},          # [EST]
    "Tim Groves Holiday Tournament":        {"start": "2025-12-28"},          # [EST]
    "Parsippany Hills Holiday Tournament":  {"start": "2025-12-28"},          # [EST]
}

# NJ schools whose CSV names don't trigger SchoolMatcher — override dict.
_NJ_SCHOOL_OVERRIDES: dict[str, int] = {
    "Becton Regional/Wood-Ridge":   321,
    "BCIT - Westampton":            256,
    "Hamilton North- Nottingham":   209,
    "Elmwood Park":                 51,
    "East Side":                    122,
    # Bullet-format-specific variations
    "Haddon Twp Hgh School":        240,   # Haddon Township
    "Gateway Reg/ Woodbury":        291,   # Gateway Regional/Woodbury
    "Passaic Co Tech-Voc":          391,   # Passaic Tech
    "Jackson Township H.S.":        201,   # Jackson Township
    "St. Joseph (Hammonton)":       356,   # St. Joseph's (Hammonton)
}


# ── Data classes ───────────────────────────────────────────────────────────────

@dataclass
class CsvRow:
    tournament:    str
    weight:        int
    round:         str
    winner:        str
    winner_school: str
    method_phrase: str
    method_detail: str
    loser:         str
    loser_school:  str


@dataclass
class ReviewItem:
    tournament: str
    weight:     int
    round:      str
    name:       str
    school:     str
    confidence: str
    alternates: list[str] = field(default_factory=list)


# ── CSV loading ────────────────────────────────────────────────────────────────

def load_csv(path: str) -> list[CsvRow]:
    rows: list[CsvRow] = []
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for r in reader:
            # Skip byes
            if r.get("method_phrase", "").strip().lower() == "received a bye":
                continue
            # Skip rows with no loser (another bye indicator)
            if not r.get("loser", "").strip():
                continue
            try:
                weight = int(r["weight"])
            except ValueError:
                continue
            rows.append(CsvRow(
                tournament    = r["tournament"].strip(),
                weight        = weight,
                round         = r["round"].strip(),
                winner        = r["winner"].strip(),
                winner_school = r["winner_school"].strip(),
                method_phrase = r["method_phrase"].strip(),
                method_detail = r["method_detail"].strip(),
                loser         = r["loser"].strip(),
                loser_school  = r["loser_school"].strip(),
            ))
    return rows


# ── School resolution ──────────────────────────────────────────────────────────

def resolve_school(raw: str, matcher: SchoolMatcher) -> dict:
    if raw in _NJ_SCHOOL_OVERRIDES:
        return {
            "school_id":   _NJ_SCHOOL_OVERRIDES[raw],
            "display_name": raw,
            "confidence":  "exact",
            "alternates":  [],
        }
    return matcher.match(raw)


# ── Tournament row upsert ──────────────────────────────────────────────────────

def ensure_tournament(name: str, client: Client) -> str:
    existing = client.from_("in_season_tournaments") \
        .select("id") \
        .eq("name", name) \
        .eq("season", SEASON) \
        .execute()
    if existing.data:
        return existing.data[0]["id"]

    meta = _TOURNAMENT_META.get(name, {})
    payload: dict = {
        "name":       name,
        "season":     SEASON,
        "start_date": meta.get("start", "2025-12-28"),
    }
    if meta.get("end"):
        payload["end_date"] = meta["end"]

    created = client.from_("in_season_tournaments").insert(payload).execute()
    return created.data[0]["id"]


def has_existing_bouts(tournament_id: str, client: Client) -> bool:
    res = client.from_("tournament_bouts") \
        .select("id", count="exact") \
        .eq("in_season_tournament_id", tournament_id) \
        .execute()
    return (res.count or 0) > 0


# ── Name parsing ───────────────────────────────────────────────────────────────

def _parse_name(full: str) -> dict:
    SUFFIXES = {"jr", "sr", "ii", "iii", "iv", "v"}
    parts = full.strip().split()
    if len(parts) <= 1:
        return {"first_name": full.strip(), "last_name": "", "suffix": None}
    suffix = None
    last_idx = len(parts) - 1
    if parts[last_idx].lower().rstrip(".") in SUFFIXES:
        suffix = parts[last_idx]
        last_idx -= 1
        if last_idx == 0:
            return {"first_name": parts[0], "last_name": "", "suffix": suffix}
    return {
        "first_name": " ".join(parts[:last_idx]),
        "last_name":  parts[last_idx],
        "suffix":     suffix,
    }


def create_wrestlers(
    to_create: list[dict],
    client:    Client,
) -> dict[tuple, str]:
    """Insert new wrestler records; idempotent — returns existing IDs for duplicates."""
    if not to_create:
        return {}

    parsed_list = []
    for item in to_create:
        parsed = _parse_name(item["name"])
        rec = {**parsed, "gender": "M"}
        parsed_list.append({"parsed": parsed, "rec": rec, "item": item})

    # Pre-check DB for already-existing wrestlers (handles partial-run recovery)
    last_names = list({e["parsed"]["last_name"] for e in parsed_list if e["parsed"]["last_name"]})
    existing: dict[tuple, str] = {}
    QCHUNK = 100
    for start in range(0, len(last_names), QCHUNK):
        res = client.from_("wrestlers").select("id,first_name,last_name") \
            .in_("last_name", last_names[start:start + QCHUNK]) \
            .eq("gender", "M").execute()
        for row in (res.data or []):
            existing[(row["first_name"], row["last_name"])] = row["id"]

    result:      dict[tuple, str] = {}
    to_insert:   list[dict]       = []
    insert_keys: list[tuple]      = []

    for entry in parsed_list:
        key    = (entry["item"]["name"], entry["item"]["school_id"])
        fn, ln = entry["parsed"]["first_name"], entry["parsed"]["last_name"]
        if (fn, ln) in existing:
            result[key] = existing[(fn, ln)]
        else:
            to_insert.append(entry)
            insert_keys.append(key)

    if not to_insert:
        return result

    CHUNK = 200
    for start in range(0, len(to_insert), CHUNK):
        batch_entries = to_insert[start:start + CHUNK]
        batch_keys    = insert_keys[start:start + CHUNK]
        res = client.from_("wrestlers").insert([e["rec"] for e in batch_entries]).execute()
        for j, row in enumerate(res.data or []):
            result[batch_keys[j]] = row["id"]

    return result


# ── Main ───────────────────────────────────────────────────────────────────────

def _emit_json(
    args,
    all_tourney_names:    list[str],
    bout_batches:         dict[str, list[dict]],
    bout_batches_meta:    dict[str, list[dict]],
    school_cache:         dict[str, dict],
    wrestler_resolutions: dict[str, dict],
    skip_set:             set[str],
    total_bouts:          int,
    client:               Client,
) -> None:
    import json
    from datetime import datetime, timezone

    existing_ids: dict[str, Optional[str]] = {}
    for tname in all_tourney_names:
        res = client.from_("in_season_tournaments") \
            .select("id").eq("name", tname).eq("season", SEASON).execute()
        existing_ids[tname] = res.data[0]["id"] if res.data else None

    flagged_school_count   = sum(1 for s in school_cache.values() if s["confidence"] in ("low", "none"))
    fuzzy_school_count     = sum(1 for s in school_cache.values() if s["confidence"] == "high")
    flagged_wrestler_count = sum(
        1 for w in wrestler_resolutions.values()
        if w["confidence"] in ("low", "none") and not w.get("is_new", False)
    )
    fuzzy_wrestler_count   = sum(
        1 for w in wrestler_resolutions.values()
        if w["confidence"] == "high" and not w.get("is_new", False)
    )
    new_wrestler_count = sum(1 for w in wrestler_resolutions.values() if w.get("is_new", False))

    tournaments_out = []
    for tname in all_tourney_names:
        meta  = _TOURNAMENT_META.get(tname, {})
        bouts = bout_batches.get(tname, [])
        metas = bout_batches_meta.get(tname, [])
        bout_list = [
            {
                "weight":            b["weight_class"],
                "round":             b["round"],
                "winner_name":       b["wrestler1_name_raw"],
                "winner_school_raw": m["winner_school_raw"],
                "winner_key":        m["winner_key"],
                "loser_name":        b["wrestler2_name_raw"],
                "loser_school_raw":  m["loser_school_raw"],
                "loser_key":         m["loser_key"],
                "result_type":       b["result_type"],
                "result_detail":     b["result_detail"],
                "fall_time_seconds": b["fall_time_seconds"],
                "flagged":           m["flagged"],
                "flag_reasons":      m["flag_reasons"],
            }
            for b, m in zip(bouts, metas)
        ]
        tournaments_out.append({
            "name":        tname,
            "existing_id": existing_ids.get(tname),
            "start_date":  meta.get("start"),
            "end_date":    meta.get("end"),
            "skipped":     tname in skip_set,
            "bouts":       bout_list,
        })

    output = {
        "schema_version": 2,
        "source_format":  SOURCE_FORMAT,
        "generated_at":   datetime.now(timezone.utc).isoformat(),
        "csv_file":       os.path.basename(args.file),
        "summary": {
            "total_bouts":             total_bouts,
            "total_tournaments":       len(all_tourney_names),
            "skipped_tournaments":     sorted(skip_set),
            "flagged_school_count":    flagged_school_count,
            "fuzzy_school_count":      fuzzy_school_count,
            "flagged_wrestler_count":  flagged_wrestler_count,
            "fuzzy_wrestler_count":    fuzzy_wrestler_count,
            "new_wrestler_count":      new_wrestler_count,
        },
        "schools": {
            raw: {
                "school_id":    s["school_id"],
                "display_name": s["display_name"],
                "confidence":   s["confidence"],
                "alternates":   s.get("alternates", []),
            }
            for raw, s in school_cache.items()
        },
        "wrestlers":   wrestler_resolutions,
        "tournaments": tournaments_out,
    }

    with open(args.json_out, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\nJSON written to: {args.json_out!r}")
    print(f"  {total_bouts} bouts across {len(all_tourney_names)} tournaments")
    print(f"  {flagged_school_count} flagged schools  |  {fuzzy_school_count} fuzzy-high schools  |  {flagged_wrestler_count} flagged wrestlers  |  {fuzzy_wrestler_count} fuzzy-high wrestlers  |  {new_wrestler_count} new wrestlers")
    print(f"  Upload at: /admin/import-tournament")


def main() -> None:
    ap = argparse.ArgumentParser(description="Import bullet-format CSV tournament bouts.")
    ap.add_argument("file",      help="Path to bullet_format CSV file")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--force-tournaments", nargs="*", metavar="TOURNAMENT",
                    help="Override _SKIP_BOUT_IMPORT for specific tournament names")
    ap.add_argument("--json-out", metavar="FILE",
                    help="Write parsed+matched data to JSON file (no DB writes). Upload to /admin/import-tournament.")
    ap.add_argument("--allow-direct-write", action="store_true",
                    help="Bypass review UI and write directly to DB. Use --json-out instead.")
    args = ap.parse_args()

    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    for env_file in [".env.local", ".env"]:
        candidate = os.path.join(project_root, env_file)
        if os.path.exists(candidate):
            load_dotenv(candidate, override=False)

    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        print("ERROR: Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local")
        sys.exit(1)

    client:         Client         = create_client(url, key)
    school_matcher: SchoolMatcher  = SchoolMatcher(client)
    name_matcher:   WrestlerMatcher = WrestlerMatcher(client)
    school_matcher._load()

    force_set = set(args.force_tournaments or [])
    skip_set  = _SKIP_BOUT_IMPORT - force_set

    print(f"Loading CSV: {args.file!r} …")
    all_rows = load_csv(args.file)
    all_tourney_names = sorted(set(r.tournament for r in all_rows))
    print(f"  {len(all_rows)} real bouts across {len(all_tourney_names)} tournaments (byes already filtered)")

    # School cache
    school_cache: dict[str, dict] = {}
    def cached_school(raw: str) -> dict:
        if raw not in school_cache:
            school_cache[raw] = resolve_school(raw, school_matcher)
        return school_cache[raw]

    by_tourney: dict[str, list[CsvRow]] = defaultdict(list)
    for row in all_rows:
        by_tourney[row.tournament].append(row)

    review_items:         list[ReviewItem]      = []
    pending_new:          list[dict]            = []
    pending_new_set:      set[tuple[str, int]]  = set()
    bout_batches:         dict[str, list[dict]] = {}
    bout_batches_meta:    dict[str, list[dict]] = {}
    wrestler_resolutions: dict[str, dict]       = {}

    SEP = "─" * 72
    print()
    print(SEP)
    print("  TOURNAMENT PROCESSING")
    print(SEP)

    for tname in all_tourney_names:
        rows_t    = by_tourney[tname]
        skip_bouts = tname in skip_set
        meta       = _TOURNAMENT_META.get(tname, {})
        date_str   = meta.get("start", "unknown date")
        est_flag   = " [EST]" if tname in {
            "Bart Payne HT Holiday Tournament", "Holmdel Holiday Tournament",
            "Tim Groves Holiday Tournament",    "Parsippany Hills Holiday Tournament",
        } else ""
        skip_note  = " [SKIP bouts — already in DB]" if skip_bouts else ""

        print(f"\n  {tname}")
        print(f"  Date: {date_str}{est_flag}{skip_note}")

        if skip_bouts:
            bout_batches[tname] = []
            continue

        bouts:      list[dict]      = []
        bouts_meta: list[dict]      = []
        new_this_t: set[tuple]      = set()
        seen_pairs: set[tuple]      = set()

        for row in rows_t:
            s_w = cached_school(row.winner_school)
            s_l = cached_school(row.loser_school)

            pair_key = (row.weight, frozenset([row.winner.lower(), row.loser.lower()]))
            if pair_key in seen_pairs:
                continue
            seen_pairs.add(pair_key)

            wm_winner = name_matcher.match(row.winner, s_w["school_id"], row.weight) \
                if s_w["school_id"] else {"wrestler_id": None, "confidence": "none", "is_new": False, "alternates": []}
            wm_loser  = name_matcher.match(row.loser,  s_l["school_id"], row.weight) \
                if s_l["school_id"] else {"wrestler_id": None, "confidence": "none", "is_new": False, "alternates": []}

            for wm, name, school_raw, school_match in [
                (wm_winner, row.winner, row.winner_school, s_w),
                (wm_loser,  row.loser,  row.loser_school,  s_l),
            ]:
                if school_match["school_id"] is None:
                    continue
                if wm["confidence"] in ("none", "low"):
                    review_items.append(ReviewItem(
                        tournament = tname,
                        weight     = row.weight,
                        round      = _normalize_round(row.round),
                        name       = name,
                        school     = school_raw,
                        confidence = wm["confidence"],
                        alternates = [a.get("display_name", "") for a in wm.get("alternates", [])[:3]],
                    ))
                    if wm.get("is_new") and school_match["school_id"] is not None:
                        nkey = (name, school_match["school_id"])
                        if nkey not in pending_new_set and nkey not in new_this_t:
                            pending_new.append({"name": name, "school_id": school_match["school_id"]})
                            pending_new_set.add(nkey)
                            new_this_t.add(nkey)

            result_type, result_detail, fall_secs, _ = _parse_result(row.method_detail)

            bouts.append({
                "weight_class":         row.weight,
                "round":                _normalize_round(row.round),
                "nj_wrestler1_id":      wm_winner["wrestler_id"],
                "wrestler1_name_raw":   row.winner,
                "wrestler1_school_id":  s_w["school_id"],
                "wrestler1_school_raw": s_w.get("display_name") or row.winner_school,
                "nj_wrestler2_id":      wm_loser["wrestler_id"],
                "wrestler2_name_raw":   row.loser,
                "wrestler2_school_id":  s_l["school_id"],
                "wrestler2_school_raw": s_l.get("display_name") or row.loser_school,
                "winner":               1,
                "result_type":          result_type,
                "result_detail":        result_detail,
                "fall_time_seconds":    fall_secs,
                "source_format":        SOURCE_FORMAT,
            })

            w_key = f"{row.winner}|{s_w['school_id'] or 'null'}|{row.weight}"
            l_key = f"{row.loser}|{s_l['school_id'] or 'null'}|{row.weight}"
            if s_w["school_id"] is not None and w_key not in wrestler_resolutions:
                wrestler_resolutions[w_key] = {
                    "wrestler_id":  wm_winner.get("wrestler_id"),
                    "display_name": wm_winner.get("display_name"),
                    "confidence":   wm_winner.get("confidence", "none"),
                    "is_new":       wm_winner.get("is_new", False),
                    "alternates":   wm_winner.get("alternates", []),
                }
            if s_l["school_id"] is not None and l_key not in wrestler_resolutions:
                wrestler_resolutions[l_key] = {
                    "wrestler_id":  wm_loser.get("wrestler_id"),
                    "display_name": wm_loser.get("display_name"),
                    "confidence":   wm_loser.get("confidence", "none"),
                    "is_new":       wm_loser.get("is_new", False),
                    "alternates":   wm_loser.get("alternates", []),
                }
            flag_reasons: list[str] = []
            if s_w["confidence"] in ("low", "none"):
                flag_reasons.append(f"winner_school_{s_w['confidence']}")
            if s_l["confidence"] in ("low", "none"):
                flag_reasons.append(f"loser_school_{s_l['confidence']}")
            if s_w["school_id"] is not None and wm_winner.get("confidence") in ("low", "none"):
                flag_reasons.append(f"winner_wrestler_{wm_winner['confidence']}")
            if s_l["school_id"] is not None and wm_loser.get("confidence") in ("low", "none"):
                flag_reasons.append(f"loser_wrestler_{wm_loser['confidence']}")
            bouts_meta.append({
                "winner_school_raw": row.winner_school,
                "loser_school_raw":  row.loser_school,
                "winner_key": w_key if s_w["school_id"] is not None else None,
                "loser_key":  l_key if s_l["school_id"] is not None else None,
                "flagged":      bool(flag_reasons),
                "flag_reasons": flag_reasons,
            })

        bout_batches[tname]      = bouts
        bout_batches_meta[tname] = bouts_meta
        print(f"  {len(bouts)} bouts queued  ({len(new_this_t)} new wrestlers to create)")

    total_bouts = sum(len(b) for b in bout_batches.values())
    total_new   = len(pending_new)

    print()
    print(SEP)
    print("  SUMMARY")
    print(SEP)
    print(f"  Bouts to insert:          {total_bouts}")
    print(f"  New wrestlers to create:  {total_new}")
    print(f"  Low-confidence reviews:   {len([r for r in review_items if r.confidence == 'low'])}")
    print(f"  Review items (all):       {len(review_items)}")

    if review_items:
        print()
        print(SEP)
        print("  WRESTLER REVIEW (low / none confidence):")
        print(SEP)
        prev_t = ""
        for item in review_items:
            if item.tournament != prev_t:
                print(f"\n  [{item.tournament}]")
                prev_t = item.tournament
            alts     = ", ".join(item.alternates) if item.alternates else "—"
            new_flag = " [NEW]" if item.confidence == "none" else ""
            print(f"    {item.weight:3d}lb {item.round:10s}  {item.name!r} ({item.school})"
                  f"  [{item.confidence}]{new_flag}  alts: {alts}")

    if args.json_out:
        _emit_json(
            args, all_tourney_names, bout_batches, bout_batches_meta,
            school_cache, wrestler_resolutions, skip_set, total_bouts, client,
        )
        return

    if args.dry_run:
        print()
        print(SEP)
        print("  DRY RUN — no changes written.")
        print(f"  Re-run without --dry-run to:")
        print(f"    • Create/confirm {len(all_tourney_names)} tournament rows")
        print(f"    • Create {total_new} new wrestler records")
        print(f"    • Insert {total_bouts} tournament bouts (source_format='bullet')")
        print(SEP)
        return

    if not args.allow_direct_write:
        print()
        print(SEP)
        print("  BLOCKED — direct DB write requires --allow-direct-write.")
        print()
        print("  The recommended path is:")
        print(f"    python scripts/import_bullet_csv.py --json-out out.json {args.file!r}")
        print("    Then upload out.json at /admin/import-tournament for review.")
        print()
        print("  This gate exists because fuzzy school matching has produced wrong")
        print("  records in production (e.g., Bart Payne 2025: 22 bouts written to")
        print("  Ewing/St John Vianney instead of Haddon Township/Passaic Tech).")
        print()
        print("  If the review UI is genuinely unavailable, pass --allow-direct-write.")
        print(SEP)
        sys.exit(1)

    # ── Live run ──────────────────────────────────────────────────────────────

    print()
    print("Starting live import …")

    tourney_ids: dict[str, str] = {}
    print("\nStep 1 — Ensuring tournament rows …")
    for tname in all_tourney_names:
        tid = ensure_tournament(tname, client)
        tourney_ids[tname] = tid
        print(f"  {tid[:8]}…  {tname}")

    print(f"\nStep 2 — Creating {total_new} new wrestler records …")
    new_wrestler_map: dict[tuple, str] = {}
    if pending_new:
        new_wrestler_map = create_wrestlers(pending_new, client)
        print(f"  Created {len(new_wrestler_map)} wrestlers.")

        for bouts in bout_batches.values():
            for bout in bouts:
                for side in ("1", "2"):
                    key = (bout[f"wrestler{side}_name_raw"], bout[f"wrestler{side}_school_id"])
                    if bout[f"nj_wrestler{side}_id"] is None:
                        wid = new_wrestler_map.get(key)
                        if wid:
                            bout[f"nj_wrestler{side}_id"] = wid

    print("\nStep 3 — Inserting bouts …")
    total_inserted = 0
    errors: list[str] = []

    for tname, bouts in bout_batches.items():
        if not bouts:
            continue

        tid = tourney_ids.get(tname)
        if not tid:
            errors.append(f"No tournament_id for {tname!r} — skipped")
            continue

        if tname not in force_set and has_existing_bouts(tid, client):
            print(f"  SKIP {tname!r} — already has bouts in DB")
            continue

        for bout in bouts:
            bout["in_season_tournament_id"] = tid

        CHUNK = 500
        inserted = 0
        for i in range(0, len(bouts), CHUNK):
            res = client.from_("tournament_bouts").insert(bouts[i:i + CHUNK]).execute()
            inserted += len(res.data or [])

        total_inserted += inserted
        print(f"  {inserted:4d} bouts  {tname}")

    print()
    print(SEP)
    print("  IMPORT COMPLETE")
    print(SEP)
    print(f"  Bouts inserted:         {total_inserted}")
    print(f"  New wrestlers created:  {len(new_wrestler_map)}")
    if errors:
        print(f"  ERRORS ({len(errors)}):")
        for e in errors:
            print(f"    • {e}")
    else:
        print("  Errors:                 0")
    print(SEP)


if __name__ == "__main__":
    main()
