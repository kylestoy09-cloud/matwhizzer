# Super 32 2026: tied places below 8th for every elimination bracket (everyone eliminated in the same
# consolation round shares a place), as podium files for the hub import.
import json, sys, csv, collections, re, os
brackets = json.load(open(sys.argv[1])); outdir = sys.argv[2]
PLACE = {'Finals': 1, '3rd Place': 3, '5th Place': 5, '7th Place': 7}
def consi_rank(rnd):  # deeper consolation round = better finish; "#2" is later than "#1"
    m = re.match(r'Consi of (\d+) #(\d)', rnd)
    if m: return (int(m.group(1)), -int(m.group(2)))
    if rnd in ('Consi-Semis', 'Consi of 4'): return (4, 0)
    return None
rows_out = collections.defaultdict(list); depth = {}
for b in brackets:
    rows = b['rows']
    if not any(r['Round'] == 'Finals' for r in rows): continue      # round robins are fully placed already
    placed = set()
    for r in rows:
        if PLACE.get(r['Round']) and r['Losing Wrestler']: placed |= {(r['Winning Wrestler'], r['Winning Team']), (r['Losing Wrestler'], r['Losing Team'])}
    elim = {}
    for r in rows:
        if not r['Losing Wrestler']: continue
        k = (r['Losing Wrestler'], r['Losing Team'])
        if r['Round'].startswith('Consi') or k not in elim: elim[k] = r['Round']
    groups = collections.defaultdict(list)
    for k, rnd in elim.items():
        if k in placed: continue
        cr = consi_rank(rnd)
        if cr: groups[cr].append(k)
    n = 9
    for cr in sorted(groups):
        g = groups[cr]
        if not g: continue
        lo, hi = n, n + len(g) - 1
        for name, st in g:
            rows_out[b['division']].append(dict(Weight=b['weight'], Place=f'{lo}-{hi}' if hi > lo else str(lo), Name=name, State=st, Division=b['division'], Grade=b['grades'].get(f'{name}|{st}') or ''))
        n = hi + 1
    depth[(b['division'], b['weight'])] = n - 1
os.makedirs(outdir, exist_ok=True)
for d, rs in rows_out.items():
    with open(f'{outdir}/Super 32 2026 tied places - {d}.csv', 'w', newline='') as fh:
        w = csv.DictWriter(fh, fieldnames=['Weight', 'Place', 'Name', 'State', 'Division', 'Grade']); w.writeheader(); w.writerows(rs)
    ds = [v for (dv, _), v in depth.items() if dv == d]
    nj = [r for r in rs if r['State'] == 'NJ']
    print(f"{d}: {len(rs)} tied places, placed through {min(ds)}th–{max(ds)}th | NJ {len(nj)}: " + '; '.join(f"{r['Weight']} {r['Place']} {r['Name']}" for r in nj))
