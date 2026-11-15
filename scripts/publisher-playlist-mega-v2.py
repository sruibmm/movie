import json,concurrent.futures,yt_dlp
from pathlib import Path
p=Path('docs/publisher-playlist-mega-index.json')
old=json.loads(p.read_text(encoding='utf8'))
channels=['SonoCairoDrama','synergytm','cbcdrama','alnahareg','alhayahtvnetwork','sobkyproductions','EMPCTV','BeelinkTV','MasperoZaman','almahatv','almajdzaman','hasanalballam','NostalgiaZamanTv','dkentertainment5592','sapiProduction','goldenlineproduction','samaartinternational8819','shoofdramaone','MasperoDrama','khalejiatv','Thikrayat_tv','QatarTelevision']
cache=Path('.cinema-yt-playlists-v2');cache.mkdir(exist_ok=True)
def fetch(h):
 f=cache/(h+'.json')
 if f.exists():return json.loads(f.read_text(encoding='utf8'))
 try:
  with yt_dlp.YoutubeDL({'extract_flat':True,'quiet':True,'no_warnings':True,'skip_download':True,'socket_timeout':12,'retries':1,'extractor_retries':1,'playlistend':1000}) as y:
   d=y.extract_info('https://www.youtube.com/@'+h+'/playlists',download=False)
   rows=[{'id':x.get('id'),'title':x.get('title'),'url':x.get('url')} for x in d.get('entries',[]) if x and x.get('id','').startswith('PL')]
   out={'handle':h,'channel':d.get('channel'),'channelId':d.get('channel_id'),'playlists':rows}
   f.write_text(json.dumps(out,ensure_ascii=False),encoding='utf8');print('CHANNEL',h,out['channel'],len(rows),flush=True);return out
 except Exception as e:print('FAIL',h,str(e)[:100],flush=True);return None
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex: new=[x for x in ex.map(fetch,channels) if x]
# channel ID, not channel handle, is the deduplication key
merged={x['channelId']:x for x in old if x.get('channelId')}
for c in new:
 if not c.get('channelId'):continue
 prev=merged.get(c['channelId'])
 if prev:
  c['playlists']=list({x['id']:x for x in prev['playlists']+c['playlists']}.values())
 merged[c['channelId']]=c
out=list(merged.values())
p.write_text(json.dumps(out,ensure_ascii=False),encoding='utf8')
print('TOTAL',len(out),sum(len(x['playlists']) for x in out),flush=True)
