#!/usr/bin/env python3
"""
import_girls_tournaments.py

Parse and import girls tournament results from multi-event RTF files.

Handles all format variants found in girls tournament files:
  1. Bracket with W-L records + result in parens (Garfield, NH Lady Lions, Kingsway)
       "Champ. Round 1 - Name (School) 4-0 won by fall over Name (School) 0-1 (Fall 1:58)"
  2. Bracket without parens (Bloomfield, some bracket events)
       "Champ. Round 1 - Name (School) won by fall over Name (School) Fall 1:58"
  3. Simple no-round format with parens (Opening Jamboree 12/13)
       "Name (School) over Name (School) (Fall 1:58)"
  4. Round-robin jamboree without parens (Queen Bee, EB Opening Jamboree, New Year's)
       "Round 3 - Name (School) won by fall over Name (School) Fall 3:06"
  5. DFF in any format: "... Name (School) and Name (School) DFF"

Jamboree weight-class headers like "Jamboree 100A" and "Queen Bee 107B" are
auto-detected; weight is extracted numerically.

Usage:
  # Scan file — list all detected events without importing:
  python scripts/import_girls_tournaments.py --file results.rtf --scan-only

  # Dry-run all events in file:
  python scripts/import_girls_tournaments.py --file results.rtf --dry-run

  # Import one specific event by name filter:
  python scripts/import_girls_tournaments.py --file results.rtf --event "Queen Bee" --dry-run

  # Live import all events:
  python scripts/import_girls_tournaments.py --file results.rtf
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from collections import defaultdict
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

# Reuse shared utilities from the boys tournament importer
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _SCRIPT_DIR)
from import_tournament import (  # type: ignore[import]
    ParsedBout,
    ReviewItem,
    SchoolMatcher,
    WrestlerMatcher,
    _extract_text,
    _parse_result,
    _normalize_round,
    _find_last_top_level_paren,
    _find_last_top_level_keyword,
    _BYE_RE,
    _ROUND_PREFIX_RE,
    _WEIGHT_RE,
    _SKIP_EXACT,
    trigram_similarity,
)

# ── Girls-specific weight header ───────────────────────────────────────────────
# Matches "Jamboree 100", "Queen Bee 100A", "Jamboree 107b", "Jamboree 145-152"
_JAMBOREE_WEIGHT_RE = re.compile(
    r'^[A-Za-z][A-Za-z\s]+?\s+(\d{2,3})(?:-\d{2,3})?[A-Za-z]?\s*$'
)
# "100A", "107B" — pool letter directly after weight, no word prefix
_WEIGHT_POOL_RE = re.compile(r'^(\d{2,3})[A-Za-z]\s*$')

# Matches a bare date line "MM/DD/YYYY" or "MM/DD - MM/DD/YYYY" or "MM/DD/YY"
_DATE_LINE_RE = re.compile(r'^\d{1,2}/\d{1,2}(?:/\d{2,4})?(?:\s*[-–]\s*\d{1,2}/\d{1,2}(?:/\d{2,4})?)?$')

# "EventName - MM/DD/YYYY" (single date, inline)
_INLINE_DATE_RE = re.compile(r'(?:\s+[-–(]\s*)(\d{1,2}/\d{1,2}/\d{4})\s*[)]?\s*$')

# "EventName MM/DD - MM/DD/YYYY" (date range embedded at end of name line)
_INLINE_RANGE_DATE_RE = re.compile(
    r'^(.+?)\s+(\d{1,2}/\d{1,2}\s*[-–]\s*\d{1,2}/\d{1,2}/\d{2,4})\s*$'
)

_SKIP_CONTENT = {
    "round results", "weight", "summary", "stats", "tw event",
    "yes", "no", "finals", "3rd", "click here to get a direct link to this page.",
    "duals", "matches", "dashboard", "tie breaking", "teams", "divisions",
    "weights", "wrestlers", "team score:", "official: none",
}

# Lines that look like navigation/UI noise (no useful match data)
_NOISE_RE = re.compile(
    r'^(?:Teams\s+Divisions|Team:\s+team|winning team|Click here|'
    r'Ralph Wetzel|\d+\s+(?:st|nd|rd|th)\s+Wrestleback|'
    r'WB\s+Semi|Add\s+Semi|(?:\d+/\d+)\s+WB|'
    r'Round\s+\d+\s+Champ\s*&|Semis\s*&|Quarters\s*&|Cons\.\s+Quarters?|'
    r'Semis?\s+\(|Quarters?\s+\(|Placement\s+\(|2nd\s+Place|'
    r'5(?:th|/6)|6(?:th|/7)|7th|8th)',
    re.IGNORECASE,
)


# ── Wrestler extraction with tail ─────────────────────────────────────────────

def _extract_wrestler_with_tail(seg: str) -> tuple[str, str, str]:
    """Return (name, school, tail) from 'Name (School) [tail]'.

    Stops at the FIRST complete top-level paren group (the school name).
    tail is everything after the school's closing paren — may include
    a W-L record like "4-0" or a bare result like "Fall 1:58".
    """
    seg = seg.strip()
    if not seg:
        return ('', '', '')
    depth = 0
    paren_start = paren_end = -1
    for i, c in enumerate(seg):
        if c == '(':
            if depth == 0:
                paren_start = i
            depth += 1
        elif c == ')':
            depth -= 1
            if depth == 0 and paren_start >= 0:
                paren_end = i
                break
    if paren_start < 0 or paren_end < 0:
        return (seg, '', '')
    name = seg[:paren_start].strip()
    school = seg[paren_start + 1:paren_end]
    tail = seg[paren_end + 1:].strip()
    return (name, school, tail)


# ── Unified girls bout line parser ────────────────────────────────────────────

def _parse_girls_bout_line(
    line: str,
    current_weight: Optional[int],
) -> Optional[ParsedBout]:
    """Parse one line into a ParsedBout or return None to skip.

    Handles both paren-result and bare-result formats.
    """
    line = line.strip()
    if not line:
        return None
    lower = line.lower()
    if lower in _SKIP_CONTENT:
        return None
    if _NOISE_RE.match(line):
        return None
    if current_weight is None:
        return None

    # Skip bye lines
    if _BYE_RE.search(line):
        return None

    # Must have ' over ' or be a DFF
    has_over = _find_last_top_level_keyword(line, ' over ') >= 0
    # DFF: "Name (School) and Name (School) DFF" — last word is DFF
    is_dff = re.search(r'\bDFF\s*$', line, re.IGNORECASE) is not None

    if not has_over and not is_dff:
        return None

    # ── Extract round prefix ───────────────────────────────────────────────
    round_code = "UNK"
    bout_part = line
    pm = _ROUND_PREFIX_RE.match(line)
    if pm:
        round_code = _normalize_round(pm.group(1))
        bout_part = line[pm.end():]

    # ── DFF ────────────────────────────────────────────────────────────────
    if is_dff:
        body = re.sub(r'\s*\bDFF\s*$', '', bout_part, flags=re.IGNORECASE).strip()
        and_pos = _find_last_top_level_keyword(body, ' and ')
        if and_pos < 0:
            return None
        w1_name, w1_school, _ = _extract_wrestler_with_tail(body[:and_pos])
        w2_name, w2_school, _ = _extract_wrestler_with_tail(body[and_pos + 5:])
        if not w1_name or not w2_name:
            return None
        return ParsedBout(
            weight_class=current_weight, round_name=round_code,
            wrestler1_name=w1_name, wrestler1_school_raw=w1_school,
            wrestler2_name=w2_name, wrestler2_school_raw=w2_school,
            result_type="DFF", result_detail=None, fall_time_seconds=None, winner=None,
        )

    # ── Standard bout with ' over ' ───────────────────────────────────────
    stripped = bout_part.rstrip()

    if stripped.endswith(')'):
        # Paren-result format: extract result from last top-level paren
        lp_start, lp_end = _find_last_top_level_paren(stripped)
        if lp_start < 0:
            return None
        if stripped[lp_end + 1:].strip():
            return None  # unexpected trailing text
        result_raw = stripped[lp_start + 1:lp_end]
        if result_raw.strip().lower() in ('bye', ''):
            return None
        bout_core = stripped[:lp_start].strip()
        over_pos = _find_last_top_level_keyword(bout_core, ' over ')
        if over_pos < 0:
            return None
        w1_name, w1_school, _ = _extract_wrestler_with_tail(bout_core[:over_pos])
        w2_name, w2_school, _ = _extract_wrestler_with_tail(bout_core[over_pos + 6:])
    else:
        # Bare-result format: result is tail after loser's school paren
        over_pos = _find_last_top_level_keyword(stripped, ' over ')
        if over_pos < 0:
            return None
        w1_name, w1_school, _ = _extract_wrestler_with_tail(stripped[:over_pos])
        w2_name, w2_school, tail = _extract_wrestler_with_tail(stripped[over_pos + 6:])
        result_raw = tail.strip()
        if not result_raw:
            return None

    if not w1_name or not w2_name:
        return None
    if w1_name.lower() in ('unknown', 'medical forfeit') or w2_name.lower() in ('unknown', 'medical forfeit'):
        return None

    rt, rd, fall_secs, winner = _parse_result(result_raw)
    if rt is None:
        return None

    return ParsedBout(
        weight_class=current_weight, round_name=round_code,
        wrestler1_name=w1_name, wrestler1_school_raw=w1_school,
        wrestler2_name=w2_name, wrestler2_school_raw=w2_school,
        result_type=rt, result_detail=rd, fall_time_seconds=fall_secs, winner=winner,
    )


# ── Section-level parser ───────────────────────────────────────────────────────

def parse_girls_bouts(text: str) -> list[ParsedBout]:
    """Parse all bouts from a single event's text (already sliced to that event)."""
    all_bouts: list[ParsedBout] = []
    current_weight: Optional[int] = None

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        # Skip known noise / section headers that aren't bouts
        if line.lower() in _SKIP_CONTENT or _NOISE_RE.match(line):
            continue

        # Bare weight header: "100", "107", etc.
        wm = _WEIGHT_RE.match(line)
        if wm:
            w = int(wm.group(1))
            if 100 <= w <= 300:
                current_weight = w
            continue

        # Jamboree/pool weight header: "Jamboree 100A", "Queen Bee 107B", "Jamboree 145-152"
        jm = _JAMBOREE_WEIGHT_RE.match(line)
        if jm:
            w = int(jm.group(1))
            if 100 <= w <= 300:
                current_weight = w
            continue

        # Bare pool header: "100A", "107B", "100a", etc.
        pm2 = _WEIGHT_POOL_RE.match(line)
        if pm2:
            w = int(pm2.group(1))
            if 100 <= w <= 300:
                current_weight = w
            continue

        bout = _parse_girls_bout_line(line, current_weight)
        if bout:
            all_bouts.append(bout)

    # Deduplicate: same two wrestlers at same weight → keep named rounds over UNK
    groups: dict[tuple, list[ParsedBout]] = defaultdict(list)
    for b in all_bouts:
        key = (b.weight_class,
               tuple(sorted([b.wrestler1_name.lower(), b.wrestler2_name.lower()])))
        groups[key].append(b)

    bouts: list[ParsedBout] = []
    for group in groups.values():
        non_unk = [b for b in group if b.round_name != "UNK"]
        if non_unk:
            seen: set[str] = set()
            for b in non_unk:
                if b.round_name not in seen:
                    seen.add(b.round_name)
                    bouts.append(b)
        else:
            bouts.append(group[0])

    return bouts


