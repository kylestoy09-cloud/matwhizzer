"""Kyle 2026-11-18: qualifiers of the NAIA 2013–2018 TrackWrestling brackets (one page a weight, after the team scores).
2013–2015 print "Gabe Roman, MBU, 32-5, Sr" (a college code, translated with CODES — codes differ between years, so
they stay here and don't become global aliases); 2016 "Jacob Colon, Grand View (Iowa), Jr, 31-6"; 2017–2018
"1 Mikel Perales, Menlo (Calif.)   13-2" (with the seed); 2017 "1 Jacob Colon, Grand View (Iowa) Sr 32-4".
   python3 scripts/transcribe/draft_naia_tw.py <pdf> <year>"""
import sys, re, fitz
CODES = {  # checked against the same wrestlers' other years and each year's team-score list
 'BAC': 'Bacone', 'BAKR': 'Baker', 'BCU': 'Briar Cliff', 'BEN': 'Benedictine', 'BETH': 'Bethany', 'BPC': 'Brewton-Parker',
 'BWPR': 'Brewton-Parker', 'CAL': 'Calumet', 'CCSJ': 'Calumet', 'CBC': 'Central Baptist', 'CBDL': 'Cumberland',
 'CUMB': 'Cumberland', 'CU': 'Cumberland', 'CBLDS': 'Cumberlands', 'UCDS': 'Cumberlands', 'UC': 'Cumberlands',
 'CBVL': 'Campbellsville', 'CAMP': 'Campbellsville', 'CON': 'Concordia', 'CUNE': 'Concordia', 'DC': 'Doane',
 'DSU': 'Dickinson State', 'DWU': 'Dakota Wesleyan', 'ER': 'Embry-Riddle', 'ERAU': 'Embry-Riddle', 'ERU': 'Embry-Riddle',
 'GLND': 'Graceland', 'GU': 'Graceland', 'GV': 'Grand View', 'GNV': 'Grand View', 'GVU': 'Grand View', 'HC': 'Hastings',
 'HLG': 'Hannibal-LaGrange', 'HLU': 'Hannibal-LaGrange', 'ITCH': 'Indiana Tech', 'ITECH': 'Indiana Tech', 'ITU': 'Indiana Tech',
 'JC': 'Jamestown', 'JSTN': 'Jamestown', 'UJ': 'Jamestown', 'LIFE': 'Life', 'LW': 'Lindsey Wilson', 'LWC': 'Lindsey Wilson',
 'MBU': 'Missouri Baptist', 'MEN': 'Menlo', 'MENL': 'Menlo', 'MID': 'Midland', 'MIDL': 'Midland', 'MU': 'Midland',
 'MOVL': 'Missouri Valley', 'MVC': 'Missouri Valley', 'MSID': 'Morningside', 'MSIDE': 'Morningside',
 'MSN': 'MSU-Northern', 'MSUN': 'MSU-Northern', 'NWC': 'Northwestern (Iowa)', 'OCU': 'Oklahoma City', 'OKC': 'Oklahoma City',
 'OU': 'Ottawa', 'SAU': 'St. Andrews', 'STAN': 'St. Andrews', 'SCC': 'St. Catharine', 'SIM': 'Simpson (Calif.)',
 'SIMP': 'Simpson (Calif.)', 'SOU': 'Southern Oregon', 'TMCC': 'Truett McConnell', 'TMCL': 'Truett McConnell',
 'UGF': 'Great Falls', 'WBU': 'Wayland Baptist', 'WYB': 'Wayland Baptist', 'WC': 'Waldorf', 'WDF': 'Waldorf',
 'WDLF': 'Waldorf', 'WIB': 'Williams Baptist', 'WMPN': 'William Penn', 'WP': 'William Penn', 'WPU': 'William Penn',
 'WPC': 'Warner Pacific', 'WVT': 'West Virginia Tech', 'YC': 'York (Neb.)',
}
# 2015's BU is Baker (Shoemaker, Haugen — Baker's in 2014)
YEAR_CODES = {2015: {'BU': 'Baker'}}
# full names the 2016–2018 files give that are another school's name on our list
SAME_NAME = {'Northwestern (Iowa)': 'Northwestern (Iowa)', 'York (Neb.)': 'York (Neb.)', 'Simpson (Calif.)': 'Simpson (Calif.)', 'Northwestern': 'Northwestern (Iowa)', 'York': 'York (Neb.)', 'Simpson': 'Simpson (Calif.)'}
pdf, year = sys.argv[1], int(sys.argv[2])
codes = {**CODES, **YEAR_CODES.get(year, {})}
WEIGHTS = [125, 133, 141, 149, 157, 165, 174, 184, 197, 285]
pages = [p for p in fitz.open(pdf) if not re.search(r'Team Scores|Team Name', p.get_text()[:200])]
print(f"# NAIA Championships {year} — source: {pdf.split('/')[-1]} (qualifiers from the PDF text, 2026-11-18)\n")
k = 0
for p in pages:
    t = p.get_text()
    ents = {}
    for l in t.split('\n'):
        l = l.strip().replace('`', "'")
        l = re.sub(r', (Jr|Sr|II|III|IV)\.?, (?=[A-Z])', r' \1, ', l)   # a name suffix: "Will Smith, Jr., Brewton-Parker" 
        m = re.match(r"^([A-Z][A-Za-z.' -]+?), ([A-Za-z&]{2,6}), (\d+-\d+)", l)            # 2013–2015
        if m and m.group(2) in codes: ents.setdefault(m.group(1), ('-', codes[m.group(2)], m.group(3))); continue
        if m: print(f'# unknown code {m.group(2)}: {l}', file=sys.stderr); continue
        m = re.match(r"^([A-Z][A-Za-z.' -]+?), (.+?), (?:RS )?(?:Fr|So|Jr|Sr|Gr)\.?, (\d+-\d+)$", l)   # 2016
        if not m: m = re.match(r"^(?:(\d{1,2}) )?([A-Z][A-Za-z.' -]+?), (.+?)\s{2,}(\d+-\d+)$", l)       # 2018
        if not m: m = re.match(r"^(?:(\d{1,2}) )?([A-Z][A-Za-z.' -]+?), (.+?) (?:RS )?(?:Fr|So|Jr|Sr|Gr)\.? (\d+-\d+)$", l)   # 2017
        if not m: continue
        g = m.groups()
        seed, name, col, rec = ('-', *g) if len(g) == 3 else (g[0] or '-', g[1], g[2], g[3])
        col = re.sub(r'\s*\((?:[A-Za-z]+\.?\s?)+\)?$', '', col).strip()   # "Grand View (Iowa)" → Grand View; "(Il" cut off
        col = SAME_NAME.get(col + {'Northwestern': ' (Iowa)', 'York': ' (Neb.)', 'Simpson': ' (Calif.)'}.get(col, ''), col)
        cur = ents.get(name)
        ents[name] = (seed if seed != '-' else (cur[0] if cur else '-'), col, rec)
    if not ents: continue
    head = re.search(r'Championships\s+(\d{3})\b', t[:200])
    w = int(head.group(1)) if head else WEIGHTS[k]
    k += 1
    print(f'@ {w}')
    for n, (s, c, r) in ents.items(): print(f'{s} {n} | {c} | {r}')
    print()
