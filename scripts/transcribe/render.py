"""Kyle 2026-11-18: render a championship PDF's pages for typing up (scratch images), plus one contact sheet of every
page to see the layout at a glance.   python3 scripts/transcribe/render.py <pdf> <outdir> <prefix> [dpi]"""
import sys, fitz
from PIL import Image
pdf, out, pre = sys.argv[1], sys.argv[2], sys.argv[3]
dpi = int(sys.argv[4]) if len(sys.argv) > 4 else 100
d = fitz.open(pdf)
thumbs = []
for i in range(d.page_count):
    p = d[i].get_pixmap(dpi=dpi); f = f'{out}/{pre}-{i+1:02d}.png'; p.save(f)
    t = Image.open(f); t.thumbnail((300, 390)); thumbs.append(t)
cols = 6; rows = (len(thumbs) + cols - 1) // cols
sheet = Image.new('RGB', (cols * 300, rows * 390), 'white')
for k, t in enumerate(thumbs): sheet.paste(t, ((k % cols) * 300, (k // cols) * 390))
sheet.save(f'{out}/{pre}-sheet.png'); print(d.page_count, 'pages')
