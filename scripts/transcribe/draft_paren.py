"""Kyle 2026-11-18: entrant lines for brackets that print "#3 Dustin Brewer (Simpson)" / "#2-Nathan Fitzenreider
(North Central)" (Kreider sheets: DIII 2004, 2011): one weight a page, the weight from the page's own number.
   python3 scripts/transcribe/draft_paren.py <pdf> > draft.txt"""
import re, sys, fitz
d = fitz.open(sys.argv[1])
W = {'125','133','141','149','157','165','174','184','197','285'}
for p in d:
    t = p.get_text(); lines = [l.strip() for l in t.split('\n')]
    w = next((l for l in lines if l in W), None)
    ents = []
    for l in lines:
        # (2011 adds the record: "#1-Clayton Rush (Coe) [31-1]")
        m = re.match(r"^(?:#(\d+)\s*-?\s*)?([A-Z][A-Za-z.'`’ -]+?)\s+\(([^)]+)\)(?:\s*\[(\d+-\d+)\]?)?$", l)
        if m and len(m.group(2).split()) >= 2 and not re.match(r'^[A-Z]\.', m.group(2)):
            ents.append((m.group(1) or '-', m.group(2).replace('`', "'").replace('’', "'"), m.group(3), m.group(4)))
    if not w or len(ents) < 8: continue
    print(f'\n@ {w}')
    seen = set()
    for s, n, c, r in ents:
        if n in seen: continue
        seen.add(n); print(f'{s} {n} | {c} | {r}' if r else f'{s} {n} | {c}')