# ── Event detection ────────────────────────────────────────────────────────────

@dataclass
class EventSection:
    name: str
    raw_date: str          # as found in file, e.g. "12/14/2025" or "12/18 - 12/19/2025"
    start_date: str        # ISO format of first date, e.g. "2025-12-14"
    end_date: Optional[str]  # ISO if multi-day
    start_line: int
    end_line: int          # exclusive; populated after full scan


def _parse_file_date(raw: str) -> tuple[str, Optional[str]]:
    """Return (start_iso, end_iso_or_None) from 'MM/DD/YYYY' or 'MM/DD - MM/DD/YYYY'."""
    raw = raw.strip()
    # Multi-day: "12/18 - 12/19/2025"
    m = re.match(r'(\d{1,2}/\d{1,2})(?:/(\d{4}))?\s*[-–]\s*(\d{1,2}/\d{1,2}/(\d{4}))', raw)
    if m:
        year = m.group(2) or m.group(4)
        start_str = f"{m.group(1)}/{year}"
        end_str = m.group(3)
        def to_iso(s: str) -> str:
            parts = s.split('/')
            if len(parts) == 2:
                return f"{year}-{int(parts[0]):02d}-{int(parts[1]):02d}"
            return f"{int(parts[2])}-{int(parts[0]):02d}-{int(parts[1]):02d}"
        return to_iso(start_str), to_iso(end_str)
    # Single: "MM/DD/YYYY"
    m2 = re.match(r'(\d{1,2})/(\d{1,2})/(\d{4})', raw)
    if m2:
        return f"{m2.group(3)}-{int(m2.group(1)):02d}-{int(m2.group(2)):02d}", None
    # Single short: "MM/DD/YY"
    m3 = re.match(r'(\d{1,2})/(\d{1,2})/(\d{2})', raw)
    if m3:
        yr = f"20{m3.group(3)}"
        return f"{yr}-{int(m3.group(1)):02d}-{int(m3.group(2)):02d}", None
    return raw, None  # fallback


