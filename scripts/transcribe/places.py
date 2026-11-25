"""Kyle 2026-11-18 ("for the ones you have to type … just pull schools, names, and all american status"): a transcript
(src/lib/ncaa/transcript.ts) of qualifiers + places only — the entrant lines drafted from the PDF text
(scripts/draft_transcript_entrants.mts) and the places 1–8 read off the bracket pages.
   python3 scripts/transcribe/places.py <draft.txt> <places.txt> <header> <out.txt>
places.txt: one line a weight, "125: Fuenffinger, Malmberg, Gunter, …" (1st to 8th, a name as the bracket prints it)"""
import sys
draft, places, header, out = sys.argv[1:5]
P = {}
for l in open(places):
    if ':' in l:
        w, names = l.split(':', 1)
        P[w.strip()] = [n.strip() for n in names.split(',') if n.strip()]
lines = [f'# {header}', '# qualifiers and places only (no bouts)']
cur = None
def flush():
    if cur and cur in P:
        lines.extend(f'place {i + 1} {n}' for i, n in enumerate(P[cur]))
for l in open(draft):
    l = l.rstrip('\n')
    if l.startswith('@'):
        flush(); cur = l.split()[1]; lines += ['', l]; continue
    if l.strip(): lines.append(l)
flush()
open(out, 'w').write('\n'.join(lines) + '\n')
