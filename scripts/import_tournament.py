#!/usr/bin/env python3
"""
scripts/import_tournament.py

Parse a tournament result RTF (or plain-text) file and import bouts into:
  in_season_tournaments  — created (or found) by name + season
  tournament_bouts       — one row per bout

NJ school/wrestler matching mirrors the TypeScript pipeline in
matchSchools.ts and matchWrestlers.ts (trigram Jaccard similarity,
same thresholds, same suffix-stripping).

Only bouts where at least one wrestler matches a NJ school are imported.
Unmatched NJ wrestlers are flagged in a review list at the end — they do
not block the import.

File format (RTF exported from tournament software):
  - Each school's bouts are grouped with a "School Name -" header
  - Each bout is preceded by the weight class on its own line
  - Bout lines: "Round Name - Winner (School) over Loser (School) (Result)"
  - Extended format (some sections): "Round - Winner (School) W-L won by X over Loser (School) W-L (Result)"
  - DFF format: "Round - Name (School) W-L and Name (School) W-L (DFF)"
  - Bye lines: "Round - Name (School) received a bye" → skipped
  - Some bouts appear without a round prefix: "Name (School) over Name (School) (Result)"
  - Duplicate bouts (same wrestlers/weight) are deduplicated; round-named wins over unnamed

Usage:
  python scripts/import_tournament.py \\
    --file results.rtf \\
    --tournament-name "Iron Man Tournament" \\
    --start-date 2025-12-12 \\
    [--end-date 2025-12-13] \\
    --season "2025-26" \\
    [--location "Lehigh University"] \\
    [--dry-run]

With --dry-run, prints what would be inserted without touching the DB.
Remove the flag to execute.
"""

from __future__ import annotations

import argparse
import os
import re
import subprocess
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


# ── Data classes ───────────────────────────────────────────────────────────────

@dataclass
class ParsedBout:
    weight_class: int
    round_name: str
    wrestler1_name: str
    wrestler1_school_raw: str
    wrestler2_name: str
    wrestler2_school_raw: str
    result_type: Optional[str]
    result_detail: Optional[str]
    fall_time_seconds: Optional[int]
    winner: Optional[int]  # 1 = wrestler1, 2 = wrestler2, None = DFF


@dataclass
class ReviewItem:
    weight_class: int
    round_name: str
    wrestler_name: str
    school_name: str
    confidence: str
    alternates: list[str] = field(default_factory=list)


# ── Tournament section extraction ─────────────────────────────────────────────

# Matches lines like "Iron Man Tournament - 12/12-12/13" or "Ramsey Invitational 12/13"
_TOURNEY_DATE_RE = re.compile(
    r'\d{1,2}/\d{1,2}(?:[-–/]\d{0,2}/?\d{0,4})?'
)


def _find_sections(text: str) -> list[tuple[str, int]]:
    """Return (name, line_index) for each detected tournament-header line.

    Named sections: "Tournament Name - MM/DD" or "Tournament Name MM/DD"
    Anonymous sections: bare date lines like "12/13 - " (name becomes "__date__")
    """
    lines = text.splitlines()
    sections: list[tuple[str, int]] = []
    for i, raw in enumerate(lines):
        line = raw.strip()
        if not line or len(line) > 120:
            continue
        # Must contain a date-like pattern
        dm = _TOURNEY_DATE_RE.search(line)
        if not dm:
            continue
        # Skip bout lines
        if ' over ' in line.lower():
            continue
        # Skip weight-only lines
        if _WEIGHT_RE.match(line):
            continue
        # Name is everything before the date
        name_part = line[:dm.start()].strip().rstrip('-–\t').strip()
        if not name_part:
            # Date is at the start of the line. Two sub-cases:
            #   "12/13 - Tournament Name"  → reversed header; name is after the dash
            #   "12/13 - "                 → truly anonymous boundary (no name after dash)
            after = line[dm.end():].strip()
            if after.startswith('-') or after.startswith('–'):
                post_dash = after.lstrip('-–').strip()
                if post_dash and len(post_dash) >= 4:
                    # Reversed format: treat post-dash text as the section name
                    sections.append((post_dash, i))
                else:
                    sections.append(("__date__", i))
        elif len(name_part) >= 4:
            sections.append((name_part, i))
    return sections


