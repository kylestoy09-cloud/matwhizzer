"""Kyle 2026-11-18: Super 32 2013 high school places from 2013HSDay2.pdf. Each weight's "Champion" page holds the
day-2 bracket: the final eight, the semifinals and final, the consolation to 3rd, and the 5th and 7th bouts. The
bracket prints last names in capitals ("CURRY", "KARAM PA"); the full names come from the weight's entrant lines
elsewhere in the file ("GAGE CURRY   PA  [10]"). Same rules as super32_brackets.py:
  1st the Champion box, 2nd the other finalist; 3rd the 3rd Place box, 4th the other consolation finalist;
  5th / 7th the box, 6th / 8th the other of the pair listed beside it.
Prints TSV: year, weight, place, place_to, name, school, state.
   python3 scripts/transcribe/super32_2013.py <pdf>"""
import sys, re, fitz
d = fitz.open(sys.argv[1])
STATES = set('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC'.split())

def lines(p):
    out = []
    for b in p.get_text('dict')['blocks']:
        for l in b.get('lines', []):
            t = ' '.join(''.join(s['text'] for s in l['spans']).split())
            if t: out.append((l['bbox'][0], l['bbox'][1], t))
    return out
def up(t): return re.fullmatch(r"[A-Z][A-Z'.\- ]+", t) is not None and t not in STATES and t not in ('BYE', 'HS')

# the weight of each page: a page with a "NNN Lbs" heading starts a weight; the pages after it belong to it
groups, cur = {}, None
for i, p in enumerate(d):
    m = re.match(r'(\d{3})[AB]? Lbs', p.get_text())
    if m: cur = m.group(1)
    groups.setdefault(cur, []).append(i)

out = []
for w, pages in groups.items():
    full = {}
    for i in pages:
        for _, _, t in lines(d[i]):
            m = re.match(r"^([A-Z][A-Z'.\-]*(?: [A-Z][A-Z'.\-]*)*?) ([A-Z][A-Z'.\-]+(?: (?:JR|SR|II|III|IV)\.?)?)\s+([A-Z]{2})\s+\[\d+\]$", t)
            if m: full.setdefault((m.group(2), m.group(3)), f'{m.group(1)} {m.group(2)}')
    def name(last, st=None):
        c = [v for (l, s), v in full.items() if l == last and (st is None or s == st)]
        st_ = st or next((s for (l, s) in full if l == last), '')
        n = c[0] if len(set(c)) == 1 else last
        return ' '.join(x.capitalize() if not re.match(r'^(II|III|IV)$', x) else x for x in n.split()).replace("'S", "'s"), (st_ if len(set(s for (l, s) in full if l == last)) == 1 or st else st_)
    cp = next((i for i in pages if 'Champion' in d[i].get_text() and '3rd Place' in d[i].get_text()), None)   # (132: pools A and B have their own Champion pages)
    if cp is None: print(f'# {w}: no Champion page', file=sys.stderr); continue
    L = lines(d[cp])
    def lab(t): return next((x for x in L if x[2] == t), None)
    def box(lb, dy=32, dx=70): return [x for x in L if lb[1] - dy <= x[1] < lb[1] and abs(x[0] - lb[0]) < dx and up(x[2])]
    def st_under(x):
        b = [y for y in L if 0 < y[1] - x[1] < 14 and abs(y[0] - x[0]) < 12 and y[2] in STATES]
        return b[0][2] if b else None
    places = {}
    c = lab('Champion'); cb = box(c)
    champ = cb[0][2] if cb else None
    top = [x for x in L if up(x[2]) and x[1] < c[1] + 120 and x not in cb]
    mx = max(x[0] for x in top); fin = list(dict.fromkeys(x[2] for x in top if x[0] > mx - 15))
    if champ not in fin or len(fin) != 2: print(f'# {w}: final {fin}, champion {champ}', file=sys.stderr)
    places[1] = champ; places[2] = next((f for f in fin if f != champ), None)
    t3 = lab('3rd Place'); b3 = box(t3, 40, 60); third = b3[0][2] if b3 else None
    l7 = lab('7th Place'); l5 = lab('5th Place')
    b7 = box(l7, 40, 90); b5 = box(l5, 40, 90)
    low = [x for x in L if up(x[2]) and x[1] > c[1] + 120 and x not in b3 + b7 + b5 and not (l7 and l7[1] - 60 < x[1] <= l7[1] + 10 and x[0] > l7[0] - 260)]
    mx = max(x[0] for x in low); cf = list(dict.fromkeys(x[2] for x in low if x[0] > mx - 15))
    if third not in cf or len(cf) != 2: print(f'# {w}: consolation final {cf}, 3rd {third}', file=sys.stderr)
    places[3] = third; places[4] = next((f for f in cf if f != third), None)
    states = {}
    for lb, bx, pl in ((l5, b5, 5), (l7, b7, 7)):
        win = bx[0][2] if bx else None
        pair = [x for x in L if up(x[2]) and lb[1] - 60 < x[1] <= lb[1] + 10 and x not in bx and st_under(x)]
        # the pair sits in one column beside the box
        cols = {}
        for x in pair: cols.setdefault(round(x[0] / 15), []).append(x)
        pr = next((v for v in cols.values() if len(v) == 2 and win in [y[2] for y in v]), None)
        if not pr: print(f'# {w}: {pl}th pair {[x[2] for x in pair]}, winner {win}', file=sys.stderr); places[pl] = win; continue
        for y in pr: states[y[2]] = st_under(y)
        places[pl] = win; places[pl + 1] = next(y[2] for y in pr if y[2] != win)
    def st_any(n):
        """the state printed under any line of that last name on the page (the consolation lists them)"""
        ss = {st_under(x) for x in L if x[2] == n} - {None}
        return ss.pop() if len(ss) == 1 else None
    for pl in sorted(places):
        if not places[pl]: continue
        nm, st = name(places[pl], states.get(places[pl]) or st_any(places[pl]))
        out.append((2013, w, pl, '', nm, '', st))
# only 106–132 are one-page day-2 brackets with every place on them; 138–220 run three pages (super32_brackets.py)
out = [r for r in out if int(r[1]) <= 132]
# NJ placers printed by last name only (day-1 consolation entrants of a one-page weight): the only NJ wrestler of
# the name in our records, at that weight in those years — Brandon Cray (Hamilton East, 106), Bryan Damon (Jefferson
# Township, 113/120) (checked 2026-11-18)
out = [(y, w, pl, pt, {('106', 'Cray'): 'Brandon Cray', ('120', 'Damon'): 'Bryan Damon'}.get((w, nm), nm), sch, st) for y, w, pl, pt, nm, sch, st in out]
# 285: one page, but the final's names sit outside the columns read above — read off the page image (2026-11-18)
out += [(2013, '285', pl, '', nm, '', st) for pl, nm, st in (
    (1, 'Patrik Garren', 'OH'), (2, 'Jesse Webb', 'VT'), (3, 'Austin Underwood', 'FL'), (4, 'Andrew Dunn', 'PA'),
    (5, 'Daniel Leon', 'FL'), (6, 'Jake Scanlan', 'IA'), (7, 'Patton Gossett', 'SC'), (8, 'Dakota Bell', 'NC'))]
for r in out: print('\t'.join(map(str, r)))
