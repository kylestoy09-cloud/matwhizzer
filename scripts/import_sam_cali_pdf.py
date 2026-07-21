#!/usr/bin/env python3
"""
scripts/import_sam_cali_pdf.py

Parse Sam Cali Battle for The Belt bracket PDFs and import bouts into MatWhizzer.

Usage:
  python scripts/import_sam_cali_pdf.py [--dry-run] <pdf_dir>

where pdf_dir contains 106.pdf, 113.pdf, ..., 285.pdf.

Round mapping (Sam Cali → DB):
  Round of 32  → R1
  Round of 16  → R2
  Quarter-Fin… → QF
  Semi-Finals  → SF
  Finals       → F
  Consi of 4   → CQF
  Consi-Semis  → CSF
  3rd Place    → 3rd_Place
  5th Place    → 5th_Place

Method parsing handles: F M:SS (fall), TF M:SS (TF), MD, DEC [SV], M FOR (skip).
NC and M FOR matches are skipped (no real bout).
Winner is the wrestler with the higher score.
"""

from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Optional

try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv(**_):  # type: ignore[misc]
        pass

try:
    from supabase import create_client, Client
except ImportError:
    print("ERROR: supabase-py not installed.  pip install supabase python-dotenv")
    sys.exit(1)

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _SCRIPT_DIR)
from import_tournament import WrestlerMatcher, _parse_time  # noqa: E402


# ── Constants ──────────────────────────────────────────────────────────────────

SEASON        = "2025-26"
SOURCE_FORMAT = "pdf"
TOURNAMENT    = "Sam Cali Battle for The Belt"

WEIGHT_CLASSES = [106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285]

# Sam Cali PDF round labels → DB round codes
_ROUND_MAP: dict[str, str] = {
    "round of 32":    "R1",
    "round of 16":    "R2",
    "quarter-finals": "QF",
    "quarter-fin":    "QF",
    "quarter-fi":     "QF",
    "semi-finals":    "SF",
    "finals":         "F",
    "consi of 4":     "CQF",
    "consi-semis":    "CSF",
    "3rd place":      "3rd_Place",
    "5th place":      "5th_Place",
}

# Team abbreviation → school_id  (verified 2026-07-21 against NJ schools table)
# Marked [REVIEW] where the mapping is an educated guess.
_TEAM_TO_SCHOOL: dict[str, Optional[int]] = {
    "B-R":     321,   # Becton Regional
    "BLOM":    81,    # Bloomfield
    "BRGF":    40,    # Bergenfield  [REVIEW]
    "CHER":    266,   # Cherokee (Marlton)
    "CRAN":    93,    # Cranford
    "DBP":     11,    # Don Bosco Prep
    "DEL":     141,   # Delaware Valley
    "DEMA":    314,   # Demarest
    "DMNT":    2,     # Dumont
    "DPLC":    22,    # DePaul Catholic (Wayne)
    "GLRK":    12,    # Glen Rock
    "HILL":    188,   # Hillsborough  [REVIEW: not Hillside=124]
    "HTWN":    240,   # Haddon Township
    "KINN":    33,    # Kinnelon
    "LAKE":    5,     # Lakeland  [REVIEW: not Lakewood=203]
    "LCM":     281,   # Lower Cape May Regional
    "MANA":    204,   # Manalapan  [REVIEW: not Manasquan=220]
    "MAT":     382,   # Matawan  [REVIEW]
    "MDTWP":   159,   # Middletown North  [REVIEW: might be South=160]
    "MO":      172,   # Monroe Township  [REVIEW]
    "MOKN":    77,    # Morris Knolls
    "MTWN":    114,   # Morristown  [REVIEW]
    "NBGN":    95,    # North Bergen  [REVIEW]
    "NHGH":    35,    # Northern Highlands
    "Nut":     106,   # Nutley
    "NWTN":    24,    # Newton
    "OLDT":    6,     # Old Tappan
    "PARA":    57,    # Paramus
    "PCVY":    46,    # Passaic Valley  [REVIEW]
    "PING":    144,   # Pingry
    "PISC":    183,   # Piscataway
    "PJ23":    117,   # Pope John XXIII
    "PRMC":    153,   # Paramus Catholic
    "PSCT":    391,   # Passaic Tech (County Technical-Vocational)
    "PSKH":    15,    # Pascack Hills
    "PSKV":    16,    # Pascack Valley
    "RBC":     264,   # Red Bank Catholic
    "RHS":     156,   # Ridge High School (Basking Ridge)  [REVIEW]
    "RMPO":    17,    # Ramapo
    "RP":      196,   # Rutgers Prep
    "SBP":     118,   # St. Benedict's Prep
    "SBW":     164,   # South Brunswick  [REVIEW]
    "SHP":     225,   # Shore Regional
    "SPAR":    26,    # Sparta
    "SPP":     157,   # South Plainfield  [REVIEW: might be St. Peter's Prep=167]
    "TNCK":    48,    # Teaneck
    "TRE":     216,   # Trenton
    "WALL":    235,   # Wall
    "WE":      39,    # West Essex
    "WHLS":    119,   # Whippany Park
    "odbridge": 187,  # Woodbridge  (PDF truncation of "Woodbridge" losing leading "W")
    "CHAM":    397,   # Summit/Chatham
    # Tentative / low-confidence
    "BBRK":    207,   # Brick Memorial  [REVIEW: could be Brick Twp=218]
    "MS":      None,  # Unknown — flag for review
    "MSCA":    None,  # Unknown — flag for review
    "PEDD":    None,  # Unknown — Peddie School not in DB?  [REVIEW]
    "PNGT":    None,  # Unknown  [REVIEW]
    "GFA":     None,  # Unknown — possibly OOS  [REVIEW]
}

