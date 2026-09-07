import json,collections,re,unicodedata,sys
neg=json.load(open(sys.argv[1]))['result']
by=collections.defaultdict(list)
for r in neg:
    if r.get('campaign_criterion_negative') in (True,'true','True'):
        by[r['campaign_id']].append((r.get('campaign_criterion_keyword_text') or '', r.get('campaign_criterion_keyword_match_type')))
def norm(s):
    s=unicodedata.normalize('NFKD',(s or '').lower())
    s=''.join(c for c in s if not unicodedata.combining(c))
    return re.findall(r'[a-z0-9]+',s)
def blocked(term,negs):
    tw=norm(term)
    for txt,mt in negs:
        nw=norm(txt)
        if not nw: continue
        if mt=='BROAD':
            if all(w in tw for w in nw): return f'{txt} [{mt}]'
        else:
            for i in range(len(tw)-len(nw)+1):
                if tw[i:i+len(nw)]==nw:
                    if mt=='EXACT' and len(tw)!=len(nw): continue
                    return f'{txt} [{mt}]'
    return None
CID={'MAPS':'23975649038','LEADS15':'23958472729','HOLTER':'23957223102','TOXICO':'24147047702','USOBST':'24112138449','USMODOB':'24117676295','USDOPP':'24112137057','TOMO':'23540984050','MAPA':'23537165460','PQLAB':'23493923927','RAIOX':'23554903863'}
rows=[l.split('|') for l in sys.stdin.read().strip().split('\n') if l.strip()]
print(f"{'campanha':9s} {'gasto':>7s} {'conv':>5s}  termo")
print('-'*90)
tot_gap=0.0
for c,sp,cv,t in rows:
    c=c.strip(); t=t.strip(); sp=float(sp); cv=float(cv)
    b=blocked(t,by.get(CID[c],[]))
    if b is None:
        tot_gap+=sp
        print(f"{c:9s} {sp:7.2f} {cv:5.2f}  {t}   <<< NAO BLOQUEADO")
    else:
        print(f"{c:9s} {sp:7.2f} {cv:5.2f}  {t}   ok: {b}")
print(f"\nGAP TOTAL (30d, termos analisados): R$ {tot_gap:.2f}")
