# Parse a FloWrestling printed-bracket PDF into bouts per weight, reading words in stream order (8-man pages draw
# two consolation boxes on top of each other; stream order keeps each box's words together). parse_flo.py in.pdf out.json
import sys, json, re, pdfplumber
src, out = sys.argv[1], sys.argv[2]
pdf = pdfplumber.open(src)
weights = {}
from collections import Counter
for pno, page in enumerate(pdf.pages):
    ws = page.extract_words(extra_attrs=['fontname', 'size'], keep_blank_chars=True, x_tolerance=1.5, use_text_flow=True)
    wl = [w for w in ws if re.match(r'\d{2,3} lbs', w['text'])]
    if not wl: continue
    weight = int(wl[0]['text'].split()[0])
    # sizes differ by print (girls 6.3 names / 5.5 results / 7.2 headers; boys 7.2 / 6.2 / 8.2)
    NS = Counter(round(w['size'], 1) for w in ws if 'Heavy' in w['fontname'] or 'Bold' in w['fontname']).most_common(1)[0][0]
    is_name = lambda w: abs(w['size'] - NS) < .4 and not re.fullmatch(r'[\dA]+', w['text'])
    is_num = lambda w: abs(w['size'] - NS) < .4 and re.fullmatch(r'[\dA]+', w['text'])
    W = weights.setdefault(weight, {'bouts': [], 'pages': []}); W['pages'].append(pno)
    heads = [w for w in ws if .6 < w['size'] - NS < 1.4 and 'Heavy' in w['fontname'] and re.match(r'(Round|Quarter|Semi|Finals|Consi|\d+(st|nd|rd|th) Place)', w['text'])]
    # sides: (seed?, name) in stream order
    sides, i = [], 0
    while i < len(ws):
        w = ws[i]
        if is_num(w) and len(w['text']) <= 2 and i + 1 < len(ws) and is_name(ws[i + 1]) and abs(ws[i + 1]['top'] - w['top']) < 1.5 and 0 <= ws[i + 1]['x0'] - w['x1'] < 5:
            sides.append((i + 1, int(w['text']), ws[i + 1])); i += 2; continue
        if is_name(w) and w['text'] not in ('Page',): sides.append((i, None, w))
        i += 1
    k = 0
    while k < len(sides) - 1:
        (ia, sa, a), (ib, sb, b) = sides[k], sides[k + 1]
        if abs(a['x0'] - b['x0']) < 1.5 and 9 < b['top'] - a['top'] < 14:
            after = ws[ib + 1: ib + 5]
            mn = next((x['text'] for x in after if is_num(x)), None)
            res = next((x['text'] for x in after if .5 < NS - x['size'] < 1.4), None)
            hd = sorted([h for h in heads if h['top'] < a['top'] and h['x0'] - 45 < a['x0'] < h['x1'] + 10],
                        key=lambda h: (abs((h['x0'] + h['x1']) / 2 - (a['x0'] + 45)), -h['top']))
            def side(seed, l):
                t = l['text'].strip()
                if t == 'BYE': return None
                m = re.match(r'^(.*?)\s*\(([^)]*)\)?$', t)
                name, team = (m.group(1), m.group(2)) if m else (t, '')
                return {'name': name.strip(), 'team': team.strip(), 'seed': seed, 'heavy': 'Heavy' in l['fontname']}
            s1, s2 = side(sa, a), side(sb, b)
            winner = 1 if s1 and s1['heavy'] else 2 if s2 and s2['heavy'] else None
            W['bouts'].append({'page': pno, 'round': hd[0]['text'] if hd else '?', 'match': mn, 'top': s1, 'bottom': s2,
                               'winner': winner, 'result': res})
            k += 2
        else:
            k += 1
json.dump(weights, open(out, 'w'), indent=1)
for w in sorted(weights):
    W = weights[w]; rc = {}
    for b in W['bouts']: rc[b['round']] = rc.get(b['round'], 0) + 1
    print(w, 'pages', W['pages'], 'boxes', len(W['bouts']), 'real bouts', sum(1 for b in W['bouts'] if b['top'] and b['bottom']), 'no winner', sum(1 for b in W['bouts'] if b['top'] and b['bottom'] and not b['winner']), rc)
