"""Kyle 2026-11-18: Super 32 high school places from the old Brute bracket PDFs (2005 "HS (1).pdf", 2006 "HS.pdf",
2007 bracket07.pdf, 2008.pdf — the year of the two undated files from their wrestlers' grades against 2007's).
Three pages a weight: the top and bottom halves of the championship bracket, then the consolation page.
  1st  the "Champion" box; 2nd the other finalist — the semifinal winner in the last column of the other half
  3rd  the "3rd Place" box; 4th the other name in the consolation page's last column (the two consolation finalists)
  5th / 7th  the boxes at the foot of the consolation page, which list both wrestlers; the loser is 6th / 8th
School and state from the first-round lines ("Name School - ST grade").
Prints TSV: year, weight, place, place_to, name, school, state.
   python3 scripts/transcribe/super32_brackets.py <pdf> <year>"""
import sys, re, fitz
pdf, year = sys.argv[1], int(sys.argv[2])
d = fitz.open(pdf)

ENTRANTS = {}
FULL_STATES = {'New Jersey': 'NJ', 'New York': 'NY', 'Pennsylvania': 'PA', 'West Virginia': 'WV', 'Ohio': 'OH', 'Virginia': 'VA', 'North Carolina': 'NC', 'South Carolina': 'SC', 'Georgia': 'GA', 'Florida': 'FL', 'Maryland': 'MD', 'Delaware': 'DE', 'Michigan': 'MI', 'Illinois': 'IL', 'Indiana': 'IN', 'Tennessee': 'TN', 'Texas': 'TX', 'Oregon': 'OR', 'California': 'CA', 'Alabama': 'AL', 'Missouri': 'MO', 'Iowa': 'IA', 'Kentucky': 'KY', 'Connecticut': 'CT', 'Massachusetts': 'MA', 'Minnesota': 'MN', 'Wisconsin': 'WI', 'Oklahoma': 'OK', 'Arizona': 'AZ', 'Colorado': 'CO'}

def cap(t):
    """2013's capitals → "Matthew Barber" (McX, O'X, hyphens; II/III kept)"""
    if re.search(r'[a-z]', t) or not t: return t
    t = ' '.join(x if x in ('II', 'III', 'IV') else x.capitalize() for x in t.split())
    t = re.sub(r"\b(Mc|O')([a-z])", lambda m: m.group(1) + m.group(2).upper(), t)
    return re.sub(r'-([a-z])', lambda m: '-' + m.group(1).upper(), t)

def lines(p):
    out = []
    for b in p.get_text('dict')['blocks']:
        for l in b.get('lines', []):
            t = ' '.join(''.join(s['text'] for s in l['spans']).split())
            if t: out.append((l['bbox'][0], l['bbox'][1], t))
    return out

NOT = re.compile(r"^(BYE|Mat\b|L-|Champion|\d|F \d|fall|Dec|MD|TF|Sunday|Saturday|Monday|HS$|.*Lbs$|.*Super ?32|.*Place$|.* - [A-Z]{2}\b)", re.I)
def is_name(t): return not NOT.match(t) and re.fullmatch(r"[A-Z][A-Za-z.'`’\-]*( [A-Za-z.'`’\-]+)+", t) is not None

def near(L, label, dy=30, dx=80):
    """the box over a label: lines just above it"""
    lab = next(x for x in L if x[2] == label)
    return lab, [x for x in L if lab[1] - dy <= x[1] < lab[1] and abs(x[0] - lab[0]) < dx]

