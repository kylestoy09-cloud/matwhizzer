"""Kyle 2026-11-18: the same region of several page images, readable size, stacked two to an image — to read places
off scanned brackets.   python3 scripts/transcribe/zoom_pairs.py <outprefix> x0 x1 y0 y1 page.png …"""
import sys
from PIL import Image
out, (x0, x1, y0, y1), pages = sys.argv[1], map(float, sys.argv[2:6]), sys.argv[6:]
crops = []
for p in pages:
    im = Image.open(p); w, h = im.size
    c = im.crop((int(w * x0), int(h * y0), int(w * x1), int(h * y1)))
    crops.append(c.resize((1100, int(1100 * c.height / c.width))))
for k in range(0, len(crops), 2):
    pair = crops[k:k + 2]
    sheet = Image.new('RGB', (1100, sum(c.height for c in pair) + 6 * (len(pair) - 1)), 'red')
    yy = 0
    for c in pair: sheet.paste(c, (0, yy)); yy += c.height + 6
    sheet.save(f'{out}-{k // 2 + 1}.png')
