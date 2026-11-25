# Parse the Super 32 roster (name / state / weight / scale weight / [grade] / division) and label each bracket.
import csv, json, re, sys, collections
roster_txt, bouts_csv, out_json = sys.argv[1:4]
lines = [l.strip() for l in open(roster_txt) if l.strip()]
DIVS = None
recs = []; i = 0
while i < len(lines):
    if re.match(r"^[^,]+, .+$", lines[i]) and i + 3 < len(lines) and re.match(r"^[A-Z]{2}$", lines[i+1]):
        last, first = [x.strip() for x in lines[i].split(',', 1)]
        st, wt = lines[i+1], lines[i+2]
        j = i + 3
        if re.match(r"^\d+(\.\d+)?$", lines[j]): j += 1          # scale weight
        grade = None
        if re.match(r"^(\d+(st|nd|rd|th)|K|Pre-?K)$", lines[j]): grade = lines[j]; j += 1
        div = lines[j]
        recs.append(dict(first=first, last=last, state=st, weight=wt, grade=grade, division=div)); i = j + 1
    else:
        i += 1
print('roster records', len(recs)); print(collections.Counter(r['division'] for r in recs))
cell = lambda v: v.replace('="', '').strip('"=')
rows = [{cell(k): cell(v) for k, v in r.items()} for r in csv.DictReader(open(bouts_csv))]
# brackets by who wrestled whom
par = {}
def f(x):
    while par.setdefault(x, x) != x: par[x] = par[par[x]]; x = par[x]
    return x
for r in rows:
    a = (r['Weight'], r['Winning Wrestler'], r['Winning Team']); f(a)
    if r['Losing Wrestler']: par[f(a)] = f((r['Weight'], r['Losing Wrestler'], r['Losing Team']))
roster = collections.defaultdict(list)
for x in recs: roster[(f"{x['first']} {x['last']}".lower(), x['state'], x['weight'])].append(x)
roster_nw = collections.defaultdict(list)
for x in recs: roster_nw[(f"{x['first']} {x['last']}".lower(), x['state'])].append(x)
br = collections.defaultdict(lambda: {'rows': [], 'people': set()})
for r in rows:
    k = f((r['Weight'], r['Winning Wrestler'], r['Winning Team'])); b = br[k]; b['rows'].append(r)
    b['people'].add((r['Winning Wrestler'], r['Winning Team']))
    if r['Losing Wrestler']: b['people'].add((r['Losing Wrestler'], r['Losing Team']))
out = []; unmatched = 0
for k, b in br.items():
    w = b['rows'][0]['Weight']; votes = collections.Counter(); grades = {}
    for n, st in b['people']:
        hit = roster.get((n.lower(), st, w)) or roster_nw.get((n.lower(), st)) or []
        if len({h['division'] for h in hit}) == 1: votes[hit[0]['division']] += 1; grades[(n, st)] = hit[0]['grade']
        else: unmatched += 1
    div, n = votes.most_common(1)[0] if votes else ('?', 0)
    out.append(dict(weight=w, division=div, agree=n, people=len(b['people']), other=dict(votes - collections.Counter({div: n})), rows=b['rows'], grades={f'{a}|{s}': g for (a, s), g in grades.items()}))
print('brackets', len(out), '| wrestlers not found in roster', unmatched)
order = {}
for o in sorted(out, key=lambda o: (o['division'], int(re.sub(r'\D', '', o['weight']) or 999))):
    order.setdefault(o['division'], []).append(f"{o['weight']}({o['people']}{'' if not o['other'] else ' ?' + json.dumps(o['other'])})")
for d, ws in order.items(): print(f"{d}: {len(ws)} brackets — {' '.join(ws)}")
json.dump(out, open(out_json, 'w'))
