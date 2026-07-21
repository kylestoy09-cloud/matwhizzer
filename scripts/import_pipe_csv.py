#!/usr/bin/env python3
"""
scripts/import_pipe_csv.py

Import tournament bouts from the pipe-delimited CSV exports into MatWhizzer.

Usage:
  python scripts/import_pipe_csv.py [--dry-run] [--season-id N] <csv_file>

Options:
  --dry-run       Show what would be imported; make no DB writes.
  --season-id N   Season label (default: "2025-26").

PREREQUISITES (apply migrations before first live run):
  docs/migrations/20260720_add_source_format_to_tournament_bouts.sql
  docs/migrations/20260720_add_tw_id_to_wrestlers.sql

The script resolves schools and wrestlers from the DB using the same
fuzzy-matching pipeline as import_tournament.py, with a manual override
dict for NJ schools whose CSV names don't trigger the matcher (see
_NJ_SCHOOL_OVERRIDES below).  It preferentially matches wrestlers by
tw_id (when the column exists and a tw_id is present in the CSV) before
falling back to name+school trigram matching.

Sam Cali Battle for The Belt is excluded from bout imports: the bracket-
PDF extraction (Sam Cali/ folder) is treated as the authoritative source.
A tournament row is still created for it so dates and metadata are correct.

Tournaments that already have bouts in the DB are skipped (their data
came from richer RTF imports).  Cutter Classic is skipped for the same
reason (328 DB bouts vs 682 CSV rows — the DB rows cover all NJ-school
bouts from the RTF).  Re-run with --force-tournaments to override.
"""

from __future__ import annotations

import argparse
import csv
import os
import re
import sys
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
    _parse_time,
)


# ── Constants ──────────────────────────────────────────────────────────────────

SEASON = "2025-26"
SOURCE_FORMAT = "pipe"

# Tournaments that already have bouts from richer RTF imports — skip bout insertion.
# Tournament rows are still created/confirmed for completeness.
_SKIP_BOUT_IMPORT: set[str] = {
    "Iron Man Tournament",               # 96 bouts in DB ≥ 95 in CSV
    "Irvington Holiday Tournament",      # 71 bouts in DB = 71 in CSV
    "Harry McLaughlin Invitational",     # 188 bouts in DB >> 42 in CSV
    "Gator Beast Wrestling Tournament",  # 142 bouts in DB >> 84 in CSV
    "Cutter Classic",                    # 328 bouts in DB; CSV has 682 but includes
                                         # OOS-vs-OOS bouts the RTF import filtered out
    "Sam Cali Battle for The Belt",      # bracket-PDF extraction is authoritative
}

# Confirmed dates for tournaments in the pipe CSV.
# Dates flagged [EST] are estimates based on NJ wrestling calendar — verify before
# using for public display.  Iron Man / Irvington / Harry McLaughlin / Gator Beast /
# Cutter Classic dates already set correctly in the DB.
_TOURNAMENT_META: dict[str, dict] = {
    "Iron Man Tournament":                          {"start": "2025-12-12", "end": "2025-12-13"},
    "Irvington Holiday Tournament":                 {"start": "2025-12-13"},
    "Harry McLaughlin Invitational":                {"start": "2025-12-13"},
    "Gator Beast Wrestling Tournament":             {"start": "2025-12-20"},
    "Cutter Classic":                               {"start": "2025-12-20"},
    "Sam Cali Battle for The Belt":                 {"start": "2025-12-27", "end": "2025-12-28"},  # [EST]
    "Linn Crawn Memorial Tournament":               {"start": "2025-12-27"},                       # [EST]
    "Palmyra Panther High School Wrestling Tournament": {"start": "2025-12-27"},                   # [EST]
    "Elmwood Park Crusader Classic":                {"start": "2025-12-27"},                       # [EST]
    "King of The Castle":                           {"start": "2025-12-27", "end": "2025-12-28"},  # [EST] 2-day
    "Bethlehem Holiday Wrestling Classic":          {"start": "2025-12-28", "end": "2025-12-29"},  # [EST] PA tournament
}

# NJ schools that SchoolMatcher returns 'none' for due to alias truncation or
# minor encoding differences in the CSV.  Maps raw CSV school name → school_id.
# Verified against school_aliases table 2026-07-20.
_NJ_SCHOOL_OVERRIDES: dict[str, int] = {
    "Becton Regional/Wood-Ridge": 321,   # → Becton
    "BCIT - Westampton":          256,   # → Westampton Tech
    "Hamilton North- Nottingham": 209,   # → Nottingham
    "Elmwood Park":               51,    # → Elmwood Park
    "East Side":                  122,   # → Newark East Side
}

