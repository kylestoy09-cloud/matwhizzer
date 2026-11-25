"""Kyle 2026-11-18: a transcript (qualifiers + places 1–8, no bouts — DIII / NAIA keep no bouts) from a TrackWrestling
bout export (CSV, every cell written ="…"): every wrestler in a bout is a qualifier; the "1st / 3rd / 5th / 7th Place
Match" winners and losers are the places. With --places-only, only the place lines (to add to a transcript that
already has the qualifiers, e.g. from the pre-tournament bracket).
Kyle 2026-11-19 (the women's championships): --bouts writes every bout too, its round mapped to the transcript's
codes (src/lib/ncaa/transcript.ts) for the 16-, 32- and 64-man brackets and both TrackWrestling namings ("Champ.
Round 1 / Cons. Round 2 …" and "Round of 32 / Consi of 16 #1 …"). The export leaves some byes out; a bye line goes
back wherever a wrestler's path needs one, so the transcript's path check passes.
   python3 scripts/transcribe/tw_csv.py <csv> "<header line>" [--places-only | --bouts] > transcript.txt"""
import sys, csv, re
path, header = sys.argv[1], sys.argv[2]
only = '--places-only' in sys.argv
with_bouts = '--bouts' in sys.argv
rows = [{k.strip('="'): v.strip('="') for k, v in r.items()} for r in csv.DictReader(open(path, encoding='utf-8-sig'))]
rows = [r for r in rows if r['Losing Wrestler'] or r['Win Type'] != 'BYE']   # a bye row: no bout
ents, places = {}, {}
for r in rows:
    w = int(r['Weight'])
    for n, t in ((r['Winning Wrestler'], r['Winning Team']), (r['Losing Wrestler'], r['Losing Team'])):
        if n: ents.setdefault(w, {}).setdefault(n.strip(), t.strip())
    m = re.match(r'(\d)(?:st|nd|rd|th) Place(?: Match)?$', r['Round']) or (re.match(r'(1)', '1') if r['Round'] == 'Finals' else None)
    if m: k = int(m.group(1)); places.setdefault(w, {})[k] = r['Winning Wrestler'].strip(); places[w][k + 1] = r['Losing Wrestler'].strip()
if not only: print(f"# {header}\n")
# the rounds a weight's bracket uses, by size: the champ rounds before the quarters, and the consolation rounds
ORDER = ['pigtail', 'r1', 'cpig', 'r2', 'c1', 'qf', 'c2', 'c3', 'sf', 'c4', 'cqf', 'csf', '7th', '5th', '3rd', 'f']
FROM = {'pigtail': ['start'], 'r1': ['start', 'pigtail:W'], 'r2': ['r1:W'], 'qf': ['r1:W', 'r2:W'], 'sf': ['qf:W'], 'f': ['sf:W'],
        'cpig': ['pigtail:L', 'r1:L'], 'c1': ['r1:L', 'cpig:W'], 'c2': ['c1:W', 'qf:L', 'r2:L'], 'c3': ['c2:W'], 'c4': ['c3:W', 'qf:L'],
        'cqf': ['c2:W', 'c4:W'], 'csf': ['cqf:W', 'sf:L'], '3rd': ['csf:W'], '5th': ['csf:L'], '7th': ['cqf:L']}