def _extract_section(text: str, tournament_name: str) -> str:
    """Return just the text slice for the named tournament, or the whole text if not found."""
    sections = _find_sections(text)
    if not sections:
        return text

    target = tournament_name.strip()
    best_idx = -1
    best_score = -1.0

    for idx, (name, _) in enumerate(sections):
        score = trigram_similarity(name, target)
        if name.lower() == target.lower():
            score = 2.0  # exact match
        if score > best_score:
            best_score = score
            best_idx = idx

    if best_idx < 0 or best_score < 0.5:
        print(f"WARNING: No section found for {tournament_name!r}. Sections detected:")
        for name, _ in sections:
            print(f"  {name!r}")
        print("Parsing the entire file (may include multiple tournaments).")
        return text

    start = sections[best_idx][1]
    end = sections[best_idx + 1][1] if best_idx + 1 < len(sections) else None
    lines = text.splitlines()
    selected = lines[start:end]
    matched_name = sections[best_idx][0]
    end_label = f"line {sections[best_idx + 1][1] + 1}" if end else "EOF"
    print(f"Matched section {matched_name!r} (lines {start + 1}–{end_label})")
    return '\n'.join(selected)


# ── RTF extraction ─────────────────────────────────────────────────────────────

def _normalize_whitespace(text: str) -> str:
    """Replace Unicode non-breaking spaces (\xa0) with regular ASCII spaces.
    textutil converts some RTF word-separators to \xa0, which breaks keyword
    matching (e.g. ' over ') when only one side has a regular space."""
    return text.replace('\xa0', ' ')


def _extract_text(path: str) -> str:
    """Return plain text from path. RTF files are converted via textutil (macOS) or striprtf."""
    if path.lower().endswith(('.txt', '.text')):
        with open(path, encoding='utf-8', errors='replace') as f:
            return _normalize_whitespace(f.read())

    # textutil is available on macOS
    try:
        result = subprocess.run(
            ['textutil', '-convert', 'txt', '-stdout', path],
            capture_output=True, text=True, timeout=60,
        )
        if result.returncode == 0 and result.stdout.strip():
            return _normalize_whitespace(result.stdout)
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass

    # Python fallback: striprtf library
    try:
        from striprtf.striprtf import rtf_to_text  # type: ignore[import]
        with open(path, encoding='utf-8', errors='replace') as f:
            return _normalize_whitespace(rtf_to_text(f.read()))
    except ImportError:
        pass

    print("WARNING: Could not convert RTF. Install 'striprtf' (pip install striprtf) or run on macOS.")
    with open(path, encoding='utf-8', errors='replace') as f:
        return _normalize_whitespace(f.read())


# ── Trigram similarity (matches matchSchools.ts / matchWrestlers.ts) ───────────

def _trigrams(s: str) -> set[str]:
    padded = f"  {s.lower()}  "
    return {padded[i:i + 3] for i in range(len(padded) - 2)}


def trigram_similarity(a: str, b: str) -> float:
    ta, tb = _trigrams(a), _trigrams(b)
    intersection = len(ta & tb)
    union = len(ta) + len(tb) - intersection
    return intersection / union if union else 0.0


# ── Suffix stripping (matches matchSchools.ts) ─────────────────────────────────

_STRIP_SUFFIXES = [
    " h.s.", " hs", " high school", " high",
    " regional", " jr/sr", " jr-sr", " sr", " jr",
    " academy", " charter", " school",
]


def _strip_suffixes(name: str) -> str:
    lower = name.lower().rstrip()
    for suffix in _STRIP_SUFFIXES:
        if lower.endswith(suffix):
            return _strip_suffixes(name[: len(name) - len(suffix)].rstrip())
    return name.strip()


# ── Fall-time parsing ──────────────────────────────────────────────────────────

def _parse_time(s: str) -> Optional[int]:
    """Parse 'M:SS' → total seconds."""
    m = re.fullmatch(r"(\d+):(\d{2})", s.strip())
    return int(m.group(1)) * 60 + int(m.group(2)) if m else None


# ── Result parsing ─────────────────────────────────────────────────────────────