# Teams confirmed as out-of-state; suppress "unknown NJ school" warnings
_KNOWN_OOS: set[str] = set()   # populate if any OOS teams are identified after dry run


# ── PDF parsing ────────────────────────────────────────────────────────────────

# Match header:  #NNN • Round Label   Method
# Stop at 3+ spaces before next # (next column header), or EOL.
# _split_round_method then extracts the clean method from whatever is captured.
_HEADER_RE = re.compile(r'#(\d+)\s*[•·]\s*(.+?)(?=\s{3,}#|\s*$)')

# Standard wrestler row:  seed  I. Surname  TEAM  score
_WRESTLER_RE = re.compile(
    r'(?<![.\w])(\d{1,2})\s+'        # seed (1-2 digits, not after word/period)
    r'([A-Z]\.\s+[\w\'\-’\.…]+)'  # name: initial.space surname (with specials)
    r'\s{2,}'                           # 2+ spaces separating name from team
    r'([A-Za-z][A-Za-z0-9\-]+)'        # team abbreviation
    r'\s+(\d+)'                         # score
)

# Finals-format: name + team + score with NO seed on the same line
_NAME_SCORE_RE = re.compile(
    r'^\s{5,}'                          # significant leading whitespace
    r'([A-Z]\.\s+[\w\'\-’\.…]+)'  # name
    r'\s{2,}'
    r'([A-Za-z][A-Za-z0-9\-]+)'        # team
    r'\s+(\d+)\s*$'                     # score
)

# Seed-only line (Finals format): just a number with lots of leading whitespace
_SEED_ONLY_RE = re.compile(r'^\s{5,}(\d{1,2})\s*$')


def _split_round_method(raw: str) -> tuple[str, str]:
    """Split 'Quarter-Fin… DEC SV' into ('Quarter-Fin', 'DEC SV').

    Also handles 'Finals             DEC' where many spaces separate the round
    label from the method, and 'Round of 32   F M:SS   wrestler row text' where
    right-column content trails after the method.  The method is extracted by
    taking everything after the round label up to the first 4+ space run.
    """
    ROUNDS = [
        "Semi-Finals", "Quarter-Finals", "Quarter-Fin", "Quarter-Fi",
        "Round of 32", "Round of 16", "Consi-Semis", "Consi of 4",
        "3rd Place", "5th Place", "Finals",
    ]
    round_raw = ""
    rest      = raw
    for r in ROUNDS:
        if raw.lower().startswith(r.lower()):
            round_raw = r
            rest = raw[len(r):].lstrip("…").lstrip()
            break
    else:
        parts = raw.split(None, 1)
        round_raw = parts[0]
        rest = parts[1] if len(parts) > 1 else ""

    # Method is a short string (≤10 chars, at most 1 internal space).
    # Any run of 4+ spaces marks the end of the method (column padding or
    # right-column wrestler row content).
    method_raw = re.split(r'\s{4,}', rest)[0].strip()
    return round_raw, method_raw


def _normalize_round(raw: str) -> str:
    return _ROUND_MAP.get(raw.strip().lower(), "UNK")


