#!/usr/bin/env python3
"""
scripts/import_dual_meets.py

Batch-imports dual meet results from an RTF/text file directly into Supabase,
replicating the admin-UI pipeline (src/app/api/admin/import-meets/route.ts).

Usage:
  python scripts/import_dual_meets.py [--dry-run] [--season-id N] <rtf_file>

Options:
  --dry-run       Print stats and low-confidence matches; make no DB writes.
  --season-id N   Season ID to use (default: 2).
"""

from __future__ import annotations

import argparse
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
    print("ERROR: supabase-py not installed.  Run: pip install supabase python-dotenv")
    sys.exit(1)

# Pull shared helpers from the sibling script rather than duplicating them.
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _SCRIPT_DIR)
from import_tournament import (  # noqa: E402
    _extract_text,
    SchoolMatcher,
    WrestlerMatcher,
)


# ── Constants ──────────────────────────────────────────────────────────────────

SEASON_ID = 2
WEIGHT_LIST = {106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285}
_WEIGHT_ALT = "|".join(str(w) for w in sorted(WEIGHT_LIST))
SUFFIXES = {"jr", "sr", "ii", "iii", "iv", "v"}

# Schools involved in the 12/20 round-robin block that may be a tournament-style event.
# Known raw-name typos/variants in the source file that won't trigram-match well.
# Applied before SchoolMatcher so the corrected name hits exact-match instead of fuzzy.
_SCHOOL_NAME_CORRECTIONS: dict[str, str] = {
    "VManville Hs": "Manville",
}

_ROUND_ROBIN_SCHOOLS: set[str] = {
    "brick township",
    "cherry hill east",
    "sterling",
    "sterling regional",
    "clayton",
    "glassboro",
    "clayton/glassboro",
    "cumberland regional",
    "penns grove",
}


# ── Data classes ───────────────────────────────────────────────────────────────

@dataclass
class ParsedMatch:
    weight_class: int
    winner_name: Optional[str]
    winner_school_raw: Optional[str]
    loser_name: Optional[str]
    loser_school_raw: Optional[str]
    result_type: str
    result_detail: Optional[str]
    team1_points: int
    team2_points: int
    is_double_forfeit: bool
    is_forfeit_win: bool


@dataclass
class ParsedMeet:
    raw_text: str
    date: str           # 'MM/DD/YYYY'
    team1_name: str
    team2_name: str
    team1_score: int
    team2_score: int
    matches: list[ParsedMatch] = field(default_factory=list)
    is_duplicate: bool = False


# ── RTF / text parsing (port of parseDualMeet.ts) ─────────────────────────────

def _split_into_chunks(text: str) -> list[str]:
    """Split raw text into one chunk per meet using header line positions."""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    header_re = re.compile(r".+?\s+vs\.\s+.+?\s+\(\d{2}/\d{2}/\d{4}\)")
    positions: list[int] = []
    for m in header_re.finditer(text):
        line_start = text.rfind("\n", 0, m.start())
        positions.append(0 if line_start < 0 else line_start + 1)
    if not positions:
        return [text]
    unique = sorted(set(positions))
    chunks = []
    for idx, pos in enumerate(unique):
        end = unique[idx + 1] if idx + 1 < len(unique) else len(text)
        chunks.append(text[pos:end].strip())
    return chunks


def _parse_header(chunk: str) -> Optional[dict]:
    m = re.match(r"^(.+?)\s+vs\.\s+(.+?)\s+\((\d{2}/\d{2}/\d{4})\)", chunk)
    if not m:
        return None
    return {"team1": m.group(1).strip(), "team2": m.group(2).strip(), "date": m.group(3)}


def _parse_team_score(chunk: str) -> Optional[dict]:
    m = re.search(r"Team\s+Score:\s+(\d+)\s+(\d+)", chunk, re.IGNORECASE)
    if not m:
        return None
    return {"t1": int(m.group(1)), "t2": int(m.group(2))}


