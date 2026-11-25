# Kyle 2026-11-21 ("we also need to import the 2026 ncaa girls tournament"): the 2026 NCAA Women's Championships →
# data/ncaa/transcripts/women/NCAA/2026.txt for scripts/load_ncaa_transcripts.mts. The FloWrestling CSV has every bout
# but names only the prelims' rounds; the bracket PDF lists each weight's 16 slots in order (seed, name, college
# abbreviation). Championship rounds come from the slots (same pair = r1, same quarter = qf, same half = sf, else the
# final) between wrestlers still unbeaten; consolation rounds from where each round's two wrestlers come from. A pair
# can meet twice (2026 207: Ward beat Sekona in the quarters, Sekona won the rematch), and a wrestler can fit two bouts
# of one round (a 7th-place match looks like a round-2 one): every choice is tried, and the one that places every bout
# is kept.
#   python3 scripts/build_ncaa_women_2026_transcript.py
import csv, re, subprocess, itertools

ROOT = '/Users/thebrain/Desktop/wrestling_brackets/NCAA Tournament/Womens/NCAA/'
CSV = ROOT + "2026NCAAWomen'sWrestlingChampionships.csv"
PDF = ROOT + "2026 NCAA Women's Wrestling Championships - Brackets.pdf"
OUT = '/Users/thebrain/Desktop/wrestling_brackets/matwhizzer/data/ncaa/transcripts/women/NCAA/2026.txt'

r = list(csv.reader(open(CSV, encoding='utf-8', errors='replace')))
h = [x.strip('="') for x in r[0]]
rows = [dict(zip(h, [c.lstrip('=').strip('"') for c in x])) for x in r[1:]]
weights = sorted({x['Weight'] for x in rows}, key=int)

# bracket slots from page 1 of each weight (4 pages a weight): left-column entrant lines, top to bottom
slots, seeds = {}, {}
for i, w in enumerate(weights):
    txt = subprocess.run(['pdftotext', '-layout', '-f', str(4 * i + 1), '-l', str(4 * i + 1), PDF, '-'], capture_output=True, text=True).stdout
    assert re.search(rf'\s{w}\s*$', txt, re.M), f'page {4 * i + 1} is not {w}'
    got = []
    for line in txt.splitlines():
        m = re.match(r'^ {0,3}(\d{1,2})?\s+([A-Z][^()]+?)\s*\(([A-Z0-9-]+)\)?\s*$', line)
        if m and len(m.group(2).split()) >= 2: got.append((m.group(1), m.group(2).strip()))   # a lone last name is a later column
    assert len(got) == 16, (w, len(got), got)
    slots[w] = [n for _, n in got]; seeds[w] = {n: s for s, n in got}

ORDER = ['pigtail', 'r1', 'cpig', 'r2', 'c1', 'qf', 'c2', 'c3', 'sf', 'c4', 'cqf', 'csf', '7th', '5th', '3rd', 'f']
# each consolation round's pairings: where its two wrestlers come from (their bout before and its result)
PAIRS = {'c1': [{('r1', 'L')}, {('r1', 'L'), ('cpig', 'W')}, {('cpig', 'W')}], 'c2': [{('c1', 'W'), ('qf', 'L')}], 'cqf': [{('c2', 'W')}],
         'csf': [{('cqf', 'W'), ('sf', 'L')}], '3rd': [{('csf', 'W')}], '5th': [{('csf', 'L')}], '7th': [{('cqf', 'L')}]}
CONS = [rd for rd in ORDER if rd in PAIRS]
nm = lambda s: re.sub('[^a-z]', '', s.lower())


def last_of(bs, assign):
    last = {}
    for rd in ORDER:
        for k, x in enumerate(bs):
            if assign.get(k) == rd: last[x['Winning Wrestler']] = (rd, 'W'); last[x['Losing Wrestler']] = (rd, 'L')
    return last


def matchings(cands):
    """every largest set of bouts with no wrestler twice"""
    best, out = 0, []
    def go(i, used, pick):
        nonlocal best, out
        if i == len(cands):
            if len(pick) > best: best, out = len(pick), [list(pick)]
            elif len(pick) == best and pick: out.append(list(pick))
            return
        k, a, b = cands[i]
        if a not in used and b not in used: go(i + 1, used | {a, b}, pick + [k])
        go(i + 1, used, pick)
    go(0, frozenset(), [])
    return out or [[]]


