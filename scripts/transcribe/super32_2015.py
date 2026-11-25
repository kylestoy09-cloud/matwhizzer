"""Kyle 2026-11-18: Super 32 2015 high school places from 2015_HS.pdf (a TrackWrestling bracket print, five pages a
weight: the championship halves, the consolation halves, the 5th / 7th bouts). Names print as "A. Busiello" with the
winner of a bout beside its numbered box; the full name and school come from the first-round lines
("Adam Busiello, Esm"). No states are printed.
  1st  the name at the foot of the top half (the final's winner, printed where its bar starts); 2nd the other semifinal
       winner (the semifinals: the two highest-numbered bouts of the championship halves, the final aside)
  3rd  the name beside the "3rd" bout; 4th the other of the two bouts that feed it (the bouts whose losers meet for 5th)
  5th / 7th  the bout lists both ("L7224K. Biscoglia", "L7225C. Nunez"), then the winner
Prints TSV: year, weight, place, place_to, name, school, state.
   python3 scripts/transcribe/super32_2015.py <pdf>"""
import sys, re, fitz
d = fitz.open(sys.argv[1])

def lines(p):
    out = []
    for b in p.get_text('dict')['blocks']:
        for l in b.get('lines', []):
            t = ' '.join(''.join(s['text'] for s in l['spans']).split())
            if t: out.append((l['bbox'][0], l['bbox'][1], l['bbox'][2], t))
    return out
SHORT = re.compile(r"^(?:L\d{4}\s?)?([A-Z][a-z]?\.? ?[A-Z]?\.?\s?[A-Z][\w'’\- ]+)$")
def short(t):
    m = re.match(r"^(?:L\d{4}\s?)?([A-Z]\. .+)$", t)
    return m.group(1).strip() if m else None

