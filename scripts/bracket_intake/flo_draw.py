# FloWrestling bracket PDF (one PDF per tournament, a weight's championship side on its first page): the draw is the
# first column of boxes, top to bottom — each line "seed Name (ABBR)" or "BYE".
import sys, json, re, pdfplumber
def lines_of(pg, x_max, x_min=0):
    # rows = characters whose tops are within 2.5pt (a seed's digits sit a hair above the name)
    cs_all = sorted((c for c in pg.chars if x_min <= c['x0'] and c['x1'] <= x_max), key=lambda c: c['top'])
    groups = []
    for c in cs_all:
        if groups and c['top'] - groups[-1][0] <= 2.5: groups[-1][1].append(c)
        else: groups.append([c['top'], [c]])
    out = []
    for top, cs in groups:
        # split a row into separate pieces where there's a wide gap (two columns on one row)
        cs = sorted(cs, key=lambda c: c['x0']); piece, start = '', cs[0]['x0']
        for k, c in enumerate(cs):
            gap = c['x0'] - cs[k - 1]['x1'] if k else 0
            if k and gap > 30: out.append((top, ' '.join(piece.split()), start)); piece, start = '', c['x0']
            elif k and gap > 1.5: piece += ' '
            piece += c['text']
        out.append((top, ' '.join(piece.split()), start))
    return out
def read(path):
    res = []
    with pdfplumber.open(path) as pdf:
        for n, pg in enumerate(pdf.pages):
            W = pg.width
            top_right = ' '.join(t for _, t, x in lines_of(pg, W) if x > W * 0.6 and _ < 150)
            pg_no = re.search(r'Page (\d+) of (\d+)', top_right)
            if pg_no and pg_no.group(1) != '1': continue          # a weight's first page holds the first round
            # the event and weight: top right (newer PDFs), or the first lines (one-page weights, 2013: no "Page 1 of 1")
            head = [(top, t, x) for top, t, x in lines_of(pg, W) if top < 150 and 'Page' not in t]
            right = [t for top, t, x in head if x > W * 0.75 and top > 40] or [t for top, t, x in head]
            # the weight: "106", or "106 lbs - Default Pool" (in-season events)
            weight = next((int(m.group(1)) for t in right for m in [re.fullmatch(r'(\d{2,3})(?:\s*lbs\b.*)?', t)] if m), None)
            event = next((t for t in right if re.match(r'^[A-Z][A-Za-z].*[A-Za-z0-9]$', t) and not re.search(r'\(', t)), '')
            if weight is None: continue
            ls = [l for l in lines_of(pg, W * 0.32) if l[0] > 40]
            cand = [l for l in ls if re.fullmatch(r'(\d+\s*)?(BYE|Forfeit)', l[1], re.I) or re.search(r'\([^()]*\)?$', l[1]) and re.search(r'\(', l[1])]
            x0 = min((l[2] for l in cand), default=0)
            slots = []
            for top, t, x in cand:
                if abs(x - x0) > 25: continue                        # later rounds' boxes
                if re.fullmatch(r'(\d+\s*)?(BYE|Forfeit)', t, re.I): slots.append(None); continue   # a bye, or a withdrawn seed's empty line
                m = re.match(r'^(\d+)?\s*(\D.*?)\s*\(([^()]*)\)?$', t)   # a long name can push the closing parenthesis off the column
                if m: slots.append({'seed': int(m.group(1)) if m.group(1) else None, 'name': m.group(2).strip(), 'abbr': m.group(3)})
            pool = (re.search(r'lbs\s*-\s*(.+)$', ' '.join(right)) or [None, ''])[1].split(' Page')[0].strip()
            res.append({'page': n + 1, 'event': event, 'weight': weight, 'pool': pool, 'paged': bool(pg_no), 'slots': slots})
    # pool-play events (in-season): a weight's round-robin pool pages carry no "Page 1 of N"; its bracket does. Keep
    # the numbered bracket page when a weight has one, else the weight's unnumbered page (2013: no page numbers at all)
    best = {}
    for r in res:
        cur = best.get(r['weight'])
        if cur is None or (r['paged'] and not cur['paged']) or (r['paged'] == cur['paged'] and len(r['slots']) > len(cur['slots'])): best[r['weight']] = r
    return list(best.values())
if __name__ == '__main__':
    print(json.dumps({p: read(p) for p in sys.argv[1:]}))