def _parse_result(raw: str) -> tuple[Optional[str], Optional[str], Optional[int], Optional[int]]:
    """Return (result_type, result_detail, fall_time_seconds, winner).
    winner=1 means wrestler1 won (always the case except DFF).
    winner=None means double forfeit.
    """
    r = raw.strip()
    u = r.upper()

    if u in ("DFF", "DOUBLE FORFEIT"):
        return ("DFF", None, None, None)

    if u in ("BYE",):
        return (None, None, None, None)  # caller should skip

    if u in ("FOR.", "FOR", "FORF", "FORFEIT", "FF"):
        return ("For", None, None, 1)

    if u in ("M. FOR.", "M.FOR.", "MED. FOR.", "MEDICAL FORFEIT", "MFFL"):
        return ("For", None, None, 1)  # medical forfeit → treated as forfeit

    if u in ("NC", "NO CONTEST"):
        return ("NC", None, None, 1)

    if u in ("DEF.", "DEF", "DEFAULT"):
        return ("Def", None, None, 1)

    # Injury default: "Inj. M:SS"
    m = re.fullmatch(r"INJ\.?\s+(\d+:\d{2})", u)
    if m:
        return ("Inj", None, _parse_time(m.group(1)), 1)

    # Fall [M:SS]
    m = re.fullmatch(r"FALL(?:\s+(\d+:\d{2}))?", u)
    if m:
        secs = _parse_time(m.group(1)) if m.group(1) else None
        return ("Fall", None, secs, 1)

    # TF-1.5 M:SS (score) — extended format used by some tournament systems
    m = re.fullmatch(r"TF-1\.5\s+(\d+:\d{2})\s+\((\d+-\d+)\)", u)
    if m:
        return ("TF", m.group(2), _parse_time(m.group(1)), 1)

    # TF[-1.5] score [M:SS] — NJ-style format
    m = re.fullmatch(r"(TF(?:-1\.5)?)\s+(\d+-\d+)(?:\s+(\d+:\d{2}))?", u)
    if m:
        secs = _parse_time(m.group(3)) if m.group(3) else None
        return (m.group(1), m.group(2), secs, 1)

    # OT / 2-OT score
    m = re.fullmatch(r"(2-OT|OT)\s+(\d+-\d+)", u)
    if m:
        return (m.group(1), m.group(2), None, 1)

    # MD / Dec / SV-1 / UTB / TB-1 / TB-2 score
    m = re.fullmatch(r"(MD|DEC|SV-1|UTB|TB-1|TB-2)\s+(\d+-\d+)", u)
    if m:
        label = "Dec" if m.group(1) == "DEC" else m.group(1)
        return (label, m.group(2), None, 1)

    # Generic "TYPE DETAIL"
    parts = r.split(None, 1)
    if len(parts) == 2:
        return (parts[0], parts[1], None, 1)
    return (r if r else None, None, None, 1)


# ── Round name normalization ───────────────────────────────────────────────────

_ROUND_EXACT: dict[str, str] = {
    "quarterfinals": "QF",  "quarterfinal": "QF",  "quarters": "QF",
    "semifinals":    "SF",  "semifinal":    "SF",  "semis":    "SF",
    "1st place match": "F", "final":        "F",   "finals":   "F",
    "3rd place match": "3rd_Place", "3rd place": "3rd_Place",
    "5th place match": "5th_Place", "5th place": "5th_Place",
    "7th place match": "7th_Place", "7th place": "7th_Place",
    "cons. semis":    "CSF", "cons. semi":  "CSF",
    "cons. quarters": "CQF", "cons. quarter": "CQF",
    "cons. 1st":      "CF",  "consolation 1st": "CF",
    "prelim":         "PL",
    "varsity":        "V",
}


def _normalize_round(raw: str) -> str:
    # Strip trailing bracket-size qualifiers like '(16 Man)', '(8man)', '(32 Man)'
    name = re.sub(r'\s*\([^)]*\)\s*$', '', raw).strip()
    lower = name.lower()

    if lower in _ROUND_EXACT:
        return _ROUND_EXACT[lower]

    m = re.fullmatch(r"champ\.\s+round\s+(\d+)", lower)
    if m:
        return f"R{m.group(1)}"

    m = re.fullmatch(r"round\s+(\d+)", lower)
    if m:
        return f"R{m.group(1)}"

    m = re.fullmatch(r"cons\.\s+round\s+(\d+)", lower)
    if m:
        return f"C{m.group(1)}"

    # Fallback: sanitize and truncate
    return re.sub(r'\s+', '_', name)[:20]


