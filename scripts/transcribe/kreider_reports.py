"""Kyle 2026-11-18: a transcript (qualifiers + places 1–8, no bouts) from a Kreider PDF that carries its reports
(NAIA 2010): "Team Results" (each school: points, deduction, total, name, weight per wrestler) gives every qualifier
with his college; "Finals Summary" ("Wt 125", then 1 … 8 with "Name (College)") gives the places.
   python3 scripts/transcribe/kreider_reports.py <pdf> "<header line>" > transcript.txt"""
import sys, re, fitz
pdf, header = sys.argv[1], sys.argv[2]
d = fitz.open(pdf)
ents, places = {}, {}
for p in d:
    L = [l.strip() for l in p.get_text().split('\n') if l.strip()]
    if 'Team Results' in L:
        i = 0
        while i < len(L):
            if L[i] == 'Total' and i + 2 < len(L) and L[i + 2] == 'Wt' and L[i - 1] in ('Deduct', 'Points Deduct'):
                school = L[i + 1]; i += 3
                # rows: points, deduct, total, name, weight
                while i + 4 < len(L) and re.fullmatch(r'-?[\d.]+', L[i]) and re.fullmatch(r'\d{3}', L[i + 4]):
                    ents.setdefault(int(L[i + 4]), {}).setdefault(L[i + 3], school); i += 5
                continue
            i += 1
    if 'Finals Summary' in L:
        w = None
        for j, l in enumerate(L):
            m = re.fullmatch(r'Wt (\d{3})', l)
            if m: w = int(m.group(1)); continue
            if w and re.fullmatch(r'[1-8]', l) and j + 1 < len(L):
                m = re.match(r'^(.+?) \((.+)\)', L[j + 1])
                if m: places.setdefault(w, {})[int(l)] = (m.group(1).strip(), m.group(2).strip())
# NAIA's Northwestern and York are other schools than the ones those bare names mean on our list
SAME_NAME = {'Northwestern': 'Northwestern (Iowa)', 'York': 'York (Neb.)'}
for w in ents: ents[w] = {n: SAME_NAME.get(c, c) for n, c in ents[w].items()}
for w in places: places[w] = {k: (n, SAME_NAME.get(c, c)) for k, (n, c) in places[w].items()}
print(f"# {header}\n")
for w in sorted(ents):
    print(f"@ {w}")
    for n, c in ents[w].items(): print(f"- {n} | {c}")
    for k, (n, c) in sorted(places.get(w, {}).items()):
        if n not in ents[w]: print(f"- {n} | {c}  # in the Finals Summary only")
        print(f"place {k} {n}")
    print()