# Schools confirmed to be out-of-state.  Some are ambiguous (e.g. 'Morris' could be
# NJ Morris Hills/Knolls but more often out-of-state in big tournaments); flag those
# in the review list rather than hard-coding a school_id.
_KNOWN_OOS: set[str] = {
    "Spire Academy", "Crown Point", "Wilmette (Loyola Academy)", "COWETA",
    "Sunnyside High School",       # WA state
    "Franklin Regional Hs",        # PA school (Murrysville, PA) — fuzzy-matches to NJ school 169 (Franklin Township)
}

# Regex to strip round prefixes that appear embedded in winner/loser name fields
# in some rows of the pipe CSV (e.g. "Cons. Semis - Zackary Swingle" → "Zackary Swingle").
_NAME_ROUND_PREFIX = re.compile(
    r"^(?:Varsity\s*-\s*|Cons\.?\s+Semis?\s*-\s*|Champ\.?\s+Round\s+\d+\s*-\s*)+",
    re.IGNORECASE,
)


# ── Data classes ───────────────────────────────────────────────────────────────

@dataclass
class CsvRow:
    tournament:    str
    weight:        int
    round:         str
    winner:        str
    winner_school: str
    tw_id_winner:  Optional[int]
    loser:         str
    loser_school:  str
    tw_id_loser:   Optional[int]
    method:        str


@dataclass
class ReviewItem:
    tournament:  str
    weight:      int
    round:       str
    name:        str
    school:      str
    confidence:  str
    alternates:  list[str] = field(default_factory=list)


# ── CSV parsing ────────────────────────────────────────────────────────────────

def load_csv(path: str) -> list[CsvRow]:
    rows: list[CsvRow] = []
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for r in reader:
            try:
                w_id = int(r["tw_id_winner"]) if r.get("tw_id_winner", "").strip() else None
                l_id = int(r["tw_id_loser"])  if r.get("tw_id_loser",  "").strip() else None
            except ValueError:
                w_id = l_id = None
            try:
                weight = int(r["weight"])
            except ValueError:
                continue
            winner = _NAME_ROUND_PREFIX.sub("", r["winner"].strip())
            loser  = _NAME_ROUND_PREFIX.sub("", r["loser"].strip())
            rows.append(CsvRow(
                tournament    = r["tournament"].strip(),
                weight        = weight,
                round         = r["round"].strip(),
                winner        = winner,
                winner_school = r["winner_school"].strip(),
                tw_id_winner  = w_id,
                loser         = loser,
                loser_school  = r["loser_school"].strip(),
                tw_id_loser   = l_id,
                method        = r["method"].strip(),
            ))
    return rows


# ── Round normalisation ────────────────────────────────────────────────────────

_VARSITY_PREFIX = re.compile(r"^varsity\s*-\s*", re.IGNORECASE)


def normalize_round(raw: str) -> str:
    cleaned = _VARSITY_PREFIX.sub("", raw).strip()
    return _normalize_round(cleaned) if cleaned else "UNK"


# ── School resolution ──────────────────────────────────────────────────────────

def resolve_school(raw: str, matcher: SchoolMatcher) -> dict:
    if raw in _KNOWN_OOS:
        return {"school_id": None, "display_name": raw, "confidence": "none", "alternates": []}
    if raw in _NJ_SCHOOL_OVERRIDES:
        sid = _NJ_SCHOOL_OVERRIDES[raw]
        return {"school_id": sid, "display_name": raw, "confidence": "exact", "alternates": []}
    return matcher.match(raw)


# ── Wrestler resolution (tw_id → name fallback) ────────────────────────────────

def _build_tw_lookup(client: Client) -> Optional[dict[int, str]]:
    """Return {tw_id: wrestler_uuid} if the tw_id column exists; else None."""
    try:
        res = client.from_("wrestlers").select("id,tw_id").not_.is_("tw_id", "null").execute()
        return {int(row["tw_id"]): row["id"] for row in (res.data or []) if row.get("tw_id")}
    except Exception:
        return None  # column doesn't exist yet — skip tw_id matching


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


