# Podiums (1st–8th) for each labeled Super 32 bracket, from the placement bouts; round robins by record.
import json, sys, csv, collections, re, os
brackets = json.load(open(sys.argv[1])); outdir = sys.argv[2]
PLACE = {'Finals': 1, '3rd Place': 3, '5th Place': 5, '7th Place': 7}
by_div = collections.defaultdict(list); notes = []
for b in brackets:
    rows = b['rows']; podium = {}
    rr = any(r['Round'].startswith('RR') for r in rows) and not any(r['Round'] == 'Finals' for r in rows)
    if rr:
        rec = collections.Counter(); loss = collections.Counter(); ppl = set()
        for r in rows:
            if not r['Losing Wrestler']: continue
            w, l = (r['Winning Wrestler'], r['Winning Team']), (r['Losing Wrestler'], r['Losing Team'])
            rec[w] += 1; loss[l] += 1; ppl |= {w, l}
        order = sorted(ppl, key=lambda p: (-rec[p], loss[p]))
        for i, p in enumerate(order[:8]): podium[i + 1] = p
        notes.append(f"{b['division']} {b['weight']}: round robin, placed by record ({', '.join(f'{p[0]} {rec[p]}-{loss[p]}' for p in order)})")
    else:
        for r in rows:
            p = PLACE.get(r['Round'])
            if not p or not r['Losing Wrestler']: continue
            podium[p] = (r['Winning Wrestler'], r['Winning Team']); podium[p + 1] = (r['Losing Wrestler'], r['Losing Team'])
    for place in sorted(podium):
        n, st = podium[place]
        by_div[b['division']].append(dict(Weight=b['weight'], Place=place, Name=n, State=st, Division=b['division'], Grade=b['grades'].get(f'{n}|{st}') or ''))
os.makedirs(outdir, exist_ok=True)
wkey = lambda r: (int(re.sub(r'\D', '', r['Weight'].split('(')[0]) or 999) if r['Weight'][0].isdigit() else 999, r['Place'])
for d, rs in by_div.items():
    rs.sort(key=wkey)
    with open(f"{outdir}/Super 32 2026 podium - {d}.csv", 'w', newline='') as fh:
        w = csv.DictWriter(fh, fieldnames=['Weight', 'Place', 'Name', 'State', 'Division', 'Grade']); w.writeheader(); w.writerows(rs)
    nj = [r for r in rs if r['State'] == 'NJ']
    print(f"{d}: {len(rs)} places | NJ {len(nj)}: " + '; '.join(f"{r['Weight']} {r['Place']} {r['Name']}{' (' + r['Grade'] + ')' if r['Grade'] else ''}" for r in nj))
for n in notes: print('  note:', n)
