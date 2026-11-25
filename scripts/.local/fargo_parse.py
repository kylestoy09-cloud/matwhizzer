# Fargo 2026 place winners (copied from USA Bracketing) → podium files per side, freestyle only (no Greco).
import re, sys, csv, collections, os
src, outdir = sys.argv[1:3]
STATES = {'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA','Colorado':'CO','Connecticut':'CT','Delaware':'DE','Florida':'FL','Georgia':'GA','Hawaii':'HI','Idaho':'ID','Illinois':'IL','Indiana':'IN','Iowa':'IA','Kansas':'KS','Kentucky':'KY','Louisiana':'LA','Maine':'ME','Maryland':'MD','Massachusetts':'MA','Michigan':'MI','Minnesota':'MN','Mississippi':'MS','Missouri':'MO','Montana':'MT','Nebraska':'NE','Nevada':'NV','New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM','New York':'NY','North Carolina':'NC','North Dakota':'ND','Ohio':'OH','Oklahoma':'OK','Oregon':'OR','Pennsylvania':'PA','Rhode Island':'RI','South Carolina':'SC','South Dakota':'SD','Tennessee':'TN','Texas':'TX','Utah':'UT','Vermont':'VT','Virginia':'VA','Washington':'WA','West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY','District of Columbia':'DC','Puerto Rico':'PR','Guam':'GU','Virgin Islands':'VI'}
lines = [l.strip() for l in open(src) if l.strip()]
rows, cur, unknown = [], None, collections.Counter()
for l in lines:
    m = re.match(r'^(JR Boys FS|16U Boys FS|16U Boys GR|JR Boys GR|16U Girls|JR Girls) - (\d+)$', l)
    if m: cur = (m.group(1), m.group(2)); continue
    p = re.match(r'^(\d+)(?:st|nd|rd|th) - (.+?) \(([^)]+)\)$', l)
    if p and cur:
        st = STATES.get(p.group(3).strip())
        if not st: unknown[p.group(3)] += 1
        rows.append(dict(div=cur[0], weight=cur[1], place=int(p.group(1)), name=p.group(2).strip(), state=st or p.group(3)))
print('places read', len(rows), '| unknown states', dict(unknown))
c = collections.Counter((r['div']) for r in rows); print(dict(c))
brk = collections.Counter((r['div'], r['weight']) for r in rows); print('brackets', len(brk), '| not 8 places:', {k: v for k, v in brk.items() if v != 8})
fs = [r for r in rows if 'GR' not in r['div']]
os.makedirs(outdir, exist_ok=True)
for side, divs in [('Boys', ['JR Boys FS', '16U Boys FS']), ('Girls', ['JR Girls', '16U Girls'])]:
    sel = sorted([r for r in fs if r['div'] in divs], key=lambda r: (r['div'], int(r['weight']), r['place']))
    with open(f'{outdir}/Fargo 2026 freestyle podium - {side}.csv', 'w', newline='') as fh:
        w = csv.writer(fh); w.writerow(['Weight', 'Place', 'Name', 'State', 'Division'])
        for r in sel: w.writerow([r['weight'], r['place'], r['name'], r['state'], 'Junior' if r['div'].startswith('JR') else '16U'])
    nj = [r for r in sel if r['state'] == 'NJ']
    print(f"{side}: {len(sel)} freestyle places | NJ {len(nj)}: " + '; '.join(f"{'Jr' if r['div'].startswith('JR') else '16U'} {r['weight']} {r['place']} {r['name']}" for r in nj))