def _parse_result(s: str) -> tuple[str, Optional[str]]:
    s = s.strip()
    if re.match(r"^fall", s, re.IGNORECASE):
        detail = re.sub(r"^fall\s*", "", s, flags=re.IGNORECASE).strip() or None
        return ("Fall", detail)
    if re.match(r"^md", s, re.IGNORECASE):
        detail = re.sub(r"^md\s*", "", s, flags=re.IGNORECASE).strip() or None
        return ("MD", detail)
    if re.match(r"^tf", s, re.IGNORECASE):
        detail = re.sub(r"^tf\s*", "", s, flags=re.IGNORECASE).strip() or None
        return ("TF", detail)
    if re.match(r"^sv-1", s, re.IGNORECASE):
        detail = re.sub(r"^sv-1\s*", "", s, flags=re.IGNORECASE).strip() or None
        return ("SV-1", detail)
    if re.match(r"^utb", s, re.IGNORECASE):
        detail = re.sub(r"^utb\s*", "", s, flags=re.IGNORECASE).strip() or None
        return ("UTB", detail)
    if re.match(r"^mffl", s, re.IGNORECASE):
        return ("MFFL", None)
    if re.match(r"^dec", s, re.IGNORECASE):
        detail = re.sub(r"^dec\s*", "", s, flags=re.IGNORECASE).strip() or None
        return ("Dec", detail)
    if re.match(r"^for", s, re.IGNORECASE):
        return ("For", None)
    if re.match(r"^double\s*forfeit", s, re.IGNORECASE):
        return ("Double Forfeit", None)
    return (s, None)


_SPLIT_RESULT_RE = re.compile(r"^(sv-?1|utb|mffl)", re.IGNORECASE)


def _parse_match_summary(summary: str, t1_pts: int, t2_pts: int, weight: int) -> ParsedMatch:
    s = summary.replace(" ", " ").strip()

    if re.match(r"^double\s+forfeit", s, re.IGNORECASE):
        return ParsedMatch(
            weight_class=weight,
            winner_name=None, winner_school_raw=None,
            loser_name=None,  loser_school_raw=None,
            result_type="Double Forfeit", result_detail=None,
            team1_points=t1_pts, team2_points=t2_pts,
            is_double_forfeit=True, is_forfeit_win=False,
        )

    over_idx = s.find(" over ")
    if over_idx == -1:
        return ParsedMatch(
            weight_class=weight,
            winner_name=s, winner_school_raw=None,
            loser_name=None, loser_school_raw=None,
            result_type="Unknown", result_detail=None,
            team1_points=t1_pts, team2_points=t2_pts,
            is_double_forfeit=False, is_forfeit_win=False,
        )

    winner_part = s[:over_idx].strip()
    after_over  = s[over_idx + 6:].strip()

    winner_m = re.match(r"^(.+?)\s+\(([^)]+)\)$", winner_part)
    winner_name      = winner_m.group(1).strip() if winner_m else winner_part
    winner_school_raw = winner_m.group(2).strip() if winner_m else None

    if re.match(r"^unknown\s+\(for\.\)$", after_over, re.IGNORECASE):
        return ParsedMatch(
            weight_class=weight,
            winner_name=winner_name, winner_school_raw=winner_school_raw,
            loser_name=None, loser_school_raw=None,
            result_type="For", result_detail=None,
            team1_points=t1_pts, team2_points=t2_pts,
            is_double_forfeit=False, is_forfeit_win=True,
        )

    # Two-group format: "Loser (School) (SV-1) (4-1)"
    two_group_m = re.match(r"^(.+?)\s+\(([^)]+)\)\s+\(([^)]+)\)\s*$", after_over)
    if two_group_m and _SPLIT_RESULT_RE.match(two_group_m.group(2)):
        loser_and_school = two_group_m.group(1).strip()
        result_str       = f"{two_group_m.group(2)} {two_group_m.group(3)}"
    else:
        last_open  = after_over.rfind("(")
        last_close = after_over.rfind(")")
        if last_open == -1 or last_close == -1 or last_close < last_open:
            return ParsedMatch(
                weight_class=weight,
                winner_name=winner_name, winner_school_raw=winner_school_raw,
                loser_name=after_over or None, loser_school_raw=None,
                result_type="Unknown", result_detail=None,
                team1_points=t1_pts, team2_points=t2_pts,
                is_double_forfeit=False, is_forfeit_win=False,
            )
        result_str       = after_over[last_open + 1:last_close]
        loser_and_school = after_over[:last_open].strip()

    result_type, result_detail = _parse_result(result_str)
    loser_m      = re.match(r"^(.+?)\s+\(([^)]+)\)$", loser_and_school)
    loser_name      = loser_m.group(1).strip() if loser_m else (loser_and_school or None)
    loser_school_raw = loser_m.group(2).strip() if loser_m else None

    return ParsedMatch(
        weight_class=weight,
        winner_name=winner_name, winner_school_raw=winner_school_raw,
        loser_name=loser_name,   loser_school_raw=loser_school_raw,
        result_type=result_type, result_detail=result_detail,
        team1_points=t1_pts, team2_points=t2_pts,
        is_double_forfeit=False, is_forfeit_win=False,
    )


