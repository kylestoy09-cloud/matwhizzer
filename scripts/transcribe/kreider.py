"""Kyle 2026-11-18: build a championship transcript (src/lib/ncaa/transcript.ts) from a typed-up Kreider/InTournament
bracket (NCAA DII 2010–2011 and similar): entrants as "Name|CODE|W-L" lines and bouts in the sheet's own notation
("r1 Wright > Meger | D;10-8"), converted to the transcript's (Dec / MD / Fall / TF / SV / TB / For.).
   python3 scripts/transcribe/kreider.py <spec.py> <out.txt>   — spec defines HEADER, CODES, W = {weight: (entrants, bouts)}"""
import re, sys

def result(r):
    p = r.split(';')
    k = p[0]
    if k == 'D':
        if len(p) > 2:
            m = re.match(r'(SV|TB)(\d?)', p[2])   # (older sheets print "TB" with no number)
            return f"{m.group(1)}-{m.group(2) or '1'} {p[1]}"
        return f"Dec {p[1]}"
    if k == 'M': return f"MD {p[1]}"
    if k == 'RT':   # a riding-time tiebreak: "RT;3-3;TB2"
        return f"TB-{p[2][2:]} (RT) {p[1]}"
    if k == 'F':
        return {'FOR': 'For.', 'DEF': 'Def.', 'M FOR': 'M. For.', 'DQ': 'DQ'}.get(p[1], f"Fall {p[1]}")
    if k.startswith('T1'): return f"TF-1.5 {p[2]} ({p[1]})"
    raise ValueError(r)

spec = {}
exec(open(sys.argv[1]).read(), spec)
out = [spec['HEADER']]
for w, (ents, bouts) in spec['W'].items():
    out += ['', f'@ {w}']
    for e in ents.strip().split('\n'):
        n, c, r = ([x.strip() for x in e.split('|')] + [''])[:3]
        col = spec.get('CODES', {}).get(c, c)   # a college not in CODES is written as printed
        out.append(f"- {n} | {col} | {r}" if r else f"- {n} | {col}")   # (some years print no records)
    for b in bouts.strip().split('\n'):
        a, r = b.split(' | ')
        out.append(f"{a.strip()} | {result(r.strip())}")
open(sys.argv[2], 'w').write('\n'.join(out) + '\n')
