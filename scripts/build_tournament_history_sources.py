#!/usr/bin/env python3
"""Tournament history source inventory (Kyle 2026-11-20: the admin Tournament Hub's History grid shows, per tournament
and season, what's in the system, what we have a file for that can be parsed (yellow), what we have but can't parse
(orange — a scanned page), and what we have nothing for (red)). Reads every file in
~/Desktop/wrestling_brackets/History/<tournament folder> and writes src/lib/tournamentHistorySources.ts:
per side, tournament and season, the files and what each can give — the podium (how deep: 2 = finals, 3, 8) and the
bouts (parseable / scanned). Rerun after adding files:  python3 scripts/build_tournament_history_sources.py"""
import csv, json, os, re, subprocess, sys
from collections import defaultdict

ROOT = os.path.expanduser('~/Desktop/wrestling_brackets/History')
OUT = os.path.join(os.path.dirname(__file__), '..', 'src', 'lib', 'tournamentHistorySources.ts')
# folder → series key per side ('M' boys, 'F' girls); a file names its side ("Girls", "Women") or is boys
FOLDERS = {'Powerade': 'powerade', 'Beast of East': 'beast', 'Iron Man': 'ironman', 'East Coast Catholic Classic': 'eccc', 'Robin Leff': 'leff', 'Sam Cali': 'samcali'}
# the season-start year of each series' 1st edition, for files named only by edition ("10th.pdf")
FIRST_EDITION = {('M', 'beast'): 1993, ('F', 'beast'): 2022}
MONTHS = {m: i + 1 for i, m in enumerate(['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'])}

def season_of(year, month=12):
    start = year if month >= 7 else year - 1
    return f'{start}-{(start + 1) % 100:02d}'

def text_of(path):
    ext = path.lower().rsplit('.', 1)[-1]
    try:
        if ext == 'pdf':
            return subprocess.run(['pdftotext', '-layout', path, '-'], capture_output=True, text=True, timeout=120).stdout, int(re.search(r'Pages:\s+(\d+)', subprocess.run(['pdfinfo', path], capture_output=True, text=True).stdout).group(1))
        if ext in ('docx', 'rtf', 'doc'):
            return subprocess.run(['textutil', '-convert', 'txt', '-stdout', path], capture_output=True, text=True, timeout=120).stdout, 1
    except Exception:
        pass
    return '', 0

RESULT = re.compile(r'\b(fall|dec|md|tf|maj|pin(?:ned)?|tech|forf|inj|dq)\b|\b\d{1,2}-\d{1,2}\b', re.I)

def podium_depth(text):
    t = text.lower()
    if re.search(r'\b(8th|eighth|7th|seventh)\b', t): return 8
    if re.search(r'\b(6th|5th|fifth|sixth)\b', t): return 6
    if re.search(r'\b(4th|3rd|third)\b', t): return 3
    if re.search(r'\b(final|champion|1st|runner)', t): return 2
    return 0

def date_in(text):
    m = re.search(r'(january|february|march|april|may|june|july|august|september|october|november|december)\b[^0-9]{0,20}\d{1,2}(?:st|nd|rd|th)?(?:\s*[-&–]\s*\d{1,2}(?:st|nd|rd|th)?)?,?\s*((?:19|20)\d\d)', text[:3000], re.I)
    return (int(m.group(2)), MONTHS[m.group(1).lower()]) if m else None

def read_csv_rows(path):
    with open(path, newline='', encoding='utf-8', errors='replace') as fh:
        r = csv.reader(fh)
        hdr = [h.strip().lstrip('=').strip('"') for h in next(r)]
        for row in r:
            yield dict(zip(hdr, [c.strip().lstrip('=').strip('"') for c in row]))

def side_of(event_or_name):
    s = event_or_name.lower()
    junior = re.search(r'\bjunior\b|\bmiddle school\b', s)     # not "Middletown"
    if junior and 'girl' in s: return 'mixed'
    if junior: return 'junior'
    if 'women' in s or 'girl' in s: return 'F'
    return 'M'

PLACE = re.compile(r'1st|first place|finals?$|place', re.I)
sources = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {'files': [], 'podium': 0, 'podiumScan': False, 'bouts': None})))
unassigned = []

def add(side, key, season, file, holds, podium=0, podium_scan=False, bouts=None):
    c = sources[side][key][season]
    c['files'].append({'file': file, 'holds': holds})
    c['podium'] = max(c['podium'], podium)
    c['podiumScan'] = c['podiumScan'] or podium_scan
    rank = {None: 0, 'scan': 1, 'yes': 2}
    if rank[bouts] > rank[c['bouts']]: c['bouts'] = bouts

