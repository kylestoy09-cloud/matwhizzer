#!/usr/bin/env python3
"""
scripts/import_rtf_tournaments.py

Parse a plain-text RTF tournament export and import all tournaments,
bouts, and placements into the MatWhizzer database.

Handles both RTF formats:
  full_bracket   — Format A: complete bracket, all participants visible.
  school_tracking — Format B: per-school TW export with Yes/No flags.

Prerequisites:
  - Convert RTF to plain text first (macOS):
      textutil -convert txt -stdout "Dec 2025 Tournaments.rtf" > dec.txt
  - docs/migrations/20260726_tournament_placements.sql applied to DB

Usage:
  python scripts/import_rtf_tournaments.py dec.txt --summary
  python scripts/import_rtf_tournaments.py dec.txt --dry-run
  python scripts/import_rtf_tournaments.py dec.txt --allow-direct-write
  python scripts/import_rtf_tournaments.py dec.txt --only "Robin Leff" --allow-direct-write
  python scripts/import_rtf_tournaments.py jan.txt --year 2026 --allow-direct-write
"""

from __future__ import annotations

import argparse
import os
import re
import sys
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
    _parse_time,
)
from parse_tournament_rtf import parse_rtf_text  # noqa: E402


# ── Constants ──────────────────────────────────────────────────────────────────

SEASON = "2025-26"
SOURCE_FORMAT = "rtf"   # stored in tournament_bouts.source_format

# Tournaments that already have bouts from earlier RTF or PDF imports.
# Bout insertion is skipped for these (tournament row and placements still updated).
# Tournaments from the pipe-CSV import are caught dynamically by has_existing_bouts().
_SKIP_BOUT_IMPORT: set[str] = {
    "Iron Man Tournament",
    "Irvington Holiday Tournament",
    "Harry McLaughlin Invitational",
    "Gator Beast Wrestling Tournament",
    "Cutter Classic",
    "Sam Cali Battle for The Belt",
}

# School name → school_id for raw names that fuzzy matching misses.
# Extend this as --dry-run reveals "none" confidence schools that are actually NJ.
_NJ_SCHOOL_OVERRIDES: dict[str, int] = {
    "Becton Regional/Wood-Ridge": 321,
    "BCIT - Westampton":          256,
    "Hamilton North- Nottingham": 209,
    "Elmwood Park":               51,
    "East Side":                  122,
}

# Schools confirmed OOS — skip matching entirely.
_KNOWN_OOS: set[str] = {
    "Spire Academy",
    "Crown Point",
    "Wilmette (Loyola Academy)",
    "Sunnyside High School",
    "Franklin Regional Hs",   # PA school, fuzzy-matches NJ Franklin Township
    "COWETA",
}


# ── Helpers ────────────────────────────────────────────────────────────────────

def parse_date_range(date_raw: str, year: int) -> tuple[str, Optional[str]]:
    """Parse '12/12-12/13' or '12/27' into ISO (start_date, end_date)."""
    m = re.match(r"(\d{1,2})/(\d{1,2})(?:\s*[-–]\s*(\d{1,2})/(\d{1,2}))?", date_raw)
    if not m:
        return f"{year}-01-01", None
    m1, d1, m2, d2 = m.groups()
    start = f"{year}-{int(m1):02d}-{int(d1):02d}"
    end = f"{year}-{int(m2):02d}-{int(d2):02d}" if m2 else None
    return start, end


def normalize_rtf_round(raw: str) -> str:
    """Normalize parser round label to a DB round code."""
    if raw.strip().lower() in ("unknown", "unk"):
        return "UNK"
    return _normalize_round(raw)


def bout_result_to_db(
    result_type: str, result_detail: Optional[str]
) -> tuple[Optional[str], Optional[str], Optional[int], Optional[int]]:
    """Convert parser result fields to (db_type, db_detail, fall_secs, winner).
    Returns all-None for BYE (caller should skip the bout).
    Winner is 1 (wrestler1 won) or None (DFF)."""
    rt = (result_type or "").strip()
    if rt.upper() in ("BYE", ""):
        return None, None, None, None
    if rt.upper() == "DFF":
        return "DFF", None, None, None
    if rt.lower() == "fall" and result_detail:
        fall_secs = _parse_time(result_detail)
        return "Fall", None, fall_secs, 1
    return rt, result_detail, None, 1


