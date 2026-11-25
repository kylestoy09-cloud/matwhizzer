"""Kyle 2026-11-18: one image per weight with just what the places need — the championship page's final (right side)
beside the consolation page's place bouts (left side) — for NAIA's two-page brackets (champ page, then wrestlebacks).
   python3 scripts/transcribe/place_crops.py <pdf> <outdir> <prefix> <first champ page (1-based)> [fx0 fx1 fy0 fy1 cx0 cx1 cy0 cy1]"""
import sys, fitz
from PIL import Image
pdf, out, pre, first = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
f = [float(x) for x in sys.argv[5:13]] if len(sys.argv) > 12 else [0.55, 0.95, 0.25, 0.75, 0.0, 0.5, 0.05, 0.85]
d = fitz.open(pdf)
for k in range(10):
    i = first - 1 + 2 * k
    if i + 1 >= d.page_count: break
    a, b = d[i], d[i + 1]
    ra, rb = a.rect, b.rect
    pa = a.get_pixmap(dpi=120, clip=fitz.Rect(ra.width * f[0], ra.height * f[2], ra.width * f[1], ra.height * f[3]))
    pb = b.get_pixmap(dpi=120, clip=fitz.Rect(rb.width * f[4], rb.height * f[6], rb.width * f[5], rb.height * f[7]))
    ia = Image.frombytes('RGB', (pa.width, pa.height), pa.samples); ib = Image.frombytes('RGB', (pb.width, pb.height), pb.samples)
    im = Image.new('RGB', (ia.width + ib.width, max(ia.height, ib.height)), 'white'); im.paste(ia, (0, 0)); im.paste(ib, (ia.width, 0))
    im.save(f'{out}/{pre}-{k + 1:02d}.png')
print('ok')
