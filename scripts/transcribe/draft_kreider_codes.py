"""Kyle 2026-11-18: qualifiers of the NAIA 2011–2012 Kreider brackets: each weight's "Championship" page prints every
wrestler as "Dante Rini (No Dame)" — a short college name, translated with CODES (per year where they differ).
   python3 scripts/transcribe/draft_kreider_codes.py <pdf> <year>"""
import sys, re, fitz
CODES = {
 2011: {'Bacone': 'Bacone', 'Baker': 'Baker', 'Briar Cliff': 'Briar Cliff', 'C Baptist': 'Central Baptist', 'Calumet': 'Calumet',
        'Cland': 'Cumberland', 'Concd': 'Concordia', 'Cville': 'Campbellsville', 'DSU': 'Dickinson State', 'DWU': 'Dakota Wesleyan',
        'ERAU': 'Embry-Riddle', 'GVU': 'Grand View', 'HC': 'Hastings', 'HLG': 'Hannibal-LaGrange', 'Jmstown': 'Jamestown',
        'LWC': 'Lindsey Wilson', 'Lwood': 'Lindenwood', 'MO Bapt': 'Missouri Baptist', 'MO Val': 'Missouri Valley',
        'MSUN': 'MSU-Northern', 'McKDre': 'McKendree', 'Menlo': 'Menlo', 'Midland': 'Midland', 'MinotSt': 'Minot State',
        'Mside': 'Morningside', 'NWC': 'Northwestern (Iowa)', 'No Dame': 'Notre Dame OH', 'OCU': 'Oklahoma City',
        'SFU': 'Simon Fraser', 'SOU': 'Southern Oregon', 'Shorter': 'Shorter', 'UClands': 'Cumberlands', 'UGF': 'Great Falls',
        'USF': 'Sioux Falls', 'W V Tech': 'West Virginia Tech', 'Waldorf': 'Waldorf', 'Wayland': 'Wayland Baptist',
        'WmPenn': 'William Penn', 'York': 'York (Neb.)'},
 2012: {'Bacone': 'Bacone', 'Baker': 'Baker', 'Bethany': 'Bethany', 'BriarCliff': 'Briar Cliff', 'CBC': 'Central Baptist',
        'CCSJ': 'Calumet', 'CU': 'Cumberland', 'Cbsv': 'Campbellsville', 'Concordia': 'Concordia', 'DSU': 'Dickinson State',
        'DWU': 'Dakota Wesleyan', 'ERAU': 'Embry-Riddle', 'GVU': 'Grand View', 'HLC': 'Hannibal-LaGrange', 'Hastings': 'Hastings',
        'Ind. Tech': 'Indiana Tech', 'JC': 'Jamestown', 'LWC': 'Lindsey Wilson', 'MBU': 'Missouri Baptist', 'MSIDE': 'Morningside',
        'MSN': 'MSU-Northern', 'MVC': 'Missouri Valley', 'Menlo': 'Menlo', 'Midland': 'Midland', 'NWC': 'Northwestern (Iowa)',
        'OCU': 'Oklahoma City', 'SOU': 'Southern Oregon', 'Shorter': 'Shorter', 'TMC': 'Truett McConnell', 'UCs': 'Cumberlands',
        'UGF': 'Great Falls', 'WBU': 'Wayland Baptist', 'WM Penn': 'William Penn', 'Waldorf': 'Waldorf', 'York': 'York (Neb.)'},
}
pdf, year = sys.argv[1], int(sys.argv[2])
codes = CODES[year]
print(f"# NAIA Championships {year} — source: {pdf.split('/')[-1]} (qualifiers from the Championship pages, college short names"
      f" translated in scripts/transcribe/draft_kreider_codes.py — \"C Baptist\" / \"CBC\" read as Central Baptist, not proven;"
      f" places read off the bracket pages, 2026-11-18)\n")
for p in fitz.open(pdf):
    t = p.get_text()
    if 'Championship' not in [l.strip() for l in t.split('\n')]: continue   # the championship page of a weight (not its consolation page)
    w = re.search(r'\b(125|133|141|149|157|165|174|184|197|285)\b', t)
    if not w: continue
    print(f'@ {w.group(1)}')
    seen = set()
    for l in t.split('\n'):
        m = re.fullmatch(r"([A-Z][A-Za-z.'`/ -]+?) \(([^()]+)\)", l.strip())
        if not m or m.group(1) in seen: continue
        if m.group(2) not in codes: print(f'unknown code {m.group(2)}', file=sys.stderr); continue
        seen.add(m.group(1)); print(f"- {m.group(1).replace('`', chr(39))} | {codes[m.group(2)]}")
    print()
