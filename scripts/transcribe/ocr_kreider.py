"""Kyle 2026-11-18: qualifiers of a scanned Kreider bracket (NCAA DII 1990s–2002 …) from OCR (scripts/transcribe/ocr.swift):
one page a weight, the weight printed large at the right, first-round lines "Brandon Newill (Pitt - Johnstown)" down
the left of the championship bracket. Pages without a weight (team scores) are skipped.
   python3 scripts/transcribe/ocr_kreider.py <ocr.txt> "<header line>" > draft.txt"""
import sys, re
ocr, header = sys.argv[1], sys.argv[2]
WEIGHTS = {'118', '126', '134', '142', '150', '158', '167', '177', '190', '125', '133', '141', '149', '157', '165', '174',
           '184', '197', '285', 'HWT', 'Hwt', 'UNL', 'Unl'}
pages, cur = [], None
for l in open(ocr):
    if l.startswith('==='): cur = []; pages.append(cur); continue
    box, t = l.rstrip('\n').split('\t', 1)
    cur.append((*map(float, box.split()), t.strip()))
print(f"# {header}\n")
for P in pages:
    ws = [t for x, y, w, h, t in P if t in WEIGHTS and x > 0.6 and h > 0.015]
    if not ws: continue
    w = '285' if ws[0].upper() in ('HWT', 'UNL') else ws[0]
    print(f'@ {w}')
    seen = set()
    for x, y, bw, bh, t in P:
        m = re.fullmatch(r"([A-Z][a-z][A-Za-z'.-]* [A-Z][A-Za-z' .-]+?) \((.+?)\)?", t)
        if m and x < 0.1 and y < 0.56 and m.group(1) not in seen:
            seen.add(m.group(1)); print(f"- {m.group(1)} | {m.group(2).rstrip(')').strip()}")
    print()
