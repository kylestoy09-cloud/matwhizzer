#!/usr/bin/env python3
"""
parse_tournament_rtf.py
=======================
Parse a plain-text export of a tournament RTF into structured JSON.

Two formats are handled:

  Format A  (full_bracket)  — organized by weight → round group → individual
            match lines; includes W-L records; no Yes/No flags; all participants
            visible; complete bracket reconstruction possible.

  Format B  (school_tracking) — organized by school → weight → individual match
            line + Yes/No flag pair; only tracked-school bouts are present.

            Sub-formats of B:
            - Traditional (Iron Man): round-prefixed match lines + Yes/No flags;
              TW Event=Yes means the bout was at THIS tournament; filter to Yes.
            - TW Dashboard export (Palmyra, A-Nice, Hunterdon Central, etc.):
              round-prefixed match lines + Yes/No flags, but TW Event=No for all
              (the tournament was not a TW official event); include all bouts.
            - No-round format (Sam Cali): bouts appear as bare "Name (School) over
              Name (School) (Result)" with no round prefix; round stored as "Unknown".

Usage
-----
    textutil -convert txt -stdout "Dec 2025 Tournaments.rtf" > dec.txt
    python3 parse_tournament_rtf.py dec.txt --summary
    python3 parse_tournament_rtf.py dec.txt --out dec_parsed.json
    python3 parse_tournament_rtf.py dec.txt --only "Robin Leff" | python3 -m json.tool
"""

import re
import sys
import json
import argparse
from typing import Optional


# ── Place-round constants ─────────────────────────────────────────────────────

PLACE_ROUNDS = {
    "1st place match": (1, 2),
    "2nd place match": (1, 2),
    "3rd place match": (3, 4),
    "5th place match": (5, 6),
    "7th place match": (7, 8),
    "first place":     (1, 2),
    "third place":     (3, 4),
    "fifth place":     (5, 6),
    "seventh place":   (7, 8),
}

PLACE_FROM_WIN = {
    "1st place match": 1, "first place":     1,
    "3rd place match": 3, "third place":     3,
    "5th place match": 5, "fifth place":     5,
    "7th place match": 7, "seventh place":   7,
}
PLACE_FROM_LOSS = {
    "1st place match": 2, "first place":     2,
    "3rd place match": 4, "third place":     4,
    "5th place match": 6, "fifth place":     6,
    "7th place match": 8, "seventh place":   8,
}

ROUND_PRIORITY = {
    "champ. round 1": 1, "round 1": 1,
    "champ. round 2": 2, "round 2": 2,
    "champ. round 3": 3,
    "cons. round 1": 4, "cons. round 2": 5, "cons. round 3": 6,
    "cons. round 4": 7, "cons. round 5": 8, "cons. round 6": 9,
    "cons. round 7": 10, "cons. round 8": 11,
    "quarterfinals": 12, "quarterfinal": 12,
    "cons. semis": 13, "cons. semi": 13,
    "semifinals": 14, "semifinal": 14,
    "7th place match": 15, "seventh place": 15,
    "5th place match": 16, "fifth place":   16,
    "3rd place match": 17, "third place":   17,
    "1st place match": 18, "first place":   18,
}


# ── Regexes ───────────────────────────────────────────────────────────────────

TOURNEY_HEADER_RE = re.compile(
    r"^(.+?) - (\d{1,2}/\d{1,2}(?:/\d{2,4})?(?:\s*-\s*\d{1,2}/\d{1,2}(?:/\d{2,4})?)?)$"
)
WEIGHT_RE = re.compile(r"^\d{2,3}$")
ROUND_GROUP_RE = re.compile(r"\(\d+\s*(?:Man|Mats)\)", re.IGNORECASE)
TW_META_RE = re.compile(
    r"Teams.*Divisions.*Weights|Team:.*team|Show:.*of \d+|Event Team|Season Team",
    re.IGNORECASE,
)
WL_SUFFIX_RE = re.compile(r"\s+\d+-\d+$")


# ── Shared helpers ────────────────────────────────────────────────────────────

def clean_line(raw: str) -> str:
    """Normalize whitespace variants introduced by RTF / TW exports."""
    return (
        raw.replace("\xa0", " ")   # non-breaking space
           .replace(" ", " ") # line separator
           .replace(" ", " ")
           .strip()
    )


def strip_wl(name: str) -> str:
    return WL_SUFFIX_RE.sub("", name).strip()


def normalize_school(raw: str) -> str:
    return re.sub(r"\s+", " ", raw).strip().rstrip(" -")