def dedup_bouts(bouts: list[dict]) -> list[dict]:
    """Remove duplicate bout records (Format B emits one entry per tracked school)."""
    seen: set[tuple] = set()
    out: list[dict] = []
    for b in bouts:
        key = (
            b.get("weight_class"),
            frozenset([
                f"{b['wrestler1_name'].lower()}|{b['wrestler1_school'].lower()}",
                f"{b['wrestler2_name'].lower()}|{b['wrestler2_school'].lower()}",
            ]),
        )
        if key not in seen:
            seen.add(key)
            out.append(b)
    return out


# ── School / wrestler resolution ───────────────────────────────────────────────

def resolve_school(raw: str, matcher: SchoolMatcher) -> dict:
    if raw in _KNOWN_OOS:
        return {"school_id": None, "display_name": raw, "confidence": "none", "alternates": []}
    if raw in _NJ_SCHOOL_OVERRIDES:
        sid = _NJ_SCHOOL_OVERRIDES[raw]
        return {"school_id": sid, "display_name": raw, "confidence": "exact", "alternates": []}
    return matcher.match(raw)


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


def create_new_wrestlers(
    to_create: list[dict], client: Client
) -> dict[tuple, str]:
    """Insert new wrestler records; return {(name, school_id) → wrestler_uuid}.
    Idempotent: pre-checks by last name to skip already-existing records."""
    if not to_create:
        return {}

    parsed_list = [{"parsed": _parse_name(x["name"]), "item": x} for x in to_create]
    last_names = list({e["parsed"]["last_name"] for e in parsed_list if e["parsed"]["last_name"]})
    existing: dict[tuple, str] = {}
    QCHUNK = 100
    for start in range(0, len(last_names), QCHUNK):
        res = (
            client.from_("wrestlers")
            .select("id,first_name,last_name")
            .in_("last_name", last_names[start : start + QCHUNK])
            .eq("gender", "M")
            .execute()
        )
        for row in res.data or []:
            existing[(row["first_name"], row["last_name"])] = row["id"]

    result: dict[tuple, str] = {}
    to_insert: list[dict] = []
    insert_keys: list[tuple] = []

    for entry in parsed_list:
        key = (entry["item"]["name"], entry["item"]["school_id"])
        fn, ln = entry["parsed"]["first_name"], entry["parsed"]["last_name"]
        if (fn, ln) in existing:
            result[key] = existing[(fn, ln)]
        else:
            to_insert.append(entry)
            insert_keys.append(key)

    CHUNK = 200
    for start in range(0, len(to_insert), CHUNK):
        batch = to_insert[start : start + CHUNK]
        records = [{**e["parsed"], "gender": "M"} for e in batch]
        res = client.from_("wrestlers").insert(records).execute()
        for j, row in enumerate(res.data or []):
            result[insert_keys[start + j]] = row["id"]

    return result


# ── DB helpers ─────────────────────────────────────────────────────────────────

def ensure_tournament(
    name: str,
    start_date: str,
    end_date: Optional[str],
    source_format: str,
    season: str,
    client: Client,
) -> str:
    """Return existing or newly-created in_season_tournaments.id.
    Sets source_format on the row if it was previously null."""
    res = (
        client.from_("in_season_tournaments")
        .select("id, source_format")
        .eq("name", name)
        .eq("season", season)
        .execute()
    )
    if res.data:
        tid = res.data[0]["id"]
        if not res.data[0].get("source_format"):
            client.from_("in_season_tournaments") \
                .update({"source_format": source_format}) \
                .eq("id", tid).execute()
        return tid

    payload: dict = {
        "name": name,
        "season": season,
        "start_date": start_date,
        "source_format": source_format,
    }
    if end_date:
        payload["end_date"] = end_date

    created = client.from_("in_season_tournaments").insert(payload).execute()
    return created.data[0]["id"]


