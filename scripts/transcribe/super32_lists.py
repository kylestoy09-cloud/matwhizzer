"""Kyle 2026-11-18: Super 32 high school places from the 2009–2012 result files (Off Season Stuff/.../Super 32):
  2009.pdf            "103 – A (School, State) dec. B (School, State) 6-4" (finals), then "Consolation Finals:" with
                      "103:" and "3rd: / 5th: / 7th: A (…) dec. B (…)"
  2010.pdf, 2011HS.pdf, 2012HS_Complete.pdf   a PlaceWinners Report: "103 Lbs:" then "1st: FIRST LAST ST [grade]" …
                      ("2nd: No Second" = not awarded); only the report at the front is read (its pages, up to the brackets)
Prints TSV: year, weight, place, place_to, name, school, state.
   python3 scripts/transcribe/super32_lists.py <dir>"""
import sys, re, fitz
D = sys.argv[1].rstrip('/') + '/'
STATES = {'Alabama': 'AL', 'Arizona': 'AZ', 'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kentucky': 'KY', 'Maryland': 'MD', 'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Missouri': 'MO', 'New Jersey': 'NJ', 'New York': 'NY', 'North Carolina': 'NC', 'Ohio': 'OH', 'Oklahoma': 'OK', 'Pennsylvania': 'PA', 'South Carolina': 'SC', 'Tennessee': 'TN', 'Texas': 'TX', 'Virginia': 'VA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'New Hampshire': 'NH', 'Washington': 'WA', 'Oregon': 'OR', 'Utah': 'UT', 'Idaho': 'ID', 'Nebraska': 'NE', 'Kansas': 'KS', 'Louisiana': 'LA', 'Mississippi': 'MS', 'Arkansas': 'AR', 'Vermont': 'VT', 'Maine': 'ME', 'Rhode Island': 'RI', 'Nevada': 'NV', 'New Mexico': 'NM', 'Montana': 'MT', 'Wyoming': 'WY', 'Hawaii': 'HI', 'Alaska': 'AK', 'South Dakota': 'SD', 'North Dakota': 'ND'}
out = []
def title(s):
    """FIRST LAST in capitals → First Last (McX, O'X, hyphens)"""
    if re.search(r'[a-z]', s): return s.strip()
    t = ' '.join(w.capitalize() for w in s.split())
    t = re.sub(r"\b(Mc|O')([a-z])", lambda m: m.group(1) + m.group(2).upper(), t)   # (not Mac: Macri)
    t = re.sub(r'\(([a-z])', lambda m: '(' + m.group(1).upper(), t)
    t = re.sub(r'\b(Ii|Iii|Iv)\b', lambda m: m.group(1).upper(), t)
    return re.sub(r'-([a-z])', lambda m: '-' + m.group(1).upper(), t)
def where(par):
    parts = [x.strip() for x in par.split(',')]
    st = parts[-1] if len(parts) > 1 else ''
    st = STATES.get(st, st if re.fullmatch(r'[A-Z]{2}', st) else '')
    return (', '.join(parts[:-1]) if st else par.strip()), st

# 2009
t = '\n'.join(p.get_text() for p in fitz.open(D + '2009.pdf'))
t = re.sub(r'\s*\n\s*', ' ', t)
# the result between the two: dec. / fall / injury default over / by forfeit over / … ; "A and B double forfeit" (both
# forfeited the 5th-place bout — tied 5th)
BOUT = r"([A-Z][\w.'’` ,-]+?)\s*\(([^)]*)\)\s*(dec\.?|fall|pinned|pin|maj\.?(?: dec\.?)?|tech\.?(?: fall)?|tf|injury default over|default over|by forfeit over|forfeit over|med\.? for\.?(?: over)?|inj\.? def\.?|def\.?|over|and)\s+([A-Z][\w.'’` ,-]+?)\s*\(([^)]*)\)"
fin = t.split('Consolation Finals:')[0]
for w, a, ap, _, b, bp in re.findall(r'(\d{3})\s*[–-]\s*' + BOUT, fin):
    s, st = where(ap); out.append((2009, w, 1, '', a, s, st)); s, st = where(bp); out.append((2009, w, 2, '', b, s, st))
cons = t.split('Consolation Finals:')[1] if 'Consolation Finals:' in t else ''
for block in re.split(r'(?=\b\d{3}:)', cons):
    m = re.match(r'(\d{3}):', block)
    if not m: continue
    for k, a, ap, verb, b, bp in re.findall(r'(3rd|5th|7th):\s*' + BOUT, block):
        p = int(k[0]); tie = verb == 'and'
        s, st = where(ap); out.append((2009, m.group(1), p, p + 1 if tie else '', a, s, st))
        s, st = where(bp); out.append((2009, m.group(1), p if tie else p + 1, p + 1 if tie else '', b, s, st))

# 2010–2012 PlaceWinners Report (the front of each file)
for f, year in (('2010.pdf', 2010), ('2011HS.pdf', 2011), ('2012HS_Complete.pdf', 2012)):
    t = '\n'.join(p.get_text() for p in fitz.open(D + f))
    # the report runs over a few pages, each ending "PlaceWinners Report"; the brackets follow the last one
    t = ' '.join(t.split('PlaceWinners Report')[:-1])
    toks = re.sub(r'\s+', ' ', t)
    # a page footer ("2010 Super 32 Sunday 10/31/10 Escape Sports, Inc 1") runs into the name before it
    toks = re.sub(r'\s*\b20\d\d Super 32[^/]*?\d+/\d+/\d+ Escape Sports, Inc \d+', ' ', toks)
    # 2012: the 120 lb 8th place ("8th:" left empty) printed under the next page's footer as "HS Christian Innarella NJ"
    if year == 2012 and ' HS Christian Innarella NJ' in toks:
        toks = toks.replace(' HS Christian Innarella NJ', '').replace('Joshua Terao HI 8th: ', 'Joshua Terao HI 8th: Christian Innarella NJ ', 1)
    # a page that continues a weight repeats a heading over it ("106 Lbs: 6th: …"): not a new weight
    toks = re.sub(r'\d{3} Lbs:\s*(?=[2-8](?:nd|rd|th):)', '', toks)
    # 2011's first weight (106) starts at the top with no heading of its own
    if re.match(r'^\s*(HS\s+)?(Place Name School Grade\s+)?1st:', toks): toks = '106 Lbs: ' + re.sub(r'^\s*(HS\s+)?(Place Name School Grade\s+)?', '', toks)
    # 2011 prints a stray "106 Lbs:" among the weights; a weight heading counts only once
    seen = set()
    for w, body in re.findall(r'(\d{3}) Lbs:\s*(.*?)(?=\d{3} Lbs:|$)', toks):
        if w in seen or not re.search(r'\d(?:st|nd|rd|th):', body): continue   # a stray empty heading
        seen.add(w)
        for k, rest in re.findall(r'(\d)(?:st|nd|rd|th):\s*(.*?)(?=\s\d(?:st|nd|rd|th):|$)', body):
            rest = rest.strip()
            if re.match(r'(?i)^no ', rest) or not rest: continue
            m = re.match(r"^(.+?)\s+([A-Za-z]{2})(?:\s+\d{1,2})?\s*$", rest)   # ("Ga" once)
            if not m: print(f'# not read {year} {w} {k}: {rest}', file=sys.stderr); continue
            out.append((year, w, int(k), '', title(re.sub(r'\s+', ' ', m.group(1))), '', m.group(2).upper()))
for r in out: print('\t'.join(map(str, r)))
