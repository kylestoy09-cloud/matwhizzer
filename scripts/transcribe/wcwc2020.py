"""Kyle 2026-11-19: the 2020 women's collegiate nationals (Cliff Keen WCWC — the NCWWC's 2020 event), from
2020_NCWWC_Championship_Brackets.pdf: a page a weight, a transcript of qualifiers and places 1–8 (no bouts). 116 and 155 aren't in the file; 109–143
print the championship side only (1st and 2nd).
  qualifiers  the center column: "Jaclyn McNichols" over "KIUN, 3-2, 10" (school code, record, seed)
  places      each "1ST / 3RD / 5TH / 7TH" bout prints its winner ("Granados, MCUN") just above its result; its two
              wrestlers stand in the outermost column (1st: right, 3rd: left) or just left of the bout's number
              (5th, 7th); the other one takes the place below
School codes are written out from the codes the page uses (CODES).
   python3 scripts/transcribe/wcwc2020.py <pdf>"""
import sys, re, fitz
# the sheet's school codes, written out — each checked against where its wrestlers were in the 2021–25 files (Augsburg,
# not Aurora; UOWA = UW–Stevens Point); MACO = MacMurray (closed 2020; its wrestlers went on to Lindenwood); LAUN
# (one entrant) = Lakeland
CODES = {'ADCO': 'Adrian College', 'AUUN': 'Augsburg University', 'CMU': 'Colorado Mesa University', 'EMCO': 'Emmanuel College',
         'ESU': 'East Stroudsburg University', 'FECO': 'Ferrum College', 'GAUN': 'Gannon University', 'KIUN': 'King University',
         'LAUN': 'Lakeland', 'LICO': 'Limestone University', 'LIUN': 'Lindenwood', 'MACO': 'MacMurray', 'MCUN': 'McKendree University',
         'NCC': 'North Central College', 'PRCO': 'Presbyterian College', 'SCUN': 'Schreiner University', 'SFU': 'Simon Fraser University',
         'TIUN': 'Tiffin University', 'UOWA': 'University Of Wisconsin At Stevens Point'}
d = fitz.open(sys.argv[1])
def lines(p):
    out = []
    for b in p.get_text('dict')['blocks']:
        for l in b.get('lines', []):
            t = ' '.join(''.join(s['text'] for s in l['spans']).split())
            if t: out.append([l['bbox'][0], l['bbox'][1], l['bbox'][2], t])
    return out
NAME = re.compile(r"^([A-Z][\w'’.\- ]+?),\s*([A-Z]{2,5})?$")
print('# source: 2020_NCWWC_Championship_Brackets.pdf (Cliff Keen WCWC: qualifiers and places, no bouts)\n')
for p in d:
    L = lines(p)
    head = [x for x in L if re.fullmatch(r'\d{3}', x[3]) and x[1] < 60 and x[0] > 500]
    if not head: print(f'# page {p.number + 1}: no weight', file=sys.stderr); continue
    w = head[0][3]
    # entrants: "First Last" over "CODE, rec, seed"
    ents = {}
    for x in L:   # the championship-only pages: "Emily Shilson, AUUN, 14-0, 9" on one line
        m = re.match(r"^(.+?), ([A-Z]{2,5}), [\d-]+, \d+$", x[3])
        if m: ents[(m.group(1).split()[-1].lower(), m.group(2))] = (m.group(1), m.group(2))
    for i, x in enumerate(L):
        m = re.match(r'^([A-Z]{2,5}), [\d-]+, \d+$', x[3])
        if not m: continue
        above = [y for y in L if 0 < x[1] - y[1] < 14 and abs((y[0] + y[2]) / 2 - (x[0] + x[2]) / 2) < 40 and not NAME.match(y[3])]
        if above: ents[(above[-1][3].split()[-1].lower(), m.group(1))] = (above[-1][3], m.group(1))
    # names in the bracket: "Last, CODE" (or "Last," with the code on the next line)
    names = []
    for x in L:
        m = NAME.match(x[3])
        if not m: continue
        code = m.group(2)
        if not code:
            nxt = [y for y in L if 0 < y[1] - x[1] < 12 and abs(y[0] - x[0]) < 30 and re.fullmatch(r'[A-Z]{2,5}', y[3])]
            code = nxt[0][3] if nxt else None
        names.append((x[0], x[1], x[2], m.group(1), code))
    def full(last, code):
        e = ents.get((last.split()[-1].lower(), code))
        if e: return e[0]
        c = [v for k, v in ents.items() if k[0] == last.split()[-1].lower()]
        return c[0][0] if len(c) == 1 else last
    places = {}
    for lab in [x for x in L if x[3] in ('1ST', '3RD', '5TH', '7TH')]:
        pl = int(lab[3][0])
        # the result line just above the label, then the winner's name just above that
        res = [y for y in L if 0 < lab[1] - y[1] < 16 and abs(y[0] - lab[0]) < 50]
        top = min((y[1] for y in res), default=lab[1])
        win = [n for n in names if 0 < top - n[1] < 22 and abs(n[0] - lab[0]) < 60]
        if not win: print(f'# {w} {pl}: no winner', file=sys.stderr); continue
        wn = min(win, key=lambda n: top - n[1])
        if pl == 1: col = [n for n in names if n[0] > 430 and n is not wn]; col = [n for n in col if n[0] > max(c[0] for c in col) - 40]
        elif pl == 3: col = [n for n in names if n[0] < 90 and n is not wn]
        else:
            num = [y for y in L if re.fullmatch(r'\d{3}', y[3]) and 0 < lab[1] - y[1] < 30 and 0 < lab[0] - y[0] < 70]
            nx = num[0] if num else lab
            col = [n for n in names if 0 < nx[0] - n[0] < 120 and abs(n[1] - nx[1]) < 40 and n is not wn]
        pair = {(n[3], n[4]) for n in col}
        other = [q for q in pair if q[0] != wn[3]]
        if len(other) != 1: print(f'# {w} {pl}: winner {wn[3]}, others {sorted(pair)}', file=sys.stderr)
        places[pl] = full(wn[3], wn[4])
        if len(other) == 1: places[pl + 1] = full(*other[0])
    # read off the page images (2026-11-19) where the lines sit apart from their bouts; the sheet cuts long names
    # ("Ana Godinez Gonz" — Simon Fraser's Ana Godinez Gonzalez)
    places.update({'170': {5: 'Korinahe Bullock', 6: 'Andrea Sennett', 7: 'Rebekah Trudel', 8: 'Mikayla Mata'},
                   '191': {2: 'Tavi Heidelberg', 5: 'Jessie Lee', 6: 'Kendall McGarity', 7: 'Kaylee Seabolt', 8: 'Angelina Kirkpatrick'},
                   '143': {1: 'Ana Godinez Gonzalez'}}.get(w, {}))
    ents = {k: ('Ana Godinez Gonzalez', v[1]) if v[0] == 'Ana Godinez Gonz' else v for k, v in ents.items()}
    print(f'@ {w}')
    for (last, code), (nm, c) in ents.items(): print(f'- {nm} | {CODES.get(c, c)}')
    for k in sorted(places): print(f'place {k} {places[k]}')
    print()