def round_code(name, size):
    """TrackWrestling's round name → the transcript's code, for a bracket of `size`"""
    n = name.lower().replace('.', '').strip()
    if n in ('1st place match', 'finals'): return 'f'
    m = re.match(r'(\d)(?:st|nd|rd|th) place', n)
    if m: return m.group(1) + {'3': 'rd', '5': 'th', '7': 'th'}[m.group(1)]
    if n in ('semifinal', 'semi-finals'): return 'sf'
    if n in ('quarterfinal', 'quarter-finals'): return 'qf'
    if n in ('cons semi', 'consi-semis'): return 'csf'
    champ = {'champ round 1': 0, 'champ round 2': 1, 'round of 64': -2, 'round of 32': -1, 'round of 16': 0}
    if n in champ:
        # "Champ. Round 1" is the first round however big the bracket; "Round of N" names it by size
        k = champ[n] if n.startswith('champ') else {64: {-2: 0, -1: 1, 0: 2}, 32: {-1: 0, 0: 1}, 16: {0: 0}}[size][champ[n]]
        rounds = {64: ['pigtail', 'r1', 'r2'], 32: ['r1', 'r2'], 16: ['r1']}[size]
        return rounds[k]
    m = re.match(r'cons round (\d)', n)
    if m:
        seq = {64: ['cpig', 'c1', 'c2', 'c3', 'c4', 'cqf'], 32: ['c1', 'c2', 'c3', 'c4', 'cqf'], 16: ['c1', 'c2', 'cqf']}[size]
        return seq[int(m.group(1)) - 1]
    m = re.match(r'consi of (\d+)(?: #(\d))?', n)
    if m:
        k, i = int(m.group(1)), int(m.group(2) or 1)
        return {(32, 1): 'cpig', (32, 2): 'c1', (16, 1): 'c1' if size < 64 else 'c2', (16, 2): 'c2' if size < 64 else 'c3',
                (8, 1): 'c3' if size >= 32 else 'c1', (8, 2): 'c4' if size >= 32 else 'c2', (4, 1): 'cqf'}[(k, i)] if not (size == 64 and k == 16) else {1: 'c2', 2: 'c3'}[i]
    raise SystemExit(f'round? {name} (size {size})')
def path_byes(prev, nxt):
    """the bye rounds between a wrestler's state after his last bout ("start", "r1:L" …) and his next round"""
    if prev in FROM[nxt]: return []
    seen, queue = {prev: []}, [prev]
    while queue:
        st = queue.pop(0)
        for r in ORDER:
            if st in FROM[r] and f'{r}:W' not in seen:
                seen[f'{r}:W'] = seen[st] + [r]
                if f'{r}:W' in FROM[nxt]: return seen[f'{r}:W']
                queue.append(f'{r}:W')
    return None
for w in sorted(ents):
    print(f"@ {w}")
    if not only:
        for n, t in ents[w].items(): print(f"- {n} | {t}")
    if with_bouts:
        mine = [r for r in rows if int(r['Weight']) == w]
        # the bracket's size from the rounds it has (byes thin out the first round, so not from its bout count)
        names = {r['Round'] for r in mine}
        size = 64 if names & {'Round of 64', 'Champ. Round 3'} else 32 if names & {'Round of 32', 'Champ. Round 2'} else 16
        bouts = sorted(((round_code(r['Round'], size), r) for r in mine), key=lambda x: ORDER.index(x[0]))
        state = {}
        for code, r in bouts:
            for who in (r['Winning Wrestler'].strip(), r['Losing Wrestler'].strip()):
                byes = path_byes(state.get(who, 'start'), code)
                if byes is None: print(f"# {w}: no path for {who} into {code}", file=sys.stderr); byes = []
                for b in byes: print(f"{b} {who} > bye")
            # TrackWrestling's win type → the word the result reader knows (src/lib/ncaa/parse.ts resultType)
            wt = {'F': 'Fall', 'DEC': 'Dec', 'MD': 'Maj'}.get(r['Win Type'], r['Win Type'])
            res = ' '.join(x for x in (wt, r['Result']) if x).strip()
            print(f"{code} {r['Winning Wrestler'].strip()} > {r['Losing Wrestler'].strip()}{f' | {res}' if res else ''}")
            state[r['Winning Wrestler'].strip()] = f'{code}:W'; state[r['Losing Wrestler'].strip()] = f'{code}:L'
    else:
        for k in sorted(places.get(w, {})): print(f"place {k} {places[w][k]}")
    print()