# ── Paren-aware helpers ────────────────────────────────────────────────────────

def _find_last_top_level_paren(s: str) -> tuple[int, int]:
    """Return (open, close) indices of the outermost (...) that ends at the last ')'.
    Returns (-1, -1) if not found."""
    s_stripped = s.rstrip()
    if not s_stripped or s_stripped[-1] != ')':
        return (-1, -1)
    end = len(s_stripped) - 1
    depth = 0
    for i in range(end, -1, -1):
        if s_stripped[i] == ')':
            depth += 1
        elif s_stripped[i] == '(':
            depth -= 1
            if depth == 0:
                return (i, end)
    return (-1, -1)


def _find_last_top_level_keyword(s: str, keyword: str) -> int:
    """Return the start index of the last occurrence of keyword at paren depth 0, or -1."""
    depth = 0
    pos = -1
    kl = keyword.lower()
    klen = len(keyword)
    for i in range(len(s)):
        c = s[i]
        if c == '(':
            depth += 1
        elif c == ')':
            depth -= 1
        elif depth == 0 and s[i:i + klen].lower() == kl:
            pos = i
    return pos


def _extract_wrestler_info(segment: str) -> tuple[str, str]:
    """Extract (wrestler_name, school_name) from 'Name (School)' or 'Name (School (Sub))'.
    Ignores any trailing W-L record or 'won by ...' text after the school's closing paren."""
    segment = segment.strip()
    if not segment:
        return ('', '')
    depth = 0
    paren_start = -1
    paren_end = -1
    for i, c in enumerate(segment):
        if c == '(':
            if depth == 0:
                paren_start = i
            depth += 1
        elif c == ')':
            depth -= 1
            if depth == 0 and paren_start >= 0:
                paren_end = i
                break  # stop at the FIRST complete top-level group (the school)
    if paren_start < 0 or paren_end < 0:
        return (segment, '')
    name = segment[:paren_start].strip()
    school = segment[paren_start + 1:paren_end]
    return (name, school)


# ── File parser ────────────────────────────────────────────────────────────────

_ROUND_PREFIX_RE = re.compile(
    r'^('
    r'Champ\.\s+Round\s+\d+'
    r'|Cons\.\s+Round\s+\d+'
    r'|Cons\.\s+Semis?(?:\s*\([^)]*\))?'
    r'|Cons\.\s+Quarters?'
    r'|Cons\.\s+1st'
    r'|Consolation\s+1st'
    r'|Quarterfinals?'
    r'|Semifinals?'
    r'|(?:\d+(?:st|nd|rd|th))\s+Place(?:\s+Match)?'
    r'|Round\s+\d+'
    r'|Prelim'
    r'|Varsity'
    r')\s*-\s*',
    re.IGNORECASE,
)

_WEIGHT_RE = re.compile(r'^(\d{2,3})\s*(?:lbs?\.?)?\s*$')

_BYE_RE = re.compile(r'\breceived\s+a\s+bye\b', re.IGNORECASE)

_SKIP_EXACT = {"yes", "no", "weight", "summary", "stats", "tw event"}