def _is_event_name_candidate(line: str) -> bool:
    """Return True if line could be an event name (not a number, date, address, etc.)."""
    # Must have letters
    if not re.search(r'[A-Za-z]', line):
        return False
    # Pure numbers or scores
    if re.match(r'^\d+\.?\d*$', line):
        return False
    # Date lines / date fragments
    if _DATE_LINE_RE.match(line):
        return False
    # NJ / state school addresses
    if re.search(r',?\s*(?:NJ|PA|DE|CT|NY|MD|VA|CA|OH)\s+\d{5}', line):
        return False
    # Bout lines
    if ' over ' in line.lower() or 'won by' in line.lower():
        return False
    # Round / section headers
    if line.lower() in _SKIP_CONTENT or _NOISE_RE.match(line):
        return False
    # Lines starting with "Champ.", "Cons.", "Semifinal", etc.
    if re.match(r'^(?:Champ\.|Cons\.|Semifinal|Quarterfinal|Prelim)', line, re.IGNORECASE):
        return False
    # "Team: ...", "Teams Divisions..."
    if re.match(r'^Team(?:s)?\b', line, re.IGNORECASE):
        return False
    # Dual meet lines
    if re.search(r'\bvs\.?\b', line, re.IGNORECASE):
        return False
    # Length guard
    if not 4 <= len(line) <= 100:
        return False
    return True