import hashlib
seen_files = set()
for folder, key in FOLDERS.items():
    d = os.path.join(ROOT, folder)
    if not os.path.isdir(d): continue
    for f in sorted(os.listdir(d)):
        path = os.path.join(d, f)
        if os.path.isdir(path) or f.startswith('.'): continue
        digest = hashlib.md5(open(path, 'rb').read()).hexdigest()
        if digest in seen_files: continue          # the same file saved twice
        seen_files.add(digest)
        rel = f'{folder}/{f}'
        ext = f.lower().rsplit('.', 1)[-1]
        if ext == 'csv':
            by = defaultdict(list)
            for row in read_csv_rows(path):
                by[side_of(row.get('Event', ''))].append(row)
            for side, rows in by.items():
                if side not in ('M', 'F'):
                    continue   # junior → the MS Hub; mixed junior + girls → split later
                m, dd, y = (int(x) for x in rows[0]['Date'].split('/'))
                real = [r for r in rows if r.get('Losing Wrestler') and 'bye' not in (r.get('Win Type') or '').lower()]
                labelled = sum(1 for r in real if (r.get('Round') or '').strip())
                bouts = 'yes' if real and labelled / len(real) >= 0.9 else 'scan'
                podium = 8 if any(PLACE.search(r.get('Round') or '') for r in rows) else 0
                add(side, key, season_of(y, m), rel, f'CSV, {len(real)} bouts' + ('' if bouts == 'yes' else ' (rounds blank — bracket order unknown)'), podium, podium == 0, bouts)
            continue
        if ext not in ('pdf', 'docx', 'rtf', 'doc'):
            continue
        text, pages = text_of(path)
        side = side_of(f + ' ' + text[:400])    # "1st Annual Girls Beast of the East Results – 2022" says it inside
        if side not in ('M', 'F'): side = 'M'
        chars = len(text.strip())
        scanned = pages and chars / max(pages, 1) < 150
        # a multi-year history ("1967 Finals" …): one cell per year
        blocks = re.split(r'\n\s*((?:19|20)\d\d)\s+Finals\b', text)
        if len(blocks) > 5:
            for i in range(1, len(blocks) - 1, 2):
                y = int(blocks[i])
                add(side, key, season_of(y), rel, 'year-by-year history: finals', 2)
            continue
        years = [int(y) for y in re.findall(r'(?<!\d)((?:19|20)\d\d)(?!\d)', f)]
        when = date_in(text)
        # "10th" / "3rd Annual …": the edition number from the first one (boys Beast 1st = Jan 1994; girls Beast 1st = 2022)
        nth = re.match(r'^(\d+)(?:st|nd|rd|th)\b', f) or re.search(r'\b(\d+)(?:st|nd|rd|th) annual', (f + ' ' + text[:300]).lower())
        first = FIRST_EDITION.get((side, key))
        if when: season = season_of(*when)
        elif years: season = season_of(years[0])
        elif nth and first is not None: season = season_of(first + int(nth.group(1)) - 1)
        else:
            unassigned.append({'side': side, 'series': key, 'file': rel, 'holds': f'{pages} pages' + (', scanned' if scanned else '')})
            continue
        if scanned:
            add(side, key, season, rel, f'{pages}-page scan', 0, True, 'scan')
            continue
        results = len(RESULT.findall(text))
        depth = podium_depth(text)
        bouts = 'yes' if results >= 300 else None
        if bouts and depth < 8: depth = 8          # a full bracket gives the whole podium
        holds = f'{pages}-page {ext.upper()}' + (', full bracket' if bouts else f', places to {depth}' if depth else '')
        add(side, key, season, rel, holds, depth, False, bouts)

out = {s: {k: dict(v) for k, v in by.items()} for s, by in sources.items()}
ts = f'''// GENERATED by scripts/build_tournament_history_sources.py — the files in ~/Desktop/wrestling_brackets/History and what
// each can give the Tournament Hub's History grid. Don't edit; rerun the script after adding files.
export type HistorySourceCell = {{ files: {{ file: string; holds: string }}[]; podium: number; podiumScan: boolean; bouts: 'yes' | 'scan' | null }}
// season-literal-ok-start — the seasons the files cover are data
export const HISTORY_SOURCES: Record<'M' | 'F', Record<string, Record<string, HistorySourceCell>>> = {json.dumps({'M': out.get('M', {}), 'F': out.get('F', {})}, indent=1)}
// season-literal-ok-end
export const HISTORY_UNASSIGNED: {{ side: string; series: string; file: string; holds: string }}[] = {json.dumps(unassigned, indent=1)}
'''
open(OUT, 'w').write(ts)
n = sum(len(v) for by in out.values() for v in by.values())
print(f'{n} tournament-seasons with files; {len(unassigned)} files with no year; wrote {os.path.relpath(OUT)}')
for s, by in out.items():
    for k, v in by.items():
        print(f'  {s} {k}: {len(v)} seasons ({min(v)} … {max(v)})')
for u in unassigned: print('  no year:', u['file'], u['holds'])