def resolve_wrestler(
    name:           str,
    school_id:      Optional[int],
    weight:         int,
    tw_id:          Optional[int],
    tw_lookup:      Optional[dict[int, str]],
    name_matcher:   WrestlerMatcher,
) -> dict:
    """Return {wrestler_id, confidence, is_new}.  Only resolves for NJ schools."""
    if school_id is None:
        return {"wrestler_id": None, "confidence": "none", "is_new": False}

    # tw_id path (fastest, most reliable)
    if tw_id is not None and tw_lookup is not None:
        wid = tw_lookup.get(tw_id)
        if wid:
            return {"wrestler_id": wid, "confidence": "exact", "is_new": False}

    # Name fuzzy matching
    return name_matcher.match(name, school_id, weight)


# ── New wrestler creation ──────────────────────────────────────────────────────

def create_wrestlers(
    to_create:  list[dict],   # [{name, school_id, tw_id}]
    tw_lookup:  Optional[dict[int, str]],
    client:     Client,
) -> dict[tuple, str]:
    """Insert new wrestler records; return {(name, school_id) → wrestler_uuid}.

    Idempotent: if a wrestler with the same (first_name, last_name, gender) already
    exists (e.g., from a previous partial run), the existing ID is returned instead
    of attempting a duplicate insert.
    """
    if not to_create:
        return {}

    parsed_list: list[dict] = []
    for item in to_create:
        parsed = _parse_name(item["name"])
        rec: dict = {**parsed, "gender": "M"}
        if item.get("tw_id") is not None and tw_lookup is not None:
            rec["tw_id"] = item["tw_id"]
        parsed_list.append({"parsed": parsed, "rec": rec, "item": item})

    # Pre-check DB for already-existing wrestlers with matching last names
    # to handle idempotent re-runs (partial failures, migration-missing runs, etc.)
    last_names = list({e["parsed"]["last_name"] for e in parsed_list if e["parsed"]["last_name"]})
    existing: dict[tuple, str] = {}   # (first_name, last_name) → wrestler_uuid
    QCHUNK = 100
    for start in range(0, len(last_names), QCHUNK):
        res = client.from_("wrestlers").select("id,first_name,last_name") \
            .in_("last_name", last_names[start:start + QCHUNK]) \
            .eq("gender", "M").execute()
        for row in (res.data or []):
            existing[(row["first_name"], row["last_name"])] = row["id"]

    result:     dict[tuple, str] = {}
    to_insert:  list[dict]       = []   # only those not already in DB
    insert_keys: list[tuple]     = []

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

    # Batch insert only the genuinely new ones
    CHUNK = 200
    for start in range(0, len(to_insert), CHUNK):
        batch_entries = to_insert[start:start + CHUNK]
        batch_keys    = insert_keys[start:start + CHUNK]
        records       = [e["rec"] for e in batch_entries]

        res = client.from_("wrestlers").insert(records).execute()
        for j, row in enumerate(res.data or []):
            result[batch_keys[j]] = row["id"]
            tw_id_val = batch_entries[j]["rec"].get("tw_id")
            if tw_id_val is not None and tw_lookup is not None:
                tw_lookup[int(tw_id_val)] = row["id"]

    return result


# ── Tournament row upsert ──────────────────────────────────────────────────────

