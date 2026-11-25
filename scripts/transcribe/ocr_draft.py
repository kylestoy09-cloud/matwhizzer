"""Kyle 2026-11-18: qualifier lines of a TrackWrestling-style bracket from OCR output (scripts/transcribe/ocr.swift):
"NAIA 125" heads a weight's pages, each first-round line reads "9 Carter Cox (Cumberland) Fr. 18-8 Mid-South".
   python3 scripts/transcribe/ocr_draft.py <ocr.txt> "<header line>" > draft.txt"""
import sys, re
ocr, header = sys.argv[1], sys.argv[2]
CLS = r'(?:RS\s+)?(?:Fr|So|Jr|Sr|Gr)\.?'
def parse_line(l):
    """seed, name, college, record from "9 Jordan Martinez (Campbellsville (Ky.)) So. 13-5 Mid-South" and the like"""
    m = re.match(r"^(?:#?(\d{1,2})\s+)?([A-Z][A-Za-z.'`’ -]+?)\s+(?:" + CLS + r"\s+)?\(", l)
    if not m: return None
    i, depth = m.end() - 1, 0
    for j in range(i, len(l)):
        if l[j] == '(': depth += 1
        elif l[j] == ')':
            depth -= 1
            if depth == 0: break
    else: return None
    college = re.sub(r'\s*\((?:[A-Z][a-z]*\.?\s?)+\)$', '', l[i + 1:j]).strip()
    tail = l[j + 1:]
    if re.search(r'\b(Dec|MD|Maj|TF|Fall|SV|TB)\b', tail): return None
    r = re.search(r'(\d+-\d+)', tail)
    return m.group(1), m.group(2).strip(), college, r.group(1) if r else None
by, w = {}, None
for l in open(ocr):
    if '\t' not in l: continue
    t = l.split('\t', 1)[1].strip()
    m = re.fullmatch(r'NAIA (\d{3})', t)
    if m: w = int(m.group(1)); continue
    p = parse_line(t.replace('’', "'").replace('`', "'"))
    if not p or w is None: continue
    seed, name, college, rec = p
    if len(name.split()) < 2: continue
    e = by.setdefault(w, {})
    cur = e.get(name)
    e[name] = (seed or (cur[0] if cur else None), college, rec or (cur[2] if cur else None))
print(f"# {header}\n")
for w in sorted(by):
    print(f"@ {w}")
    for n, (s, c, r) in by[w].items(): print(f"{s or '-'} {n} | {c}" + (f" | {r}" if r else ''))
    print()