def has_existing_bouts(tournament_id: str, client: Client) -> bool:
    res = (
        client.from_("tournament_bouts")
        .select("id", count="exact")
        .eq("in_season_tournament_id", tournament_id)
        .execute()
    )
    return (res.count or 0) > 0


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    ap = argparse.ArgumentParser(description="Import RTF tournament bouts and placements.")
    ap.add_argument("file",              help="Plain text file (converted from RTF via textutil)")
    ap.add_argument("--dry-run",         action="store_true",
                    help="Show what would be inserted; make no DB writes.")
    ap.add_argument("--summary",         action="store_true",
                    help="Print parser summary table and exit (no DB access needed).")
    ap.add_argument("--only",            metavar="NAME",
                    help="Restrict to one tournament by name substring.")
    ap.add_argument("--year",            type=int, default=2025,
                    help="Calendar year for date parsing (default 2025; use 2026 for January file).")
    ap.add_argument("--season",          default=SEASON)
    ap.add_argument("--allow-direct-write", action="store_true",
                    help="Write to the DB. Omit to stop after review output.")
    ap.add_argument("--force-tournaments", nargs="*", metavar="TOURNAMENT",
                    help="Override _SKIP_BOUT_IMPORT for named tournaments.")
    args = ap.parse_args()

    text = open(args.file, encoding="utf-8").read()
    parsed = parse_rtf_text(text, only=args.only)

    if args.summary:
        print(f"{'#':>3}  {'Format':<15}  {'Bouts':>6}  {'Places':>6}  Tournament")
        print("-" * 80)
        for i, t in enumerate(parsed, 1):
            fmt = "full_bracket" if t["source_format"] == "full_bracket" else "school_trk"
            print(f"{i:>3}  {fmt:<15}  {t['bout_count']:>6}  {t['placement_count']:>6}  {t['name']}")
        print(f"\n{len(parsed)} tournaments")
        return

    # ── DB setup ──────────────────────────────────────────────────────────────
    script_dir   = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    for env_file in [".env.local", ".env"]:
        candidate = os.path.join(project_root, env_file)
        if os.path.exists(candidate):
            load_dotenv(candidate, override=False)

    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        print("ERROR: Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local")
        sys.exit(1)

    client:         Client          = create_client(url, key)
    school_matcher: SchoolMatcher   = SchoolMatcher(client)
    name_matcher:   WrestlerMatcher = WrestlerMatcher(client)
    school_matcher._load()

    force_set = set(args.force_tournaments or [])
    skip_set  = _SKIP_BOUT_IMPORT - force_set

    SEP = "─" * 72

    # ── Per-tournament processing ─────────────────────────────────────────────
    school_cache: dict[str, dict] = {}

    def cached_school(raw: str) -> dict:
        if raw not in school_cache:
            school_cache[raw] = resolve_school(raw, school_matcher)
        return school_cache[raw]

    review_items:    list[dict]       = []
    pending_new:     list[dict]       = []
    pending_new_set: set[tuple]       = set()

    bout_batches:      dict[str, list[dict]] = {}
    placement_batches: dict[str, list[dict]] = {}
    tourney_meta:      dict[str, dict]       = {}
    wrestler_resolutions: dict[str, dict]    = {}

    print()
    print(SEP)
    print("  TOURNAMENT PROCESSING")
    print(SEP)

    for t in parsed:
        tname         = t["name"]
        source_format = t["source_format"]
        start_date, end_date = parse_date_range(t["date_raw"], args.year)
        is_skipped    = tname in skip_set

        print(f"\n  {tname}  [{source_format}]")
        print(f"  Date: {t['date_raw']}  →  {start_date}" + (f" – {end_date}" if end_date else ""))

        tourney_meta[tname] = {
            "start_date":   start_date,
            "end_date":     end_date,
            "source_format": source_format,
        }

        if is_skipped:
            print(f"  SKIP bouts (in _SKIP_BOUT_IMPORT)")
            bout_batches[tname]      = []
            placement_batches[tname] = []
            continue

        # Dedup (Format B repeats each bout once per tracked school)
        raw_bouts = dedup_bouts(t["bouts"])

        bouts:      list[dict] = []
        new_this_t: set[tuple] = set()
        seen_pairs: set[tuple] = set()

        for b in raw_bouts:
            s1 = cached_school(b["wrestler1_school"])
            s2 = cached_school(b["wrestler2_school"])

            pair_key = (
                b["weight_class"],
                frozenset([b["wrestler1_name"].lower(), b["wrestler2_name"].lower()]),
            )
            if pair_key in seen_pairs:
                continue
            seen_pairs.add(pair_key)

            db_type, db_detail, fall_secs, winner = bout_result_to_db(
                b.get("result_type", ""), b.get("result_detail")
            )
            if winner is None and db_type is None:
                continue   # BYE — skip

            round_code = normalize_rtf_round(b["round"])

            # Resolve wrestlers only for NJ schools
            wm1: dict = {"wrestler_id": None, "confidence": "none", "is_new": False, "alternates": []}
            wm2: dict = {"wrestler_id": None, "confidence": "none", "is_new": False, "alternates": []}

            if s1["school_id"] is not None:
                wm1 = name_matcher.match(
                    b["wrestler1_name"], s1["school_id"], b["weight_class"], gender="M"
                )
            if s2["school_id"] is not None:
                wm2 = name_matcher.match(
                    b["wrestler2_name"], s2["school_id"], b["weight_class"], gender="M"
                )

            for wm, wname, school_raw, smatch in [
                (wm1, b["wrestler1_name"], b["wrestler1_school"], s1),
                (wm2, b["wrestler2_name"], b["wrestler2_school"], s2),
            ]:
                if smatch["school_id"] is None:
                    continue
                w_key = f"{wname}|{smatch['school_id']}|{b['weight_class']}"
                if w_key not in wrestler_resolutions:
                    wrestler_resolutions[w_key] = {
                        "wrestler_id": wm.get("wrestler_id"),
                        "confidence":  wm.get("confidence", "none"),
                        "is_new":      wm.get("is_new", False),
                        "alternates":  wm.get("alternates", []),
                    }
                if wm["confidence"] in ("low", "none"):
                    review_items.append({
                        "tournament": tname,
                        "weight":     b["weight_class"],
                        "round":      round_code,
                        "name":       wname,
                        "school":     school_raw,
                        "confidence": wm["confidence"],
                        "alternates": [a.get("display_name", "") for a in wm.get("alternates", [])[:3]],
                    })
                    if wm.get("is_new") and smatch["school_id"] is not None:
                        nkey = (wname, smatch["school_id"])
                        if nkey not in pending_new_set and nkey not in new_this_t:
                            pending_new.append({"name": wname, "school_id": smatch["school_id"]})
                            pending_new_set.add(nkey)
                            new_this_t.add(nkey)

            bouts.append({
                "weight_class":         b["weight_class"],
                "round":                round_code,
                "nj_wrestler1_id":      wm1["wrestler_id"],
                "wrestler1_name_raw":   b["wrestler1_name"],
                "wrestler1_school_id":  s1["school_id"],
                "wrestler1_school_raw": s1.get("display_name") or b["wrestler1_school"],
                "nj_wrestler2_id":      wm2["wrestler_id"],
                "wrestler2_name_raw":   b["wrestler2_name"],
                "wrestler2_school_id":  s2["school_id"],
                "wrestler2_school_raw": s2.get("display_name") or b["wrestler2_school"],
                "winner":               winner,
                "result_type":          db_type,
                "result_detail":        db_detail,
                "fall_time_seconds":    fall_secs,
                "source_format":        SOURCE_FORMAT,
            })

        # Build placement rows
        placements: list[dict] = []
        for p in t["placements"]:
            ps = cached_school(p["school_name"])
            nj_wid: Optional[str] = None
            if ps["school_id"] is not None:
                pwm = name_matcher.match(
                    p["wrestler_name"], ps["school_id"], p["weight_class"], gender="M"
                )
                if pwm.get("confidence") in ("exact", "high"):
                    nj_wid = pwm.get("wrestler_id")
            placements.append({
                "weight_class":      p["weight_class"],
                "place":             p["place"],
                "wrestler_name_raw": p["wrestler_name"],
                "school_name_raw":   p["school_name"],
                "school_id":         ps["school_id"],
                "nj_wrestler_id":    nj_wid,
            })

        bout_batches[tname]      = bouts
        placement_batches[tname] = placements
        print(
            f"  {len(raw_bouts)} raw bouts → {len(bouts)} unique"
            f"  |  {len(placements)} placements"
            f"  |  {len(new_this_t)} new wrestlers"
        )

    # ── Totals ────────────────────────────────────────────────────────────────
    total_bouts      = sum(len(b) for b in bout_batches.values())
    total_placements = sum(len(p) for p in placement_batches.values())
    total_new        = len(pending_new)
    low_conf         = [r for r in review_items if r["confidence"] == "low"]

    print()
    print(SEP)
    print("  SUMMARY")
    print(SEP)
    print(f"  Tournaments parsed:   {len(parsed)}")
    print(f"  Bouts to insert:      {total_bouts}")
    print(f"  Placements to upsert: {total_placements}")
    print(f"  New wrestlers:        {total_new}")
    print(f"  Low-conf wrestlers:   {len(low_conf)}")

    if review_items:
        print()
        print(SEP)
        print("  WRESTLER REVIEW (low / none confidence):")
        print(SEP)
        prev_t = ""
        for item in review_items[:60]:
            if item["tournament"] != prev_t:
                print(f"\n  [{item['tournament']}]")
                prev_t = item["tournament"]
            alts     = ", ".join(item["alternates"]) if item["alternates"] else "—"
            new_flag = " [NEW]" if item["confidence"] == "none" else ""
            print(
                f"    {item['weight']:3d}lb {item['round']:8s}  {item['name']!r}"
                f" ({item['school']})  [{item['confidence']}]{new_flag}  alts: {alts}"
            )
        if len(review_items) > 60:
            print(f"    … and {len(review_items) - 60} more")

    if args.dry_run:
        print()
        print(SEP)
        print("  DRY RUN — no changes written.")
        print(f"  Re-run with --allow-direct-write to execute.")
        print(SEP)
        return

    if not args.allow_direct_write:
        print()
        print(SEP)
        print("  Pass --dry-run to preview or --allow-direct-write to import.")
        print(SEP)
        sys.exit(0)

    # ── Live run ──────────────────────────────────────────────────────────────
    print()
    print("Starting live import …")

    # Step 1: Tournament rows
    tourney_ids: dict[str, str] = {}
    print("\nStep 1 — Ensuring tournament rows …")
    for t in parsed:
        tname = t["name"]
        meta  = tourney_meta[tname]
        tid   = ensure_tournament(
            tname, meta["start_date"], meta["end_date"],
            meta["source_format"], args.season, client,
        )
        tourney_ids[tname] = tid
        print(f"  {tid[:8]}…  {tname}")

    # Step 2: New wrestlers
    print(f"\nStep 2 — Creating {total_new} new wrestler records …")
    new_wrestler_map: dict[tuple, str] = {}
    if pending_new:
        new_wrestler_map = create_new_wrestlers(pending_new, client)
        print(f"  Created / confirmed {len(new_wrestler_map)} wrestler records.")
        # Back-fill IDs into bout rows
        for tname, bouts in bout_batches.items():
            for bout in bouts:
                for side in ("1", "2"):
                    key = (bout[f"wrestler{side}_name_raw"], bout[f"wrestler{side}_school_id"])
                    if bout[f"nj_wrestler{side}_id"] is None and key in new_wrestler_map:
                        bout[f"nj_wrestler{side}_id"] = new_wrestler_map[key]

    # Step 3: Bouts
    print("\nStep 3 — Inserting bouts …")
    total_inserted = 0
    errors: list[str] = []

    for t in parsed:
        tname = t["name"]
        bouts = bout_batches.get(tname, [])
        if not bouts:
            continue
        tid = tourney_ids.get(tname)
        if not tid:
            errors.append(f"No tournament ID for {tname!r} — skipped")
            continue
        if tname not in force_set and has_existing_bouts(tid, client):
            print(f"  SKIP {tname!r} — already has bouts in DB")
            continue
        for b in bouts:
            b["in_season_tournament_id"] = tid
        CHUNK = 500
        inserted = 0
        for i in range(0, len(bouts), CHUNK):
            res = client.from_("tournament_bouts").insert(bouts[i : i + CHUNK]).execute()
            inserted += len(res.data or [])
        total_inserted += inserted
        print(f"  {inserted:4d} bouts  {tname}")

    # Step 4: Placements
    print("\nStep 4 — Upserting placements …")
    total_pl_inserted = 0
    for t in parsed:
        tname      = t["name"]
        placements = placement_batches.get(tname, [])
        if not placements:
            continue
        tid = tourney_ids.get(tname)
        if not tid:
            continue
        for p in placements:
            p["in_season_tournament_id"] = tid
        res = (
            client.from_("tournament_placements")
            .upsert(placements, on_conflict="in_season_tournament_id,weight_class,place")
            .execute()
        )
        total_pl_inserted += len(res.data or [])
        print(f"  {len(placements):4d} placements  {tname}")

    # ── Final summary ─────────────────────────────────────────────────────────
    print()
    print(SEP)
    print("  IMPORT COMPLETE")
    print(SEP)
    print(f"  Bouts inserted:      {total_inserted}")
    print(f"  Placements upserted: {total_pl_inserted}")
    print(f"  New wrestlers:       {len(new_wrestler_map)}")
    if errors:
        print(f"  ERRORS ({len(errors)}):")
        for e in errors:
            print(f"    • {e}")
    else:
        print("  Errors:              0")
    print(SEP)


if __name__ == "__main__":
    main()
