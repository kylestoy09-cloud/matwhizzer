import re, html, subprocess, json
B='https://matwhizzer.com'
def get(u):
    r=subprocess.run(['curl','-s','-w','\n%{http_code} %{redirect_url}',B+u],capture_output=True,text=True).stdout
    body,_,meta=r.rpartition('\n'); return body, meta
def text(h):
    h=re.sub(r'<script[\s\S]*?</script>',' ',h).replace('<!-- -->','')
    return [html.unescape(x).strip() for x in re.sub(r'<[^>]+>','\n',h).split('\n') if x.strip()]
def say(ok,what,ev): print(('PASS' if ok else 'FAIL'),' ',what,'|',ev)
h,_=get('/girls/standings'); t=text(h)
co=['Jefferson-Sparta','Ramsey-Northern Highlands','Newton/Kittatinny','Mt. Olive/Randolph','Parsippany Hills/Parsippany']
ina=['Sparta','Vineland','Cherry Hill West','Kittatinny','Penns Grove','Hackensack','Indian Hills','Hammonton','Keansburg']
say(all(c in t for c in co) and not any(x in t for x in ina),'girls standings: co-op names, inactive schools hidden',f"co-op names {sum(c in t for c in co)}/5; inactive shown {[x for x in ina if x in t]}")
say('Group' in t and 'Conference' in t,'standings tabs','Group/Conference tabs present')
h,_=get('/postseason/team/girls'); t=text(h)
links=len(set(re.findall(r'href="/meets/[0-9a-f-]+"',h)))
say(links==14 and 'TBD' not in t and '🏆 Jackson Township' in t,'girls team postseason page',f"meet links {links}; TBD {t.count('TBD')}; champion shown {'🏆 Jackson Township' in t}")
for u,dest in [('/boys/postseason','/postseason/individual/boys'),('/girls/postseason','/postseason/individual/girls')]:
    _,m=get(u); say(m.startswith('307') and m.endswith(dest),f'{u} redirects',m)
h,_=get('/girls'); 
say('aria-haspopup="menu"' in h and 'href="/postseason/team/girls"' in h and 'href="/girls/postseason"' not in h,'header: Post Season menu only; girls Team link',f"menu button {'aria-haspopup' in h}; team link {'/postseason/team/girls' in h}")
h,_=get('/girls/schools/111?tab=schedule'); t=text(h)
say('Schedule' in t and 'No postseason results found for the current season.' not in t,'girls Schedule tab opens','schedule section rendered')
h,_=get('/girls/schools/111?tab=roster'); t=text(h)
say('Youmie Azarre' in t,'East Orange roster lists Youmie Azarre','found' if 'Youmie Azarre' in t else 'missing')
h,_=get('/girls/schools/165?tab=roster'); t=text(h)
say('Unknown' not in t,'roster leaves out Unknown (school 165)',f"Unknown on page: {'Unknown' in t}")
h,_=get('/sections/north-i?gender=girls'); t=text(h)
say('Jefferson-Sparta' in t and 'Newton/Kittatinny' in t,'girls section page co-op names',f"J-S {'Jefferson-Sparta' in t}, N/K {'Newton/Kittatinny' in t}")
h,_=get('/girls/regions/1'); t=text(h); i=t.index('The Terminators') if 'The Terminators' in t else -1
say(i>=0 and t[i+2]!='No data','girls Region 1 Terminators box',' | '.join(t[i:i+5]) if i>=0 else 'no box')
