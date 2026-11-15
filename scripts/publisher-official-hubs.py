import json,concurrent.futures,yt_dlp
from pathlib import Path
cache=Path('.cinema-official-hubs');cache.mkdir(exist_ok=True)
def get(h):
 p=cache/(h+'.json')
 if p.exists():return json.loads(p.read_text(encoding='utf8'))
 try:
  with yt_dlp.YoutubeDL({'extract_flat':True,'quiet':True,'no_warnings':True,'skip_download':True,'socket_timeout':12,'retries':1,'extractor_retries':1,'playlistend':1000}) as y:
   d=y.extract_info('https://www.youtube.com/@'+h+'/playlists',download=False)
   rows=[{'id':x.get('id'),'title':x.get('title'),'url':x.get('url')} for x in d.get('entries',[]) if x and x.get('id','').startswith('PL')]
   out={'handle':h,'channel':d.get('channel'),'channelId':d.get('channel_id'),'playlists':rows}
   p.write_text(json.dumps(out,ensure_ascii=False),encoding='utf8');print('HUB',h,out['channel'],len(rows),flush=True);return out
 except Exception as e:print('FAIL',h,str(e)[:100],flush=True);return None
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex: out=[x for x in ex.map(get,['Aflam','Mosalsalat','Shahrazad','ArabTelemedia']) if x]
Path('docs/publisher-official-hubs.json').write_text(json.dumps(out,ensure_ascii=False),encoding='utf8')