def ensure_tournament(name: str, client: Client) -> str:
    """Return existing or newly-created in_season_tournaments.id."""
    existing = client.from_("in_season_tournaments") \
        .select("id") \
        .eq("name", name) \
        .eq("season", SEASON) \
        .execute()
    if existing.data:
        return existing.data[0]["id"]

    meta = _TOURNAMENT_META.get(name, {})
    payload = {
        "name":       name,
        "season":     SEASON,
        "start_date": meta.get("start", "2025-12-27"),   # fallback if unknown
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


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    ap = argparse.ArgumentParser(description="Import pipe-format CSV tournament bouts.")
    ap.add_argument("file",          help="Path to pipe_format CSV file")
    ap.add_argument("--dry-run",     action="store_true")
    ap.add_argument("--season",      default=SEASON)
    ap.add_argument("--force-tournaments", nargs="*", metavar="TOURNAMENT",
                    help="Override _SKIP_BOUT_IMPORT for specific tournament names")
    args = ap.parse_args()

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

    client:         Client         = create_client(url, key)
    school_matcher: SchoolMatcher  = SchoolMatcher(client)
    name_matcher:   WrestlerMatcher = WrestlerMatcher(client)
    school_matcher._load()

    tw_lookup = _build_tw_lookup(client)
    if tw_lookup is None:
        print("NOTE: wrestlers.tw_id column not found — apply migration first for tw_id matching.")
    else:
        print(f"tw_id lookup loaded: {len(tw_lookup)} wrestlers have a tw_id.")

    force_set = set(args.force_tournaments or [])
    skip_set  = _SKIP_BOUT_IMPORT - force_set

    print(f"Loading CSV: {args.file!r} …")
    all_rows = load_csv(args.file)
    all_tourney_names = sorted(set(r.tournament for r in all_rows))
    print(f"  {len(all_rows)} rows across {len(all_tourney_names)} tournaments")

    # ── School cache (avoid re-matching same raw name) ─────────────────────────
    school_cache: dict[str, dict] = {}
    def cached_school(raw: str) -> dict:
        if raw not in school_cache:
            school_cache[raw] = resolve_school(raw, school_matcher)
        return school_cache[raw]

    # ── Collect review items and pending new wrestler creations ───────────────
    review_items:    list[ReviewItem]         = []
    pending_new:     list[dict]               = []   # {name, school_id, tw_id, key}
    pending_new_set: set[tuple[str, int]]     = set()

    # ── Per-tournament processing ─────────────────────────────────────────────
    # Group rows by tournament then process.

    from collections import defaultdict
    by_tourney: dict[str, list[CsvRow]] = defaultdict(list)
    for row in all_rows:
        by_tourney[row.tournament].append(row)

    # We build bout_batches: {tournament_name → list[bout_dict]}
    # New wrestlers are collected first (dry run prints them; live run creates them).
    bout_batches: dict[str, list[dict]] = {}
    tourney_ids:  dict[str, str]        = {}   # name → uuid (populated in live run)

    sep = "─" * 72

    print()
    print(sep)
    print("  TOURNAMENT PROCESSING")
    print(sep)

    for tname in all_tourney_names:
        rows_t = by_tourney[tname]
        is_skipped_for_bouts = (tname in skip_set)
        note = " [SKIP bouts — already in DB]"    if is_skipped_for_bouts else ""
        if tname == "Sam Cali Battle for The Belt":
            note = " [SKIP bouts — PDF extraction is authoritative]"
        meta = _TOURNAMENT_META.get(tname, {})
        date_str = meta.get("start", "unknown date")
        est_flag = " [EST]" if date_str == meta.get("start", "") and "EST" not in tname else ""

        print(f"\n  {tname}")
        print(f"  Date: {date_str}{est_flag}{note}")

        if is_skipped_for_bouts:
            bout_batches[tname] = []
            continue

        # Build bout rows for this tournament
        bouts: list[dict]         = []
        new_this_t: set[tuple]    = set()   # (name, school_id) newly pending this tournament

        # Deduplicate within tournament: (weight, frozenset({winner, loser}))
        seen_pairs: set[tuple] = set()

        for row in rows_t:
            s_w = cached_school(row.winner_school)
            s_l = cached_school(row.loser_school)

            pair_key = (row.weight, frozenset([row.winner.lower(), row.loser.lower()]))
            if pair_key in seen_pairs:
                continue
            seen_pairs.add(pair_key)

            # Resolve wrestlers
            wm_winner = resolve_wrestler(
                row.winner, s_w["school_id"], row.weight, row.tw_id_winner, tw_lookup, name_matcher
            )
            wm_loser  = resolve_wrestler(
                row.loser,  s_l["school_id"], row.weight, row.tw_id_loser,  tw_lookup, name_matcher
            )

            # Flag low/none confidence NJ wrestlers for review
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
                        round      = normalize_round(row.round),
                        name       = name,
                        school     = school_raw,
                        confidence = wm["confidence"],
                        alternates = [a.get("display_name","") for a in wm.get("alternates", [])[:3]],
                    ))
                    # Queue for creation only if fully unmatched (none)
                    if wm["is_new"] and school_match["school_id"] is not None:
                        nkey = (name, school_match["school_id"])
                        if nkey not in pending_new_set and nkey not in new_this_t:
                            tw_val = row.tw_id_winner if name == row.winner else row.tw_id_loser
                            pending_new.append({"name": name, "school_id": school_match["school_id"], "tw_id": tw_val})
                            pending_new_set.add(nkey)
                            new_this_t.add(nkey)

            # Parse result
            result_type, result_detail, fall_secs, _ = _parse_result(row.method)

            bouts.append({
                "weight_class":         row.weight,
                "round":                normalize_round(row.round),
                "nj_wrestler1_id":      wm_winner["wrestler_id"],
                "wrestler1_name_raw":   row.winner,
                "wrestler1_school_id":  s_w["school_id"],
                "wrestler1_school_raw": s_w.get("display_name") or row.winner_school,
                "nj_wrestler2_id":      wm_loser["wrestler_id"],
                "wrestler2_name_raw":   row.loser,
                "wrestler2_school_id":  s_l["school_id"],
                "wrestler2_school_raw": s_l.get("display_name") or row.loser_school,
                "winner":               1,       # winner is always wrestler1 in pipe CSV
                "result_type":          result_type,
                "result_detail":        result_detail,
                "fall_time_seconds":    fall_secs,
                "source_format":        SOURCE_FORMAT,
            })

        bout_batches[tname] = bouts
        print(f"  {len(bouts)} bouts queued  ({len(new_this_t)} new wrestlers to create)")

    # ── Totals ────────────────────────────────────────────────────────────────
    total_bouts = sum(len(b) for b in bout_batches.values())
    total_new   = len(pending_new)
    review_nj   = [r for r in review_items if r.confidence == "low"]

    print()
    print(sep)
    print(f"  SUMMARY")
    print(sep)
    print(f"  Bouts to insert:          {total_bouts}")
    print(f"  New wrestlers to create:  {total_new}")
    print(f"  Low-confidence wrestlers: {len(review_nj)}")
    print(f"  Review items (all):       {len(review_items)}")

    # ── Review items ──────────────────────────────────────────────────────────
    if review_items:
        print()
        print(sep)
        print("  WRESTLER REVIEW (low / none confidence):")
        print(sep)
        prev_t = ""
        for item in review_items:
            if item.tournament != prev_t:
                print(f"\n  [{item.tournament}]")
                prev_t = item.tournament
            alts = ", ".join(item.alternates) if item.alternates else "—"
            new_flag = " [NEW]" if item.confidence == "none" else ""
            print(f"    {item.weight:3d}lb {item.round:8s}  {item.name!r} ({item.school})"
                  f"  [{item.confidence}]{new_flag}  alts: {alts}")

    if args.dry_run:
        print()
        print(sep)
        print("  DRY RUN — no changes written.")
        print(f"  Re-run without --dry-run to:")
        print(f"    • Create/confirm {len(all_tourney_names)} tournament rows")
        print(f"    • Create {total_new} new wrestler records")
        print(f"    • Insert {total_bouts} tournament bouts (source_format='pipe')")
        print(sep)
        return

    # ── Live run ──────────────────────────────────────────────────────────────

    print()
    print("Starting live import …")

    # Step 1: Ensure tournament rows exist
    print("\nStep 1 — Ensuring tournament rows …")
    for tname in all_tourney_names:
        tid = ensure_tournament(tname, client)
        tourney_ids[tname] = tid
        print(f"  {tid[:8]}…  {tname}")

    # Step 2: Create new wrestlers
    print(f"\nStep 2 — Creating {total_new} new wrestler records …")
    new_wrestler_map: dict[tuple, str] = {}
    if pending_new:
        new_wrestler_map = create_wrestlers(pending_new, tw_lookup, client)
        print(f"  Created {len(new_wrestler_map)} wrestlers.")

        # Back-fill wrestler IDs into bout rows
        for tname, bouts in bout_batches.items():
            for bout in bouts:
                for side in ("1", "2"):
                    key = (bout[f"wrestler{side}_name_raw"], bout[f"wrestler{side}_school_id"])
                    if bout[f"nj_wrestler{side}_id"] is None:
                        wid = new_wrestler_map.get(key)
                        if wid:
                            bout[f"nj_wrestler{side}_id"] = wid

    # Step 3: Insert bouts
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

        # Skip if tournament already has bouts in DB (redundant guard for live run)
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
    print(sep)
    print("  IMPORT COMPLETE")
    print(sep)
    print(f"  Bouts inserted:            {total_inserted}")
    print(f"  New wrestlers created:     {len(new_wrestler_map)}")
    if errors:
        print(f"  ERRORS ({len(errors)}):")
        for e in errors:
            print(f"    • {e}")
    else:
        print("  Errors:                    0")
    print(sep)


if __name__ == "__main__":
    main()
