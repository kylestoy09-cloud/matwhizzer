"""Kyle 2026-11-18: places 1–8 from a TrackWrestling bracket PDF with text (NAIA 2019–2023): each weight's place bouts
are marked 1ST / 3RD / 5TH / 7TH; the winner is printed above the mark, the two wrestlers end at the bout number beside
it. Prints "125: 1st, 2nd, …, 8th" (full names) for places.py, and "??" where it can't tell — read those off the page.
   python3 scripts/transcribe/tw_places.py <pdf> <draft.txt>"""
import sys, re, fitz
pdf, draft = sys.argv[1], sys.argv[2]
ents, w = {}, None
for l in open(draft):
    if l.startswith('@'): w = l.split()[1]; ents[w] = []
    elif '|' in l: ents[w].append(l.split('|')[0].split(None, 1)[1].strip())
nm = lambda s: re.sub(r'[^a-z]', '', s.lower())
def who(t, w):
    """the entrant a bracket line names ("3 Keegan Hessler MOIO   280" → Keegan Hessler)"""
    t = re.sub(r'^\d{3}\s+', '', t); t = re.sub(r'\s+\d{2,3}$', '', t)
    hits = [e for e in ents.get(w, []) if nm(e) and nm(t).startswith(re.sub(r'^\d+', '', nm(e))) or nm(re.sub(r'^\d+\s+', '', t)).startswith(nm(e))]
    return max(hits, key=len) if hits else None
d = fitz.open(pdf)
out, w = {}, None
for p in d:
    L = []
    for b in p.get_text('dict')['blocks']:
        for l in b.get('lines', []):
            t = ' '.join(s['text'] for s in l['spans']).strip()
            if t: L.append((l['bbox'], t))
    head = re.search(r'NAIA\s+(\d{3})\b', p.get_text()[:200])
    if head and head.group(1) in ents: w = head.group(1)
    if not w: continue
    for (bb, t) in L:
        if t not in ('1ST', '3RD', '5TH', '7TH'): continue
        place = int(t[0])
        above = [(bb[1] - b2[3], x) for (b2, x) in L if 0 < bb[1] - b2[3] < 40 and b2[0] < bb[2] + 30 and b2[2] > bb[0] - 30 and who(x, w)]
        win = who(min(above)[1], w) if above else None
        wl = min(above)[1] if above else None   # (the winner's own line above the mark isn't one of the two)
        nums = [(abs(b2[1] - bb[1]) + abs(b2[0] - bb[0]) / 3, b2) for (b2, x) in L if re.fullmatch(r'\d{3}', x) and abs(b2[1] - bb[1]) < 20 and abs(b2[0] - bb[0]) < 80]
        lose = None
        if nums:
            bn = min(nums, key=lambda z: z[0])[1]
            # the nearest line ending at the bout number above it and below it: the two wrestlers
            side = [(b2[1] - bn[1], who(x, w)) for (b2, x) in L if x != wl and who(x, w) and abs(b2[1] - bn[1]) < (160 if place > 3 else 420) and (abs(b2[2] - bn[0]) < 14 or abs(b2[0] - bn[2]) < 14)]
            up, down = [z for z in side if z[0] < 0], [z for z in side if z[0] >= 0]
            comp = {max(up)[1] if up else None, min(down)[1] if down else None} - {None}
            if win in comp and len(comp) == 2: lose = (comp - {win}).pop()
        out.setdefault(w, {})[place] = win; out[w][place + 1] = lose
for w in ents:
    print(f"{w}: " + ', '.join(out.get(w, {}).get(k) or '??' for k in range(1, 9)))
