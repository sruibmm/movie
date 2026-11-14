// Private, incremental catalog crawler. Only ordinary public source pages and authorized direct media.
// No proxy, cookies, access-control bypass, or public playback endpoint.
const ORIGIN='https://af.alooytv16.com';
const SOURCE_HOSTS=new Set(['af.alooytv16.com','ae.alooytv16.com','alooytv16.com','e.alooytv16.com']);
const REVISION='auto-v4';
const P='pc:', DAY=86400000;
const decode=s=>String(s||'').replace(/&amp;|&#38;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&nbsp;/gi,' ').replace(/&#(\d+);/g,(_,n)=>{try{return String.fromCodePoint(Number(n))}catch{return ''}});
const clean=s=>decode(String(s||'').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
const attr=(tag,key)=>{const m=tag.match(new RegExp('(?:^|\\s)'+key+'\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))','i'));return m?decode(m[1]??m[2]??m[3]):'';};
function source(raw,base=ORIGIN){if(!raw)return null;try{const u=new URL(raw,base);if(u.protocol!=='https:'||!SOURCE_HOSTS.has(u.hostname)||u.port||u.username||u.password||u.hash)return null;return u;}catch{return null}}
function image(raw,base=ORIGIN){if(!raw)return null;try{const u=new URL(raw,base);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null}}
function anchors(html,base){const out=[];for(const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi)){const u=source(attr(m[1],'href'),base);if(u){const active=new URL(u.pathname+u.search,base);if(source(active.href))out.push({u:active,label:clean(m[2]),html:m[2]});}}return out;}
function meta(html,key){for(const m of html.matchAll(/<meta\b[^>]*>/gi)){if([attr(m[0],'property'),attr(m[0],'name'),attr(m[0],'itemprop')].includes(key))return attr(m[0],'content');}return '';}
function schema(html){const out=[];for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{const o=JSON.parse(m[1]);const walk=x=>{if(Array.isArray(x))x.forEach(walk);else if(x&&typeof x==='object'){out.push(x);if(x['@graph'])walk(x['@graph']);}};walk(o);}catch{}}return out;}
const types=x=>Array.isArray(x?.['@type'])?x['@type']:[x?.['@type']];
const value=x=>typeof x==='string'?x:Array.isArray(x)?value(x[0]):x?.url||x?.contentUrl||'';
export function metadata(html,page,kind=''){
 const ld=schema(html).find(x=>types(x).some(t=>['Movie','TVSeries','TVEpisode','VideoObject','CreativeWork'].includes(t)))||{};
 const title=clean(ld.name||html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||meta(html,'og:title')).slice(0,300);
 const story=clean(ld.description||meta(html,'og:description')||meta(html,'description')).slice(0,4000);
 const titleImage=[...html.matchAll(/<img\b[^>]*>/gi)].find(m=>attr(m[0],'alt').trim()===title);const poster=image(value(ld.image)||meta(html,'og:image')||(titleImage&&(attr(titleImage[0],'data-src')||attr(titleImage[0],'src'))),page);
 const wide=Number(meta(html,'og:image:width'))>Number(meta(html,'og:image:height'))*1.3;
 const banner=image(value(ld.backdrop)||value(ld.banner)||meta(html,'og:image:landscape')||(wide?meta(html,'og:image'):''),page);
 const year=String(ld.datePublished||meta(html,'release_date')||clean(html).match(/(?:Release\s*:\s*|إنتاج عام\s*)(\d{4})/)?.[1]||'').match(/\b(19\d{2}|20\d{2})\b/)?.[1]||title.match(/\((19\d{2}|20\d{2})\)/)?.[1]||null;
 const genres=(Array.isArray(ld.genre)?ld.genre:ld.genre?[ld.genre]:[]).map(clean).filter(Boolean).slice(0,15);
 const inferred=types(ld).includes('Movie')?'movie':types(ld).includes('TVSeries')?'tv':kind;
 const thumbnail=image(value(ld.thumbnailUrl)||meta(html,'thumbnailUrl')||meta(html,'og:image'),page);
 const explicitSeason=Number(ld.seasonNumber||ld.partOfSeason?.seasonNumber||title.match(/(?:الموسم|الجزء|ج)\s*(\d+)/)?.[1]||title.match(/\bS(?:eason\s*)?0?(\d+)\b/i)?.[1]||1);
 return {title,story,poster,banner,year,genres,kind:inferred,thumbnail,season:Number.isSafeInteger(explicitSeason)&&explicitSeason>0?explicitSeason:1};
}
const workPath=u=>/^\/(?:watch|movie)\/[a-z0-9-]+\.html$/i.test(u.pathname);
const workId=u=>'alooytv:'+u.pathname.split('/').pop().replace(/\.html$/i,'');
function kindHint(u,label=''){const s=(u.pathname+' '+label).toLowerCase();return /(?:movie|film|افلام|أفلام|فيلم)/.test(s)?'movie':/(?:play|مسرح)/.test(s)?'play':/(?:series|ramadan|مسلسل|رمضان)/.test(s)?'tv':'';}
export function indexLinks(html,page,kind=''){
 const out=new Map();
 for(const a of anchors(html,page)){const u=a.u;
  if(workPath(u)){u.search='';const id=workId(u);const img=a.html.match(/<img\b[^>]*>/i)?.[0]||'';const poster=image(attr(img,'data-src')||attr(img,'src'),page);out.set('w:'+id,{type:'work',url:u.href,id,kind:kind||kindHint(u,a.label),poster});}
  else if(/^\/genre\/[a-z0-9_-]+(?:\.html|\/(?:page\/)?\d+(?:\.html)?)?$/i.test(u.pathname)||/^\/(?:movies|series|tv-series)(?:\/\d+|\.html)?$/i.test(u.pathname)||u.pathname==='/'&&u.searchParams.has('page')){
   // Only actual navigable category/pagination URLs; reject arbitrary query parameters.
   if([...u.searchParams.keys()].some(k=>!['page','p','offset','sort'].includes(k)))continue;
   out.set('i:'+u.pathname+u.search,{type:'index',url:u.href,kind:kindHint(u,a.label)||kind});
  }
 }
 return [...out.values()];
}
export function episodes(html,page){
 const base=source(page),rows=new Map();
 for(const a of anchors(html,page)){
  if(a.u.pathname!==base.pathname||!a.u.searchParams.get('key'))continue;
  const m=a.label.match(/^(?:Ep\s*#?\s*|Episode\s*|الحلقة\s*|حلقة\s*)(\d+)$/i);if(!m)continue;
  const n=Number(m[1]);if(n<1||n>1000)throw Error('invalid-episode');
  if(rows.has(n)&&rows.get(n)!==a.u.href)throw Error('ambiguous-season-or-episode');
  rows.set(n,a.u.href);
 }
 const list=[...rows].sort((a,b)=>a[0]-b[0]);
 if(list.length&&list.some(([n],i)=>n!==i+1))throw Error('incomplete-episode-index');
 const declared=clean(html).match(/(?:عدد الحلقات\s*[:：]?\s*(\d+)|(\d+)\s*حلقة)/);
 if(list.length&&declared&&Number(declared[1]||declared[2])!==list.length)throw Error('declared-count-mismatch');
 return list;
}
export function mediaLink(html,page){
 const ep=source(page),matches=new Set();
 for(const a of anchors(html,page)){
  if(a.u.pathname!=='/download_video.php'||!a.u.searchParams.has('video_url'))continue;
  const ref=source(a.u.searchParams.get('ref')||'/',page);if(!ref||ref.pathname!==ep.pathname||ref.searchParams.get('key')!==ep.searchParams.get('key'))continue;
  try{const u=new URL(atob(a.u.searchParams.get('video_url')));if(u.protocol==='https:'&&/^vid\d+\.zvde-dsn-01\.site$/i.test(u.hostname)&&!u.port&&!u.username&&!u.password&&!u.hash)matches.add(u.href);}catch{}
 }
 if(matches.size!==1)throw Error('missing-or-ambiguous-direct-source');
 return [...matches][0];
}
async function getPage(url,fetcher){let r;for(let hop=0;hop<4;hop++){r=await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(8000),headers:{accept:'text/html'}});if(![301,302,303,307,308].includes(r.status))break;const next=source(r.headers.get('Location'),url);if(!next)throw Error('unapproved-redirect');url=next.href;}if(!r.ok)throw Error('page-'+r.status);const body=await r.text();if(body.length>3000000)throw Error('page-too-large');return body;}
export async function probe(url,fetcher=fetch){const r=await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(8000),headers:{Range:'bytes=0-4095'}});if(r.status>=300&&r.status<400){await r.body?.cancel().catch(()=>{});throw Error('media-redirect-'+r.status);}if(!r.ok||!r.body){await r.body?.cancel().catch(()=>{});throw Error('media-'+r.status);}const reader=r.body.getReader();let bytes=[];try{while(bytes.length<12){const {done,value}=await reader.read();if(done)break;bytes.push(...value.subarray(0,32));}}finally{await reader.cancel().catch(()=>{});}if(bytes.length<12||String.fromCharCode(...bytes.slice(4,8))!=='ftyp')throw Error('not-mp4');}
const jobKey=j=>P+'q:'+({episode:'0',work:'1',index:'2'}[j.type])+':'+(j.type==='episode'?j.id+':'+j.gen+':'+String(j.n).padStart(4,'0'):j.url);
async function enqueue(s,j,now,force=false){const key=jobKey(j);const existing=await s.get(key);if(existing){if(j.type==='work'&&(!existing.kind&&j.kind||!existing.poster&&j.poster))await s.put(key,{...existing,kind:existing.kind||j.kind,poster:existing.poster||j.poster});return;}if(!force&&Number(await s.get(P+'seen:'+key))>now-DAY)return;await s.put(key,{...j,tries:0,after:0});}
const wk=id=>P+'work:'+id,dk=id=>P+'draft:'+id,epPrefix=(id,gen)=>P+'e:'+id+':'+gen+':';
async function publish(s,d){
 const old=await s.get(wk(d.id));if(old&&old.count>d.count)throw Error('refuse-catalog-shrink');
 const {remaining,...record}=d;await s.put(wk(d.id),{...record,partial:false,availableCount:d.count});await s.delete(dk(d.id));
 // Keep the previous generation until the replacement is complete, then remove it.
 if(old&&old.gen!==d.gen){const rows=await s.list({prefix:epPrefix(d.id,old.gen),limit:1000});const keys=[...rows.keys()];for(let i=0;i<keys.length;i+=100)await s.delete(keys.slice(i,i+100));}
}
async function prepareJob(j,fetcher){const html=await getPage(j.url,fetcher);if(j.type==='episode'){const url=mediaLink(html,j.url);await probe(url,fetcher);return {html,url};}return {html};}
async function processJob(s,j,fetcher,now,prepared){
 const {html,url:preparedUrl}=prepared||await prepareJob(j,fetcher);
 if(j.type==='index'){const links=indexLinks(html,j.url,j.kind);if(!links.length)throw Error('empty-index');for(const link of links)await enqueue(s,link,now);return;}
 if(j.type==='work'){
  const m=metadata(html,j.url,j.kind),list=episodes(html,j.url);if(!m.title)throw Error('missing-title');
  const kind=list.length?'tv':m.kind;if(!['tv','movie','play'].includes(kind)||kind==='tv'&&!list.length)throw Error('unclassified-or-incomplete-work');
  const count=list.length||1,old=await s.get(wk(j.id));if(old&&old.count>count)throw Error('refuse-catalog-shrink');
  const current=await s.get(dk(j.id));if(current&&current.remaining>0&&now-current.gen<DAY&&current.count===count&&current.season===m.season){for(const [n,url] of list.length?list:[[1,j.url]]){const k=epPrefix(j.id,current.gen)+String(n).padStart(4,'0');if(!await s.get(k))await enqueue(s,{type:'episode',url,id:j.id,gen:current.gen,n,kind},now,true);}return;}
  const d={id:j.id,title:m.title,kind,year:m.year,story:m.story,poster:m.poster||j.poster||null,banner:m.banner,genres:m.genres,sourcePage:j.url,count,season:m.season,gen:now,remaining:count};
  await s.put(dk(j.id),d);
  for(const [n,url] of list.length?list:[[1,j.url]])await enqueue(s,{type:'episode',url,id:j.id,gen:now,n,kind},now,true);
  return;
 }
 const d=await s.get(dk(j.id));if(!d||d.gen!==j.gen)return;
 const key=epPrefix(j.id,j.gen)+String(j.n).padStart(4,'0');
 if(await s.get(key)){if(d.remaining===0)await publish(s,d);return;}
 const url=preparedUrl;
 const m=metadata(html,j.url),asset={id:j.id+':s'+d.season+':e'+j.n,title:d.kind==='tv'?'الحلقة '+j.n:d.title,season:d.season,episode:j.n,format:'mp4',url,sourcePage:j.url,thumbnail:m.thumbnail&&m.thumbnail!==d.poster?m.thumbnail:null,story:m.story!==d.story?m.story:'',verifiedAt:now};
 await s.transaction(async tx=>{const latest=await tx.get(dk(j.id));if(!latest||latest.gen!==j.gen||await tx.get(key))return;await tx.put(key,asset);latest.remaining--;await tx.put(dk(j.id),latest);});
 const latest=await s.get(dk(j.id));if(latest&&latest.gen===j.gen){if(latest.remaining===0)await publish(s,latest);else{const old=await s.get(wk(j.id));const availableCount=latest.count-latest.remaining;if(!old||old.partial===true&&(old.gen===latest.gen||availableCount>=(old.availableCount||0))){const {remaining,...record}=latest;await s.put(wk(j.id),{...record,partial:true,availableCount});}}}
}
export async function crawl(s,fetcher=fetch,now=Date.now(),budget=16){
 // A bounded batch with at most four concurrent network checks.
 const last=Number(await s.get(P+'seed')||0),rev=await s.get(P+'revision');
 if(rev!==REVISION){const previous=await s.list({prefix:P+'q:',limit:1000});for(const [key,j] of previous){const u=source(j.url);if(u){const next={...j,url:ORIGIN+u.pathname+u.search,tries:0,after:0};await s.put(jobKey(next),next);if(key!==jobKey(next))await s.delete(key);}}await s.put(P+'revision',REVISION);}
 const seedDue=rev!==REVISION||!last||now-last>=DAY;
 if(seedDue){await enqueue(s,{type:'index',url:ORIGIN+'/',kind:''},now,true);await enqueue(s,{type:'index',url:ORIGIN+'/genre/ramadan-arabi-2026.html',kind:'tv'},now,true);await enqueue(s,{type:'work',url:ORIGIN+'/watch/gztyqowfz11u.html',id:'alooytv:gztyqowfz11u',kind:'tv'},now,true);await s.put(P+'seed',now);}
 // Read each lane independently so an episode backlog cannot starve discovery.
 const lanes=await Promise.all(['0','1','2'].map(n=>s.list({prefix:P+'q:'+n+':',limit:200})));
 const ready=lanes.map(rows=>[...rows].filter(([,j])=>j.after<=now));
 const jobs=[];while(jobs.length<budget&&ready.some(a=>a.length)){for(const lane of [2,1,0,0,0]){if(jobs.length>=budget)break;if(ready[lane].length)jobs.push(ready[lane].shift());}}
 let done=0,failed=0;const start=Date.now();const errors=[];const prior=await s.get(P+'status')||{};const totals={...(prior.totals||{processed:0,failed:0})};
 // Parallelize only network reads; serialize storage commits to avoid races between episodes.
 for(let i=0;i<jobs.length&&Date.now()-start<20000;i+=4){
  const batch=jobs.slice(i,i+4),results=await Promise.allSettled(batch.map(([,j])=>prepareJob(j,fetcher)));
  for(let k=0;k<batch.length;k++){
   const [key,j]=batch[k],r=results[k];
   try{if(r.status==='rejected')throw r.reason;await processJob(s,j,fetcher,now,r.value);await s.put(P+'seen:'+key,now);await s.delete(key);done++;}
   catch(e){failed++;const reason=String(e.message||e).slice(0,160);errors.push({type:j.type,reason,path:new URL(j.url).pathname});const tries=j.tries+1;if(tries>=4){await s.put(P+'error:'+key,{url:j.url,reason,at:now});await s.delete(key);}else await s.put(key,{...j,tries,after:now+Math.min(3600000,60000*2**tries)});}
  }
  await s.put(P+'status',{...prior,revision:REVISION,state:'running',at:now,processed:done,failed,errors:errors.slice(0,5),totals:{processed:totals.processed+done,failed:totals.failed+failed}});
 }
 const pendingLanes=await Promise.all(['0','1','2'].map(n=>s.list({prefix:P+'q:'+n+':',limit:1000})));const pending=new Map(pendingLanes.flatMap(m=>[...m]));const works=await s.list({prefix:P+'work:',limit:1000}),drafts=await s.list({prefix:P+'draft:',limit:1000});const readyCount=[...pending.values()].filter(j=>j.after<=now).length;const nextRetry=[...pending.values()].filter(j=>j.after>now).reduce((m,j)=>Math.min(m,j.after),Infinity);totals.processed+=done;totals.failed+=failed;
 const result={at:now,revision:REVISION,source:ORIGIN,processed:done,failed,queuedSample:pending.size,queueSampleTruncated:pendingLanes.some(m=>m.size===1000),ready:readyCount,waiting:pending.size-readyCount,nextRetry:Number.isFinite(nextRetry)?nextRetry:null,published:[...works.values()].filter(w=>!w.partial).length,availableWorks:works.size,publishedEpisodes:[...works.values()].reduce((n,w)=>n+(w.availableCount??w.count),0),drafts:drafts.size,verifiedDraftEpisodes:[...drafts.values()].reduce((n,d)=>n+d.count-d.remaining,0),totals,errors:errors.length?errors.slice(0,5):[],state:done?'working':failed?'source-error':pending.size?'retry-wait':'idle'};await s.put(P+'status',result);return result;
}
const json=(x,status=200)=>Response.json(x,{status,headers:{'Cache-Control':'private, no-store','Vary':'Authorization'}});
export async function privateRequest(request,s){
 const u=new URL(request.url);
 if(u.pathname==='/private-sync'&&request.method==='POST')return json(await crawl(s));
 if(u.pathname==='/private-status')return json(await s.get(P+'status')||{at:null,processed:0,failed:0});
 if(u.pathname==='/private-work'){
  const id=u.searchParams.get('id')||'';if(!/^alooytv:[a-z0-9-]+$/i.test(id))return json({error:'invalid-work'},400);
  const w=await s.get(wk(id));if(!w)return json({error:'not-found'},404);
  const rows=await s.list({prefix:epPrefix(id,w.gen),limit:1000});if(!rows.size||rows.size!==(w.availableCount??w.count))return json({error:'incomplete-work'},503);
  return json({...w,assets:[...rows.values()]});
 }
 if(u.pathname==='/private-list'){
  const q=(u.searchParams.get('q')||'').trim().toLowerCase().slice(0,200),kind=u.searchParams.get('kind')||'all',cursor=u.searchParams.get('cursor')||'';
  if(cursor&&!cursor.startsWith(P+'work:'))return json({error:'invalid-cursor'},400);
  const normalize=x=>String(x||'').toLowerCase().replace(/[\u064b-\u065f\u0670]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي');
  const titles=[];let after=cursor,more=true,scanned=0;
  while(titles.length<40&&scanned<1000&&more){
   const rows=await s.list({prefix:P+'work:',...(after?{startAfter:after}:{}),limit:100});if(!rows.size){more=false;break;}
   for(const [key,w] of rows){after=key;scanned++;if((kind==='all'||kind===w.kind)&&(!q||normalize(w.title).includes(normalize(q))))titles.push(w);if(titles.length>=40)break;}
   if(rows.size<100&&titles.length<40)more=false;
  }
  return json({titles,next:more?after:null});
 }
 return json({error:'not-found'},404);
}
export async function authorize(request,secret){if(typeof secret!=='string'||secret.length<32)return false;const v=request.headers.get('Authorization')||'';if(!v.startsWith('Bearer '))return false;const enc=new TextEncoder(),[a,b]=await Promise.all([crypto.subtle.digest('SHA-256',enc.encode(v.slice(7))),crypto.subtle.digest('SHA-256',enc.encode(secret))]);const x=new Uint8Array(a),y=new Uint8Array(b);let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0;}
