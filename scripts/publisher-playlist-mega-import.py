import json,re,unicodedata,concurrent.futures,os,time,threading,sys
from pathlib import Path
import requests,yt_dlp
read=lambda p:json.loads(Path(p).read_text(encoding='utf-8-sig'))
data=read('docs/publisher-playlist-mega-index.json')
known=read('.cinema-playlist-known.json')
def norm(t):
 t=unicodedata.normalize('NFKC',str(t or '')).lower()
 t=re.sub(r'[\u064b-\u065f\u0670ـ]','',t)
 t=t.translate(str.maketrans('أإآٱىة٠١٢٣٤٥٦٧٨٩','اااايه0123456789'))
 return re.sub(r'[^\w]+','',t)
known_seasons={(norm(g['title']),s.get('season',1)) for g in known['series'] for s in g['seasons']}
known_titles={norm(g['title']) for g in known['series']}
known_titles.update(norm(s.get('title')) for g in known['series'] for s in g['seasons'] if s.get('title'))
known_ids={x for g in known['series'] for s in g['seasons'] for x in s['ids']}|set(known['films'])
cache_dir=Path('.cinema-playlist-details');cache_dir.mkdir(exist_ok=True)
meta_dir=Path('.cinema-playlist-tmdb');meta_dir.mkdir(exist_ok=True)
token=os.environ.get('TMDB_TOKEN') or re.search(r"const TMDB_TOKEN = '([^']+)'",Path('src/main.jsx').read_text(encoding='utf-8')).group(1)
lock=threading.Lock()
def tmdb(path,params={}):
 import hashlib
 k=hashlib.sha256(json.dumps([path,params],sort_keys=True).encode()).hexdigest()
 p=meta_dir/(k+'.json')
 if p.exists():
  try:return read(p)
  except:pass
 try:
  r=requests.get('https://api.themoviedb.org/3/'+path,params={'language':'ar-SA',**params},headers={'Authorization':'Bearer '+token},timeout=12)
  if r.ok:
   d=r.json();p.write_text(json.dumps(d,ensure_ascii=False),encoding='utf-8');return d
 except:pass
 return {}
block=re.compile(r'مشاهد|مقاطع|ملخص|برومو|اعلان|إعلان|تتر|اغنية|أغنية|برنامج|لقاءات|مسرحي|كواليس|trailer|clips|behind|songs|مقدمة|تجميع|أفضل|افضل|أجمل|اجمل|بودكاست',re.I)
season_words={'الاول':1,'الاولى':1,'الثاني':2,'الثانيه':2,'الثالث':3,'الثالثه':3,'الرابع':4,'الرابعه':4,'الخامس':5,'الخامسه':5,'السادس':6,'السادسه':6,'السابع':7,'الثامن':8,'التاسع':9,'العاشر':10}
def parse_title(raw):
 if block.search(raw):return None
 if not re.search(r'مسلسل|المسلسل|حلقات|الحلقات|series',raw,re.I):return None
 t=raw.translate(str.maketrans('٠١٢٣٤٥٦٧٨٩','0123456789'))
 if '|' in t or ' - ' in t:
  parts=re.split(r'\||\s+-\s+',t)
  parts=[x for x in parts if re.search(r'[\u0600-\u06ff]',x)]
  if parts:t=next((x for x in parts if 'مسلسل' in x),parts[0])
 t=re.sub(r'^.*?(?:حلقات\s+)?(?:المسلسل|مسلسل)\s*','',t) if re.search(r'مسلسل',t) else t
 t=re.sub(r'^(?:السعودي|الكويتي|المصري|السوري|الخليجي|النادر|القديم|الدرامي|البدوي|التاريخي)\s+','',t)
 t=re.sub(r'\s*(?:الحلقات الكاملة|الحلقات كاملة|حلقات كاملة|كامل الحلقات|كامل|رمضان\s*\d{4}|نسخة.*|بصيغة.*|بطولة.*|بجودة.*|جميع الحلقات).*$', '',t)
 t=re.sub(r'["«»“”ـ_]+',' ',t).strip(' -|:')
 season=1
 raw_s=raw.translate(str.maketrans('٠١٢٣٤٥٦٧٨٩','0123456789')).replace('ـ','').replace('ى','ي')
 raw_m=re.search(r'(?:الجزء|الموسم|ج)\s*(\d+|الأول|الاول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر)',raw_s)
 if raw_m:season=int(raw_m[1]) if raw_m[1].isdigit() else season_words.get(norm(raw_m[1]),1)
 m=re.search(r'\s+(?:الجزء|الموسم|ج)\s*(\d+|الأول|الاول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر)',t)
 if m:
  season=int(m[1]) if m[1].isdigit() else season_words.get(norm(m[1]),1);t=t[:m.start()].strip()
 else:
  m=re.search(r'\s+([2-9])$',t)
  if m:season=int(m[1]);t=t[:m.start()].strip()
 y=re.search(r'\b(19\d{2}|20\d{2})\b',t)
 year=y[0] if y else None
 if y:t=t[:y.start()].strip()
 if len(t)<3 or len(t)>70 or not re.search(r'[\u0600-\u06ff]',t):return None
 return t,season,year