def _parse_method(raw: str) -> tuple[Optional[str], Optional[str], Optional[int]]:
    """Return (result_type, result_detail, fall_time_seconds)."""
    r = raw.strip()
    u = r.upper()

    # "F M:SS" — fall with time
    m = re.fullmatch(r"F\s+(\d+:\d{2})", r, re.IGNORECASE)
    if m:
        return ("Fall", None, _parse_time(m.group(1)))

    # "TF[-1.5] M:SS" — technical fall with time (no score in PDF format)
    m = re.fullmatch(r"TF(?:-1\.5)?\s+(\d+:\d{2})", r, re.IGNORECASE)
    if m:
        return ("TF", None, _parse_time(m.group(1)))

    if u == "MD":
        return ("MD", None, None)

    if u in ("DEC", "DEC SV", "DEC TB"):
        detail = u.split(None, 1)[1] if " " in u else None
        return ("Dec", detail, None)

    if u in ("M FOR", "M.FOR", "MFOR", "MED. FOR."):
        return ("For", None, None)

    if u in ("NC", "BYE", ""):
        return (None, None, None)

    # Fallback: first token is type, rest is detail
    parts = r.split(None, 1)
    return (parts[0], parts[1] if len(parts) > 1 else None, None)


def parse_pdf(pdf_path: Path, weight: int) -> list[dict]:
    """Extract matches from one bracket PDF. Returns list of match dicts."""
    result = subprocess.run(
        ["pdftotext", "-layout", str(pdf_path), "-"],
        capture_output=True, text=True,
    )
    text = result.stdout
    lines = text.split("\n")

    # pending[col] = match dict being assembled
    pending: dict[int, dict] = {}
    completed: list[dict] = []

    prev_stripped = ""

    for line in lines:
        if not line.rstrip():
            prev_stripped = ""
            continue

        # ── Detect match headers ───────────────────────────────────────────────
        # Use _HEADER_RE so multiple headers per line (different columns) are found.
        for m in _HEADER_RE.finditer(line):
            col       = m.start()
            match_num = int(m.group(1))
            label_raw = m.group(2).strip()

            round_raw, method_raw = _split_round_method(label_raw)
            mkey = method_raw.upper().strip()

            # Skip non-bouts
            if mkey in ("NC", "BYE", "M FOR", "M.FOR", "MFOR", ""):
                continue

            pending[col] = {
                "match":      match_num,
                "weight":     weight,
                "round_raw":  round_raw,
                "round":      _normalize_round(round_raw),
                "method_raw": method_raw,
                "wrestlers":  [],
            }

        # ── Detect wrestler rows ───────────────────────────────────────────────
        found: list[tuple[int, dict]] = []  # (col, wrestler_dict)

        # Standard: seed  Name  Team  score on one line
        for m in _WRESTLER_RE.finditer(line):
            col = m.start()
            seed_val = int(m.group(1))
            if seed_val > 32:
                continue  # not a seed
            found.append((col, {
                "seed":  seed_val,
                "name":  m.group(2).strip(),
                "team":  m.group(3).strip(),
                "score": int(m.group(4)),
            }))

        # Finals format: Name  Team  score (seed was on the previous non-empty line)
        if not found:
            nm = _NAME_SCORE_RE.match(line)
            if nm:
                col  = len(line) - len(line.lstrip())
                seed = None
                sm   = _SEED_ONLY_RE.match(prev_stripped)
                if sm:
                    seed = int(sm.group(1))
                found.append((col, {
                    "seed":  seed,
                    "name":  nm.group(1).strip(),
                    "team":  nm.group(2).strip(),
                    "score": int(nm.group(3)),
                }))

        # Assign each wrestler to the nearest pending match by column proximity
        for col, wrestler in found:
            if not pending:
                break
            best_col = min(pending.keys(), key=lambda k: abs(k - col))
            if abs(best_col - col) <= 35:
                pending[best_col]["wrestlers"].append(wrestler)
                if len(pending[best_col]["wrestlers"]) == 2:
                    match = pending.pop(best_col)
                    if _is_valid_match(match):
                        completed.append(match)

        prev_stripped = line

    return completed


def _is_valid_match(match: dict) -> bool:
    ws = match["wrestlers"]
    if len(ws) != 2:
        return False
    # Both scores 0 typically means NC / no-show — skip
    if ws[0]["score"] == 0 and ws[1]["score"] == 0:
        return False
    return True