def detect_event_sections(text: str) -> list[EventSection]:
    """Find all event boundaries in a multi-tournament file.

    Tries three patterns in order:
      1. "EventName MM/DD - MM/DD/YYYY" (range date at end of same line)
      2. "EventName - MM/DD/YYYY" (single date at end of same line)
      3. "EventName\\nMM/DD/YYYY" (name then date on next non-empty line)

    Dual meets ("Team vs. Team") are excluded.
    """
    lines = text.splitlines()
    events: list[EventSection] = []

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        if not line:
            i += 1
            continue

        # 1. Range date on same line: "EventName MM/DD - MM/DD/YYYY"
        rng = _INLINE_RANGE_DATE_RE.match(line)
        if rng:
            name = rng.group(1).strip()
            raw_date = rng.group(2).strip()
            if _is_event_name_candidate(name):
                start_iso, end_iso = _parse_file_date(raw_date)
                events.append(EventSection(
                    name=name, raw_date=raw_date,
                    start_date=start_iso, end_date=end_iso,
                    start_line=i, end_line=len(lines),
                ))
                i += 1
                continue

        # 2. Single date on same line: "EventName - MM/DD/YYYY"
        inline = _INLINE_DATE_RE.search(line)
        if inline:
            name = line[:inline.start()].strip().rstrip('-–(').strip()
            if _is_event_name_candidate(name) and not re.search(r'\d{1,2}/\d{1,2}$', name):
                raw_date = inline.group(1)
                start_iso, end_iso = _parse_file_date(raw_date)
                events.append(EventSection(
                    name=name, raw_date=raw_date,
                    start_date=start_iso, end_date=end_iso,
                    start_line=i, end_line=len(lines),
                ))
                i += 1
                continue

        # 3. Two-line: name on this line, date on next non-empty line
        if _is_event_name_candidate(line):
            for j in range(i + 1, min(i + 5, len(lines))):
                next_line = lines[j].strip()
                if not next_line:
                    continue
                if _DATE_LINE_RE.match(next_line):
                    raw_date = next_line
                    start_iso, end_iso = _parse_file_date(raw_date)
                    events.append(EventSection(
                        name=line, raw_date=raw_date,
                        start_date=start_iso, end_date=end_iso,
                        start_line=i, end_line=len(lines),
                    ))
                    break
                else:
                    break  # non-empty non-date line → not a two-line header

        i += 1

    # Fill end_line: each event ends where the next one begins
    for k in range(len(events) - 1):
        events[k].end_line = events[k + 1].start_line

    return events


