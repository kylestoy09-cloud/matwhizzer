"""Kyle 2026-11-18: the Super 32 high school places of 2000–2004 from "2000 - 2004 Super 32.rtf" (text: scripts' rtfToText
first) — a different layout each year, places 1–4 (later years 1–8 come from other files):
  2004  "130 1st - Nick Murray (Bound Brook, NJ) d Kyle C (Scottsboro, AL) 8-0 3rd - C (…) d D (…)"
  2003  finals "103 - A (Fr, Middletown PA) Dec B (…)" then "Consolation" "103 - C (…) Dec D (…)"; "Tie: A (…), B (…)"
  2002  "105 1. Jarrod Shaw - Brooke, WV 2. Matt Rosen - Great Bridge, VA 3. … 4. …"
  2001  "105 (27 entries) 1st - A (Great Bridge VA) d. B (Mt Tabor) 7-1 3rd - …"
  2000  "122.1 1st - A (Denbigh,VA) pin B (East Gaston) 3rd - …" ("and" for a final not wrestled)
Prints TSV: year, weight, place, place_to, name, school, state — only the high school sections.
   python3 scripts/transcribe/super32_rtf.py <text file>"""
import sys, re
# non-breaking spaces and line separators from the RTF read as spaces; "Trebor Clavette, (Sr, …)" loses its comma; the
# one 2000 line printed without brackets ("Ian Lindermuth Morehead pin …") gets them
L = [re.sub(r'[\u00a0\u2028\u2029\u2007\u202f]', ' ', l).replace(', (', ' (').replace('Ian Lindermuth Morehead pin', 'Ian Lindermuth (Morehead) pin').rstrip()
     for l in open(sys.argv[1], encoding='utf-8', errors='replace')]
STATES = set('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC'.split())
out = []

def who(par):
    """school and state from what's in the brackets: 'Bound Brook, NJ', 'Jr, 1st St, Middletown PA', 'Great Bridge VA',
    'Franklin Co,VA', 'Riverdale, FL 1R-2S' (a seed note)"""
    p = re.sub(r'\s+\d+R(-\d+S)?$|\s+\d+S$', '', par.strip())
    parts = [x.strip() for x in p.split(',') if x.strip()]
    parts = [x for x in parts if not re.fullmatch(r'(Fr|So|Jr|Sr|\d+(st|nd|rd|th)( St| Reg)?|8th)', x)]
    if not parts: return '', None
    last = parts[-1]
    m = re.fullmatch(r'(.*?)[ ]?([A-Z]{2})', last)
    if m and m.group(2) in STATES:
        school = ', '.join(parts[:-1] + ([m.group(1).strip()] if m.group(1).strip() else []))
        return school, m.group(2)
    return ', '.join(parts), None

BOUT = re.compile(r"([A-Z][\w.'` -]+?)\s*\(([^)]*)\)\s*,?\s*(?:d\.?|p\.?|pin|tf|Dec|dec\.?|Maj Dec|Fall|and)\s+([A-Z][\w.'` -]+?)\s*\(([^)]*)\)")

def put(year, w, place, name, par, place_to=None):
    s, st = who(par)
    out.append((year, w, place, place_to or '', name.strip(), s, st or ''))

def weight(tok):
    t = tok.strip().upper()
    if t in ('HWT', 'UNL'): return '285'
    return str(int(float(t.replace(' ', '')))) if re.match(r'^[\d. ]+$', t) else t

year, sect = None, None
for raw in L:
    l = raw.strip()
    m = re.match(r'^(20\d\d)\b', l)
    if m: year = int(m.group(1)); sect = 'hs' if re.search(r'HIGH SCHOOL|RESULTS', l, re.I) else sect
    if re.search(r'MIDDLE SCHOOL', l): sect = 'ms'; continue
    if re.search(r'HIGH SCHOOL|High School Division', l): sect = 'hs'
    if re.search(r'ROUND BY ROUND|Brackets', l, re.I): sect = None
    if sect != 'hs' or not l: continue
    l = re.sub(r'^High School Division Finals\s+|^Championship Finals\s+', '', l)
    if year == 2003:
        if l.startswith('Consolation'): sect3 = 3; continue
        m = re.match(r'^(\d{3}|HWT)\s*-\s*(.*)$', l)
        if not m: continue
        w, rest = weight(m.group(1)), m.group(2)
        base = 3 if any(r[0] == 2003 and r[1] == w and r[2] == 1 for r in out) else 1
        t = re.match(r'^Tie:\s*([^(]+)\(([^)]*)\),\s*([^(]+)\(([^)]*)\)', rest)
        if t: put(2003, w, base, t.group(1), t.group(2), base + 1); put(2003, w, base, t.group(3), t.group(4), base + 1); continue
        b = BOUT.search(rest)
        if b: put(2003, w, base, b.group(1), b.group(2)); put(2003, w, base + 1, b.group(3), b.group(4))
        continue
    m = re.match(r'^(\d{3}(?:\.\s?\d)?|HWT)\b\s*(?:\(\d+ entries\))?\s*(.*)$', l)
    if not m: continue
    w, rest = weight(m.group(1)), m.group(2)
    if year == 2002:
        for k, name, par in re.findall(r'(\d)\.\s+([^-]+?)\s*(?:-\s*([^0-9]*?))?(?=\s+\d\.\s|$)', rest):
            if name.strip(): put(2002, w, int(k), name, par or '')
        continue
    for lab, chunk in re.findall(r'(1st|3rd)\s*-\s*(.*?)(?=\s(?:1st|3rd)\s*-|$)', rest):
        base = 1 if lab == '1st' else 3
        b = BOUT.search(chunk)
        if not b: print(f'# not read: {year} {w} {lab} {chunk}', file=sys.stderr); continue
        tie = ' and ' in chunk[:b.end()] and not re.search(r'\)\s*(d\.?|p\.?|pin|tf|Dec|dec)', chunk)
        put(year, w, base, b.group(1), b.group(2), base + 1 if tie else None)
        put(year, w, base if tie else base + 1, b.group(3), b.group(4), base + 1 if tie else None)
for r in out: print('\t'.join(map(str, r)))
