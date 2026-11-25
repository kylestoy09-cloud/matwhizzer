"""Kyle 2026-11-18: the ten finals of a championship on one image — the region of each weight's championship page
around the final — to read champion and runner-up quickly.
   python3 scripts/transcribe/finals_sheet.py <pdf> <out.png> <page,page,…> x0 x1 y0 y1"""
import sys, fitz
from PIL import Image, ImageDraw
pdf, out, pages = sys.argv[1], sys.argv[2], [int(p) for p in sys.argv[3].split(',')]
x0, x1, y0, y1 = [float(v) for v in sys.argv[4:8]]
d = fitz.open(pdf)
ims = []
for p in pages:
    pg = d[p - 1]; r = pg.rect
    pm = pg.get_pixmap(dpi=int(sys.argv[8]) if len(sys.argv) > 8 else 85, clip=fitz.Rect(r.width * x0, r.height * y0, r.width * x1, r.height * y1))
    ims.append(Image.frombytes('RGB', (pm.width, pm.height), pm.samples))
cols = int(sys.argv[9]) if len(sys.argv) > 9 else 5; w, h = ims[0].width, ims[0].height
sheet = Image.new('RGB', (w * cols, h * ((len(ims) + cols - 1) // cols)), 'white')
dr = ImageDraw.Draw(sheet)
for k, im in enumerate(ims):
    sheet.paste(im, ((k % cols) * w, (k // cols) * h)); dr.rectangle([(k % cols) * w, (k // cols) * h, (k % cols) * w + w - 1, (k // cols) * h + h - 1], outline='red')
sheet.save(out)