def champ_side(bs, slot, fixed, skip):
    """r1 / qf / sf / f between still-unbeaten slotted wrestlers whose slots meet at that depth; `skip` = bouts left out"""
    rnd, alive = dict(fixed), set(slot)
    for rd, depth in (('r1', 1), ('qf', 2), ('sf', 3), ('f', 4)):
        used, losers = set(), []
        for k, x in enumerate(bs):
            if k in rnd or k in skip: continue
            a, b = x['Winning Wrestler'], x['Losing Wrestler']
            if a in alive and b in alive and a not in used and b not in used and (slot[a] ^ slot[b]).bit_length() == depth:
                rnd[k] = rd; used |= {a, b}; losers.append(b)
        alive -= set(losers)
    return rnd


def cons_side(bs, assign, ri=0):
    if ri == len(CONS): return assign if len(assign) == len(bs) else None
    rd = CONS[ri]
    last = last_of(bs, {k: v for k, v in assign.items() if ORDER.index(v) < ORDER.index(rd)})
    cands = [(k, x['Winning Wrestler'], x['Losing Wrestler']) for k, x in enumerate(bs)
             if k not in assign and {last.get(x['Winning Wrestler']), last.get(x['Losing Wrestler'])} in PAIRS[rd]]
    for m in matchings(cands):
        got = cons_side(bs, {**assign, **{k: rd for k in m}}, ri + 1)
        if got: return got
    return None


out = ["# source: 2026 NCAA Women's Championships (FloWrestling CSV; rounds from the bracket PDF slots and each wrestler's path)", '']
problems = []
for w in weights:
    bs = [x for x in rows if x['Weight'] == w]
    people = {}
    for x in bs:
        for n, t in ((x['Winning Wrestler'], x['Winning Team']), (x['Losing Wrestler'], x['Losing Team'])):
            if n: people[n] = t
    slot = {}
    for i, s in enumerate(slots[w]):
        hit = [p for p in people if nm(p) == nm(s)] or [p for p in people if nm(s).startswith(nm(p)) or nm(p).startswith(nm(s))]
        if len(hit) != 1: problems.append(f'{w}: slot "{s}" → {hit}'); continue
        slot[hit[0]] = i
    fixed = {k: 'pigtail' if x['Round'] == 'Champ. Prelim.' else 'cpig' for k, x in enumerate(bs) if x['Round'] in ('Champ. Prelim.', 'Cons. Prelim.')}
    # pairs of slotted wrestlers who met twice: one of the two bouts may be the championship one
    seen = {}
    for k, x in enumerate(bs):
        if k in fixed: continue
        key = frozenset((x['Winning Wrestler'], x['Losing Wrestler']))
        if key <= set(slot): seen.setdefault(key, []).append(k)
    twice = [ks for ks in seen.values() if len(ks) == 2]
    rnd = None
    for choice in itertools.product(*[[ks[0], ks[1]] for ks in twice]):
        got = cons_side(bs, champ_side(bs, slot, fixed, set(choice)))
        if got: rnd = got; break
    if rnd is None:
        problems.append(f'{w}: no way to place every bout'); rnd = champ_side(bs, slot, fixed, set())
    left = [x for k, x in enumerate(bs) if k not in rnd]
    if left: problems.append(f'{w}: {len(left)} bouts with no round: ' + '; '.join(f"{x['Winning Wrestler']} > {x['Losing Wrestler']}" for x in left))
    out.append(f'@ {w}')
    for p in sorted(people, key=lambda p: slot.get(p, 99)):
        sd = seeds[w].get(slots[w][slot[p]]) if p in slot else None
        out.append(f"{sd or '-'} {p} | {people[p].replace('`', chr(39))}")
    for rd in ORDER:
        for k, x in enumerate(bs):
            if rnd.get(k) != rd: continue
            res = ' '.join(t for t in (x['Win Type'], x['Result']) if t)
            out.append(f"{rd} {x['Winning Wrestler']} > {x['Losing Wrestler']} | {res}")
    out.append('')
open(OUT, 'w').write('\n'.join(out))
print('weights', len(weights), 'bouts', len(rows))
print('\n'.join(problems) if problems else 'no problems')
