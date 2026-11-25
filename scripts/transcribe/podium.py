"""Kyle 2026-11-18: a transcript (place winners only) from a wrestlingstats "Champions and Place Winners" sheet
("NCAA II 1985.pdf", "NCAA III 1990.pdf"). Two columns — 1st/3rd/5th/7th on the left, 2nd/4th/6th/8th on the right —
so the text order isn't the place order: each "3rd:" label is read with the name printed to its right
("Rich Dicola - Ashland  (5-3)"); a weight ("118" … "UNL") heads its rows at the far left.
   python3 scripts/transcribe/podium.py <pdf> "<header line>" > transcript.txt"""
import sys, re, fitz
pdf, header = sys.argv[1], sys.argv[2]
items = []   # (page, y, x0, x1, text)
for pn, p in enumerate(fitz.open(pdf)):
    for b in p.get_text('dict')['blocks']:
        for l in b.get('lines', []):
            for s in l['spans']:
                t = s['text'].strip()
                x0, y0, x1, y1 = s['bbox']
                # text printed sideways (2001, 1980 — direction (0, 1)): read it upright, rows run right to left
                if l['dir'] == (0.0, 1.0): x0, x1, y0, y1 = y0, y1, p.rect.width - x1, p.rect.width - x0
                if t: items.append((pn, round((y0 + y1) / 2, 1), x0, x1, t))
head = next((it for it in items if 'Champions and Place Winners' in it[4]), None)
if not head: sys.exit('no "Champions and Place Winners" heading')
body = [it for it in items if (it[0], it[1]) > (head[0], head[1])]
weights = sorted([it for it in body if re.fullmatch(r'\d{3}|UNL|HWT|Hwt|Unl', it[4]) and it[2] < 100], key=lambda it: (it[0], it[1]))
labels = [it for it in body if re.fullmatch(r'([1-8])(st|nd|rd|th):', it[4])]
out = {}
for lab in labels:
    k = int(lab[4][0])
    # the weight: the last weight label at or above this row
    w = [wt for wt in weights if (wt[0], wt[1]) <= (lab[0], lab[1] + 2)]
    if not w: continue
    wv = w[-1][4]; wv = 285 if not wv.isdigit() else int(wv)
    name = sorted([it for it in body if it[0] == lab[0] and abs(it[1] - lab[1]) < 3 and it[2] > lab[3] - 1 and it[2] - lab[3] < 30], key=lambda it: it[2])
    if not name: continue
    m = re.match(r'^(.+?) - (.+?)(?:\s+\(.*\))?$', name[0][4])
    if not m: print(f'{wv} {k}: not read: {name[0][4]}', file=sys.stderr); continue
    n = m.group(1).strip()
    n = re.sub(r"^([A-Z][\w'-]+)\. ([A-Z][\w'-]+)$", r'\2 \1', n)   # "Atterbury. Anton" (DIII 1997) → Anton Atterbury
    out.setdefault(wv, {})[k] = (n, m.group(2).strip())
print(f"# {header}\n")
for w in sorted(out):
    print(f"@ {w}")
    for k in sorted(out[w]): print(f"- {out[w][k][0]} | {out[w][k][1]}")
    for k in sorted(out[w]): print(f"place {k} {out[w][k][0]}")
    for k in range(1, max(out[w])):   # a place the sheet leaves blank wasn't awarded
        if k not in out[w]: print(f"vacant {k}  # not on the sheet")
    print()
print(' '.join(f"{w}:{''.join(str(k) for k in sorted(v))}" for w, v in sorted(out.items())), file=sys.stderr)
