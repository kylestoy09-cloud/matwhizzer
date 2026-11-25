# Round names for a FloWrestling CSV that has none (Kyle 2026-11-21: Iron Man 2025's export left every round blank),
# read from the event's FloWrestling bracket PDF. Each bout box in the PDF carries a bout number with its two wrestlers
# just to its left ("1 Chittum (Clev)" above, "32 Haley (WAJE)" below); FloWrestling numbers bouts round by round across
# the weights, so a weight's bouts in number order are its rounds in order, and a run of consecutive numbers is one
# round. A bout between two still-unbeaten wrestlers is a championship bout; the last one is the final, the runs before
# it the semis, quarters and earlier rounds. The placement page names the 3rd / 5th / 7th place bouts. Everything else
# is a consolation round in order. Writes a copy of the CSV with the Round column filled, for the history import
# (data/history/rounds/<file name>, which scripts/import_tournament_history_20261120.mts reads in place of the file).
#   python3 scripts/flo_pdf_rounds.py "<csv>" "<pdf>" [--seeds-only]   (seeds also go to data/history/seeds/<file name>)
import csv, re, subprocess, sys, os, collections

CSV, PDF = sys.argv[1], sys.argv[2]
SEEDS_ONLY = '--seeds-only' in sys.argv   # a CSV that has its rounds: only the seeds are read
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'history', 'rounds')
os.makedirs(OUT_DIR, exist_ok=True)
OUT = os.path.join(OUT_DIR, os.path.basename(CSV))

norm = lambda s: re.sub('[^a-z]', '', (s or '').lower())
women = lambda s: bool(re.search(r'women|girl', s or '', re.I))

