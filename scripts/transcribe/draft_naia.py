"""Kyle 2026-11-18: entrant lines for NAIA brackets that print "1 Aden Reeves (Grand View) 20-3", "#3 John Erickson
(King)", "Jason Moorhouse (MBU)" — seed (optional), name, college or code in parentheses, class / record optional.
The weight is the page's (a line "125" / "NAIA 125" / "Wt125"). Pages for the same weight are merged.
   python3 scripts/transcribe/draft_naia.py <pdf> > draft.txt"""
import re, sys, fitz
W = ['125','133','141','149','157','165','174','184','197','285']
d = fitz.open(sys.argv[1])
by = {}
ENT = re.compile(r"^(?:#?(\d{1,2})\s+)?([A-Z][A-Za-z.'`’ -]+?)\s+(?:(?:Fr|So|Jr|Sr|RS)\.?\s+)?\(([^)]+?)\s*\)\s*(?:(?:Fr|So|Jr|Sr|RS)\.?\s*)?(\d+-\d+)?(?:\s+[A-Z][A-Za-z ]*)?$")
CLS = r'(?:RS\s+)?(?:Fr|So|Jr|Sr|Gr)\.?'
def parse_line(l):
    """seed, name, college, record from "9 Jordan Martinez So. (Campbellsville (Ky.)) 13-5 Mid-South" and the like"""
    m = re.match(r"^(?:#?(\d{1,2})\s+)?([A-Z][A-Za-z.'`’ -]+?)\s+(?:" + CLS + r"\s+)?\(", l)
    if not m: return None
    i, depth = m.end() - 1, 0
    for j in range(i, len(l)):
        if l[j] == '(': depth += 1
        elif l[j] == ')':
            depth -= 1
            if depth == 0: break
    else: return None
    college = re.sub(r'\s*\((?:[A-Z][a-z]*\.?\s?)+\)$', '', l[i + 1:j]).strip()   # "Grand View (Iowa)" → Grand View
    tail = l[j + 1:]
    r = re.search(r'(\d+-\d+)', tail)
    if re.search(r'\b(Dec|MD|Maj|TF|Fall|SV|TB)\b', tail): return None
    return m.group(1), m.group(2).strip(), college, r.group(1) if r else None
for p in d:
    L = [re.sub(r'\s+', ' ', l.replace('\xa0', ' ')).strip() for l in p.get_text().split('\n')]
    # the weight: "NAIA 125", else the largest-printed weight number on the page
    w = next((m.group(1) for l in L if (m := re.match(r'^NAIA (\d{3})$', l)) and m.group(1) in W), None)
    if not w:
        big = [(sp['size'], sp['text'].strip()) for b in p.get_text('dict')['blocks'] for ln in b.get('lines', []) for sp in ln['spans'] if sp['text'].strip() in W]
        if big: w = max(big)[1]
    if not w: continue
    for l in L:
        m = parse_line(l)
        if not m: continue
        seed, name, college, rec = m
        name = name.replace('`', "'").replace('’', "'").strip()
        if len(name.split()) < 2 or re.match(r'^[A-Z]\. ', name) or re.search(r'\b(DEC|WBF|MD|TF|Fall|Dec|Maj|Loser|Winner)\b', name): continue
        e = by.setdefault(w, {})
        cur = e.get(name)
        e[name] = (seed or (cur[0] if cur else None), college, rec or (cur[2] if cur else None))
for w in W:
    if w not in by: continue
    print(f'\n@ {w}')
    for n, (s, c, r) in by[w].items():
        print(f"{s or '-'} {n} | {c}" + (f' | {r}' if r else ''))