def _is_format_a(chunk: str) -> bool:
    re_a = re.compile(rf"^[^\S\n]*({_WEIGHT_ALT})[^\S\n]+\S", re.MULTILINE)
    return bool(re_a.search(chunk))


def _is_format_c(chunk: str) -> bool:
    re_c = re.compile(rf"^({_WEIGHT_ALT})$", re.MULTILINE)
    return bool(re_c.search(chunk))


def _parse_format_a(chunk: str) -> list[ParsedMatch]:
    weight_re = re.compile(rf"^({_WEIGHT_ALT})\s+")
    matches = []
    for line in chunk.split("\n"):
        t = line.strip()
        wm = weight_re.match(t)
        if not wm:
            continue
        weight = int(wm.group(1))
        rest   = t[wm.end():]
        trail  = re.search(r"\s+(\d+)\s+(\d+)\s*$", rest)
        if not trail:
            continue
        summary = rest[:trail.start()].strip()
        matches.append(_parse_match_summary(summary, int(trail.group(1)), int(trail.group(2)), weight))
    return matches


def _parse_format_b(chunk: str) -> list[ParsedMatch]:
    bullet_idx = chunk.find("•")
    body_raw = chunk[bullet_idx + 1:] if bullet_idx >= 0 else chunk
    score_idx = re.search(r"Team\s+Score:", body_raw, re.IGNORECASE)
    body = body_raw[:score_idx.start()] if score_idx else body_raw
    entry_re = re.compile(
        rf"({_WEIGHT_ALT})"
        r"((?:Double\s*Forfeit|.+?\([^)]+\)))"
        r"\s*([0-6])\s*([0-6])",
        re.DOTALL,
    )
    matches = []
    for m in entry_re.finditer(body):
        matches.append(_parse_match_summary(
            m.group(2).strip(), int(m.group(3)), int(m.group(4)), int(m.group(1))
        ))
    return matches


def _parse_format_c(chunk: str) -> list[ParsedMatch]:
    lines = [l.strip() for l in chunk.split("\n")]
    matches = []
    i = 0
    while i < len(lines):
        if not lines[i]:
            i += 1
            continue
        try:
            weight = int(lines[i])
        except ValueError:
            i += 1
            continue
        if weight not in WEIGHT_LIST:
            i += 1
            continue
        summary = lines[i + 1] if i + 1 < len(lines) else ""
        t1_str  = lines[i + 2] if i + 2 < len(lines) else ""
        t2_str  = lines[i + 3] if i + 3 < len(lines) else ""
        try:
            t1, t2 = int(t1_str), int(t2_str)
        except ValueError:
            i += 1
            continue
        if not summary:
            i += 1
            continue
        matches.append(_parse_match_summary(summary, t1, t2, weight))
        i += 4
    return matches


def parse_dual_meet_text(raw: str) -> list[ParsedMeet]:
    """Port of parseDualMeetText() from parseDualMeet.ts."""
    chunks = _split_into_chunks(raw)
    seen: dict[str, bool] = {}
    results = []

    for chunk in chunks:
        if not chunk.strip():
            continue
        header = _parse_header(chunk)
        if not header:
            continue
        score = _parse_team_score(chunk)
        if _is_format_a(chunk):
            matches = _parse_format_a(chunk)
        elif _is_format_c(chunk):
            matches = _parse_format_c(chunk)
        else:
            matches = _parse_format_b(chunk)

        key = f"{header['team1']}|{header['team2']}|{header['date']}"
        is_dup = key in seen
        seen[key] = True

        results.append(ParsedMeet(
            raw_text=chunk,
            date=header["date"],
            team1_name=header["team1"],
            team2_name=header["team2"],
            team1_score=score["t1"] if score else 0,
            team2_score=score["t2"] if score else 0,
            matches=matches,
            is_duplicate=is_dup,
        ))
    return results


