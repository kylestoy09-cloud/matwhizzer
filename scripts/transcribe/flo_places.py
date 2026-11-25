"""Kyle 2026-11-18: places 1–8 from a FloWrestling bracket PDF (NCAA DII 2025 "2025 brackets.pdf"): each weight's
bouts are boxes — two "seed Last (CODE)" lines beside the bout number, the winner in the heavy face. The final is the
highest-numbered bout of the championship side; "3rd / 5th / 7th Place" head their bouts on the weight's last page.
Prints "place" lines per weight ("@ 125") to add under a transcript's qualifiers.
   python3 scripts/transcribe/flo_places.py <pdf>"""
import sys, re, fitz
d = fitz.open(sys.argv[1])
out, w = {}, None
for p in d:
    # the winner's line is set in the heavy face (UniNeueHeavy), the loser's in the lighter "Bold" one
    spans = [(s['bbox'], s['text'].strip(), 'Heavy' in s['font']) for b in p.get_text('dict')['blocks'] for l in b.get('lines', []) for s in l['spans'] if s['text'].strip()]
    wt = [t for bb, t, _ in spans if re.fullmatch(r'\d{3}', t) and bb[1] < 120 and bb[0] > 400]
    if wt: w = int(wt[0])
    nums = [(bb, int(t)) for bb, t, _ in spans if re.fullmatch(r'\d{1,3}', t) and int(t) != w]
    def bout(n):
        """the two wrestlers of bout n on this page: (winner, loser) by the bold line"""
        hit = [bb for bb, k in nums if k == n]
        if not hit: return None
        bb = hit[0]
        names = [(sb, t, bold) for sb, t, bold in spans if re.search(r'\([A-Z]+\)$', t) and sb[2] <= bb[0] + 2 and bb[0] - sb[2] < 140 and abs((sb[1] + sb[3]) / 2 - (bb[1] + bb[3]) / 2) < 12]
        win = [t for _, t, b in names if b]; lose = [t for _, t, b in names if not b]
        return (win[0], lose[0]) if len(win) == 1 and len(lose) == 1 else None
    clean = lambda t: re.sub(r'^\d+\s+', '', re.sub(r'\s*\([A-Z]+\)$', '', t)).strip()
    labels = {t: bb for bb, t, _ in spans if t in ('3rd Place', '5th Place', '7th Place')}
    for lab, bb in labels.items():
        k = int(lab[0])
        # the bout number under its label
        under = sorted([(abs(nb[0] - bb[2]) + abs(nb[1] - bb[3]), n) for nb, n in nums if nb[1] > bb[3] and nb[1] - bb[3] < 40 and abs((nb[0]) - bb[0]) < 160])
        for _, n in under:
            r = bout(n)
            if r: out.setdefault(w, {})[k] = clean(r[0]); out[w][k + 1] = clean(r[1]); break
    champ = [n for _, n in nums if 'Page 1 of' in p.get_text()]   # the final: the highest bout of the weight's first page
    for n in sorted(champ, reverse=True):
        r = bout(n)
        if r: out.setdefault(w, {})[1] = clean(r[0]); out[w][2] = clean(r[1]); break
for w in sorted(out):
    print(f"@ {w}")
    for k in sorted(out[w]): print(f"place {k} {out[w][k]}")
    print(f"{w}: {''.join(map(str, sorted(out[w])))}", file=sys.stderr)