starts = [i for i, p in enumerate(d) if re.search(r'Super 32\s*\nHigh School\s*\n\d{3}', p.get_text())]
out = []
for k, i0 in enumerate(starts):
    pages = list(range(i0, starts[k + 1] if k + 1 < len(starts) else len(d)))
    w = re.search(r'High School\s*\n(\d{3})', d[i0].get_text()).group(1)
    P = [lines(d[i]) for i in pages]
    ents = {}
    for L in P:
        for _, _, _, t in L:
            m = re.match(r"^([A-Z][\w'’.\- ]+?), (.+)$", t)
            if m and not re.match(r'^L\d', t):
                full = m.group(1).strip(); last = full.split()[-1] if not re.search(r' (Jr|Sr|II|III)\.?$', full) else ' '.join(full.split()[-2:])
                key = f'{full[0]}. {" ".join(full.split()[1:])}'
                ents.setdefault(key.lower(), set()).add((full, m.group(2).strip()))
    def who(s):
        c = ents.get(s.lower(), set())
        if len(c) == 1: return next(iter(c))
        print(f'# 2015 {w}: "{s}" — {len(c)} entrants', file=sys.stderr); return (s, '')
    def boxes(L): return [x for x in L if re.fullmatch(r'\d{4}', x[3])]
    def winner_right(L, b):
        c = [x for x in L if 0 <= x[0] - b[2] < 40 and abs(x[1] - b[1]) < 9 and short(x[3])]
        return short(min(c, key=lambda x: x[0])[3]) if c else None
    places = {}
    # 5th / 7th (and the bouts that fed the 3rd)
    feed3 = []
    for L in P:
        toks = [x[3] for x in L]
        for j, t in enumerate(toks):
            if t in ('5th', '7th') and j >= 5 and re.fullmatch(r'\d{4}', toks[j - 5]):
                a, b, win = toks[j - 4], toks[j - 3], short(toks[j - 2])
                pa, pb = short(a), short(b)
                pl = int(t[0]); places[pl] = win; places[pl + 1] = pb if win == pa else pa
                if pl == 5: feed3 = [a[1:5], b[1:5]]
    # 3rd / 4th
    for L in P:
        lab = next((x for x in L if x[3] == '3rd'), None)
        if not lab: continue
        box = min(boxes(L), key=lambda b: abs(b[1] - lab[1]) + abs(b[2] - lab[0]))
        c = [x for x in L if 0 <= box[0] - x[2] < 40 and abs(x[1] - box[1]) < 15 and short(x[3])]
        places[3] = short(c[0][3]) if c else None
        fed = []
        for L2 in P:
            for b in boxes(L2):
                if b[3] in feed3: fed.append(winner_right(L2, b))
        o = [f for f in fed if f and f != places[3]]
        places[4] = o[0] if len(o) == 1 else None
        if places[3] not in fed: print(f'# 2015 {w}: 3rd {places[3]} not among {fed}', file=sys.stderr)
    # 1st / 2nd. The championship pages are those with no "L5023"-style consolation lines; the final is the bout by the
    # "1st" label; the semifinals the two highest-numbered other bouts there. The final's winner prints where its bar
    # starts — just above its result, or at the foot of the page before when the bar starts there.
    champ_pages = [j for j, L in enumerate(P) if not any(re.match(r'^L\d{4}', x[3]) for x in L)]
    fj = next((j for j in champ_pages if any(x[3] == '1st' for x in P[j])), None)
    champ, sw = None, []
    if fj is not None:
        lab = next(x for x in P[fj] if x[3] == '1st')
        fbox = min(boxes(P[fj]), key=lambda b: abs(b[1] - lab[1]) + abs(b[2] - lab[0]))
        res = [x for x in P[fj] if 0 <= fbox[0] - x[2] < 40 and abs(x[1] - fbox[1]) < 15]
        rx = res[0][0] if res else fbox[0] - 50
        above = [x for x in P[fj] if short(x[3]) and abs(x[0] - rx) < 30 and 0 < (res[0][1] if res else fbox[1]) - x[1] < 16]
        beside = [x for x in P[fj] if short(x[3]) and 0 <= fbox[0] - x[2] < 30 and abs(x[1] - fbox[1]) < 22]
        if beside: champ = short(beside[0][3])      # the one-page brackets: the winner beside the final's box
        elif above: champ = short(above[-1][3])
        elif fj > 0:
            prev = [x for x in P[fj - 1] if short(x[3]) and abs(x[0] - rx) < 40]
            if prev: champ = short(max(prev, key=lambda x: x[1])[3])
        bs = sorted([(int(b[3]), j, b) for j in champ_pages for b in boxes(P[j]) if b is not fbox], reverse=True)[:2]
        sw = [winner_right(P[j], b) for _, j, b in bs]
        # the other finalist: the semifinal winner whose line meets the foot of the final's bar, just left of it
        low = [x for x in P[fj] if short(x[3]) and 0 < fbox[0] - x[0] < 90 and x[1] > fbox[1] + 20]
        if low:
            o = short(max(low, key=lambda x: x[1])[3])
            if o != champ: sw = [champ, o]
    if champ not in sw or len(sw) != 2: print(f'# 2015 {w}: semifinal winners {sw}, champion {champ}', file=sys.stderr)
    places[1] = champ; places[2] = next((x for x in sw if x and x != champ), None)
    # read off the page images (2026-11-18) where the final's lines sit apart from its box: 126 (Suriano over Karam,
    # the semifinal on the page before), 220 (Wood over Stencel), 285 (Gunning over Lill)
    places.update({'126': {2: 'L. Karam'}, '220': {1: 'J. Wood', 2: 'M. Stencel'}, '285': {1: 'A. Gunning', 2: 'J. Lill'}}.get(w, {}))
    for pl in sorted(places):
        if places[pl]:
            full, sch = who(places[pl]); out.append((2015, w, pl, '', full, sch, ''))
    if sorted(p for p in places if places[p]) != list(range(1, 9)): print(f'# 2015 {w}: places {sorted(p for p in places if places[p])}', file=sys.stderr)
for r in out: print('\t'.join(map(str, r)))