def parse_result(raw: str) -> tuple[str, Optional[str]]:
    raw = raw.strip()
    if raw.lower() in ("bye", ""):
        return "BYE", None
    if raw.lower().startswith("fall"):
        parts = raw.split(None, 1)
        return "Fall", (parts[1] if len(parts) > 1 else None)
    if raw.lower() in ("for.", "for", "forfeit", "m. for.", "m. for", "medical forfeit"):
        return "Forfeit", None
    if raw.lower() in ("dff", "double forfeit"):
        return "DFF", None
    parts = raw.split(None, 1)
    return parts[0], (parts[1] if len(parts) > 1 else None)


def extract_name_school(s: str) -> tuple[str, str]:
    """Extract (name, school) from 'Name (School) [W-L]' strings."""
    s = s.strip()
    m = re.match(r"^(.+?) \((.+)\)(?:\s+\d+-\d+)?$", s)
    if m:
        return strip_wl(m.group(1)), normalize_school(m.group(2))
    pend = s.rfind(")")
    if pend >= 0:
        pstart = s.rfind("(", 0, pend)
        if pstart >= 0:
            return strip_wl(s[:pstart].strip()), normalize_school(s[pstart + 1:pend])
    return strip_wl(s), ""


def looks_like_school(line: str) -> bool:
    if not line or len(line) > 80:
        return False
    if any(c.isdigit() for c in line[:3]):
        return False
    if line.lower() in ("yes", "no", "weight", "summary", "stats", "tw event"):
        return False
    if " - " in line and re.search(r"\d{1,2}/\d{1,2}", line):
        return False
    if "(" in line and ")" in line:
        return False
    return bool(re.match(r"^[A-Za-z\'\. &/\-,]+\s*-?\s*$", line))


def detect_format(lines: list[str], lookahead: int = 200) -> str:
    for line in lines[:lookahead]:
        l = clean_line(line)
        if l in ("Yes", "No", "Weight", "Summary", "Stats", "TW Event"):
            return "school_tracking"
        if ROUND_GROUP_RE.search(l):
            return "full_bracket"
        if l.lower() in (
            "consolation semifinals", "consolation quarterfinals",
            "championship semifinals", "round results",
        ):
            return "full_bracket"
    return "full_bracket"


# ── Format A parser ───────────────────────────────────────────────────────────

def parse_bout_a(line: str) -> Optional[dict]:
    """Parse one Format A match line."""
    dash = line.find(" - ")
    if dash < 0:
        return None
    round_label = line[:dash].strip()
    rest = line[dash + 3:].strip()

    if "received a bye" in rest.lower():
        m = re.match(r"^(.+?) \((.+?)\)", rest)
        if not m:
            return None
        return {
            "round": round_label,
            "wrestler1_name": strip_wl(m.group(1)), "wrestler1_school": normalize_school(m.group(2)),
            "wrestler2_name": "", "wrestler2_school": "",
            "winner": None, "result_type": "BYE", "result_detail": None,
        }

    if " over " not in rest.lower():
        return None

    result_m = re.search(r"\(([^)]+)\)$", rest)
    if not result_m:
        return None
    result_raw = result_m.group(1)
    rest2 = rest[:result_m.start()].strip()

    trans = re.search(r"\bwon (?:by|in) .+? over\b", rest2, re.IGNORECASE)
    if not trans:
        return None

    name1, school1 = extract_name_school(rest2[:trans.start()])
    name2, school2 = extract_name_school(rest2[trans.end():])
    rt, rd = parse_result(result_raw)

    return {
        "round": round_label,
        "wrestler1_name": name1, "wrestler1_school": school1,
        "wrestler2_name": name2, "wrestler2_school": school2,
        "winner": 1, "result_type": rt, "result_detail": rd,
    }


def parse_format_a(lines: list[str]) -> tuple[list[dict], list[dict]]:
    bouts: list[dict] = []
    placements: list[dict] = []
    current_weight: Optional[int] = None

    SKIP_LOWER = {
        "consolation semifinals", "consolation quarterfinals",
        "championship semifinals", "round results",
        "seventh place", "fifth place", "third place", "first place",
    }

    for raw in lines:
        line = clean_line(raw)
        if not line:
            continue
        if WEIGHT_RE.match(line):
            current_weight = int(line)
            continue
        if current_weight is None:
            continue
        if ROUND_GROUP_RE.search(line) or line.lower() in SKIP_LOWER:
            continue

        bout = parse_bout_a(line)
        if bout is None:
            continue
        bout["weight_class"] = current_weight
        bouts.append(bout)

        rn = bout["round"].lower().strip()
        if rn in PLACE_ROUNDS:
            w1, w2 = PLACE_ROUNDS[rn]
            if bout["winner"] == 1 and bout["wrestler1_name"]:
                placements.append({"weight_class": current_weight, "place": w1,
                                   "wrestler_name": bout["wrestler1_name"],
                                   "school_name": bout["wrestler1_school"]})
            if bout["wrestler2_name"]:
                placements.append({"weight_class": current_weight, "place": w2,
                                   "wrestler_name": bout["wrestler2_name"],
                                   "school_name": bout["wrestler2_school"]})

    return bouts, placements