def parse_file(text: str) -> list[ParsedBout]:
    """Parse extracted plain text into ParsedBout records.

    Deduplication: bouts appearing multiple times (per-school + bracket sections)
    are merged by (weight, frozenset(wrestler_names)).  Round-named entries take
    precedence over entries without a recognised round prefix (stored as 'UNK').
    """
    all_bouts: list[ParsedBout] = []
    current_weight: Optional[int] = None

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if line.lower() in _SKIP_EXACT:
            continue

        # Weight-class header (bare number, 100–300 lbs)
        wm = _WEIGHT_RE.match(line)
        if wm:
            w = int(wm.group(1))
            if 100 <= w <= 300:
                current_weight = w
            continue

        if current_weight is None:
            continue

        # Skip bye lines regardless of format
        if _BYE_RE.search(line):
            continue

        # Quick filter: must contain ' over ' at top level, or be a DFF
        has_over = _find_last_top_level_keyword(line, ' over ') >= 0
        is_dff = line.rstrip().upper().endswith('(DFF)')
        if not has_over and not is_dff:
            continue

        # ── Extract round prefix ───────────────────────────────────────────────
        round_code = "UNK"
        bout_part = line
        pm = _ROUND_PREFIX_RE.match(line)
        if pm:
            round_code = _normalize_round(pm.group(1))
            bout_part = line[pm.end():]

        # ── Extract result (last top-level paren group) ────────────────────────
        lp_start, lp_end = _find_last_top_level_paren(bout_part)
        if lp_start < 0:
            continue
        # Verify result is truly at the end (no trailing non-paren text)
        if bout_part.rstrip()[lp_end + 1:].strip():
            continue
        result_raw = bout_part[lp_start + 1:lp_end]
        bout_core = bout_part[:lp_start].strip()

        # Skip byes with (Bye) result
        if result_raw.strip().lower() == 'bye':
            continue

        # ── DFF: "Name (School) and Name (School) (DFF)" ──────────────────────
        result_upper = result_raw.strip().upper()
        if result_upper in ("DFF", "DOUBLE FORFEIT"):
            and_pos = _find_last_top_level_keyword(bout_core, ' and ')
            if and_pos < 0:
                continue
            w1_name, w1_school = _extract_wrestler_info(bout_core[:and_pos])
            w2_name, w2_school = _extract_wrestler_info(bout_core[and_pos + 5:])
            if not w1_name or not w2_name:
                continue
            all_bouts.append(ParsedBout(
                weight_class=current_weight,
                round_name=round_code,
                wrestler1_name=w1_name,
                wrestler1_school_raw=w1_school,
                wrestler2_name=w2_name,
                wrestler2_school_raw=w2_school,
                result_type="DFF",
                result_detail=None,
                fall_time_seconds=None,
                winner=None,
            ))
            continue

        # ── Standard / extended: split on last ' over ' ───────────────────────
        over_pos = _find_last_top_level_keyword(bout_core, ' over ')
        if over_pos < 0:
            continue

        seg1 = bout_core[:over_pos]
        seg2 = bout_core[over_pos + 6:]  # len(' over ') == 6

        w1_name, w1_school = _extract_wrestler_info(seg1)
        w2_name, w2_school = _extract_wrestler_info(seg2)

        if not w1_name or not w2_name:
            continue
        if w1_name.lower() in ('unknown', 'medical forfeit') or w2_name.lower() in ('unknown', 'medical forfeit'):
            continue

        rt, rd, fall_secs, winner = _parse_result(result_raw)
        if rt is None:
            continue

        all_bouts.append(ParsedBout(
            weight_class=current_weight,
            round_name=round_code,
            wrestler1_name=w1_name,
            wrestler1_school_raw=w1_school,
            wrestler2_name=w2_name,
            wrestler2_school_raw=w2_school,
            result_type=rt,
            result_detail=rd,
            fall_time_seconds=fall_secs,
            winner=winner,
        ))

    # ── Two-pass deduplication ─────────────────────────────────────────────────
    # Group by (weight, sorted_names).  Prefer non-UNK rounds; if multiple
    # non-UNK rounds exist (same wrestlers met more than once), keep all of them.
    groups: dict[tuple, list[ParsedBout]] = defaultdict(list)
    for bout in all_bouts:
        key = (bout.weight_class,
               tuple(sorted([bout.wrestler1_name.lower(), bout.wrestler2_name.lower()])))
        groups[key].append(bout)

    bouts: list[ParsedBout] = []
    for group in groups.values():
        non_unk = [b for b in group if b.round_name != "UNK"]
        if non_unk:
            # Keep one per unique round (drop duplicate round entries)
            seen_rounds: set[str] = set()
            for b in non_unk:
                if b.round_name not in seen_rounds:
                    seen_rounds.add(b.round_name)
                    bouts.append(b)
        else:
            bouts.append(group[0])

    return bouts


# ── School matcher (mirrors matchSchools.ts) ───────────────────────────────────