# ── DB helpers ─────────────────────────────────────────────────────────────────

def _to_iso_date(d: str) -> str:
    """'MM/DD/YYYY' → 'YYYY-MM-DD'"""
    mm, dd, yyyy = d.split("/")
    return f"{yyyy}-{mm}-{dd}"


def _parse_fall_time(detail: Optional[str]) -> Optional[int]:
    if not detail:
        return None
    m = re.match(r"^(\d+):(\d{2})$", detail)
    if not m:
        return None
    return int(m.group(1)) * 60 + int(m.group(2))


def _parse_name(raw: str) -> dict:
    parts = raw.strip().split()
    if len(parts) <= 1:
        return {"first_name": raw.strip(), "last_name": "", "suffix": None}
    suffix = None
    last_idx = len(parts) - 1
    last_norm = parts[last_idx].lower().rstrip(".")
    if last_norm in SUFFIXES:
        suffix = parts[last_idx]
        last_idx -= 1
        if last_idx == 0:
            return {"first_name": parts[0], "last_name": "", "suffix": suffix}
    return {
        "first_name": " ".join(parts[:last_idx]),
        "last_name":  parts[last_idx],
        "suffix":     suffix,
    }


def _meet_exists(client: Client, school1_id: Optional[int], school2_id: Optional[int], iso_date: str) -> bool:
    """Check DB for an existing dual_meets row with these two schools on this date (either order)."""
    if school1_id is None or school2_id is None:
        return False
    r1 = client.from_("dual_meets") \
        .select("id") \
        .eq("team1_school_id", school1_id) \
        .eq("team2_school_id", school2_id) \
        .eq("meet_date", iso_date) \
        .limit(1).execute()
    if r1.data:
        return True
    r2 = client.from_("dual_meets") \
        .select("id") \
        .eq("team1_school_id", school2_id) \
        .eq("team2_school_id", school1_id) \
        .eq("meet_date", iso_date) \
        .limit(1).execute()
    return bool(r2.data)


