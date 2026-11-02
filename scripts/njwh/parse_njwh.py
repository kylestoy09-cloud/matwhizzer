#!/usr/bin/env python3
"""Parse njwrestlinghistory.info (boys NJSIAA history) into JSON for the trivia game.

Input: the site's pages saved as HTML (one file per page, named by path, e.g. 2025states.html).
Output (data/njwh/):
  state_medalists.json   [{year, weight, place, name, school}]     from the per-year / decade medal pages
  state_champions.json   [{year, weight, name, school}]            from /state-champions
  region_champions.json  [{region, year, weight, name, school}]    from /region-N-champs
  group_champions.json   [{group, year, champion, runner_up}]      team titles
  sectional_champions.json [{group, year, section, champion}]
Run: python3 scripts/njwh/parse_njwh.py <raw_html_dir>
Source: NJ Wrestling History (njwrestlinghistory.info) — credit it wherever this is shown.
"""
import html, json, os, re, sys

RAW = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'njwh')
os.makedirs(OUT, exist_ok=True)

def lines(page):
    s = open(os.path.join(RAW, f'{page}.html'), encoding='utf-8', errors='replace').read()
    body = s[s.find('<body'):]
    t = html.unescape(re.sub(r'<[^>]+>', '\n', re.sub(r'<(script|style)[^>]*>.*?</\1>', '', body, flags=re.S)))
    L = [re.sub(r'\s+', ' ', l).strip() for l in t.split('\n')]
    L = [l for l in L if l]
    # rejoin years the site's markup splits ("2" / "022")
    J = []
    for l in L:
        if J and re.fullmatch(r'[12]', J[-1]) and re.fullmatch(r'\d{3}', l): J[-1] += l
        else: J.append(l)
    L = J
    # the content starts after the last navigation entry ("Region 8" under Advancement)
    nav_end = max(i for i, l in enumerate(L[:200]) if l == 'Region 8')
    end = next((i for i, l in enumerate(L) if l.startswith('CONTACT:')), len(L))
    return L[nav_end + 1:end]

WEIGHT = re.compile(r'^(\d{2,3}|Hwt|HWT|Heavyweight)$')
PERSON = re.compile(r'^(.*?)\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)\s*$')   # "Name (School)", school may hold parentheses

def weight(w):
    return 'Hwt' if w.lower().startswith('h') else int(w)

def person(s):
    s = s.strip()
    # the site's own typos: "Name (School" (no closing bracket), "(School0", "(School))"
    s = re.sub(r'\)+$', ')', s)
    s = re.sub(r'\((.*?)0$', r'(\1)', s)
    if '(' in s and not s.endswith(')'): s += ')'
    m = PERSON.match(s)
    if m: return (m.group(1).strip(), m.group(2).strip())
    # older champion lists write "Name - School"
    m = re.match(r'^(.*?)(?:\s+-\s*|\s*-\s+)(.+)$', s)          # "Name - School", "Name- School", "Name -School"
    if m:
        return (m.group(1).strip(), m.group(2).strip())
    return (s, None)

problems, problems_soft = [], []

# ── State medalists: "YYYY NJSIAA ... Medal Winners" / weight / "1st: Name (School)" ──────────
# Older years have tied places ("3rd/4th:" when consolation finals weren't wrestled): kept as
# place 3 with tie "3rd/4th". Recent pages split "1st: Name (School)" over several lines.
medalists, vacant, no_school = [], [], []
PLACE = re.compile(r'^(\d)(?:st|nd|rd|th)(?:/(\d)(?:st|nd|rd|th))?:?\s*(.*)$')
pages = sorted(f[:-5] for f in os.listdir(RAW) if re.match(r'^\d{4}(-\d{4})?states\.html$', f))
for page in pages:
    year = wt = None
    block = 0
    pending = None                                   # a place whose name/school continues on later lines
    def flush():
        global pending
        if pending:
            p, tie, text = pending
            name, school = person(text)
            if not name or name.strip('-').strip() == '' or name.upper() == 'NONE':
                vacant.append({'year': year, 'weight': wt, 'place': p})          # nobody earned this place
            else:
                medalists.append({'year': year, 'weight': wt, 'place': p, 'tie': tie, 'name': name, 'school': school, '_block': f'{page}#{block}'})
                if not school: no_school.append(f'{year} {wt} {p}: {name}')
        pending = None
    for l in lines(page):
        m = re.match(r'^(\d{4})\s*NJSIAA .*(Medal|Medalist|Winners)', l)
        if m: flush(); year, wt = int(m.group(1)), None; block += 1; continue
        if WEIGHT.match(l): flush(); wt = weight(l); continue
        m = PLACE.match(l)
        if m and year and wt is not None:
            flush()
            tie = f'{m.group(1)}/{m.group(2)}' if m.group(2) else None
            pending = (int(m.group(1)), tie, m.group(3))
            if m.group(3).rstrip().endswith(')'): flush()
            continue
        if pending and not pending[2].rstrip().endswith(')') and '(' in pending[2]:
            flush()                                   # an unclosed "(School" followed by a new entry
        if pending:                                   # continuation of a split line
            pending = (pending[0], pending[1], (pending[2] + ' ' + l).strip())
            if l.rstrip().endswith(')'): flush()
            continue
        if year and wt is not None:
            problems.append(f'{page}: unread line "{l[:80]}"')
    flush()