out = []
def brute(i):
    """the Brute layout (103–145 in 2007; every weight in 2005, 2006, 2008). Each bracket line is tied back to the
    first-round entrant list — the later columns print the full name (2006, 2007) or only the last name (2005, 2008),
    and the schools on their own lines look like names"""
    # three pages (two halves + consolation), or two when the whole bracket fits one page
    two = '3rd Place' in d[i + 1].get_text()
    p1, p2, p3 = lines(d[i]), ([] if two else lines(d[i + 1])), lines(d[i + 1] if two else d[i + 2])
    w = next(t for _, _, t in p1 if t.endswith('Lbs')).split()[0]
    later = set(t for _, _, t in p1 + p2 + p3)
    ents = []
    for x0, y0, t in p1 + p2:
        # the first-round lines (a few are indented): name, school, grade and/or state
        if x0 > 120 or t == 'BYE' or len(t.split()) < 3 or not re.search(r'\d\s*([A-Z]{2})?\s*\d*$|-\s?[A-Z]{2}$|[A-Z]{2}\s+\[\d+\]$', t): continue
        e = re.sub(r'^\(\d+\)', '', t).strip()
        e = re.sub(r'\s+([A-Z]{2})\s+\[(\d+)\]$', r' - \1 \2', e)           # 2013: "MATTHEW BARBER   NJ  [12]"
        for full_st, ab in FULL_STATES.items(): e = re.sub(rf'(\d)\s+{full_st}$', rf'\1 {ab}', e)   # "10 Ohio"
        e = re.sub(r'(\d{1,2}\s+[A-Z]{2})\s*\d+$', r'\1', e)          # "10 PA81": a bout number run into the state
        # "Name School - ST  10", "Name School  10 ST", "Name School -ST", "Name School   10" (a bout number can run
        # into the grade: "- PA  923")
        m = re.match(r'^(.*?)(?:\s*[-–]\s*([A-Z]{2}))?\s*(?:(\d{1,4})\s*)?([A-Z]{2})?$', e)
        body, st = m.group(1).strip(), m.group(2) or m.group(4) or ''
        toks = body.split()
        name = None
        for k in (2, 3, 4):                           # the full name as printed later
            if ' '.join(toks[:k]) in later: name = toks[:k]; break
        if not name:
            for k in (2, 3, 4):                       # the last name as printed later
                if ' '.join(toks[1:k]) in later: name = toks[:k]; break
        name = name or toks[:2]
        ents.append({'full': ' '.join(name), 'last': ' '.join(name[1:]), 'school': ' '.join(toks[len(name):]).rstrip(' -'), 'state': st})
    ENTRANTS[w] = ents
    def ent(t, hint=None):
        """the entrant a bracket line names; a last name two entrants share is settled by the school printed under it"""
        hit = [e for e in ents if t == e['full']] or [e for e in ents if t == e['last']]
        if not hit and len(t) >= 6: hit = [e for e in ents if e['full'].startswith(t) or e['last'].startswith(t)]
        if len(hit) > 1 and hint: hit = [e for e in hit if (e['school'] and (e['school'].startswith(hint) or hint.startswith(e['school']))) or e['state'] == hint]
        return hit[0] if len(hit) == 1 else None
    def at(L, x):
        """ent() for a line, with the next line down as the school hint"""
        below = [y for y in L if 0 < y[1] - x[1] < 20 and abs(y[0] - x[0]) < 25 and not re.match(r'^(\d|F |Mat|fall|def|for|nc|TF|MD)', y[2])]
        hint = min(below, key=lambda y: y[1])[2].split(' - ')[0] if below else None
        return ent(x[2], hint)
    def put(place, e):
        out.append((year, w, place, '', cap(e['full']), cap(e['school']), e['state']))
    def boxed(L, label):
        lab = next((x for x in L if x[2] == label), None)
        if not lab: return None, []
        return lab, [x for x in L if lab[1] - 30 <= x[1] < lab[1] and abs(x[0] - lab[0]) < 80]
    def first(box, L):
        for x in sorted(box, key=lambda x: x[1]):
            e = at(L, x)
            if e: return e
        return None
    def last_col(L, skip, above=None, known=None):
        """the names in the last column; a last name two entrants share (no school under it there) is the known
        placer of that name — the champion, or the 3rd place winner"""
        def r(x): return at(L, x) or (known if known and x[2] in (known['last'], known['full']) else None)
        ns = [x for x in L if id(x) not in skip and r(x) and (above is None or x[1] < above)]
        if not ns: return []
        mx = max(x[0] for x in ns)
        return list({id(e): e for e in (r(x) for x in ns if x[0] > mx - 15)}.values())
    def other(pair, win):
        o = [e for e in pair if e is not win]; return o[0] if len(o) == 1 else None
    # 1st / 2nd
    lab, box = boxed(p1, 'Champion')
    champ = first(box, p1)
    fin = last_col(p1, set(map(id, box)), known=champ) + last_col(p2, set(), known=champ)
    if not champ or champ not in fin or len(fin) != 2: print(f'# {year} {w}: final {[e["full"] for e in fin]}, champion {champ and champ["full"]}', file=sys.stderr)
    if champ: put(1, champ)
    if champ and other(fin, champ): put(2, other(fin, champ))
    # 3rd / 4th
    lab3, box3 = boxed(p3, '3rd Place'); deferred = None
    if lab3:
        third = first(box3, p3)
        foot = min((x[1] for x in p3 if x[2] in ('5th Place', '7th Place')), default=9999) - 60
        cf = last_col(p3, set(map(id, box3)), foot, known=third)
        deferred = None
        if len(cf) > 2:
            # 2013: the losers dropping to the 5th bout print in the same column — 4th is settled after 5th–8th: the
            # one name there that isn't 3rd or in the 5th bout
            deferred, cf = cf, []
        if not deferred and (not third or third not in cf or len(cf) != 2): print(f'# {year} {w}: consolation final {[e["full"] for e in cf]}, 3rd {third and third["full"]}', file=sys.stderr)
        if third: put(3, third)
        if third and other(cf, third): put(4, other(cf, third))
    else: print(f'# {year} {w}: no 3rd place box', file=sys.stderr)
    # 5th–8th: both wrestlers listed in the left column of the group, the winner in the box
    for label, pl in (('5th Place', 5), ('7th Place', 7)):
        lab5 = next((x for x in p3 if x[2] == label), None)
        if not lab5: print(f'# {year} {w}: no {label}', file=sys.stderr); continue
        # the pair: the column well left of the label, from a little above the box to the label's line
        # (the boxes are taller on the two-page weights: a narrow window first, then a wider one)
        for up, bup in ((35, 25), (60, 45)):
            pair_l = [x for x in p3 if lab5[1] - up < x[1] <= lab5[1] + 8 and lab5[0] - 120 < x[0] < lab5[0] - 40 and at(p3, x)]
            left = min((x[0] for x in pair_l), default=0)
            pair = list({id(e): e for e in (at(p3, x) for x in sorted(pair_l, key=lambda x: x[1]) if x[0] < left + 15)}.values())
            box5 = [x for x in p3 if lab5[1] - bup < x[1] < lab5[1] and abs(x[0] - lab5[0]) < 35]
            win = first(box5, p3)
            if len(pair) == 2: break
        if win is None:
            # "No-Contest" in the box: the school printed under it says who took the place
            bs = [x[2] for x in box5 if not at(p3, x) and not re.match(r'^(No-Contest|nc|\d|F |Mat)', x[2])]
            win = next((e for e in pair if bs and e['school'].startswith(bs[0].split(' - ')[0])), None)
        bye = any(x[2].upper() == 'BYE' and lab5[1] - 60 < x[1] <= lab5[1] + 8 and abs(x[0] - left) < 15 for x in p3)
        if win is None and len(pair) == 1 and bye: win = pair[0]          # the other side a bye (printed "BYE")
        if win is None and len(pair) == 2 and any(x[2] == 'No-Contest' for x in box5):
            # the bout not wrestled ("No-Contest", nothing under it): both share the place
            for e in pair: out.append((year, w, pl, pl + 1, e['full'], e['school'], e['state']))
            continue
        if win is None or win not in pair: print(f'# {year} {w}: {label} pair {[e["full"] for e in pair]}, winner {win and win["full"]}', file=sys.stderr)
        if win: put(pl, win)
        if win and other(pair, win): put(pl + 1, other(pair, win))
    if lab3 and deferred:
        done = {r[4] for r in out if r[0] == year and r[1] == w}
        rest = [e for e in deferred if cap(e['full']) not in done]
        if len(rest) == 1: put(4, rest[0])
        else: print(f'# {year} {w}: 4th not settled from {[e["full"] for e in deferred]}', file=sys.stderr)
        out.sort(key=lambda r: (r[0], int(r[1]), r[2]))

