import urllib.request, urllib.parse, concurrent.futures, json, re, unicodedata, statistics
BASE='https://api.dailymotion.com/'
owners=['IMediaMovies','SyrianaArtproduction','ImediaSeries','goldenlinefortvproduction','clacketmediaproductions','SamaArtInternational','kabandartproduction','EBLATVProduction','alnahareg','CBCDrama','LeenArtProduction','OnlineartProduction','FGForArtProduction','ajprodist','shammedia','OscarProductionDistribution','DramaMBC']
fields='id,title,duration,allow_embed,geoblocking,owner.username,description,created_time'
def norm(s):
 s=unicodedata.normalize('NFKC',str(s or '')).translate(str.maketrans('أإآىة٠١٢٣٤٥٦٧٨٩','ااايه0123456789'))
 return re.sub(r'[^\w\s]',' ',re.sub(r'[\u064b-\u065fـ]','',s)).strip().lower()
def get(path,params):
 u=BASE+path+'?'+urllib.parse.urlencode(params)
 with urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=15) as r:return json.load(r)
def allowed(v):
 a=v.get('geoblocking')
 return v.get('allow_embed') is True and isinstance(a,list) and (not a or a[0]=='deny' and 'kw' not in a or a[0]=='allow' and (len(a)==1 or 'kw' in a))
def crawl(owner):
 out=[]
 for p in range(1,11):
  try:d=get('user/'+owner+'/videos',{'fields':fields,'limit':100,'page':p})
  except Exception as e:print('ERR',owner,p,str(e));break
  out+=d.get('list',[])
  if not d.get('has_more'):break
 print('CRAWL',owner,len(out))
 return owner,out
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex: results=list(ex.map(crawl,owners))
films=[];series=[]
bad=re.compile(r'(?:اعلان|برومو|ملخص|مشهد|مقطع|كواليس|trailer|teaser|clip|القسم|جزء\s*[0-9]|part\s*[0-9])')
for owner,vs in results:
 groups={}
 for v in vs:
  if not allowed(v) or v.get('owner.username','').lower()!=owner.lower():continue
  t=v['title']; nt=norm(t); d=v['duration']; vid=v['id']
  if owner=='IMediaMovies' and 3900<=d<=12000 and re.search(r'\bفيلم\b',nt) and not bad.search(nt) and not re.search(r'الحلقه|مسلسل|مسرحيه',nt):
   title=re.split(r'\s*[-|–—]\s*|\s+بطولة\s+|\s+بطوله\s+',t,maxsplit=1)[0]
   title=re.sub(r'^.*?فيلم\s+','',title).strip()
   title=re.split(r'\s+[A-Za-z]',title,maxsplit=1)[0].strip()
   title=re.sub(r'\s+(?:كامل|كاملة|بجودة عالية|HD|Full HD)\s*$','',title,flags=re.I).strip()
   if len(title)>=3 and not re.search(r'[A-Za-z]',title):
    year=re.search(r'\b(19\d{2}|20[0-2]\d)\b',title); y=year.group(1) if year else ''
    if year:title=title.replace(y,'').strip(' -()')
    films.append({'id':vid,'title':title,'year':y,'duration':d,'owner':owner})
  if d<1100 or d>7200 or bad.search(nt):continue
  m=re.match(r'^(?:المسلسل السوري\s+|مسلسل\s+|المسلسل\s+)?(.+?)\s+الحلقه\s+(\d{1,3})(?:\s|$)',nt)
  if not m:continue
  key=' '.join(m[1].split()); n=int(m[2])
  if len(key)<3 or n<1 or n>150 or re.search(r'الجزء|الموسم|\b\d+\b',key):continue
  orig=re.split(r'الحلق[هة]',t,maxsplit=1)[0].strip(' -ـ|–')
  orig=re.sub(r'^(?:المسلسل السوري|مسلسل|المسلسل)\s+','',orig).strip()
  if not orig:continue
  g=groups.setdefault(key,{'title':orig,'items':{},'final':set()})
  old=g['items'].get(n)
  if old is None or old['duration']<d:g['items'][n]={'number':n,'id':vid,'duration':d,'owner':owner}
  if re.search(r'الاخيره|الاخير|final episode|last episode',nt):g['final'].add(n)
 for k,g in groups.items():
  if len(g['final'])!=1:continue
  end=next(iter(g['final'])); es=g['items']
  if end<8 or set(es)!=set(range(1,end+1)):continue
  eps=[es[i] for i in range(1,end+1)]
  if min(e['duration'] for e in eps)<statistics.median(e['duration'] for e in eps)*.65:continue
  series.append({'id':'dm-series:'+k,'title':g['title'],'year':'','poster':None,'seasons':[{'season':1,'title':g['title'],'expected':end,'episodes':eps}]})
# dedup film title, pick longest copy; do not assert unknown release year
uniq={}
for f in films:
 k=' '.join(norm(f['title']).split())
 if k not in uniq or uniq[k]['duration']<f['duration']:uniq[k]=f
for f in uniq.values():print('NEW_FILM '+json.dumps(f,ensure_ascii=False,separators=(',',':')))
for g in series:print('NEW_SERIES '+json.dumps(g,ensure_ascii=False,separators=(',',':')))
print('DISCOVERY_COUNTS',len(uniq),len(series))
