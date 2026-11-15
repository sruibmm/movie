import json, os, concurrent.futures, yt_dlp, time
from pathlib import Path
channels=['MBA','ElWadyDrama','VerdiProductionHouse','Hekayatpluseg','HakayatMasriya','MasperoDrama','GhazalArtProd','sheikhani','khalejiatv','Thikrayat_tv','QatarTelevision','HashtagClassic','AlarabiaCinema','RotanaCinema','ElSobkyProduction']
cache=Path('.cinema-yt-playlists');cache.mkdir(exist_ok=True)
def fetch(handle):
 p=cache/(handle+'.json')
 if p.exists():return json.loads(p.read_text(encoding='utf-8'))
 try:
  with yt_dlp.YoutubeDL({'extract_flat':True,'quiet':True,'no_warnings':True,'skip_download':True,'socket_timeout':12,'retries':1,'extractor_retries':1,'playlistend':300}) as y:
   d=y.extract_info('https://www.youtube.com/@'+handle+'/playlists',download=False)
   rows=[{'id':x.get('id'),'title':x.get('title'),'url':x.get('url')} for x in d.get('entries',[]) if x and x.get('id','').startswith('PL')]
   out={'handle':handle,'channel':d.get('channel') or d.get('uploader'),'channelId':d.get('channel_id'),'playlists':rows}
   p.write_text(json.dumps(out,ensure_ascii=False),encoding='utf-8');print('CHANNEL',handle,len(rows),flush=True);return out
 except Exception as e:print('FAIL',handle,str(e)[:120],flush=True);return {'handle':handle,'playlists':[]}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex: out=list(ex.map(fetch,channels))
Path('docs/publisher-playlist-mega-index.json').write_text(json.dumps(out,ensure_ascii=False),encoding='utf-8')
print('INDEX',sum(len(x['playlists']) for x in out),flush=True)