# ── School resolution ──────────────────────────────────────────────────────────

def resolve_school(abbrev: str) -> Optional[int]:
    """Return school_id or None (OOS / unknown)."""
    return _TEAM_TO_SCHOOL.get(abbrev)


# ── Wrestler matching ──────────────────────────────────────────────────────────

def _parse_abbreviated_name(raw: str) -> tuple[str, str]:
    """'C. Parke' → ('C.', 'Parke').  Returns (first_initial, last_name)."""
    parts = raw.strip().split(None, 1)
    if len(parts) == 2:
        return parts[0], parts[1]
    return "", raw.strip()


def match_wrestler(
    abbrev_name: str,
    school_id:   int,
    weight:      int,
    client:      Client,
) -> Optional[str]:
    """Try to match abbreviated name (e.g. 'C. Parke') to existing wrestler UUID.

    Matches by last_name in the wrestlers table, then filters by first initial.
    Returns wrestler UUID on unique match, None otherwise.
    """
    first_initial, last_name = _parse_abbreviated_name(abbrev_name)
    if not last_name:
        return None

    # Strip trailing truncation characters ("Carrillo-Sol" from "Carrillo-Sol…")
    last_name = last_name.rstrip("….").strip()

    res = client.from_("wrestlers") \
        .select("id,first_name,last_name") \
        .eq("last_name", last_name) \
        .eq("gender", "M") \
        .execute()
    matches = res.data or []

    if len(matches) == 1:
        return matches[0]["id"]

    # Multiple matches — filter by first initial
    init = first_initial.rstrip(".").upper()
    if init and matches:
        filtered = [m for m in matches if m.get("first_name", "").upper().startswith(init)]
        if len(filtered) == 1:
            return filtered[0]["id"]

    return None  # ambiguous or not found


def get_or_create_wrestler(
    abbrev_name: str,
    school_id:   int,
    weight:      int,
    client:      Client,
    dry_run:     bool,
    new_cache:   dict,
) -> Optional[str]:
    """Match existing wrestler or queue/create a new stub record."""
    wid = match_wrestler(abbrev_name, school_id, weight, client)
    if wid:
        return wid

    # Check the new-wrestler cache (in case we already created them earlier)
    cache_key = (abbrev_name, school_id)
    if cache_key in new_cache:
        return new_cache[cache_key]

    first_init, last_name = _parse_abbreviated_name(abbrev_name)
    last_name = last_name.rstrip("….").strip().title()  # "connors" → "Connors"
    first_name = first_init  # abbreviated: "C." or "T."

    if dry_run:
        new_cache[cache_key] = None  # placeholder in dry run
        return None

    rec = {"first_name": first_name, "last_name": last_name, "gender": "M"}
    res = client.from_("wrestlers").insert(rec).execute()
    wid = (res.data or [{}])[0].get("id")
    if wid:
        new_cache[cache_key] = wid
    return wid


# ── Tournament helpers ─────────────────────────────────────────────────────────

def get_tournament_id(client: Client) -> Optional[str]:
    res = client.from_("in_season_tournaments") \
        .select("id") \
        .eq("name", TOURNAMENT) \
        .eq("season", SEASON) \
        .execute()
    if res.data:
        return res.data[0]["id"]
    return None