# ── Champions lists: "YYYY" then "106: Name (School)" (also "106: Name (School) 113: ..." on one line) ──
def champion_list(page):
    out, year = [], None
    text = ' '.join(lines(page))
    text = re.sub(r'\b((?:19|20)\d)\s+(\d)(?=\s+(?:\d{2,3}|Hwt|HWT):)', r'\1\2', text)   # "201 4" -> 2014
    text = re.sub(r'\)\s+(\d{2,3}|Hwt)\s+(?=[A-Z])', r') \1: ', text)                     # "(Westfield) 113 Zachary" -> "113:"
    # the champions page ends with lists of multi-time champions: not year results
    text = re.split(r'\b\d-Time Champions\b', text)[0]
    # a year may carry a note (the 2021 COVID season): "2021 (North 1 Super Region)",
    # "2021 Central Super Region", "2021 South Super Region Champions"
    NOTE = r'(?:\s*\(([^)]*)\)|\s+((?:[A-Z]\w*\s+){0,3}Super Region)(?:\s+Champions)?)?'
    SPLIT = r'(?=\b(?:19|20)\d{2}\b(?:\s*\([^)]*\)|\s+(?:[A-Z]\w*\s+){0,3}Super Region(?:\s+Champions)?)?\s+(?:\d{2,3}|Hwt|HWT):)'
    for tok in re.split(SPLIT, text):
        m = re.match(r'^((?:19|20)\d{2})' + NOTE + r'\s+(.*)$', tok.strip(), re.S)
        if not m: continue
        year, note = int(m.group(1)), (m.group(2) or m.group(3) or None)
        entries = re.findall(r'\b(\d{2,3}|Hwt|HWT):\s*(.*?)(?=\s+\b(?:\d{2,3}|Hwt|HWT):|$)', m.group(4))
        has_hwt = any(w.lower().startswith('h') for w, _ in entries)
        for i, (w, who) in enumerate(entries):
            # two people under one weight: the site left out the label of the last one ("185: A (X) B (Y)")
            people = re.findall(r'[^()]+\([^()]*(?:\([^()]*\)[^()]*)*\)', who)
            if len(people) > 1:
                if i == len(entries) - 1 and not has_hwt and len(people) == 2:
                    entries_fix = [(w, people[0]), ('Hwt', people[1])]
                    problems_soft.append(f'{page} {year}: "{who[:70]}" -> {w} and Hwt (label missing on the site)')
                else:
                    problems.append(f'{page} {year} {w}: several people "{who[:70]}"'); entries_fix = [(w, people[0])]
            else:
                entries_fix = [(w, who)]
            for ww, ppl in entries_fix:
                name, school = person(ppl)
                row = {'year': year, 'weight': weight(ww), 'name': name, 'school': school}
                if note: row['note'] = note
                if row not in out: out.append(row)      # region 3's page lists everything twice
    return out

state_champions = champion_list('state-champions')