jobs=[];seen=set()
for c in data:
 if not c.get('channelId'):continue
 for p in c['playlists']:
  x=parse_title(p['title'])
  if not x:continue
  title,season,year=x
  if (norm(title),season) in known_seasons or p['id'] in seen:continue
  seen.add(p['id']);jobs.append((c,p,title,season,year))
print('CANDIDATES',len(jobs),flush=True)
def canonical(job):
 c,p,t,s,y=job
 result=tmdb('search/tv',{'query':t})
 matches=[x for x in result.get('results',[]) if x.get('original_language')=='ar' and any(norm(a)==norm(t) for a in [x.get('name'),x.get('original_name')]) and (not y or x.get('first_air_date','')[:4]==y)]
 if len(matches)!=1:return None
 m=matches[0];detail=tmdb('tv/'+str(m['id'])+'/season/'+str(s))
 eps=detail.get('episodes',[])
 if len(eps)<5 or len(eps)>180 or not m.get('poster_path'):return None
 return job,m,detail
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as ex:
 matched=[x for x in ex.map(canonical,jobs) if x]
print('CANONICAL',len(matched),flush=True)
# prioritize modern complete lists and dedupe by canonical season
unique={}
for j,m,s in matched:
 k=(m['id'],j[3])
 unique.setdefault(k,[]).append((j,m,s))
print('CANONICAL_UNIQUE',len(unique),flush=True)
def epnum(t):
 s=unicodedata.normalize('NFKC',t).translate(str.maketrans('٠١٢٣٤٥٦٧٨٩','0123456789'))
 m=re.search(r'(?:الحلقة|الحلقه|حلقة|حلقه|episode|epi|ep)\s*[\s_ـ:|\-]*\s*(\d+)',s,re.I)
 if m:return int(m[1])
 m=re.search(r'(?:الحلقة|الحلقه|حلقة|حلقه)\s*(.*)',s)
 if not m:return 0
 tail=norm(m[1])
 ones=[['الأول','الأولى','اول','اولى','الحادي','الحادية','الواحد','الواحدة'],['الثاني','الثانية','اثنين','اثنتين','اثنان','اثنتان'],['الثالث','الثالثة','ثلاثة'],['الرابع','الرابعة','اربعة'],['الخامس','الخامسة','خمسة'],['السادس','السادسة','ستة'],['السابع','السابعة','سبعة'],['الثامن','الثامنة','ثمانية'],['التاسع','التاسعة','تسعة']]
 pairs={}
 for n,vs in enumerate(ones,1):
  for v in vs:
   pairs[norm(v)]=n
   for suffix in ['عشر','عشرة']:pairs[norm(v+suffix)]=10+n
   for tens,words in [(20,['العشرون','العشرين','عشرون','عشرين']),(30,['الثلاثون','الثلاثين','ثلاثون','ثلاثين']),(40,['الأربعون','الأربعين','اربعون','اربعين']),(50,['الخمسون','الخمسين']),(60,['الستون','الستين']),(70,['السبعون','السبعين']),(80,['الثمانون','الثمانين']),(90,['التسعون','التسعين'])]:
    for w in words:pairs[norm(v+'و'+w)]=tens+n
 for n,ws in [(10,['العاشر','العاشرة','عشرة']),(20,['العشرون','العشرين']),(30,['الثلاثون','الثلاثين']),(40,['الأربعون','الأربعين']),(50,['الخمسون','الخمسين']),(60,['الستون','الستين']),(70,['السبعون','السبعين']),(80,['الثمانون','الثمانين']),(90,['التسعون','التسعين'])]:
  for w in ws:pairs[norm(w)]=n
 for k in sorted(pairs,key=len,reverse=True):
  if tail.startswith(k):return pairs[k]
 return 0