def _is_round_robin_meet(meet: ParsedMeet) -> bool:
    """True if both teams in this meet are part of the 12/20 round-robin block."""
    return (
        meet.team1_name.lower() in _ROUND_ROBIN_SCHOOLS
        and meet.team2_name.lower() in _ROUND_ROBIN_SCHOOLS
    )


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    ap = argparse.ArgumentParser(description="Import dual meet results into MatWhizzer.")
    ap.add_argument("file", help="Path to RTF or plain-text dual meet file")
    ap.add_argument("--dry-run", action="store_true", help="Print plan without writing to DB")
    ap.add_argument("--season-id", type=int, default=SEASON_ID, dest="season_id",
                    help=f"Supabase season_id (default: {SEASON_ID})")
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
        print("ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local")
        sys.exit(1)

    print(f"Extracting text from {args.file!r} …")
    raw_text = _extract_text(args.file)

    print("Parsing dual meets …")
    all_meets = parse_dual_meet_text(raw_text)
    print(f"  Found {len(all_meets)} meet chunks ({sum(1 for m in all_meets if m.is_duplicate)} text-duplicates)")

    # ── School matching ──────────────────────────────────────────────────────────
    print("Loading schools from DB …")
    client: Client = create_client(url, key)
    school_matcher  = SchoolMatcher(client)
    wrestler_matcher = WrestlerMatcher(client)
    school_matcher._load()

    # Cache school matches so we don't hit the matcher twice for the same raw name
    school_cache: dict[str, dict] = {}

    def match_school(raw: str) -> dict:
        if raw not in school_cache:
            normalized = _SCHOOL_NAME_CORRECTIONS.get(raw, raw)
            school_cache[raw] = school_matcher.match(normalized)
        return school_cache[raw]

    # ── Per-meet analysis ────────────────────────────────────────────────────────
    # Populate results and collect all wrestler names that need matching.
    # Key: (winner_name, winner_school_id, weight_class) and similar for losers.
    wrestler_lookup: dict[tuple, dict] = {}  # key → WrestlerMatcher result

    unmatched_school_meets: list[ParsedMeet] = []
    low_conf_school_meets:  list[tuple[ParsedMeet, str, str]] = []  # (meet, raw, confidence)
    low_conf_wrestlers:     list[tuple[ParsedMeet, str, str, Optional[int], int]] = []

    for meet in all_meets:
        s1 = match_school(meet.team1_name)
        s2 = match_school(meet.team2_name)

        if s1["school_id"] is None and s2["school_id"] is None:
            unmatched_school_meets.append(meet)
        for sm, raw in [(s1, meet.team1_name), (s2, meet.team2_name)]:
            if sm["confidence"] == "low":
                low_conf_school_meets.append((meet, raw, sm.get("display_name", "?")))

        for match in meet.matches:
            if match.is_double_forfeit:
                continue
            candidates = [(match.winner_name, match.winner_school_raw)]
            if not match.is_forfeit_win:
                candidates.append((match.loser_name, match.loser_school_raw))
            for name, school_raw in candidates:
                if not name or not school_raw:
                    continue
                sm = match_school(school_raw)
                if sm["school_id"] is None:
                    continue
                wkey = (name, sm["school_id"], match.weight_class)
                if wkey not in wrestler_lookup:
                    wrestler_lookup[wkey] = wrestler_matcher.match(name, sm["school_id"], match.weight_class)
                wm = wrestler_lookup[wkey]
                if wm["confidence"] in ("none", "low"):
                    low_conf_wrestlers.append((meet, name, school_raw, sm["school_id"], match.weight_class))

    # ── Stats ────────────────────────────────────────────────────────────────────
    total_meets    = len(all_meets)
    dup_meets      = sum(1 for m in all_meets if m.is_duplicate)
    unique_meets   = total_meets - dup_meets
    total_matches  = sum(len(m.matches) for m in all_meets)

    school_raw_names = set()
    for meet in all_meets:
        school_raw_names.add(meet.team1_name)
        school_raw_names.add(meet.team2_name)
        for match in meet.matches:
            if match.winner_school_raw: school_raw_names.add(match.winner_school_raw)
            if match.loser_school_raw:  school_raw_names.add(match.loser_school_raw)

    matched_schools   = sum(1 for r in (match_school(n) for n in school_raw_names) if r["school_id"] is not None)
    school_match_rate = matched_schools / len(school_raw_names) if school_raw_names else 0

    wrestler_total   = len(wrestler_lookup)
    wrestler_matched = sum(1 for v in wrestler_lookup.values() if v["wrestler_id"] is not None)
    wrestler_new     = sum(1 for v in wrestler_lookup.values() if v.get("is_new"))
    wrestler_rate    = wrestler_matched / wrestler_total if wrestler_total else 0

    round_robin_meets = [m for m in all_meets if _is_round_robin_meet(m)]

    print()
    print("=" * 72)
    print(f"  DUAL MEET FILE SUMMARY")
    print("=" * 72)
    print(f"  Total meet chunks:        {total_meets}")
    print(f"  Text-duplicate chunks:    {dup_meets}")
    print(f"  Unique meets to import:   {unique_meets}")
    print(f"  Total match rows:         {total_matches}")
    print(f"  Unmatched-school meets:   {len(unmatched_school_meets)}")
    print(f"  Low-confidence schools:   {len(low_conf_school_meets)}")
    print(f"  School match rate:        {school_match_rate:.1%} ({matched_schools}/{len(school_raw_names)} raw names)")
    print(f"  Wrestler total:           {wrestler_total}")
    print(f"  Wrestler matched:         {wrestler_matched}")
    print(f"  Wrestler new (to create): {wrestler_new}")
    print(f"  Wrestler match rate:      {wrestler_rate:.1%}")
    print(f"  Round-robin block meets:  {len(round_robin_meets)}")
    print("=" * 72)

    if round_robin_meets:
        print()
        print("  ⚑  12/20 ROUND-ROBIN BLOCK (import but flag for review)")
        print("  Both teams are in: Brick Township, Cherry Hill East, Sterling,")
        print("  Clayton/Glassboro, Cumberland Regional, Penns Grove")
        print()
        for m in round_robin_meets:
            score = f"{m.team1_score}–{m.team2_score}"
            print(f"    {m.date}  {m.team1_name} vs. {m.team2_name}  ({score}, {len(m.matches)} matches)")

    if low_conf_school_meets:
        print()
        print("  LOW-CONFIDENCE SCHOOL MATCHES")
        seen_low: set[str] = set()
        for meet, raw, display in low_conf_school_meets:
            if raw not in seen_low:
                print(f"    {raw!r}  →  {display!r}")
                seen_low.add(raw)

    if low_conf_wrestlers:
        print()
        print("  LOW-CONFIDENCE / UNMATCHED WRESTLERS (first 30)")
        seen_lw: set[tuple] = set()
        count = 0
        for meet, name, school_raw, school_id, wt in low_conf_wrestlers:
            k = (name, school_raw)
            if k in seen_lw or count >= 30:
                continue
            seen_lw.add(k)
            wm = wrestler_lookup.get((name, school_id, wt), {})
            conf     = wm.get("confidence", "none")
            best_alt = wm.get("display_name") or "—"
            print(f"    [{conf:4s}]  {name!r} ({school_raw})  wt={wt}  best={best_alt!r}")
            count += 1

    if args.dry_run:
        print()
        print("  DRY RUN — no changes written to DB.")
        return

    # ── Live import ──────────────────────────────────────────────────────────────
    print()
    print("Starting live import …")

    # Step 1: Create new wrestler records
    new_wrestler_meta: dict[str, dict] = {}  # "first|last|M" → {first_name, last_name, gender}
    new_key_to_meta:   dict[tuple, str] = {} # (name, school_id, weight) → dedup key

    for wkey, wm in wrestler_lookup.items():
        if wm.get("is_new") and wm["wrestler_id"] is None:
            name = wkey[0]
            parsed = _parse_name(name)
            dedup_key = f"{parsed['first_name']}|{parsed['last_name']}|M"
            new_wrestler_meta[dedup_key] = {**parsed, "gender": "M"}
            new_key_to_meta[wkey] = dedup_key

    wrestler_id_map: dict[tuple, str] = {}  # (name, school_id, weight) → uuid

    # Pre-fill already-matched wrestlers
    for wkey, wm in wrestler_lookup.items():
        if wm["wrestler_id"]:
            wrestler_id_map[wkey] = wm["wrestler_id"]

    if new_wrestler_meta:
        first_names = list({v["first_name"] for v in new_wrestler_meta.values()})
        existing_res = client.from_("wrestlers") \
            .select("id, first_name, last_name, gender") \
            .in_("first_name", first_names) \
            .execute()
        existing_map: dict[str, str] = {}
        for w in (existing_res.data or []):
            existing_map[f"{w['first_name']}|{w['last_name']}|{w['gender']}"] = w["id"]

        truly_new = [v for k, v in new_wrestler_meta.items() if k not in existing_map]
        created_count = 0
        if truly_new:
            CHUNK = 200
            for i in range(0, len(truly_new), CHUNK):
                res = client.from_("wrestlers").insert(truly_new[i:i+CHUNK]).execute()
                for w in (res.data or []):
                    existing_map[f"{w['first_name']}|{w['last_name']}|{w['gender']}"] = w["id"]
                    created_count += 1

        # Map wrestler keys back to UUIDs
        for wkey, dedup_key in new_key_to_meta.items():
            wid = existing_map.get(dedup_key)
            if wid:
                wrestler_id_map[wkey] = wid

        print(f"  Created {created_count} new wrestler records.")

    # Step 2: Import meets
    meets_imported   = 0
    meets_skipped_dup = 0
    matches_imported = 0
    errors: list[str] = []

    for meet in all_meets:
        if meet.is_duplicate:
            meets_skipped_dup += 1
            continue

        s1 = match_school(meet.team1_name)
        s2 = match_school(meet.team2_name)
        team1_school_id: Optional[int] = s1["school_id"]
        team2_school_id: Optional[int] = s2["school_id"]
        iso_date = _to_iso_date(meet.date)

        # DB-level duplicate check
        if _meet_exists(client, team1_school_id, team2_school_id, iso_date):
            meets_skipped_dup += 1
            print(f"  SKIP (already in DB): {meet.team1_name} vs. {meet.team2_name} {meet.date}")
            continue

        is_rr = _is_round_robin_meet(meet)
        rr_tag = " [ROUND-ROBIN]" if is_rr else ""

        # Insert dual_meets row
        meet_res = client.from_("dual_meets").insert({
            "season_id":       args.season_id,
            "team1_school_id": team1_school_id,
            "team2_school_id": team2_school_id,
            "meet_date":       iso_date,
            "team1_score":     meet.team1_score or None,
            "team2_score":     meet.team2_score or None,
            "gender":          "M",
            "status":          "final",
        }).execute()

        if not meet_res.data:
            errors.append(f"Meet insert failed: {meet.team1_name} vs {meet.team2_name} {meet.date}")
            continue

        dual_meet_id = meet_res.data[0]["id"]
        meets_imported += 1

        # Build match rows
        match_rows = []
        for match in meet.matches:
            winner_school_id: Optional[int] = None
            loser_school_id:  Optional[int] = None
            if match.winner_school_raw:
                winner_school_id = match_school(match.winner_school_raw)["school_id"]
            if match.loser_school_raw:
                loser_school_id  = match_school(match.loser_school_raw)["school_id"]

            winner_wid: Optional[str] = None
            loser_wid:  Optional[str] = None

            if not match.is_double_forfeit and match.winner_name and winner_school_id:
                winner_wid = wrestler_id_map.get((match.winner_name, winner_school_id, match.weight_class))
            if not match.is_double_forfeit and not match.is_forfeit_win and match.loser_name and loser_school_id:
                loser_wid = wrestler_id_map.get((match.loser_name, loser_school_id, match.weight_class))

            winner_is_team1 = (team1_school_id is not None and winner_school_id == team1_school_id)

            if match.is_double_forfeit:
                wrestler_a_id = None
                wrestler_b_id = None
            elif match.is_forfeit_win:
                wrestler_a_id = winner_wid if winner_is_team1 else None
                wrestler_b_id = None if winner_is_team1 else winner_wid
            else:
                wrestler_a_id = winner_wid if winner_is_team1 else loser_wid
                wrestler_b_id = loser_wid  if winner_is_team1 else winner_wid

            fall_secs = _parse_fall_time(match.result_detail) if match.result_type == "Fall" else None

            match_rows.append({
                "dual_meet_id":      dual_meet_id,
                "weight_class":      match.weight_class,
                "wrestler_a_id":     wrestler_a_id,
                "wrestler_b_id":     wrestler_b_id,
                "school_a_id":       team1_school_id,
                "school_b_id":       team2_school_id,
                "winner_id":         winner_wid,
                "result_type":       match.result_type,
                "result_detail":     match.result_detail,
                "fall_time_seconds": fall_secs,
                "team1_points":      match.team1_points,
                "team2_points":      match.team2_points,
                "is_double_forfeit": match.is_double_forfeit,
                "is_forfeit_win":    match.is_forfeit_win,
                "validated":         False,
            })

        if match_rows:
            CHUNK = 500
            for i in range(0, len(match_rows), CHUNK):
                res = client.from_("dual_meet_matches").insert(match_rows[i:i+CHUNK]).execute()
                if not res.data and hasattr(res, "error") and res.error:
                    errors.append(f"Matches insert error ({meet.team1_name} vs {meet.team2_name}): {res.error}")
                else:
                    matches_imported += len(match_rows[i:i+CHUNK])

        print(f"  {'[RR]' if is_rr else '    '}  {meet.date}  {meet.team1_name} vs. {meet.team2_name}"
              f"  →  {len(match_rows)} matches  [{dual_meet_id[:8]}…]{rr_tag}")

    print()
    print("=" * 72)
    print(f"  IMPORT COMPLETE")
    print("=" * 72)
    print(f"  Meets imported:         {meets_imported}")
    print(f"  Meets skipped (dup):    {meets_skipped_dup}")
    print(f"  Matches imported:       {matches_imported}")
    if errors:
        print(f"  ERRORS ({len(errors)}):")
        for e in errors:
            print(f"    • {e}")
    else:
        print("  Errors:                 0")
    print("=" * 72)


if __name__ == "__main__":
    main()