def has_existing_bouts(tid: str, client: Client) -> bool:
    res = client.from_("tournament_bouts") \
        .select("id", count="exact") \
        .eq("in_season_tournament_id", tid) \
        .execute()
    return (res.count or 0) > 0


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    ap = argparse.ArgumentParser(description="Import Sam Cali bracket PDFs into MatWhizzer.")
    ap.add_argument("pdf_dir", help="Directory containing 106.pdf … 285.pdf")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    pdf_dir = Path(args.pdf_dir)
    if not pdf_dir.is_dir():
        print(f"ERROR: {pdf_dir} is not a directory")
        sys.exit(1)

    project_root = Path(_SCRIPT_DIR).parent
    for env_file in [".env.local", ".env"]:
        candidate = project_root / env_file
        if candidate.exists():
            load_dotenv(str(candidate), override=False)

    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        print("ERROR: Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local")
        sys.exit(1)

    client: Client = create_client(url, key)

    # ── Verify tournament row exists ───────────────────────────────────────────
    tid = get_tournament_id(client)
    if not tid:
        print(f"ERROR: tournament '{TOURNAMENT}' (season={SEASON}) not found in DB.")
        print("       Run import_pipe_csv.py first to create the tournament row.")
        sys.exit(1)
    print(f"Tournament: {TOURNAMENT}  ({tid[:8]}…)")

    # ── Duplicate check ────────────────────────────────────────────────────────
    if has_existing_bouts(tid, client):
        print("WARNING: Sam Cali already has bouts in the DB.")
        print("         Re-running will create duplicates.  Aborting.")
        sys.exit(1)
    print("Duplicate check: 0 existing bouts — safe to import.\n")

    # ── Parse PDFs ────────────────────────────────────────────────────────────
    sep = "─" * 72

    all_matches: list[dict] = []
    unknown_teams: dict[str, int] = {}  # abbrev → count of wrestlers seen

    print(sep)
    print("  PDF PARSING")
    print(sep)

    for weight in WEIGHT_CLASSES:
        pdf = pdf_dir / f"{weight}.pdf"
        if not pdf.exists():
            print(f"  {weight:3d}lb  MISSING: {pdf}")
            continue
        matches = parse_pdf(pdf, weight)
        for m in matches:
            all_matches.append(m)
            for w in m["wrestlers"]:
                t = w["team"]
                if t not in _TEAM_TO_SCHOOL:
                    unknown_teams[t] = unknown_teams.get(t, 0) + 1
        print(f"  {weight:3d}lb  {len(matches):3d} matches parsed")

    print(f"\n  Total matches: {len(all_matches)}")

    if unknown_teams:
        print(f"\n  Unknown team abbreviations ({len(unknown_teams)}):")
        for t, cnt in sorted(unknown_teams.items(), key=lambda x: -x[1]):
            print(f"    {t!r:12s}  ({cnt} wrestlers)")

    # ── Build bout records ─────────────────────────────────────────────────────
    print()
    print(sep)
    print("  WRESTLER RESOLUTION")
    print(sep)

    new_wrestler_cache: dict[tuple, Optional[str]] = {}

    bouts: list[dict] = []
    review_items: list[str] = []

    for match in all_matches:
        ws = match["wrestlers"]
        w1, w2 = ws[0], ws[1]

        # Determine winner (higher score)
        if w1["score"] > w2["score"]:
            winner_idx, loser_idx = 0, 1
        elif w2["score"] > w1["score"]:
            winner_idx, loser_idx = 1, 0
        else:
            # Tied score: valid for falls where both wrestlers score equally before the pin.
            # Use seed as tiebreaker — lower seed = better seeded = more likely winner.
            s1, s2 = ws[0].get("seed"), ws[1].get("seed")
            rt_tmp, _, _ = _parse_method(match["method_raw"])
            if rt_tmp in ("Fall", "MD", "Dec", "TF") and s1 and s2 and s1 != s2:
                if s1 < s2:
                    winner_idx, loser_idx = 0, 1
                else:
                    winner_idx, loser_idx = 1, 0
            else:
                review_items.append(
                    f"  TIE SCORE  {match['weight']}lb {match['round']}  "
                    f"#{match['match']}  {w1['name']} vs {w2['name']}  "
                    f"({w1['score']}-{w2['score']} {match['method_raw']})"
                )
                continue

        winner = ws[winner_idx]
        loser  = ws[loser_idx]

        sid_w = resolve_school(winner["team"])
        sid_l = resolve_school(loser["team"])

        # Resolve wrestlers
        wid_winner = wid_loser = None
        if sid_w is not None:
            wid_winner = get_or_create_wrestler(
                winner["name"], sid_w, match["weight"], client,
                args.dry_run, new_wrestler_cache,
            )
        if sid_l is not None:
            wid_loser = get_or_create_wrestler(
                loser["name"], sid_l, match["weight"], client,
                args.dry_run, new_wrestler_cache,
            )

        rt, rd, secs = _parse_method(match["method_raw"])

        bouts.append({
            "weight_class":         match["weight"],
            "round":                match["round"],
            "nj_wrestler1_id":      wid_winner,
            "wrestler1_name_raw":   winner["name"],
            "wrestler1_school_id":  sid_w,
            "wrestler1_school_raw": winner["team"],
            "nj_wrestler2_id":      wid_loser,
            "wrestler2_name_raw":   loser["name"],
            "wrestler2_school_id":  sid_l,
            "wrestler2_school_raw": loser["team"],
            "winner":               1,
            "result_type":          rt,
            "result_detail":        rd,
            "fall_time_seconds":    secs,
            "source_format":        SOURCE_FORMAT,
        })

    # ── Summary ────────────────────────────────────────────────────────────────
    matched    = sum(1 for b in bouts if b["nj_wrestler1_id"] is not None)
    unmatched1 = sum(1 for b in bouts if b["nj_wrestler1_id"] is None and b["wrestler1_school_id"] is not None)
    new_w      = sum(1 for v in new_wrestler_cache.values() if v is None)  # dry-run placeholder

    print(f"\n  Bouts to insert:              {len(bouts)}")
    print(f"  Winner matched to DB:         {matched}")
    print(f"  Winner unmatched (new stub):  {unmatched1}")

    if review_items:
        print()
        print(sep)
        print("  REVIEW ITEMS:")
        for item in review_items:
            print(item)

    # ── Per-weight-class breakdown ─────────────────────────────────────────────
    print()
    print(sep)
    print("  BOUTS BY WEIGHT CLASS")
    print(sep)
    from collections import Counter
    wt_counts: Counter = Counter()
    for b in bouts:
        wt_counts[b["weight_class"]] += 1
    for wt in WEIGHT_CLASSES:
        n = wt_counts.get(wt, 0)
        print(f"  {wt:3d}lb  {n:3d} bouts")

    # ── Sample of unresolved winners ───────────────────────────────────────────
    unresolved = [
        b for b in bouts
        if b["nj_wrestler1_id"] is None and b["wrestler1_school_id"] is not None
    ]
    if unresolved:
        print()
        print(sep)
        print(f"  UNRESOLVED NJ WINNERS (will create stub wrestlers, first 30):")
        for b in unresolved[:30]:
            print(f"    {b['weight_class']:3d}lb {b['round']:10s}  "
                  f"{b['wrestler1_name_raw']!r:22s}  ({b['wrestler1_school_raw']})")

    if args.dry_run:
        print()
        print(sep)
        print("  DRY RUN — no changes written.")
        print(f"  Re-run without --dry-run to:")
        print(f"    • Create stub wrestler records for {len(unresolved)} unmatched NJ winners")
        print(f"    • Insert {len(bouts)} tournament bouts (source_format='pdf')")
        print(sep)
        return

    # ── Live: create stub wrestlers then insert bouts ──────────────────────────
    print()
    print("Starting live import …")

    print(f"\nStep 1 — Creating stub wrestlers …")
    new_created = 0
    for (aname, sid), wid in list(new_wrestler_cache.items()):
        if wid is not None:
            continue  # already in cache from a previous round in dry run (shouldn't reach here)
        first_init, last_name = _parse_abbreviated_name(aname)
        last_name = last_name.rstrip("….").strip().title()
        rec = {"first_name": first_init, "last_name": last_name, "gender": "M"}
        res = client.from_("wrestlers").insert(rec).execute()
        new_wid = (res.data or [{}])[0].get("id")
        if new_wid:
            new_wrestler_cache[(aname, sid)] = new_wid
            new_created += 1

    # Back-fill wrestler IDs into bout rows
    for bout in bouts:
        for side in ("1", "2"):
            if bout[f"nj_wrestler{side}_id"] is None:
                sid = bout[f"wrestler{side}_school_id"]
                raw = bout[f"wrestler{side}_name_raw"]
                if sid is not None:
                    bout[f"nj_wrestler{side}_id"] = new_wrestler_cache.get((raw, sid))

    print(f"  Created {new_created} stub wrestlers.")

    print(f"\nStep 2 — Inserting {len(bouts)} bouts …")
    for bout in bouts:
        bout["in_season_tournament_id"] = tid

    CHUNK = 500
    total_inserted = 0
    errors: list[str] = []
    for i in range(0, len(bouts), CHUNK):
        try:
            res = client.from_("tournament_bouts").insert(bouts[i:i + CHUNK]).execute()
            total_inserted += len(res.data or [])
        except Exception as e:
            errors.append(str(e))

    print()
    print(sep)
    print("  IMPORT COMPLETE")
    print(sep)
    print(f"  Bouts inserted:           {total_inserted}")
    print(f"  Stub wrestlers created:   {new_created}")
    if errors:
        print(f"  ERRORS ({len(errors)}):")
        for e in errors:
            print(f"    • {e}")
    else:
        print("  Errors:                   0")
    print(sep)


if __name__ == "__main__":
    main()