def playlist(p):
 file=cache_dir/(p['id']+'.json')
 if file.exists():
  try:return read(file)
  except:pass
 try:
  with yt_dlp.YoutubeDL({'extract_flat':True,'quiet':True,'no_warnings':True,'skip_download':True,'socket_timeout':15,'retries':1,'extractor_retries':1,'playlistend':200}) as y:
   d=y.extract_info('https://www.youtube.com/playlist?list='+p['id'],download=False)
   out={'channelId':d.get('channel_id'),'channel':d.get('channel'),'title':d.get('title'),'count':d.get('playlist_count'),'entries':[{k:x.get(k) for k in ['id','title','duration','channel_id','channel','availability']} for x in d.get('entries',[]) if x]}
   file.write_text(json.dumps(out,ensure_ascii=False),encoding='utf-8');return out
 except:return {}
def embed(id,author):
 try:
  r=requests.get('https://www.youtube.com/oembed',params={'url':'https://www.youtube.com/watch?v='+id,'format':'json'},timeout=10)
  x=r.json();return r.ok and x.get('author_name')==author and id in x.get('html','')
 except:return False
def process(items):
 for j,m,s in items:
  c,p,t,season,y=j;d=playlist(p)
  if d.get('channelId')!=c['channelId']:continue
  expected=len(s['episodes']);entries=d.get('entries',[])
  eps={}
  for e in entries:
   n=epnum(e.get('title') or '')
   if not n or n>expected or e.get('channel_id')!=c['channelId'] or not re.fullmatch(r'[-_A-Za-z0-9]{11}',e.get('id') or '') or e.get('id') in known_ids or not (e.get('duration') or 0)>=900 or block.search(e.get('title') or ''):continue
   if re.search(r'[\u0600-\u06ff]',e.get('title') or '') and not re.search(r'episode|epi|\bep\b',e.get('title') or '',re.I) and norm(t) not in norm(e.get('title')) and norm(m.get('name')) not in norm(e.get('title')) and norm(m.get('original_name')) not in norm(e.get('title')):continue
   if n in eps:eps={};break
   eps[n]=e
  if len(eps)!=expected or set(eps)!=set(range(1,expected+1)):continue
  if not all(embed(eps[n]['id'],d['channel']) for n in [1,expected]):continue
  row={'id':'tmdb:'+str(m['id'])+':'+str(season),'provider':'youtube','title':m.get('original_name') or m['name'],'tmdbId':m['id'],'year':(s.get('air_date') or m.get('first_air_date') or '')[:4],'season':season,'expected':expected,'publisher':d['channel'],'source':'https://www.youtube.com/playlist?list='+p['id'],'poster':'https://image.tmdb.org/t/p/w342'+m['poster_path'],'episodes':[{'number':n,'id':eps[n]['id']} for n in range(1,expected+1)],'adsPossible':True,'evidence':'Official publisher playlist metadata, same channel, exact numbered canonical season, duration >=15 minutes; first/last embed checked; HD/live playback/ads unverified'}
  print('ACCEPT',row['title'],season,expected,flush=True)
  return row
 return None
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex: rows=[x for x in ex.map(process,unique.values()) if x]
Path('docs/publisher-playlist-mega-approved.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
print('FINAL',len(rows),sum(len(r['episodes']) for r in rows),flush=True)
