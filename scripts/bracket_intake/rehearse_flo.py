# Rehearsal: Flo PDF draw + CSV results for the same tournament → does every bout fit? Local files only.
import sys, csv, re, json, unicodedata
sys.path.insert(0, sys.argv[1]); from flo_draw import read
from collections import defaultdict, Counter
def norm(s): return re.sub(r'[^a-z]', '', unicodedata.normalize('NFD', re.sub(r'\([^)]*\)', ' ', s.replace('`', "'"))).lower())
def rows(path):
    with open(path, newline='', encoding='utf-8-sig', errors='replace') as f:
        r = csv.reader(f); hdr = [h.strip('="') for h in next(r)]
        for row in r: yield dict(zip(hdr, [c.strip('="') for c in row]))
CHAMP = [(re.compile(p, re.I), k) for p, k in [
    (r'^(finals?|first place|championship( finals)?|1st place match)$', 'F'), (r'^(semis|semifinals?|semis-finals|champ semis)$', 'SF'),
    (r'^(quarters|quarterfinals?|quarter-finals)$', 'QF'), (r'^(champ\.? round 2|pre-quart?erfinals|round 2)$', 'EARLY2'),
    (r'^(champ\.? round 1|round 1|preliminar(y round|ies)|prelims|perlim round 1)$', 'EARLY1')]]
CONS = re.compile(r'^(cons|consolation|wrestleback|placement|3rd|5th|7th|conso)', re.I)
def kind(label):
    l = re.sub(r'\s*\(\d+ Man\)$', '', label).strip()
    for rx, k in CHAMP:
        if rx.match(l): return k
    return 'CONS' if CONS.match(l) else ('?' + l)
def rehearse(pdf, csvp, label):
    draws = {w['weight']: w for w in read(pdf)}
    bouts = defaultdict(list)
    for x in rows(csvp): bouts[int(x['Weight'])].append(x) if x.get('Weight', '').isdigit() else None
    total = good = 0; probs = []; unknown = Counter()
    for wt, d in sorted(draws.items()):
        slots = d['slots']; size = len(slots); D = size.bit_length() - 1
        pos = {}
        dup = Counter(norm(s['name']) for s in slots if s)
        for i, s in enumerate(slots):
            if not s: continue
            key = norm(s['name']) if dup[norm(s['name'])] == 1 else (norm(s['name']), s['abbr'].lower())
            pos[key] = i
        def where(name, team):
            n = norm(name)
            if n in pos: return pos[n]
            # two wrestlers with this name: the code whose letters fit the team (until Kyle's code list): JALI ~ Jackson Liberty
            cands = [(k, i) for k, i in pos.items() if isinstance(k, tuple) and k[0] == n]
            initials = ''.join(w[0] for w in re.findall(r'[A-Za-z]+', team)).lower()
            fit = [i for k, i in cands if k[1][:2] in (initials[:2], norm(team)[:2]) or initials.startswith(k[1][:3])]
            return fit[0] if len(fit) == 1 else None
        if size not in (8, 16, 32, 64): probs.append(f'{wt}: draw has {size} lines'); continue
        early = sorted({kind(b['Round']) for b in bouts[wt] if kind(b['Round']).startswith('EARLY')})
        col = {'F': D - 1, 'SF': D - 2, 'QF': D - 3}
        if D == 5: col.update({'EARLY1': 0, 'EARLY2': 1})
        else: col.update({'EARLY1': 0, 'EARLY2': 0})
        wbad = []; seen_pairs = set()
        for b in bouts[wt]:
            if b['Win Type'] == 'BYE' or not b['Losing Wrestler'].strip(): continue
            k = kind(b['Round'])
            if k == '?':
                # no round name: two wrestlers on the draw meet on the championship side at exactly one round
                a0, c0 = where(b['Winning Wrestler'], b['Winning Team']), where(b['Losing Wrestler'], b['Losing Team'])
                if a0 is None or c0 is None: unknown['(blank, not on draw)'] += 1; continue
                lvl = (a0 ^ c0).bit_length() - 1
                k = {D - 1: 'F', D - 2: 'SF', D - 3: 'QF'}.get(lvl, 'EARLY1' if lvl == 0 else 'EARLY2')
                # a later meeting of the same pair (wrestlebacks) can't be told apart here: count it as championship once
                key = (min(a0, c0), max(a0, c0))
                if key in seen_pairs: continue
                seen_pairs.add(key)
            if k.startswith('?'): unknown[k[1:]] += 1; continue
            if b['Win Type'] == 'BYE' or not b['Losing Wrestler'].strip() or re.search(r'\bfore?f?e?it\b|^bye bye$', b['Winning Wrestler'] + ' ' + b['Losing Wrestler'], re.I) and (where(b['Winning Wrestler'], b['Winning Team']) is None or where(b['Losing Wrestler'], b['Losing Team']) is None): continue
            a, c = where(b['Winning Wrestler'], b['Winning Team']), where(b['Losing Wrestler'], b['Losing Team'])
            if k == 'CONS':
                if a is None or c is None: wbad.append(f"cons {b['Winning Wrestler']} v {b['Losing Wrestler']}: not on the draw")
                continue
            total += 1
            if a is None or c is None: wbad.append(f"{b['Round']} {b['Winning Wrestler'] if a is None else b['Losing Wrestler']}: not on the draw"); continue
            k_ = col.get(k); blk = 2 ** (k_ + 1)
            if a // blk != c // blk or a // (blk // 2) == c // (blk // 2): wbad.append(f"{b['Round']} {b['Winning Wrestler']} v {b['Losing Wrestler']} off the draw (lines {a+1},{c+1})")
            else: good += 1
        if wbad: probs.append(f'{wt}: ' + ' | '.join(wbad[:3]) + (f' (+{len(wbad)-3})' if len(wbad) > 3 else ''))
    return f'{label}: {len(draws)} weights, {good}/{total} championship bouts fit' + (f'; unknown rounds {dict(unknown)}' if unknown else ''), probs
if __name__ == '__main__':
    for pdf, csvp, label in json.loads(sys.argv[2]):
        head, probs = rehearse(pdf, csvp, label); print(head); [print('   ', p) for p in probs[:8]]
