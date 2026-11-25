import re, itertools, collections
L=open('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/dmd2026.txt',encoding='utf8').read().split('\n')
W=[]; cur=None; d=0
for l in L:
    h=re.match(r'^NJSIAA District (\d+) Results for (.+)$',l)
    if h: d=int(h.group(1)); continue
    m=re.match(r'^(.+?) \((\d+-\d+)\) (?:placed (\d+)\w\w|place is unknown) and scored ([\d.]+) team points\.',l)
    if m: cur={'d':d,'name':m.group(1),'place':int(m.group(3)) if m.group(3) else None,'tw':float(m.group(4)),'bouts':[]}; W.append(cur); continue
    b=re.match(r'^(Champ\. Round \d|Quarterfinal|Semifinal|1st Place Match|3rd Place Match|Cons\. [^-]+?) - (.+)$',l)
    if b and cur is not None:
        rnd, rest = b.group(1), b.group(2)
        if 'received a bye' in rest:
            cur['bouts'].append((rnd,'bye',rest.startswith(cur['name']+' ('))); continue
        # who won: the line starts with the winner's full name and school ("Charles (CJ) Palmisano
        # (Whippany Park) 26-12 won by …"), so compare the full name, never text cut at a "("
        m2=re.search(r' won (?:by |in )(.+?) over ', rest)
        if not m2: continue
        typ=m2.group(1)
        won = rest.startswith(cur['name']+' (')
        # a forfeit over an empty slot ("over () (For.)"): a forfeit win, but not a contested match
        if 'forfeit' in typ and ' over () ' in rest: cur['bouts'].append((rnd,'ffo',won)); continue
        cur['bouts'].append((rnd,typ,won))
def bonus(t):
    t=t.lower()
    if 'fall' in t and 'tech' not in t: return 2
    if 'forfeit' in t or 'default' in t or 'disqualif' in t: return 2
    if 'tech.' in t: return 1   # "tech. fall" (TF-1): TrackWrestling's totals give it 1
    if 'tech' in t: return 1.5
    if 'major' in t: return 1
    return 0
def score(w, final_adv, third_adv, bye_rule, places, forfeit_empty_ok=True):
    pts=0; bs=w['bouts']
    for i,(r,t,won) in enumerate(bs):
        champ = r.startswith('Champ') or r in ('Quarterfinal','Semifinal','1st Place Match')
        if t=='bye':
            if not won: continue
            if bye_rule=='never': continue
            # credit only if the next CONTESTED match is won (not a bye, not a forfeit over an empty slot)
            nxt=next(((r2,t2,w2) for (r2,t2,w2) in bs[i+1:] if t2 not in ('bye','ffo')),None)
            if bye_rule=='if_next_win' and not (nxt and nxt[2]): continue
            pts+= 2 if champ else 1
            continue
        if not won: continue
        if r=='1st Place Match' and not final_adv: adv=0
        elif r=='3rd Place Match' and not third_adv: adv=0
        else: adv = 2 if champ else 1
        pts+=adv+(2 if t=='ffo' else bonus(t))
    if w['place']: pts+=places.get(w['place'],0)
    return pts
variants={}
PL={'pasted (14/10/7, no 4th)':{1:14,2:10,3:7},'14/10/7/6':{1:14,2:10,3:7,4:6},'16/12/9/7':{1:16,2:12,3:9,4:7}}
for fa,ta,br,(pn,pl) in itertools.product([True,False],[True,False],['if_next_win','always','never'],PL.items()):
    ok=sum(1 for w in W if abs(score(w,fa,ta,br,pl)-w['tw'])<0.01)
    variants[(f"final adv {fa}",f"3rd-place adv {ta}",f"bye {br}",pn)]=ok
print(len(W),'wrestlers parsed;', sum(1 for w in W if w['tw']>0),'with points')
for k,v in sorted(variants.items(), key=lambda x:-x[1])[:6]: print(v, k)
pasted=('final adv True','3rd-place adv True','bye if_next_win','pasted (14/10/7, no 4th)')
print('the pasted rules as written:', variants[pasted])
best=dict(final_adv=False, third_adv=False, bye_rule='if_next_win', places={1:14,2:10,3:7,4:6})
miss=[w for w in W if abs(score(w,**best)-w['tw'])>=0.01]
print('with points: matched', sum(1 for w in W if w['tw']>0 and abs(score(w,**best)-w['tw'])<0.01), 'of', sum(1 for w in W if w['tw']>0))
diff=collections.Counter(round(w['tw']-score(w,**best),1) for w in miss); print('TW minus model:', diff.most_common(8))
byplace=collections.Counter(w['place'] for w in miss); print('misses by place:', byplace.most_common())
for w in miss[:8]: print(w['d'], w['name'], 'place', w['place'], 'TW', w['tw'], 'model', score(w,**best), w['bouts'])
best2=dict(final_adv=False, third_adv=False, bye_rule='if_next_win', places={1:14,2:10,3:7,4:4})
miss2=[w for w in W if abs(score(w,**best2)-w['tw'])>=0.01]
print('\nWITH 4th = 4: all', len(W)-len(miss2), 'of', len(W), '| with points', sum(1 for w in W if w['tw']>0 and abs(score(w,**best2)-w['tw'])<0.01), 'of', sum(1 for w in W if w['tw']>0))
for w in miss2: print(' ', w['d'], w['name'], 'place', w['place'], 'TW', w['tw'], 'model', score(w,**best2), w['bouts'])
tf=[(w['d'],w['name'],b[0],b[1]) for w in W for b in w['bouts'] if 'tech' in b[1] and b[2]]
print('\nTECH-FALL WINS in the per-wrestler test (D1-18):', len(tf), '| "tech. fall" (TF-1):', sum(1 for x in tf if 'tech.' in x[3]), '| "tech fall" (TF-1.5):', sum(1 for x in tf if 'tech.' not in x[3]))
