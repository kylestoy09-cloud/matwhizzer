"""Kyle 2026-11-18: entrant lines for brackets printing "(seed) First Last, College" (DIII 2012) or "(seed) First Last"
over "College (region)" (DIII 2024). One weight a page (pages without a first-round list are skipped).
   python3 scripts/transcribe/draft_comma.py <pdf> > draft.txt"""
import re, sys, fitz
W = {'125','133','141','149','157','165','174','184','197','285'}
d = fitz.open(sys.argv[1])
done = set()
for p in d:
    L = [l.strip().replace('\xa0', ' ') for l in p.get_text().split('\n')]
    w = next((l for l in L if l in W), None)
    if not w or w in done: continue
    ents = []
    for i, l in enumerate(L):
        m = re.match(r"^(?:\((\d+)\)\s*)?([A-Z][A-Za-z.'`’ -]+?\s[A-Z][A-Za-z.'`’ -]+?),\s+(.+)$", l)   # 2012
        if m and not re.search(r'\d', m.group(3)) and ' ' in m.group(2):
            ents.append((m.group(1) or '-', m.group(2), m.group(3))); continue
        m = re.match(r"^(?:\((\d+)\)\s*)?([A-Z][A-Za-z.'`’ -]+)$", l)   # 2024: name, then "College (X)"
        if m and i + 1 < len(L) and len(m.group(2).split()) >= 2:
            c = re.match(r'^(.+?)\s+\((?:C|N|M|S|LM|UM|LM)\)$', L[i + 1])
            if c: ents.append((m.group(1) or '-', m.group(2), c.group(1))); continue
            # (2012's single-page weights: "(5) Ryan Timmerman" over "St. Olaf")
            nx = L[i + 1]
            if len(m.group(2).split()) <= 4 and nx and not re.search(r'[\d,]|Session|Night|Morn|^(Dec|Pin|Maj|TF|OT|I-D|Bye|Loser)\b', nx) and re.match(r'^[A-Z]', nx) \
               and not re.match(r'^(NCAA|Saturday|Friday|Fri|Sat)', m.group(2)):
                ents.append((m.group(1) or '-', m.group(2), nx))
    if len(ents) < 12: continue
    done.add(w)
    print(f'\n@ {w}')
    seen = set()
    for s, n, c in ents:
        n = n.replace('`', "'").replace('’', "'")
        if n in seen: continue
        seen.add(n); print(f'{s} {n} | {c}')