# The site repeats a year heading: on the 1960s page the 1961 medalists are headed "1960".
# A block of a repeated year gets the neighbouring year whose state champions its 1st places
# match (the champions list has 1961: Rocky Gilmore, Wayne Hicks, ...).
def key(n): return re.sub(r'[^a-z]', '', n.lower().split()[-1]) if n.split() else ''   # last name
champs = {(c['year'], str(c['weight'])): key(c['name']) for c in state_champions}
blocks = {}
for m in medalists: blocks.setdefault(m['_block'], []).append(m)
by_year = {}
for b, ms in blocks.items(): by_year.setdefault(ms[0]['year'], []).append(b)
relabelled = []
for y, bs in by_year.items():
    if len(bs) < 2: continue
    for b in bs:
        firsts = [m for m in blocks[b] if m['place'] == 1]
        score = lambda yy: sum(champs.get((yy, str(m['weight']))) == key(m['name']) for m in firsts)
        best = max([y - 1, y + 1], key=score)
        if score(best) > score(y):
            for m in blocks[b]: m['year'] = best
            relabelled.append(f'{b.split("#")[0]}: a block headed {y} matches the {best} champions ({score(best)} of {len(firsts)} vs {score(y)}) -> {best}')
for m in medalists: m.pop('_block')

region_champions = []
for r in range(1, 9):
    for c in champion_list(f'region-{r}-champs'):
        region_champions.append({'region': r, **c})

# ── Team titles: "Group 5" / "Year | Champion | Runner-Up" / rows ─────────────────────────────
def team_table(page, kind):
    out, group, cols, row = [], None, None, []
    for l in lines(page):
        if re.match(r'^(Group \w+|Non-?Public \w+)$', l, re.I):
            group, cols, row = l, None, []; continue
        if l == 'Year':
            cols, row = [], []; continue
        if cols is not None and not re.match(r'^(19|20)\d{2}$', l) and not row:
            cols.append(l); continue                      # header cells after "Year"
        if re.match(r'^(19|20)\d{2}$', l):
            if row: problems.append(f'{page} {group}: row with a blank cell, left out {row}')
            row = [int(l)]; continue
        if row:
            row.append(l)
            if len(row) == len(cols) + 1:
                y, *vals = row
                if kind == 'group':
                    out.append({'group': group, 'year': y, 'champion': vals[0], 'runner_up': vals[1] if len(vals) > 1 else None})
                else:
                    for sec, champ in zip(cols, vals):
                        out.append({'group': group, 'year': y, 'section': sec, 'champion': champ})
                row = []
    return out

# "Name School)" (the site dropped the opening bracket): match the end against known schools
known = {r['school'] for r in medalists + state_champions + region_champions if r.get('school')}
fixed_brackets = []
for r in medalists + state_champions + region_champions:
    if r.get('school') or not r['name'].endswith(')'): continue
    words = r['name'][:-1].split()
    for k in range(1, min(5, len(words))):
        cand = ' '.join(words[-k:])
        if cand in known:
            r['name'], r['school'] = ' '.join(words[:-k]), cand; fixed_brackets.append(f"{r['name']} ({cand})"); break

group_champions = team_table('group-champs', 'group')
sectional_champions = team_table('sectional-champs', 'section')

# Corrections from other sources (data/njwh/corrections.json): each names its source; a
# correction that matches nothing is reported, never silently ignored
files = {'state_medalists': medalists, 'state_champions': state_champions, 'region_champions': region_champions}
cpath = os.path.join(OUT, 'corrections.json')
for c in (json.load(open(cpath)) if os.path.exists(cpath) else []):
    hits = [r for r in files[c['file']] if all(r.get(k) == v for k, v in c['match'].items())]
    if len(hits) != 1: problems.append(f"correction matched {len(hits)} rows: {c['match']}"); continue
    hits[0].update(c['set']); hits[0]['corrected_from'] = c['source']

for name, rows in [('state_medalists', medalists), ('state_champions', state_champions), ('region_champions', region_champions),
                   ('group_champions', group_champions), ('sectional_champions', sectional_champions)]:
    json.dump(rows, open(os.path.join(OUT, f'{name}.json'), 'w'), indent=1)
    print(f'{name}: {len(rows)} rows')
print(f'vacant places: {len(vacant)} | medalists with no school on the site: {len(no_school)} {no_school}')
print('relabelled:', relabelled)
print('missing bracket fixed from known schools:', fixed_brackets)
print('site labels missing:', problems_soft)
print(f'unread lines: {len(problems)}')
for p in problems[:25]: print('  ', p)