class SchoolMatcher:
    def __init__(self, client: Client) -> None:
        self._client = client
        self._schools: Optional[list[dict]] = None
        self._aliases: Optional[list[dict]] = None

    def _load(self) -> None:
        if self._schools is not None:
            return
        schools_res = self._client.from_("schools").select("id, display_name, is_nj").execute()
        self._schools = [s for s in (schools_res.data or []) if s.get("is_nj", True)]
        nj_ids = {s["id"] for s in self._schools}
        aliases_res = self._client.from_("school_aliases").select("school_id, alias").execute()
        self._aliases = [a for a in (aliases_res.data or []) if a["school_id"] in nj_ids]

    def match(self, raw: str) -> dict:
        """Return {school_id, display_name, confidence, alternates}."""
        self._load()
        name = raw.strip()
        lower = name.lower()
        schools = self._schools or []
        aliases = self._aliases or []

        for s in schools:
            if s["display_name"].lower() == lower:
                return {"school_id": s["id"], "display_name": s["display_name"], "confidence": "exact", "alternates": []}

        for a in aliases:
            if a["alias"].lower() == lower:
                school = next((s for s in schools if s["id"] == a["school_id"]), None)
                return {"school_id": a["school_id"], "display_name": school["display_name"] if school else None, "confidence": "exact", "alternates": []}

        stripped = _strip_suffixes(name)
        if stripped and stripped != name:
            for s in schools:
                if s["display_name"].lower() == stripped.lower():
                    return {"school_id": s["id"], "display_name": s["display_name"], "confidence": "exact", "alternates": []}
            for a in aliases:
                if a["alias"].lower() == stripped.lower():
                    school = next((s for s in schools if s["id"] == a["school_id"]), None)
                    return {"school_id": a["school_id"], "display_name": school["display_name"] if school else None, "confidence": "exact", "alternates": []}

        query = stripped if (stripped and stripped != name) else name
        scored = sorted(
            [{"school_id": s["id"], "display_name": s["display_name"], "score": trigram_similarity(query, s["display_name"])} for s in schools],
            key=lambda x: x["score"],
            reverse=True,
        )[:3]

        best = scored[0] if scored else None
        if best and best["score"] >= 0.85:
            return {"school_id": best["school_id"], "display_name": best["display_name"], "confidence": "high", "alternates": scored}
        if best and best["score"] >= 0.6:
            return {"school_id": best["school_id"], "display_name": best["display_name"], "confidence": "low", "alternates": scored}

        return {"school_id": None, "display_name": None, "confidence": "none", "alternates": scored}


# ── Wrestler matcher (mirrors matchWrestlers.ts) ───────────────────────────────

