import re, urllib.request, urllib.parse, concurrent.futures
def get(url):
 try:
  req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
  with urllib.request.urlopen(req,timeout=12) as r: return r.read(4000000).decode('utf-8','replace')
 except Exception as e: print('FETCH FAIL',url,str(e)); return ''
# Public embed UI code only. Inspect caption preference handling, not stream endpoints.
for url in ['https://embedwave.cc/embed/movie/1084242?server=cinesrc','https://cinesrc.st/embed/movie/1084242']:
 h=get(url)
 print('PAGE',url,'bytes',len(h))
 scripts=list(dict.fromkeys(urllib.parse.urljoin(url,x) for x in re.findall(r'<script[^>]+src=["\x27]([^"\x27]+)',h)))
 print('SCRIPTS',scripts[:40])
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex: results=list(ex.map(get,scripts[:40]))
 for u,s in [(url,h)]+list(zip(scripts[:40],results)):
  # Only text around explicit subtitle preference identifiers.
  patterns=[r'(?:defaultSubtitle|preferredSubtitle|subtitleLanguage|subtitleLang|selectedSubtitle|subtitlePreference|captionLanguage|captionLang|subLang|ds_lang|cinesrc[:_-]subtitle)',r'localStorage\.(?:getItem|setItem)\([^)]{0,140}(?:sub|caption|lang)[^)]{0,100}\)',r'(?:searchParams|query)\.get\([^)]{0,100}(?:sub|caption|lang)[^)]{0,100}\)']
  hits=[]
  for pat in patterns:
   for m in re.finditer(pat,s,re.I):
    x=s[max(0,m.start()-110):m.end()+150]
    if x not in hits: hits.append(x)
  if hits:
   print('UI PREFERENCES',u)
   for x in hits[:45]: print(x[:340].replace('\n',' '))