def spans(p):
    """every text piece of a page, in reading position (the page's rotation applied)"""
    M, out = p.rotation_matrix, []
    for b in p.get_text('dict')['blocks']:
        for l in b.get('lines', []):
            for sp in l['spans']:
                t = sp['text'].strip()
                if t: r = fitz.Rect(sp['bbox']) * M; out.append((r.x0, r.y0, t))
    return out

SCHOOL = re.compile(r'-[A-Z]{2}$')
def summary(pages, w):
    """the second layout (the heavier weights): a place list "1st  School-ST  Name" (or "Name  School-ST") beside
    the bracket, split over the weight's pages"""
    got = {}
    for p in pages:
        S = spans(p)
        for lab in [x for x in S if re.fullmatch(r'[1-8](st|nd|rd|th)', x[2])]:
            row = [x for x in S if abs(x[1] - lab[1]) <= 1.5 and x is not lab and not re.fullmatch(r'[1-8](st|nd|rd|th)|\d+|Bout|Win|Forf|\d?S', x[2])]
            right = sorted([x for x in row if 0 < x[0] - lab[0] < 120], key=lambda x: x[0])
            left = sorted([x for x in row if 0 < lab[0] - x[0] < 120], key=lambda x: -x[0])
            side = right if len(right) >= 1 else left[:2][::-1]
            txt = ' '.join(x[2] for x in side)
            # "Southern Regional-NJBrian Broderick": a school run into the name
            txt = re.sub(r'(-[A-Z]{2})(?=[A-Z][a-z])', r'\1 | ', txt)
            parts = [x[2] for x in side] if ' | ' not in txt else [q.strip() for q in txt.split(' | ')]
            if len(parts) == 1 and re.search(r'-[A-Z]?\s', parts[0]):
                # "Passaic Valley-N Ryan Dunphy", "Queen Of Peace- Jamie Westwood": a school cut short, then the name
                q = re.split(r'(?<=-)[A-Z]?\s', parts[0], maxsplit=1); parts = [q[0], q[1]]
            elif len(parts) == 1 and len(parts[0].split()) >= 4 and not SCHOOL.search(parts[0]):
                parts = [' '.join(parts[0].split()[:-2]), ' '.join(parts[0].split()[-2:])]   # "Central Mountain Dylan Alton"
                m = re.match(r'^([A-Z][a-z]+)([A-Z][a-z]+ .*)$', parts[1])                    # "Council Rock SouJimmy Vollrath"
                if m: parts = [parts[0] + ' ' + m.group(1), m.group(2)]
            if len(parts) == 1 and not SCHOOL.search(parts[0]):
                # a cut-off school run into the name: "Susquehanna TowEdward Ruth", "Richmond-Burton CJordan Blanton",
                # "Jackson Memorial-Scott Winston" — the name starts at the last capital before its lower-case run
                m = re.match(r"^(.*?[a-z\-]|.*?[A-Z])([A-Z][a-z]+ [A-Z][\w'’\-]+)$", parts[0])
                if m: parts = [m.group(1).rstrip('-'), m.group(2)]
            sch = next((q for q in parts if SCHOOL.search(q)), None)
            if sch is None and len(parts) == 2: sch = parts[0] if right else parts[1]   # a cut-off school ("Long Island Luther")
            nm = next((q for q in parts if q != sch and is_name(q)), None)
            if not nm: continue
            pl = int(lab[2][0])
            if pl in got and got[pl][0] != nm: print(f'# {year} {w}: place {pl} read as {got[pl][0]} and {nm}', file=sys.stderr)
            got.setdefault(pl, (nm, sch or ''))
    # the entrant rows ("Name" then "School-ST" beside it) give the full school and state where the list cut them
    known = {}
    for p in pages:
        S = spans(p)
        for x in S:
            if not is_name(x[2]): continue
            nxt = sorted([y for y in S if abs(y[1] - x[1]) <= 1.5 and 0 < y[0] - x[0] < 70], key=lambda y: y[0])
            if nxt and SCHOOL.search(nxt[0][2]): known.setdefault(x[2], nxt[0][2])
    for pl in sorted(got):
        nm, sch = got[pl]
        full = [k for k in known if k == nm] or [k for k in known if k.startswith(nm) and len(nm) >= 8]
        if len(full) == 1:
            if not SCHOOL.search(sch or '') or full[0] != nm: sch = known[full[0]]
            nm = full[0]                                   # "Harrison Honeycu" → its full form
        m = re.match(r'(.*)-([A-Z]{2})$', sch)
        out.append((year, w, pl, '', nm, m.group(1) if m else sch, m.group(2) if m else ''))
    if sorted(got) != list(range(1, 9)): print(f'# {year} {w}: places read {sorted(got)}', file=sys.stderr)

