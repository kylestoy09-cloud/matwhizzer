# Read a TrackWrestling bracket PDF's draw: the first column's lines, top to bottom (a wrestler or a Bye per line).
import sys, json, re, pdfplumber
def draw(path):
    with pdfplumber.open(path) as pdf:
        pg = pdf.pages[0]; W = pg.width
        chars = [c for c in pg.chars if c['x1'] < W * 0.33 and c['top'] > 50 and c['x0'] < W * 0.30]
        # lines from characters grouped by their own height (overprinted text — a Bye over a name — stays apart)
        rows = {}
        for c in chars: rows.setdefault(round(c['top']), []).append(c)
        lines = []
        for top in sorted(rows):
            cs = sorted(rows[top], key=lambda c: c['x0']); t = ''
            for k, c in enumerate(cs):
                if k and c['x0'] - cs[k - 1]['x1'] > 1.5: t += ' '
                t += c['text']
            t = ' '.join(t.split())
            if t: lines.append({'top': top, 'text': t})
        title = ' '.join(w['text'] for w in pg.extract_words(keep_blank_chars=True) if 25 < w['top'] < 50)
    slots, i = [], 0
    rec = re.compile(r',\s*\d+-\d+(-\d+)?,\s*\S*\s*$')   # "School, 34-6, 10"
    while i < len(lines):
        t = lines[i]['text'].strip()
        if t == 'Bye': slots.append(None); i += 1; continue
        # district layout: "Ryan, McConaghy" over "38-2, West Deptford, Sr"
        # (a placeholder — "Forfeit, Forfeit" over "0-1, , " — holds its line empty)
        m2 = re.match(r'^(\d+-\d+(?:-\d+)?),(.*?),\s*(\w*)\s*$', lines[i + 1]['text'].strip()) if i + 1 < len(lines) else None
        if m2 and re.match(r'^[^,]*, ?[^,]*$', t):
            first, last = [x.strip() for x in t.split(',', 1)]
            if re.search(r'\bfore?f?e?it\b', t, re.I) or not m2.group(2).strip(): slots.append(None)
            else: slots.append({'name': f'{first} {last}', 'school': m2.group(2).strip(), 'line': lines[i + 1]['text'].strip()})
            i += 2; continue
        if i + 1 < len(lines) and rec.search(lines[i + 1]['text']):
            sch = rec.sub('', lines[i + 1]['text']).strip()
            slots.append({'name': t, 'school': sch, 'line': lines[i + 1]['text'].strip()}); i += 2; continue
        i += 1   # anything else in the column (bout numbers etc.)
    return {'title': title, 'slots': slots}
if __name__ == '__main__':
    out = {p: draw(p) for p in sys.argv[1:]}
    print(json.dumps(out, indent=1))
