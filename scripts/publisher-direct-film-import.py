import json,re,unicodedata,concurrent.futures,os,time,hashlib
from pathlib import Path
import requests,yt_dlp
read=lambda p:json.loads(Path(p).read_text(encoding='utf-8-sig'))
def norm(t):
 t=unicodedata.normalize('NFKC',str(t or '')).lower()
 t=re.sub(r'[\u064b-\u065f\u0670ـ]','',t)
 t=t.translate(str.maketrans('أإآٱىة٠١٢٣٤٥٦٧٨٩','اااايه0123456789'))
 return re.sub(r'[^\w]+','',t)
known=read('.cinema-film-known.json')
ids={x['id'] for x in known};names={norm(x['title']) for x in known};canon={x.get('tmdbId') for x in known if x.get('tmdbId')}
cache=Path('.cinema-direct-film-v2');cache.mkdir(exist_ok=True)
md=Path('.cinema-playlist-tmdb');md.mkdir(exist_ok=True)
token=os.environ.get('TMDB_TOKEN') or re.search(r"const TMDB_TOKEN = '([^']+)'",Path('src/main.jsx').read_text(encoding='utf8')).group(1)
def tmdb(path,params={}):
 k=hashlib.sha256(json.dumps([path,params],sort_keys=True).encode()).hexdigest();p=md/(k+'.json')
 if p.exists():
  try:return read(p)
  except:pass
 try:
  r=requests.get('https://api.themoviedb.org/3/'+path,params={'language':'ar-SA',**params},headers={'Authorization':'Bearer '+token},timeout=10)
  if r.ok:
   x=r.json();p.write_text(json.dumps(x,ensure_ascii=False),encoding='utf8');return x
 except:pass
 return {}
def fetch(h):
 f=cache/(h+'.json')
 if f.exists():return read(f)
 try:
  with yt_dlp.YoutubeDL({'extract_flat':True,'quiet':True,'no_warnings':True,'skip_download':True,'socket_timeout':12,'retries':1,'extractor_retries':1,'playlistend':500}) as y:
   d=y.extract_info('https://www.youtube.com/@'+h+'/videos',download=False)
   cid=d.get('channel_id');author=d.get('channel')
   if not cid or not author:return []
   rows=[{k:x.get(k) for k in ['id','title','duration','channel','channel_id']} for x in d.get('entries',[]) if x and (x.get('duration') or 0)>=3600 and x.get('channel_id') in (None,cid)]
   for x in rows:x['channel']=x.get('channel') or author;x['channel_id']=x.get('channel_id') or cid
   f.write_text(json.dumps(rows,ensure_ascii=False),encoding='utf8');print('FILM SOURCE',h,len(rows),flush=True);return rows
 except Exception as e:print('FAIL',h,str(e)[:100],flush=True);return []
ps=['ElNasrFilmCo','misrintfilms','melodyaflam','moviesimedia','AlarabiaCinema','sobkyproductions','RotanaCinema']
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex: lists=list(ex.map(fetch,ps))
raw=list({x['id']:x for l in lists for x in l if x['id']}.values())
Path('docs/publisher-direct-film-v2-catalog.json').write_text(json.dumps(raw,ensure_ascii=False),encoding='utf8')
print('DIRECT RAW',len(raw),'CHANNELS',len(ps),flush=True)
block=re.compile(r'مسرحي|مسلسل|الحلقة|مشاهد|ملخص|تجميع|مقطع|برومو|اعلان|إعلان|trailer|clip|part\s*\d',re.I)
def title(raw):
 t=raw.strip()
 t=re.sub(r'^\s*(?:حصري[اً]*\s*)?(?:الفيلم|فيلم)\s*(?:العربي|الكوميدي|الرومانسي|القديم|الكامل|الاكشن|الأكشن|الدرامي|النادر)?\s*','',t)
 t=re.split(r'\s*[|│]\s*|\s+-\s+|\s+بطولة|\s+بطوله|\s+كامل|\s+بجودة|\s+جودة|\s+HD|\s+\(',t)[0].strip(' -:"«»')
 t=re.sub(r'\s+[A-Za-z].*$','',t)
 y=re.search(r'\b(19\d{2}|20\d{2})\b',t)
 yr=y[0] if y else None
 if y:t=t[:y.start()].strip(' -()')
 if not re.search(r'[\u0600-\u06ff]',t) or len(t)<3 or len(t)>65:return None
 return t,yr
jobs=[]
for v in raw:
 if v['id'] in ids or not v.get('channel') or block.search(v['title']):continue
 t=title(v['title'])
 if t and norm(t[0]) not in names:jobs.append((v,*t))
print('AFLAM CANDIDATES',len(jobs),flush=True)
def check(j):
 v,t,y=j
 try:
  rs=tmdb('search/movie',{'query':t})
  matches=[x for x in rs.get('results',[]) if x.get('original_language')=='ar' and any(norm(a)==norm(t) for a in [x.get('title'),x.get('original_title')]) and (not y or x.get('release_date','')[:4]==y)]
  if len(matches)!=1:return None
  m=matches[0]
  if m['id'] in canon or not m.get('poster_path'):return None
  d=tmdb('movie/'+str(m['id']))
  dur=v['duration'];rt=d.get('runtime')
  if not rt or abs(dur-rt*60)>max(480,rt*60*.12):return None
  r=requests.get('https://www.youtube.com/oembed',params={'url':'https://www.youtube.com/watch?v='+v['id'],'format':'json'},timeout=10)
  if not r.ok:return None
  o=r.json()
  if v['id'] not in o.get('html','') or o.get('author_name')!=v['channel']:return None
  name=m.get('original_title') if re.search(r'[\u0600-\u06ff]',m.get('original_title') or '') else m.get('title')
  return {'id':v['id'],'provider':'youtube','title':name,'tmdbId':m['id'],'year':m.get('release_date','')[:4],'poster':'https://image.tmdb.org/t/p/w342'+m['poster_path'],'publisher':v['channel'],'source':o.get('author_url'),'duration':dur,'runtime':rt,'raw':v['title'],'adsPossible':True,'evidence':'Direct publisher upload metadata, canonical title/runtime, original publisher oEmbed; HD, live playback and ads unverified'}
 except:return None
with concurrent.futures.ThreadPoolExecutor(max_workers=16) as ex: rows=[x for x in ex.map(check,jobs) if x]
out=[];seen=set()
for x in rows:
 if x['tmdbId'] in seen:continue
 seen.add(x['tmdbId']);out.append(x)
Path('docs/publisher-direct-film-v2-approved.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
print('AFLAM APPROVED',len(out),[x['title'] for x in out[:20]],flush=True)