# ── Format B parser ───────────────────────────────────────────────────────────

def parse_bout_b(line: str) -> Optional[dict]:
    """Parse one Format B match line (with round prefix)."""
    dash = line.find(" - ")
    if dash < 0:
        return None
    round_label = line[:dash].strip()
    rest = line[dash + 3:].strip()

    if "received a bye" in rest.lower():
        m = re.match(r"^(.+?) \((.+?)\)", rest)
        if not m:
            return None
        return {
            "round": round_label,
            "wrestler1_name": m.group(1).strip(), "wrestler1_school": normalize_school(m.group(2)),
            "wrestler2_name": "", "wrestler2_school": "",
            "winner": None, "result_type": "BYE", "result_detail": None,
        }

    if " over " not in rest.lower():
        return None

    result_m = re.search(r"\(([^)]+)\)$", rest)
    result_raw = result_m.group(1) if result_m else ""
    rest2 = rest[:result_m.start()].strip() if result_m else rest

    over_idx = rest2.lower().rfind(" over ")
    if over_idx < 0:
        return None

    name1, school1 = extract_name_school(rest2[:over_idx])
    name2, school2 = extract_name_school(rest2[over_idx + 6:])
    rt, rd = parse_result(result_raw)

    return {
        "round": round_label,
        "wrestler1_name": name1, "wrestler1_school": school1,
        "wrestler2_name": name2, "wrestler2_school": school2,
        "winner": 1, "result_type": rt, "result_detail": rd,
    }


def parse_bout_b_no_round(line: str) -> Optional[dict]:
    """Parse a bare 'Name (School) over Name (School) (Result)' line (Sam Cali style)."""
    if " over " not in line.lower() or " - " in line:
        return None
    if "(" not in line or ")" not in line:
        return None

    result_m = re.search(r"\(([^)]+)\)$", line)
    result_raw = result_m.group(1) if result_m else ""
    rest = line[:result_m.start()].strip() if result_m else line

    over_idx = rest.lower().rfind(" over ")
    if over_idx < 0:
        return None

    name1, school1 = extract_name_school(rest[:over_idx])
    name2, school2 = extract_name_school(rest[over_idx + 6:])
    if not name1 or not name2:
        return None
    rt, rd = parse_result(result_raw)

    return {
        "round": "Unknown",
        "wrestler1_name": name1, "wrestler1_school": school1,
        "wrestler2_name": name2, "wrestler2_school": school2,
        "winner": 1, "result_type": rt, "result_detail": rd,
    }


def read_flags(cleaned: list[str], idx: int) -> tuple[Optional[str], Optional[str], int]:
    """Read up to two Yes/No flags from cleaned starting at idx. Returns (flag1, flag2, new_idx)."""
    flag1: Optional[str] = None
    flag2: Optional[str] = None
    la = 0
    while la < 6 and idx < len(cleaned):
        fl = cleaned[idx]
        idx += 1
        la += 1
        if fl in ("Yes", "No"):
            if flag1 is None:
                flag1 = fl
            elif flag2 is None:
                flag2 = fl
                break
        elif fl:
            idx -= 1
            break
    return flag1, flag2, idx