# ── the PDF: words with positions, page by page ──────────────────────────────────────────────────────────────────────
html = subprocess.run(['pdftotext', '-bbox', PDF, '-'], capture_output=True, text=True).stdout
pages = re.findall(r'<page[^>]*>(.*?)</page>', html, re.S)
seeds = []   # (womens, weight, seed, full name)
bouts = []   # (womens, weight, number, last name A, last name B, place label or None, x of the bout box)
prev_wt, womens_part = None, False
for pg in pages:
    ws = [(float(a), float(b), float(c), float(d), t) for a, b, c, d, t in re.findall(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)</word>', pg)]
    if not ws: continue
    head = ' '.join(t for x, y, _, _, t in ws if y < 55)
    # the weight sits in the top-right corner, under the event name
    wt = next((t for x, y, _, _, t in ws if 50 < y < 75 and x > 600 and t.isdigit()), None)
    if not wt: continue
    # the women's brackets follow the men's with the same header: they start where the weights start over
    if prev_wt and int(wt) < prev_wt and not womens_part and int(wt) < 105: womens_part = True
    prev_wt = int(wt)
    wom = women(head) or womens_part
    # lines: words on the same baseline, close together → "seed First Last (ABBR)" entries
    # (a seed sits a hair lower than its name: words within 2 points of height are one row, read left to right)
    rows_y = []
    for w in sorted(ws, key=lambda w: w[1]):
        if rows_y and abs(rows_y[-1][0][1] - w[1]) < 2: rows_y[-1].append(w)
        else: rows_y.append([w])
    lines = []
    for row in rows_y:
        cur = None
        for w in sorted(row, key=lambda w: w[0]):
            if cur and w[0] - cur['x1'] < 8: cur['t'] += ' ' + w[4]; cur['x1'] = w[2]
            else:
                cur = {'x0': w[0], 'x1': w[2], 'y': w[1], 't': w[4]}; lines.append(cur)
    # seeds: the first column's entrant lines, "1 Ace Chittum (Clev)" (full name; later columns print last names)
    for l in lines:
        m = re.match(r'^(\d{1,2}) (.+?) \(([^)]*)\)?$', l['t'])
        if m and l['x0'] < 60 and len(m.group(2).split()) >= 2: seeds.append((wom, wt, int(m.group(1)), m.group(2)))
    entries = []
    for l in lines:
        m = re.match(r'^(?:\d{1,2} )?(.+?) \(([^)]*)\)?$', l['t'])   # a long name's team abbreviation can lose its ")"
        if m: entries.append({**l, 'last': m.group(1).split(' ')[-1] if ' ' not in m.group(1) else m.group(1)})
    # placement headers on this page
    heads = [(l['x0'], l['y'], l['t']) for l in lines if re.fullmatch(r'(3rd|5th|7th) Place', l['t'])]
    # bout numbers: a number printed twice at the same spot
    nums = collections.defaultdict(list)
    for x, y, x1, y1, t in ws:
        if t.isdigit() and len(t) <= 4: nums[t].append((x, y))
    for n, pos in nums.items():
        for i in range(len(pos)):
            for j in range(i + 1, len(pos)):
                (xa, ya), (xb, yb) = pos[i], pos[j]
                if abs(xa - xb) < 3 and abs(ya - yb) < 4:
                    x, y = (xa + xb) / 2, (ya + yb) / 2
                    near = [e for e in entries if e['x1'] < x and x - e['x1'] < 140 and abs(e['y'] - y) < 25]
                    above = [e for e in near if e['y'] < y]; below = [e for e in near if e['y'] > y]
                    if not above or not below: continue
                    # the column just left of the number, then the nearest line above and below in it
                    edge = max(e['x1'] for e in near)
                    above = [e for e in above if e['x1'] > edge - 45] or above
                    below = [e for e in below if e['x1'] > edge - 45] or below
                    a = min(above, key=lambda e: y - e['y']); b = min(below, key=lambda e: e['y'] - y)
                    place = None
                    for hx, hy, ht in heads:
                        if hy < y and y - hy < 60 and abs(a['x0'] - hx) < 60: place = ht.split()[0]
                    bouts.append((wom, wt, int(n), a['last'], b['last'], place, x))

# ── the CSV ──────────────────────────────────────────────────────────────────────────────────────────────────────────
raw = list(csv.reader(open(CSV, encoding='utf-8', errors='replace')))
hdr = [x.strip('="') for x in raw[0]]
rows = [dict(zip(hdr, [c.lstrip('=').strip('"') for c in x])) for x in raw[1:]]
idx = {h: i for i, h in enumerate(hdr)}

def ends(full, last):
    # the PDF's last name ends the CSV's full name; failing that (a name cut short or spelled two ways —
    # "Gonzalez-Henrique", "Littleton mascaro"), its first six letters are in it
    f, l = norm(full), norm(last)
    return bool(l) and (f.endswith(l) or (len(l) >= 6 and l[:6] in f))

pdf_by = collections.defaultdict(list)
for b in bouts: pdf_by[(b[0], b[1])].append(b)
number = {}   # csv row index → (number, place)
unmatched = []
for i, r in enumerate(rows):
    if not r['Losing Wrestler']: continue
    key = (women(r['Event']), r['Weight'])
    cands = [b for b in pdf_by.get(key, []) if (ends(r['Winning Wrestler'], b[3]) and ends(r['Losing Wrestler'], b[4])) or (ends(r['Winning Wrestler'], b[4]) and ends(r['Losing Wrestler'], b[3]))]
    cands = [b for b in cands if b[2] not in {v[0] for v in number.values() if v[2] == key}]
    if not cands: unmatched.append(f"{r['Event']} {r['Weight']}: {r['Winning Wrestler']} > {r['Losing Wrestler']}"); continue
    b = min(cands, key=lambda b: b[2])
    number[i] = (b[2], b[5], key, b[6])

# ── rounds, weight by weight ────────────────────────────────────────────────────────────────────────────────────────
label = {}
report = []
for key in sorted({v[2] for v in number.values()}):
    ix = sorted([i for i, v in number.items() if v[2] == key], key=lambda i: number[i][0])
    losses = collections.Counter()
    champ, cons = [], []
    for i in ix:
        r = rows[i]
        (champ if not losses[r['Winning Wrestler']] and not losses[r['Losing Wrestler']] and not number[i][1] else cons).append(i)
        losses[r['Losing Wrestler']] += 1
    # championship rounds: the PDF's columns, left to right (the final is the last championship bout, on its own page)
    final = champ[-1] if champ else None
    # columns: the box x positions, grouped where they're within 40 points of each other
    xs = sorted({number[i][3] for i in champ if i != final})
    col_of, cols = {}, []
    for x in xs:
        if not cols or x - cols[-1][-1] > 40: cols.append([x])
        else: cols[-1].append(x)
        col_of[x] = len(cols) - 1
    cols = list(range(len(cols)))
    names = ['Semifinal', 'Quarterfinal']
    for i in champ:
        if i == final: label[i] = '1st Place Match'; continue
        k = len(cols) - 1 - col_of[number[i][3]]
        label[i] = names[k] if k < 2 else f'Championship Round {len(cols) - k}'
    places = [i for i in cons if number[i][1]]
    for i in places: label[i] = f'{number[i][1]} Place Match'
    # consolation rounds: one round after the later of the two wrestlers' previous bouts (a championship loss = 0)
    level, last = {}, {}
    for i in ix:
        r = rows[i]
        if i in cons and not number[i][1]:
            level[i] = 1 + max(last.get(r['Winning Wrestler'], 0), last.get(r['Losing Wrestler'], 0))
            last[r['Winning Wrestler']] = last[r['Losing Wrestler']] = level[i]
        elif i in champ:
            last[r['Losing Wrestler']] = 0
    for i, lv in level.items(): label[i] = f'Cons. Round {lv}'
    cr = [sum(1 for i in champ if label[i] == n) for n in sorted({label[i] for i in champ}, key=lambda n: (n == '1st Place Match', n == 'Semifinal', n == 'Quarterfinal', n))]
    rest = [sum(1 for v in level.values() if v == k) for k in sorted(set(level.values()))]
    report.append(f"{'W' if key[0] else 'B'} {key[1]}: championship rounds {cr} consolation rounds {rest} places {sorted(number[i][1] for i in places)}")

if SEEDS_ONLY: OUT = os.path.join(OUT_DIR, '_unused_' + os.path.basename(CSV))
with open(OUT, 'w', newline='') as fh:
    w = csv.writer(fh, quoting=csv.QUOTE_ALL)
    w.writerow(hdr)
    for i, r in enumerate(rows):
        if i in label: r = {**r, 'Round': label[i]}
        w.writerow([r[h] for h in hdr])
print('\n'.join(report))
print(f'PDF bouts {len(bouts)}, CSV bouts {sum(1 for r in rows if r["Losing Wrestler"])}, labeled {len(label)}, unmatched {len(unmatched)}')
for u in unmatched[:15]: print('  unmatched:', u)
if SEEDS_ONLY: os.remove(OUT)
else: print('wrote', os.path.normpath(OUT))
# the seeds, for the history import (data/history/seeds/<file name>): event as the CSV names it, weight, seed, name
SEED_DIR = os.path.join(OUT_DIR, '..', 'seeds'); os.makedirs(SEED_DIR, exist_ok=True)
events = {women(r['Event']): r['Event'] for r in rows}
uniq = {(w, wt, n): sd for w, wt, sd, n in seeds}
with open(os.path.join(SEED_DIR, os.path.basename(CSV)), 'w', newline='') as fh:
    out = csv.writer(fh, quoting=csv.QUOTE_ALL); out.writerow(['Event', 'Weight', 'Seed', 'Wrestler'])
    for (w, wt, n), sd in sorted(uniq.items(), key=lambda x: (x[0][0], int(x[0][1]), x[1])): out.writerow([events.get(w, ''), wt, sd, n])
print(f'seeds: {len(uniq)} → {os.path.normpath(os.path.join(SEED_DIR, os.path.basename(CSV)))}')
