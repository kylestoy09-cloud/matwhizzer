import re,sys,subprocess,time
for u in sys.argv[1:]:
    h=subprocess.run(['curl','-sL','-m','60','https://matwhizzer.com'+u],capture_output=True,text=True).stdout
    t=re.sub(r'<script[\s\S]*?</script>',' ',h); t=re.sub(r'<[^>]+>','\n',t)
    L=[x.strip() for x in t.split('\n') if x.strip()]
    i=next((k for k,x in enumerate(L) if x=='Team Scoring'),None); top=[]
    if i is not None:
        j=i+1
        while j<len(L) and len(top)<4:
            if L[j].endswith(' pts'): top.append(f"{L[j-1]} {L[j]}")
            j+=1
    print(u,'| team scoring:',top,'| individual points list:',any('Individual' in x and 'Point' in x for x in L))
    time.sleep(4)