i = 0
while i < len(d):
    t = d[i].get_text()
    if re.search(r'\d{3} Lbs', t) and 'Champion' in t and '3rd Place' not in t and i + 1 < len(d) and \
            ('3rd Place' in d[i + 1].get_text() or (i + 2 < len(d) and '3rd Place' in d[i + 2].get_text())): brute(i); i += 2 if '3rd Place' in d[i + 1].get_text() else 3; continue
    if 'Weight Class' in t:
        m = re.search(r'\b(\d{3})\.5\b', t); w = m.group(1) if m else '?'
        j = i + 1
        while j < len(d) and 'Weight Class' not in d[j].get_text() and not re.search(r'\d{3} Lbs', d[j].get_text()): j += 1
        summary([d[k] for k in range(i, j)], {'152': '152', '160': '160', '171': '171', '189': '189', '215': '215', '285': '285'}.get(w, w)); i = j; continue
    i += 1
if year == 2013:   # 106–132 and 285 are one-page day-2 brackets: scripts/transcribe/super32_2013.py
    out = [r for r in out if int(r[1]) >= 138 and r[1] != '285']
# Read off the page images (2026-11-18) where the text can't be trusted: an overlay under the 2005 119 final (Roche
# printed over Peppelman), the short consolation pages of 2005 215 / 275 and 2006 215 / 285, the 2008 285 round robin,
# and the schools the place list cut before the state. (place, place_to, name, school, state); a weight listed here
# replaces what was read for those places.
FIXES = {
    (2005, '119'): [(1, '', 'Ryan Fields', 'Lakota West', 'OH'), (2, '', 'Walter Peppelman', 'Central Dauphin', 'PA')],
    (2005, '135'): [(4, '', 'Richard Spicel', 'Brunswick', 'OH')],     # "Spoel-forfeiting" on the page
    (2005, '171'): [(6, '', '?Olsen', 'Walton', '')],
    (2005, '215'): [(3, '', '?Rogers', 'Great Bridge', 'VA'), (4, '', '?Delain', 'Collins Hill', 'GA'), (5, '', '?Kizzar', 'James River', 'VA'),
                    (6, '', '?Fincher', 'East Paulding', 'GA'), (7, 8, '?Roberts', 'Laney', 'NC'), (7, 8, '?Peterson', 'Seventy-First', 'NC')],
    (2005, '275'): [(3, '', '?Lee', 'Pennsbury', 'PA'), (4, '', '?Knepp', 'Indian Valley', 'PA'), (5, '', '?Yohn', 'Lewistown', 'PA'),
                    (6, '', '?Oakley', 'Person', 'NC'), (7, 8, '?Heafner', 'West Lincoln', 'NC'), (7, 8, '?Armstrong', 'McEachern', 'GA')],
    (2006, '215'): [(3, '', 'Brooks Pendleton', 'McEachern', ''), (4, '', 'Brandon Miller', 'Christiansburg', ''), (5, '', 'Ardest Carter', 'Eastside', ''),
                    (6, '', 'Brandon Williamson', 'Greenwich', ''), (7, '', 'Jessie Mcfarland', 'R-S Central', ''), (8, '', 'Jesse Cooper III', 'Mount Tabor', '')],
    (2006, '285'): [(3, '', 'Josiah Beers', 'Southwestern', ''), (4, '', 'Cody Sliger', 'Ooltewah', ''), (5, '', 'Wesley East', 'Eastside', ''),
                    (6, '', 'Matthew Holcomb', 'Manchester', ''), (7, 8, 'Tom McGee', 'McEachern', ''), (7, 8, 'Jordan Anastassiou', 'East Lake', '')],
    # 2013: two Whites from PA at 170 — the one who reached the 3rd place bout dropped into the consolation late (Tyrel
    # won two bouts in the championship bracket; Idris one); two Allens from NC at 220 — likewise Trent, not Matt, who
    # won the 7th place bout by forfeit over Pelusi
    (2013, '170'): [(3, '', 'Tyrel White', '', 'PA')],
    (2013, '220'): [(7, '', 'Trent Allen', '', 'NC'), (8, '', 'Antonio Pelusi', '', 'PA')],
    (2008, '285'): [(1, '', 'Sam Brownlee', 'Canon-McMillan', 'PA'), (2, '', 'Joe McElhinney', 'Cochranton', 'PA'), (3, '', 'Adam Peters', 'Cleveland', 'TN'),
                    (4, '', 'Andrew Severson', 'St. Benedict', 'TN'), (5, '', 'Zach Hanson', 'Parkersburg South', 'WV'), (6, '', 'Patrick Quinn', "Gray's Creek", 'NC'),
                    (7, '', 'Greg Clarke Jr', 'Franklin County', 'VA'), (8, '', 'Peter Codella', 'Collins Hill', 'GA')],
}
STATE_FILL = {   # (year, weight, place): school, state — cut short in the place list
    (2007, '152', 1): ('Long Island Lutheran', 'NY'), (2007, '160', 2): ('Jackson Memorial', 'NJ'), (2007, '171', 2): ('Susquehanna Township', 'PA'),
    (2007, '171', 3): ('Richmond-Burton', 'IL'), (2008, '145', 3): ('Central Mountain', 'PA'), (2008, '152', 2): ('Lawrenceville School', 'NJ'),
    (2008, '152', 6): ('Bergen Catholic', 'NJ'), (2008, '152', 8): ('Council Rock South', 'PA'), (2008, '160', 4): ('Council Rock South', 'PA'),
    (2008, '160', 6): ('Cumberland Valley', 'PA'), (2008, '189', 7): ('Oak Park River Forest', 'IL'),
}
for (y, w), rows in FIXES.items():
    if y != year: continue
    places = {r[0] for r in rows}
    got = {r[2]: r for r in out if r[1] == w}
    out = [r for r in out if not (r[1] == w and r[2] in places)]
    for pl, pt, nm, sch, st in rows:
        if nm.startswith('?'):
            # the image shows the last name only: the full name from this weight's entrants read above
            last = nm[1:]
            cand = [r for r in ENTRANTS.get(w, []) if r['last'] == last and (not sch or r['school'].startswith(sch.split()[0]))]
            nm = cand[0]['full'] if len(cand) == 1 else last
            if len(cand) != 1: print(f'# {year} {w}: {last} ({sch}) — full name not found', file=sys.stderr)
            if len(cand) == 1 and not st: st = cand[0]['state']
        out.append((year, w, pl, pt, nm, sch, st))
out = [(y, w, pl, pt, nm, *STATE_FILL.get((y, w, pl), (sch, st))) if not st or (y, w, pl) in STATE_FILL else (y, w, pl, pt, nm, sch, st) for y, w, pl, pt, nm, sch, st in out]
out.sort(key=lambda r: (int(r[1]), r[2]))
for r in out: print('\t'.join(map(str, r)))
