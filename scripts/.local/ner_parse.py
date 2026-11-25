# Northeast Regional 2026 (FloArena copy): entries (name / club / weight / division) and the Junior FS results.
# Places 1–6 from the 1st / 3rd / 5th place matches; abbreviated names ("B. Kinney") matched to entries.
import re, sys, collections, json
L = [l.strip() for l in open(sys.argv[1])]
start = next(i for i, l in enumerate(L) if l.startswith('2026 Phil Portuese Northeast Regional Championships') and 'May' in l)
# entries
entries = []; i = 0
while i < start:
    if L[i] and ',' in L[i] and i + 3 < start and L[i + 3] and re.search(r'(FS|GR)$', L[i + 3]):
        last, first = [x.strip() for x in L[i].split(',', 1)]
        entries.append(dict(first=re.sub(r'^[“"(\'].*?[”")\']\s*', '', first).strip() or first, last=re.sub(r'^[“"(\'].*?[”")\']\s*', '', last).strip() or last, club=L[i + 1], weight=L[i + 2], division=L[i + 3])); i += 4
    else: i += 1
R = L[start:]
div = None; weight = None; places = []; unresolved = []
j = 0
while j < len(R):
    l = R[j]
    if re.match(r'^(Junior|16U|14U|12U|10U|8U|U23|Senior)\b.*(FS|GR)$', l): div = l
    m = re.match(r'^(\d+) lbs$', l)
    if m: weight = m.group(1)
    pm = re.match(r'^(1ST|3RD|5TH|7TH) PLACE MATCH$', l)
    if pm:
        k = j + 1; blk = []
        while k < len(R) and not R[k].startswith('#'):
            if R[k]: blk.append(R[k])
            k += 1
        names = [x for x in blk if re.match(r'^[A-Z]\.\s?\S', x)][:2]
        nums = [int(x) for x in blk if re.fullmatch(r'\d+', x)]
        res = next((x for x in blk if re.match(r'^(DEC|MD|TF|F |FALL|M FOR|FOR|INJ|DQ|DFF|FF)', x)), '')
        base = int(pm.group(1)[0])
        if len(names) == 2 and len(nums) >= 2 and nums[0] != nums[1]:
            win, lose = (names[0], names[1]) if nums[0] > nums[1] else (names[1], names[0])
        elif len(names) == 2:
            win, lose = names[0], names[1]; unresolved.append(f'{div} {weight} {pm.group(1)}: {names} {res} (no scores, first listed taken as winner)')
        else:
            j = k; continue
        places += [dict(division=div, weight=weight, place=base, short=win), dict(division=div, weight=weight, place=base + 1, short=lose)]
        j = k
    j += 1
# resolve "B. Kinney" → entry in that division + weight (first initial + last name)
def resolve(p):
    ini, last = p['short'].split('.', 1)[0], p['short'].split('.', 1)[1].strip()
    c = [e for e in entries if e['division'] == p['division'] and e['last'].lower() == last.lower() and e['first'][:1].upper() == ini.upper()]
    if len(c) > 1: c = [e for e in c if e['weight'] == p['weight']] or c
    return c
out = []; miss = []
for p in places:
    c = resolve(p)
    if len(c) == 1: out.append({**p, 'name': f"{c[0]['first']} {c[0]['last']}", 'club': c[0]['club']})
    else: miss.append(f"{p['division']} {p['weight']} {p['place']} {p['short']} ({len(c)} entries)")
print('entries', len(entries), '| result divisions', sorted({p['division'] for p in places}), '| places', len(places), '| named', len(out))
for m in miss: print('  could not name:', m)
for u in unresolved: print('  check:', u)
json.dump(out, open(sys.argv[2], 'w'))
for w in sorted({p['weight'] for p in out}, key=int)[:3]:
    print(w, '; '.join(f"{p['place']}. {p['name']} ({p['club']})" for p in sorted([x for x in out if x['weight'] == w], key=lambda x: x['place'])))