class WrestlerMatcher:
    def __init__(self, client: Client) -> None:
        self._client = client
        self._index: Optional[dict[int, list[dict]]] = None

    def _load(self) -> None:
        if self._index is not None:
            return

        PAGE = 1000

        def paginate(table: str, select: str) -> list[dict]:
            rows: list[dict] = []
            offset = 0
            while True:
                res = self._client.from_(table).select(select).range(offset, offset + PAGE - 1).execute()
                batch = res.data or []
                rows.extend(batch)
                if len(batch) < PAGE:
                    break
                offset += PAGE
            return rows

        wrestlers = paginate("wrestlers", "id, first_name, last_name, suffix")
        wc_res = self._client.from_("weight_classes").select("id, weight").execute()
        entries = paginate("tournament_entries", "wrestler_id, school_id, weight_class_id")

        wrestler_map = {w["id"]: w for w in wrestlers}
        weight_map = {wc["id"]: wc["weight"] for wc in (wc_res.data or [])}

        record_map: dict[tuple, dict] = {}
        for e in entries:
            if not e["school_id"]:
                continue
            w = wrestler_map.get(e["wrestler_id"])
            if not w:
                continue
            weight = weight_map.get(e["weight_class_id"])
            if weight is None:
                continue
            key = (e["wrestler_id"], e["school_id"])
            if key not in record_map:
                suffix = f" {w['suffix']}" if w.get("suffix") else ""
                record_map[key] = {
                    "wrestler_id": e["wrestler_id"],
                    "display_name": f"{w['first_name']} {w['last_name']}{suffix}".strip(),
                    "school_id": e["school_id"],
                    "weights": [],
                }
            if weight not in record_map[key]["weights"]:
                record_map[key]["weights"].append(weight)

        self._index = {}
        for rec in record_map.values():
            sid = rec["school_id"]
            self._index.setdefault(sid, []).append(rec)

    def match(self, name: str, school_id: int, weight_class: int) -> dict:
        """Return {wrestler_id, display_name, confidence, is_new, alternates}."""
        self._load()
        raw = name.strip()
        lower = raw.lower()
        at_school = (self._index or {}).get(school_id, [])

        for rec in at_school:
            if rec["display_name"].lower() == lower and weight_class in rec["weights"]:
                return {"wrestler_id": rec["wrestler_id"], "display_name": rec["display_name"], "confidence": "exact", "is_new": False, "alternates": []}

        for rec in at_school:
            if rec["display_name"].lower() == lower:
                return {"wrestler_id": rec["wrestler_id"], "display_name": rec["display_name"], "confidence": "high", "is_new": False, "alternates": []}

        scored = sorted(
            [{"wrestler_id": r["wrestler_id"], "display_name": r["display_name"], "score": trigram_similarity(raw, r["display_name"])} for r in at_school],
            key=lambda x: x["score"],
            reverse=True,
        )[:3]
        best = scored[0] if scored else None

        if best and best["score"] >= 0.85:
            return {"wrestler_id": best["wrestler_id"], "display_name": best["display_name"], "confidence": "high", "is_new": False, "alternates": scored}
        if best and best["score"] >= 0.6:
            return {"wrestler_id": best["wrestler_id"], "display_name": best["display_name"], "confidence": "low", "is_new": False, "alternates": scored}

        return {"wrestler_id": None, "display_name": None, "confidence": "none", "is_new": True, "alternates": scored}


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    ap = argparse.ArgumentParser(description="Import tournament bouts into MatWhizzer.")
    ap.add_argument("--file", required=True, help="Path to RTF or plain-text bout file")
    ap.add_argument("--tournament-name", required=True, help="Tournament name")
    ap.add_argument("--start-date", required=True, help="Start date YYYY-MM-DD")
    ap.add_argument("--end-date", default=None, help="End date YYYY-MM-DD (optional)")
    ap.add_argument("--season", required=True, help='Season label e.g. "2025-26"')
    ap.add_argument("--location", default=None, help="Venue/location (optional)")
    ap.add_argument("--dry-run", action="store_true", help="Print plan without writing to DB")
    args = ap.parse_args()

    # Next.js projects use .env.local; fall back to .env
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

    # ── Extract and parse ──────────────────────────────────────────────────────

    print(f"Extracting text from {args.file!r} …")
    raw_text = _extract_text(args.file)
    section_text = _extract_section(raw_text, args.tournament_name)

    parsed = parse_file(section_text)
    if not parsed:
        print("No bouts parsed — check the file format.")
        sys.exit(1)

    print(f"Parsed {len(parsed)} bouts")
    print("Loading NJ school/wrestler data from DB …")

    # ── Match schools + wrestlers ──────────────────────────────────────────────

    review_items: list[ReviewItem] = []
    rows: list[dict] = []
    skipped = 0

    for bout in parsed:
        s1 = school_matcher.match(bout.wrestler1_school_raw)
        s2 = school_matcher.match(bout.wrestler2_school_raw)

        if s1["school_id"] is None and s2["school_id"] is None:
            skipped += 1
            continue

        def match_wrestler(name: str, school_match: dict, weight: int) -> dict:
            if school_match["school_id"] is None:
                return {"wrestler_id": None, "display_name": None, "confidence": "none", "is_new": False, "alternates": []}
            return wrestler_matcher.match(name, school_match["school_id"], weight)

        w1 = match_wrestler(bout.wrestler1_name, s1, bout.weight_class)
        w2 = match_wrestler(bout.wrestler2_name, s2, bout.weight_class)

        for wm, raw_name, raw_school, sm in [
            (w1, bout.wrestler1_name, bout.wrestler1_school_raw, s1),
            (w2, bout.wrestler2_name, bout.wrestler2_school_raw, s2),
        ]:
            if wm["confidence"] in ("none", "low") and sm["school_id"] is not None:
                review_items.append(ReviewItem(
                    weight_class=bout.weight_class,
                    round_name=bout.round_name,
                    wrestler_name=raw_name,
                    school_name=raw_school,
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
            "nj_wrestler1_id": w1["wrestler_id"],
            "wrestler1_name_raw": bout.wrestler1_name,
            "wrestler1_school_id": s1["school_id"],
            "wrestler1_school_raw": s1["display_name"] or bout.wrestler1_school_raw,
            "nj_wrestler2_id": w2["wrestler_id"],
            "wrestler2_name_raw": bout.wrestler2_name,
            "wrestler2_school_id": s2["school_id"],
            "wrestler2_school_raw": s2["display_name"] or bout.wrestler2_school_raw,
        })

    print(f"{len(rows)} bouts to insert, {skipped} skipped (no NJ wrestler on either side)")

    # ── Dry-run output ─────────────────────────────────────────────────────────

    if args.dry_run:
        sep = "─" * 64
        print(f"\n{sep}")
        print(f"DRY RUN — {args.tournament_name!r}  season={args.season}")
        print(f"  start={args.start_date}  end={args.end_date or '—'}  location={args.location or '—'}")
        print(sep)

        cur_wt: Optional[int] = None
        for row in rows:
            if row["weight_class"] != cur_wt:
                cur_wt = row["weight_class"]
                print(f"\n  ── {cur_wt} lb ──")
            w1_tag = f"[{row['nj_wrestler1_id'][:8]}…]" if row["nj_wrestler1_id"] else "[OOS/new]"
            w2_tag = f"[{row['nj_wrestler2_id'][:8]}…]" if row["nj_wrestler2_id"] else "[OOS/new]"
            result = row["result_type"] or "—"
            if row["result_detail"]:
                result += f" {row['result_detail']}"
            winner_arrow = ">" if row["winner"] == 1 else ("<" if row["winner"] == 2 else "=")
            print(
                f"  {row['round']:8s}  "
                f"{row['wrestler1_name_raw']} ({row['wrestler1_school_raw']}) {w1_tag}"
                f"  {winner_arrow}  "
                f"{row['wrestler2_name_raw']} ({row['wrestler2_school_raw']}) {w2_tag}"
                f"  [{result}]"
            )

        if review_items:
            print(f"\n{sep}")
            print(f"REVIEW LIST — {len(review_items)} low/no-confidence NJ wrestler match(es):")
            print(sep)
            for item in review_items:
                alts = ", ".join(item.alternates) if item.alternates else "none"
                print(
                    f"  [{item.weight_class} lb {item.round_name}] "
                    f"{item.wrestler_name!r} @ {item.school_name!r} "
                    f"— confidence: {item.confidence} | alternates: {alts}"
                )
        else:
            print("\nNo low-confidence wrestler matches.")

        print(f"\nRe-run without --dry-run to write {len(rows)} bouts to the DB.")
        return

    # ── Live insert ────────────────────────────────────────────────────────────

    existing = (
        client.from_("in_season_tournaments")
        .select("id")
        .eq("name", args.tournament_name)
        .eq("season", args.season)
        .execute()
    )

    if existing.data:
        tournament_id = existing.data[0]["id"]
        print(f"\nFound existing tournament  id={tournament_id}")
    else:
        payload: dict = {
            "name": args.tournament_name,
            "start_date": args.start_date,
            "season": args.season,
        }
        if args.end_date:
            payload["end_date"] = args.end_date
        if args.location:
            payload["location"] = args.location
        created = client.from_("in_season_tournaments").insert(payload).execute()
        tournament_id = created.data[0]["id"]
        print(f"\nCreated tournament  id={tournament_id}")

    for row in rows:
        row["in_season_tournament_id"] = tournament_id

    if rows:
        client.from_("tournament_bouts").insert(rows).execute()
        print(f"Inserted {len(rows)} bouts.")

    if review_items:
        print(f"\nREVIEW — {len(review_items)} low/no-confidence NJ wrestler match(es) (import not blocked):")
        for item in review_items:
            alts = ", ".join(item.alternates) if item.alternates else "none"
            print(
                f"  [{item.weight_class} lb {item.round_name}] "
                f"{item.wrestler_name!r} @ {item.school_name!r} "
                f"— {item.confidence} | alternates: {alts}"
            )

    print("\nDone.")


if __name__ == "__main__":
    main()