# ── School + wrestler matching (gender-aware) ─────────────────────────────────

def _do_import(
    events: list[EventSection],
    all_lines: list[str],
    client: Client,
    school_matcher: SchoolMatcher,
    wrestler_matcher: WrestlerMatcher,
    dry_run: bool,
    event_filter: Optional[str],
    season: str,
) -> None:
    sep = "─" * 70

    for ev in events:
        if event_filter and trigram_similarity(event_filter.lower(), ev.name.lower()) < 0.3:
            if event_filter.lower() not in ev.name.lower():
                continue

        section_text = '\n'.join(all_lines[ev.start_line:ev.end_line])
        bouts = parse_girls_bouts(section_text)

        print(f"\n{sep}")
        print(f"Event : {ev.name}")
        print(f"Date  : {ev.raw_date}  → {ev.start_date}" + (f" – {ev.end_date}" if ev.end_date else ""))
        print(f"Bouts : {len(bouts)} parsed")

        if not bouts:
            print("  (no bouts — skipping)")
            continue

        review_items: list[ReviewItem] = []
        rows: list[dict] = []
        skipped = 0

        for bout in bouts:
            s1 = school_matcher.match(bout.wrestler1_school_raw)
            s2 = school_matcher.match(bout.wrestler2_school_raw)

            if s1["school_id"] is None and s2["school_id"] is None:
                skipped += 1
                continue

            def _match_w(name: str, sm: dict) -> dict:
                if sm["school_id"] is None:
                    return {"wrestler_id": None, "display_name": None,
                            "confidence": "none", "is_new": False, "alternates": []}
                return wrestler_matcher.match(name, sm["school_id"], bout.weight_class, gender="F")

            w1 = _match_w(bout.wrestler1_name, s1)
            w2 = _match_w(bout.wrestler2_name, s2)

            for wm, raw_name, sm in [(w1, bout.wrestler1_name, s1), (w2, bout.wrestler2_name, s2)]:
                if wm["confidence"] in ("none", "low") and sm["school_id"] is not None:
                    review_items.append(ReviewItem(
                        weight_class=bout.weight_class,
                        round_name=bout.round_name,
                        wrestler_name=raw_name,
                        school_name=sm.get("display_name") or "",
                        confidence=wm["confidence"],
                        alternates=[a["display_name"] for a in wm.get("alternates", [])[:3]],
                    ))

            rows.append({
                "weight_class": bout.weight_class,
                "round": bout.round_name,
                "winner": bout.winner,
                "result_type": bout.result_type,
                "result_detail": bout.result_detail,
                "fall_time_seconds": bout.fall_time_seconds,
                "wrestler1_id": w1["wrestler_id"],
                "wrestler1_name_raw": bout.wrestler1_name,
                "wrestler1_school_id": s1["school_id"],
                "wrestler1_school_raw": s1.get("display_name") or bout.wrestler1_school_raw,
                "wrestler2_id": w2["wrestler_id"],
                "wrestler2_name_raw": bout.wrestler2_name,
                "wrestler2_school_id": s2["school_id"],
                "wrestler2_school_raw": s2.get("display_name") or bout.wrestler2_school_raw,
            })

        print(f"  Rows to insert : {len(rows)}  |  Skipped (no NJ): {skipped}")

        if dry_run:
            cur_wt: Optional[int] = None
            for row in rows[:50]:  # show first 50 per event
                if row["weight_class"] != cur_wt:
                    cur_wt = row["weight_class"]
                    print(f"\n  ── {cur_wt} lb ──")
                w1_tag = f"[{row['wrestler1_id'][:8]}…]" if row["wrestler1_id"] else "[OOS/new]"
                w2_tag = f"[{row['wrestler2_id'][:8]}…]" if row["wrestler2_id"] else "[OOS/new]"
                result = row["result_type"] or "—"
                if row["result_detail"]:
                    result += f" {row['result_detail']}"
                arrow = ">" if row["winner"] == 1 else ("<" if row["winner"] == 2 else "=")
                print(
                    f"  {row['round']:8s}  "
                    f"{row['wrestler1_name_raw']} ({row['wrestler1_school_raw']}) {w1_tag}"
                    f"  {arrow}  "
                    f"{row['wrestler2_name_raw']} ({row['wrestler2_school_raw']}) {w2_tag}"
                    f"  [{result}]"
                )
            if len(rows) > 50:
                print(f"  … and {len(rows) - 50} more rows")
        else:
            # Create or find the tournament
            existing = (
                client.from_("in_season_tournaments")
                .select("id")
                .eq("name", ev.name)
                .eq("season", season)
                .eq("gender", "F")
                .execute()
            )
            if existing.data:
                tournament_id = existing.data[0]["id"]
                print(f"  Found existing tournament  id={tournament_id}")
            else:
                payload: dict = {
                    "name": ev.name,
                    "start_date": ev.start_date,
                    "season": season,
                    "gender": "F",
                }
                if ev.end_date:
                    payload["end_date"] = ev.end_date
                created = client.from_("in_season_tournaments").insert(payload).execute()
                tournament_id = created.data[0]["id"]
                print(f"  Created tournament  id={tournament_id}")

            for row in rows:
                row["in_season_tournament_id"] = tournament_id

            if rows:
                client.from_("tournament_bouts").insert(rows).execute()
                print(f"  Inserted {len(rows)} bouts.")

        if review_items:
            print(f"\n  REVIEW — {len(review_items)} low/no-confidence wrestler match(es):")
            for item in review_items[:20]:
                alts = ", ".join(item.alternates) if item.alternates else "none"
                print(
                    f"    [{item.weight_class} lb {item.round_name}] "
                    f"{item.wrestler_name!r} @ {item.school_name!r} "
                    f"— {item.confidence} | {alts}"
                )
            if len(review_items) > 20:
                print(f"    … and {len(review_items) - 20} more")


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    ap = argparse.ArgumentParser(description="Import girls tournament bouts into MatWhizzer.")
    ap.add_argument("--file", required=True, help="Path to RTF or text file")
    ap.add_argument("--scan-only", action="store_true", help="Detect events only; do not import")
    ap.add_argument("--dry-run", action="store_true", help="Parse + match but do not write to DB")
    ap.add_argument("--event", default=None, help="Only process events whose name contains this string")
    ap.add_argument("--season", default="2025-26", help='Season label (default: "2025-26")')
    args = ap.parse_args()

    print(f"Extracting text from {args.file!r} …")
    raw_text = _extract_text(args.file)
    all_lines = raw_text.splitlines()

    print("Detecting event sections …")
    events = detect_event_sections(raw_text)

    if not events:
        print("No events detected — check file format.")
        sys.exit(1)

    print(f"\nDetected {len(events)} events:")
    for ev in events:
        section_text = '\n'.join(all_lines[ev.start_line:ev.end_line])
        bout_count = len(parse_girls_bouts(section_text))
        print(
            f"  {ev.start_date:<12} {ev.name:<50} "
            f"lines {ev.start_line+1}–{ev.end_line}  ~{bout_count} bouts"
        )

    if args.scan_only:
        return

    # Load .env
    script_dir = os.path.dirname(os.path.abspath(__file__))
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

    client: Client = create_client(url, key)
    school_matcher = SchoolMatcher(client)
    wrestler_matcher = WrestlerMatcher(client)
    print("\nLoading NJ school/wrestler data from DB …")

    _do_import(
        events=events,
        all_lines=all_lines,
        client=client,
        school_matcher=school_matcher,
        wrestler_matcher=wrestler_matcher,
        dry_run=args.dry_run,
        event_filter=args.event,
        season=args.season,
    )

    if args.dry_run:
        print("\n(Dry run — no DB changes written.)")
    else:
        print("\nDone.")


if __name__ == "__main__":
    main()