def parse_format_b(lines: list[str]) -> tuple[list[dict], list[dict]]:
    """Parse a Format B tournament section."""
    cleaned = [clean_line(l) for l in lines]

    # First pass: collect (bout, flag2, tracked_school)
    raw: list[tuple[dict, Optional[str], Optional[str]]] = []
    current_weight: Optional[int] = None
    current_school: Optional[str] = None

    i = 0
    while i < len(cleaned):
        line = cleaned[i]
        i += 1

        if not line:
            continue
        if TW_META_RE.search(line):
            continue
        if line in ("Weight", "Summary", "Stats", "TW Event"):
            continue

        if WEIGHT_RE.match(line):
            current_weight = int(line)
            continue

        # Try round-prefixed Format B line
        bout = parse_bout_b(line)

        # Try no-round bare match line
        if bout is None and current_weight is not None:
            bout = parse_bout_b_no_round(line)

        if bout is None:
            if looks_like_school(line):
                current_school = normalize_school(line)
                if current_weight is not None and " over " not in line.lower():
                    current_weight = None
            continue

        _, flag2, i = read_flags(cleaned, i)
        bout["weight_class"] = current_weight
        raw.append((bout, flag2, current_school))

    # Decide filtering: if ANY bout has TW Event=Yes → filter to Yes; else include all
    any_yes = any(f == "Yes" for _, f, _ in raw)

    bouts: list[dict] = []
    school_weight_bouts: dict[str, dict[int, list[dict]]] = {}

    for bout, flag2, school in raw:
        if any_yes and flag2 != "Yes":
            continue
        b = dict(bout)
        bouts.append(b)
        if school and b.get("weight_class"):
            school_weight_bouts.setdefault(school, {})
            school_weight_bouts[school].setdefault(b["weight_class"], [])
            school_weight_bouts[school][b["weight_class"]].append(b)

    # Infer placements from last round reached per school per weight
    placements: list[dict] = []
    for school, weight_map in school_weight_bouts.items():
        for weight, wbouts in weight_map.items():
            if not wbouts:
                continue
            s_w1 = sum(
                1 for b in wbouts
                if normalize_school(b["wrestler1_school"]).lower() == school.lower()
            )
            s_w2 = sum(
                1 for b in wbouts
                if normalize_school(b["wrestler2_school"]).lower() == school.lower()
            )
            tracked_side = 1 if s_w1 >= s_w2 else 2

            best = max(wbouts, key=lambda b: ROUND_PRIORITY.get(b["round"].lower().strip(), 0))
            rn = best["round"].lower().strip()
            won = best["winner"] == tracked_side
            name = best["wrestler1_name"] if tracked_side == 1 else best["wrestler2_name"]

            if rn in PLACE_FROM_WIN and won:
                place = PLACE_FROM_WIN[rn]
            elif rn in PLACE_FROM_LOSS and not won:
                place = PLACE_FROM_LOSS[rn]
            else:
                continue

            placements.append({
                "weight_class": weight, "place": place,
                "wrestler_name": name, "school_name": school,
            })

    return bouts, placements


# ── Top-level parser ──────────────────────────────────────────────────────────

def parse_rtf_text(text: str, only: Optional[str] = None) -> list[dict]:
    lines = text.splitlines()
    tournament_starts: list[tuple[int, str, str]] = []

    for i, raw in enumerate(lines):
        line = clean_line(raw)
        m = TOURNEY_HEADER_RE.match(line)
        if m:
            tournament_starts.append((i, m.group(1).strip(), m.group(2).strip()))

    results = []
    for idx, (line_idx, name, date_raw) in enumerate(tournament_starts):
        if only and only.lower() not in name.lower():
            continue

        next_start = tournament_starts[idx + 1][0] if idx + 1 < len(tournament_starts) else len(lines)
        section = lines[line_idx + 1:next_start]

        source_format = detect_format(section)

        if source_format == "full_bracket":
            bouts, placements = parse_format_a(section)
        else:
            bouts, placements = parse_format_b(section)

        results.append({
            "name": name,
            "date_raw": date_raw,
            "source_format": source_format,
            "bout_count": len(bouts),
            "placement_count": len(placements),
            "bouts": bouts,
            "placements": placements,
        })

    return results


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Parse tournament RTF plain-text export")
    ap.add_argument("input", help="Plain text file converted from RTF")
    ap.add_argument("--out", default=None, help="Output JSON path (default: stdout)")
    ap.add_argument("--only", default=None, help="Filter to one tournament by name substring")
    ap.add_argument("--summary", action="store_true", help="Print summary table instead of JSON")
    args = ap.parse_args()

    text = open(args.input, encoding="utf-8").read()
    parsed = parse_rtf_text(text, only=args.only)

    if args.summary:
        print(f"{'#':>3}  {'Fmt':<15}  {'Bouts':>6}  {'Places':>6}  Tournament")
        print("-" * 80)
        for i, t in enumerate(parsed, 1):
            fmt = "full_bracket" if t["source_format"] == "full_bracket" else "school_trk"
            print(f"{i:>3}  {fmt:<15}  {t['bout_count']:>6}  {t['placement_count']:>6}  {t['name']}")
        print(f"\n{len(parsed)} tournaments")
    else:
        out = json.dumps(parsed, indent=2, ensure_ascii=False)
        if args.out:
            open(args.out, "w", encoding="utf-8").write(out)
            print(f"Wrote {len(parsed)} tournaments to {args.out}", file=sys.stderr)
        else:
            print(out)
