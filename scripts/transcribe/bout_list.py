"""Kyle 2026-11-18: a transcript (entrants + places 1–8, no bouts) from a Kreider "Bout-By-Bout Results" PDF (NAIA 2009):
"Wt125" heads a weight, each bout "437  #2 Name (College) DEC #1 Name (College)   D 3-0", the place bouts under
"Finals - First Place" etc. The "#n" is a pod seed (several wrestlers share it), so no seed is kept.
   python3 scripts/transcribe/bout_list.py <pdf> "<header line>" > transcript.txt"""
import sys, re, fitz
pdf, header = sys.argv[1], sys.argv[2]
t = '\n'.join(p.get_text() for p in fitz.open(pdf))
SIDE = r"(?:#\d+\s+)?([A-Z][^()]*?)\s+\(([^()]+)\)"
ents, places, w, place = {}, {}, None, None
for l in t.split('\n'):
    l = l.strip()
    m = re.fullmatch(r'Wt(\d{3})', l)
    if m: w = int(m.group(1)); ents.setdefault(w, {}); places.setdefault(w, {}); continue
    m = re.match(r'Finals - (First|Third|Fifth|Seventh) Place', l)
    if m: place = {'First': 1, 'Third': 3, 'Fifth': 5, 'Seventh': 7}[m.group(1)]; continue
    if re.search(r'Round|Rou$', l): place = None
    m = re.match(r'^\d+\s+' + SIDE + r'\s+[A-Z]{2,4}\s+' + SIDE + r'\s+', l)
    if not m or w is None: continue
    for n, c in ((m.group(1), m.group(2)), (m.group(3), m.group(4))): ents[w].setdefault(n.strip(), c.strip())
    if place: places[w][place], places[w][place + 1] = m.group(1).strip(), m.group(3).strip()
print(f"# {header}\n")
for w in sorted(ents):
    print(f"@ {w}")
    for n, c in ents[w].items(): print(f"- {n} | {c}")
    for p in sorted(places[w]): print(f"place {p} {places[w][p]}")
    print()
