# How far a bout export can rank a bracket: 1st–8th from the placement bouts; below that, everyone who lost
# in the same consolation round is tied (double elimination), so places come in groups.
import json, sys, collections, re
brackets = json.load(open(sys.argv[1]))
def place_groups(rows):
    PLACE = {'Finals': 1, '3rd Place': 3, '5th Place': 5, '7th Place': 7}
    placed = {}
    for r in rows:
        p = PLACE.get(r['Round'])
        if p and r['Losing Wrestler']: placed[(r['Winning Wrestler'], r['Winning Team'])] = p; placed[(r['Losing Wrestler'], r['Losing Team'])] = p + 1
    # elimination round for the rest: the round of their second loss (double elim) = their last loss
    # eliminated by the consolation loss (double elimination); a championship loss only if they never wrestled back
    last_loss = {}
    for r in rows:
        if not r['Losing Wrestler']: continue
        k = (r['Losing Wrestler'], r['Losing Team'])
        if r['Round'].startswith('Consi') or k not in last_loss: last_loss[k] = r['Round']
    wins = collections.Counter((r['Winning Wrestler'], r['Winning Team']) for r in rows if r['Losing Wrestler'])
    groups = collections.defaultdict(list)
    for p, rnd in last_loss.items():
        if p in placed: continue
        groups[rnd].append(p)
    return placed, groups, wins
# consolation rounds deepest first (later = better finish)
ORDER = ['Consi-Semis', 'Consi of 4', 'Consi of 8 #2', 'Consi of 8 #1', 'Consi of 16 #2', 'Consi of 16 #1', 'Consi of 32 #2', 'Consi of 32 #1', 'Consi of 64 #2', 'Consi of 64 #1', 'Consi of 128 #2', 'Consi of 128 #1']
for b in brackets:
    if b['division'] != 'High School Boys' or b['weight'] != '120': continue
    placed, groups, wins = place_groups(b['rows'])
    n = 9
    print(f"Super 32 2026 · High School Boys 120 · {b['people']} wrestlers")
    for nm, p in sorted(placed.items(), key=lambda x: x[1]): print(f"  {p:>2}. {nm[0]} ({nm[1]})")
    for rnd in ORDER:
        g = groups.get(rnd, [])
        if not g: continue
        print(f"  {n}–{n + len(g) - 1} (tied, lost in {rnd}): " + ', '.join(f"{a} ({s}) {wins[(a, s)]}W" for a, s in sorted(g, key=lambda x: -wins[x])))
        n += len(g)
        if n > 25: break
