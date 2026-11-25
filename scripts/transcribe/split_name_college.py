"""Kyle 2026-11-18: entrant lines for a bracket that prints "(seed) First Last College W-L" on one line (DIII 2025):
the college is split off as the longest team name (from the team-score pages) the line ends with.
   python3 scripts/transcribe/split_name_college.py <pdf> > draft.txt"""
import re, sys, fitz
d = fitz.open(sys.argv[1])
teams, pages = set(), []
for p in d:
    t = p.get_text()
    if 'Team Scores' in t or 'Final Team' in t:
        for l in t.split('\n'):
            l = l.strip()
            if re.search(r'[a-z]', l) and not re.search(r'Team|Place|Points|Championships', l): teams.add(l)
    else:
        pages.append(p)
teams = sorted(teams, key=len, reverse=True)
for p in pages:
    t = p.get_text()
    w = re.search(r'(\d{3}) CHAMPIONSHIP', t)
    if not w: continue
    print(f'\n@ {w.group(1)}')
    seen = set()
    for l in t.split('\n'):
        m = re.match(r"^(?:\((\d+)\)\s*)?([A-Z][A-Za-z'.` -]+?.*?)\s+(\d+-\d+)$", l.strip())
        if not m: continue
        body = m.group(2)
        team = next((tm for tm in teams if body.endswith(' ' + tm)), None)
        if team:
            name = body[: -len(team)].strip()
        else:
            # not a scoring team: the name is the first two words (three with a suffix), the rest the college
            words = body.split()
            k = 3 if len(words) > 3 and re.match(r'^(Jr\.?|Sr\.?|II|III|IV)$', words[2]) else 2
            name, team = ' '.join(words[:k]), ' '.join(words[k:])
            if not team: print(f'# ? {l.strip()}'); continue
        if name in seen: continue
        seen.add(name)
        print(f"{m.group(1) or '-'} {name} | {team} | {m.group(3)}")
