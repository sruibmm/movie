import {buildEpisodeGraph,mediaByEpisode,candidatesFor,graphSignature} from './private-episode-graph.js';
import {categoryInfo,getFastIndex,searchCards,putMany,getMany,invalidateIndex} from './private-fast-index.js';
// Private, incremental catalog crawler. Only ordinary public source pages and authorized direct media.
// No proxy, cookies, access-control bypass, or public playback endpoint.
const ORIGIN='https://af.alooytv16.com';
const SOURCE_HOSTS=new Set(['af.alooytv16.com','ae.alooytv16.com','alooytv16.com','e.alooytv16.com']);
const REVISION='auto-v7';
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
  if(workPath(u)){u.search='';const id=workId(u);const img=a.html.match(/<img\b[^>]*>/i)?.[0]||'';const poster=image(attr(img,'data-src')||attr(img,'src'),page);const title=clean(attr(img,'alt')||attr(img,'title')||attr(a.html.match(/<[^>]+>/)?.[0]||'','title')||a.label).slice(0,300);const info=categoryInfo(page);const previous=out.get('w:'+id);if(!previous||title.length>previous.title.length||poster&&!previous.poster)out.set('w:'+id,{type:'work',url:u.href,id,kind:kindHint(u,a.label)||kind,poster,title,...info,categories:[new URL(page).pathname]});}
  else if(/^\/genre\/[a-z0-9_-]+(?:\.html|\/(?:page\/)?\d+(?:\.html)?)?$/i.test(u.pathname)||/^\/(?:movies|series|tv-series)(?:\/\d+|\.html)?$/i.test(u.pathname)||u.pathname==='/'&&u.searchParams.has('page')){
   // Only actual navigable category/pagination URLs; reject arbitrary query parameters.
   if([...u.searchParams.keys()].some(k=>!['page','p','offset','sort'].includes(k)))continue;
   out.set('i:'+u.pathname+u.search,{type:'index',url:u.href,kind:kindHint(u,a.label)||kind,...categoryInfo(u.href,a.label)});
  }
 }
 return [...out.values()];
}
export function episodes(html,page,{allowPartial=false}={}){
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
 const declared=clean(html).match(/(?:عدد الحلقات|Episodes)\s*[:：]\s*(\d+)/i);const expected=declared?Number(declared[1]):list.length;
 if(list.length&&declared&&expected!==list.length&&!allowPartial)throw Error('declared-count-mismatch');
 Object.defineProperty(list,'expected',{value:Math.max(expected,list.length),enumerable:false});
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
function validMedia(raw){try{const u=new URL(raw);return u.protocol==='https:'&&/^vid\d+\.zvde-dsn-01\.site$/i.test(u.hostname)&&!u.port&&!u.username&&!u.password&&!u.hash;}catch{return false;}}
function pageGraph(html,page,m){
 const base=source(page),links=anchors(html,page),plain=clean(html);
 const declared=plain.match(/(?:عدد الحلقات|Episodes)\s*[:：]\s*(\d+)/i)?.[1];
 const g=buildEpisodeGraph(links,base,m.season,declared);
 const kind=g.slots.length||g.conflicts.length?'tv':m.kind||kindHint(base,m.title);
 const media=mediaByEpisode(links,base,{source,allowedMedia:validMedia,decode:x=>new URL(atob(x)).href});
 if(!g.slots.length&&!g.conflicts.length&&['movie','play'].includes(kind)){
  // A single explicitly identified film source can have a key; do not invent one.
  const keys=[...media.keys()];if(keys.length===1){const u=new URL(page);if(keys[0])u.searchParams.set('key',keys[0]);g.slots=[{season:1,episode:1,page:u.href}];g.expected=1;}
  else if(!keys.length){g.slots=[{season:1,episode:1,page}];g.expected=1;}
 }
 const slots=g.slots.map(v=>({...v,candidates:candidatesFor(media,new URL(v.page))}));
 return {...g,kind,slots,signature:graphSignature(slots)};
}
async function chooseMedia(candidates,fetcher){
 const urls=[...new Set(candidates||[])].filter(validMedia).slice(0,3);
 if(!urls.length)throw Error('missing-direct-source');
 const errors=[];for(const url of urls){try{await probe(url,fetcher);return url;}catch(e){errors.push(String(e.message||e));}}
 throw Error('direct-sources-unavailable: '+errors.join('; ').slice(0,120));
}
async function loadEpisode(page,candidates,fetcher){
 // Some work pages already expose exact media links for multiple episodes.
 // Only use those links when their ref matches the precise episode key.
 if(candidates?.length){try{return {url:await chooseMedia(candidates,fetcher),html:''};}catch{}}
 const html=await getPage(page,fetcher),base=source(page);
 const graph=mediaByEpisode(anchors(html,page),base,{source,allowedMedia:validMedia,decode:x=>new URL(atob(x)).href});
 return {html,url:await chooseMedia(candidatesFor(graph,base),fetcher)};
}
async function getPage(url,fetcher){let r;for(let hop=0;hop<4;hop++){r=await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(8000),headers:{accept:'text/html'}});if(![301,302,303,307,308].includes(r.status))break;const next=source(r.headers.get('Location'),url);if(!next)throw Error('unapproved-redirect');url=next.href;}if(!r.ok)throw Error('page-'+r.status);const body=await r.text();if(body.length>3000000)throw Error('page-too-large');return body;}
export async function probe(url,fetcher=fetch){const r=await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(8000),headers:{Range:'bytes=0-4095'}});if(r.status>=300&&r.status<400){await r.body?.cancel().catch(()=>{});throw Error('media-redirect-'+r.status);}if(!r.ok||!r.body){await r.body?.cancel().catch(()=>{});throw Error('media-'+r.status);}const reader=r.body.getReader();let bytes=[];try{while(bytes.length<12){const {done,value}=await reader.read();if(done)break;bytes.push(...value.subarray(0,32));}}finally{await reader.cancel().catch(()=>{});}if(bytes.length<12||String.fromCharCode(...bytes.slice(4,8))!=='ftyp')throw Error('not-mp4');}
const jobKey=j=>P+'q:'+({episode:'0',work:'1',index:'2'}[j.type])+':'+(j.type==='episode'?j.id+':'+j.gen+':'+String(j.n).padStart(4,'0'):j.url);
async function enqueue(s,j,now,force=false){if(j.type==='work'&&j.title&&j.title.length>2&&!/^(?:watch|عرض|مشاهدة|تحميل|play)$/i.test(j.title)){const k=P+'discovered:'+j.id,old=await s.get(k);await s.put(k,{id:j.id,title:j.title,kind:j.kind||old?.kind||'unknown',poster:j.poster||old?.poster||null,sourcePage:j.url,discovered:true,count:null});}const key=jobKey(j);const existing=await s.get(key);if(existing){if(j.type==='work'&&(!existing.kind&&j.kind||!existing.poster&&j.poster))await s.put(key,{...existing,kind:existing.kind||j.kind,poster:existing.poster||j.poster});return;}if(!force&&Number(await s.get(P+'seen:'+key))>now-DAY)return;await s.put(key,{...j,tries:0,after:0,revision:REVISION});}
// Process an entire category page in a few storage operations.
async function enqueueIndex(s,links,now){
 const byKey=new Map(links.map(j=>[jobKey(j),j]));
 const keys=[...byKey.keys()],seenKey=(key,j)=>j.type==='index'?P+'seen:'+REVISION+':'+key:P+'seen:'+key,dkeys=[...byKey.values()].filter(j=>j.type==='work'&&j.title&&j.title.length>2&&!/^(?:watch|عرض|مشاهدة|تحميل|play)$/i.test(j.title)).map(j=>P+'discovered:'+j.id);
 const existing=await getMany(s,[...keys,...keys.map(k=>seenKey(k,byKey.get(k))),...dkeys]),writes=new Map();
 for(const [key,j] of byKey){
  if(j.type==='work'&&j.title&&j.title.length>2&&!/^(?:watch|عرض|مشاهدة|تحميل|play)$/i.test(j.title)){
   const k=P+'discovered:'+j.id,old=existing.get(k)||{};
   const precise=j.kind&&j.kind!=='unknown'?j.kind:old.kind||'unknown';
   const rich=old.gen||old.story;
   const next={...old,id:j.id,title:rich?old.title:j.title,kind:rich?old.kind:precise,poster:old.poster||j.poster||null,sourcePage:old.sourcePage||j.url,discovered:true,count:old.count??null,year:old.year||j.year||null,region:old.region&&old.region!=='عربي'?old.region:j.region||old.region||null,ramadan:!!(old.ramadan||j.ramadan),categories:[...new Set([...(old.categories||[]),...(j.categories||[])])].slice(0,20)};
   writes.set(k,next);
  }
  const old=existing.get(key);
  if(old){if(j.type==='work'&&(!old.title&&j.title||!old.kind&&j.kind||!old.poster&&j.poster))writes.set(key,{...old,title:old.title||j.title,kind:old.kind||j.kind,poster:old.poster||j.poster});}
  else if(!(Number(existing.get(seenKey(key,j)))>now-DAY))writes.set(key,{...j,tries:0,after:0,revision:REVISION});
 }
 await putMany(s,[...writes]);invalidateIndex(s);
}
const wk=id=>P+'work:'+id,dk=id=>P+'draft:'+id,epPrefix=(id,gen)=>P+'e:'+id+':'+gen+':';
async function publish(s,d){
 const old=await s.get(wk(d.id));
 if(old&&!old.partial&&old.count>d.count){await s.delete(dk(d.id));return;}
 const {remaining,signature,...record}=d;
 await s.put(wk(d.id),{...record,count:Math.max(d.count,d.expectedCount||0),partial:!!d.indexIncomplete,graphSignature:d.signature,availableCount:d.count});invalidateIndex(s);await s.delete(dk(d.id));
 if(old&&old.gen!==d.gen){const rows=await s.list({prefix:epPrefix(d.id,old.gen),limit:1000});const keys=[...rows.keys()];for(let i=0;i<keys.length;i+=100)await s.delete(keys.slice(i,i+100));}
}
async function prepareJob(j,fetcher,s,now){
 if(j.type==='episode'){
  const d=await s.get(dk(j.id));if(!d||d.gen!==j.gen)return {skip:true};
  const key=epPrefix(j.id,j.gen)+String(j.n).padStart(4,'0');if(await s.get(key))return {skip:true};
  const season=j.season||d.season,episode=j.episode||j.n;
  const cached=await s.get(P+'ondemand:'+j.id+':'+season+':'+episode);
  if(cached&&cached.sourcePage===j.url&&now-cached.verifiedAt<3600000)return {asset:cached,html:'',url:cached.url};
  return loadEpisode(j.url,j.candidates,fetcher);
 }
 return {html:await getPage(j.url,fetcher)};
}
async function processJob(s,j,fetcher,now,prepared){
 const result=prepared||await prepareJob(j,fetcher,s,now),{html='',url:preparedUrl}=result;
 if(result.skip)return;
 if(j.type==='index'){const links=indexLinks(html,j.url,j.kind);if(!links.length)throw Error('empty-index');await enqueueIndex(s,links,now);return;}
 if(j.type==='work'){
  const m=metadata(html,j.url,j.kind);if(!m.title)throw Error('missing-title');
  const g=pageGraph(html,j.url,m),kind=g.kind;
  if(!['tv','movie','play'].includes(kind)||!g.slots.length)throw Error(g.conflicts.length?'unresolved-episode-identities':'unclassified-or-incomplete-work');
  const count=g.slots.length,old=await s.get(wk(j.id)),current=await s.get(dk(j.id));
  const known=await s.get(P+'discovered:'+j.id)||{};
  const d={id:j.id,title:m.title,kind,year:m.year||known.year||null,story:m.story,poster:m.poster||j.poster||known.poster||null,banner:m.banner,genres:m.genres,sourcePage:j.url,count,expectedCount:Math.max(count,g.expected),indexIncomplete:g.incomplete,conflicts:g.conflicts,gaps:g.gaps,season:m.season,gen:now,remaining:count,signature:g.signature};
  const preview={id:d.id,title:d.title,kind:d.kind,year:d.year,story:d.story,poster:d.poster,banner:d.banner,genres:d.genres,sourcePage:d.sourcePage,count:d.expectedCount,checkedAt:now,graphVersion:7,slots:g.slots,conflicts:g.conflicts,gaps:g.gaps};
  await s.put(P+'discovered:'+j.id,{...known,...d,discovered:true});await s.put(P+'preview:'+j.id,preview);invalidateIndex(s);
  // Keep a complete prior library if the source index temporarily shrinks.
  if(old&&!old.partial&&old.count>count)return;
  if(old&&!old.partial&&old.count===count&&old.graphSignature===g.signature)return;
  const reuse=current?.signature===g.signature&&current.remaining>0;
  if(reuse){d.gen=current.gen;d.remaining=current.remaining;}else await s.put(dk(j.id),d);
  const rows=g.slots.map((slot,i)=>({type:'episode',url:slot.page,id:j.id,gen:d.gen,n:i+1,season:slot.season,episode:slot.episode,kind,candidates:slot.candidates}));
  const keys=rows.map(x=>jobKey(x)),assetKeys=rows.map(x=>epPrefix(j.id,d.gen)+String(x.n).padStart(4,'0'));
  const existing=await getMany(s,[...keys,...assetKeys]);
  await putMany(s,rows.flatMap((x,i)=>existing.has(keys[i])||existing.has(assetKeys[i])?[]:[[keys[i],{...x,tries:0,after:0,revision:REVISION}]]));
  return;
 }
 const d=await s.get(dk(j.id));if(!d||d.gen!==j.gen)return;
 const key=epPrefix(j.id,j.gen)+String(j.n).padStart(4,'0');
 if(await s.get(key)){if(d.remaining===0)await publish(s,d);return;}
 const season=j.season||d.season,episode=j.episode||j.n,m=html?metadata(html,j.url):{};
 const asset=result.asset||{id:j.id+':s'+season+':e'+episode,title:d.kind==='tv'?'الحلقة '+episode:d.title,season,episode,format:'mp4',url:preparedUrl,sourcePage:j.url,thumbnail:m.thumbnail&&m.thumbnail!==d.poster?m.thumbnail:null,story:m.story&&m.story!==d.story?m.story:'',verifiedAt:now};
 await s.transaction(async tx=>{const latest=await tx.get(dk(j.id));if(!latest||latest.gen!==j.gen||await tx.get(key))return;await tx.put(key,asset);latest.remaining--;await tx.put(dk(j.id),latest);});
 const latest=await s.get(dk(j.id));if(latest&&latest.gen===j.gen){if(latest.remaining===0)await publish(s,latest);else{const old=await s.get(wk(j.id));const availableCount=latest.count-latest.remaining;if(!old||old.partial===true&&(old.gen===latest.gen||availableCount>=(old.availableCount||0))){const {remaining,signature,...record}=latest;await s.put(wk(j.id),{...record,count:Math.max(latest.count,latest.expectedCount||0),partial:true,availableCount});invalidateIndex(s);}}}
}
export async function crawl(s,fetcher=fetch,now=Date.now(),budget=24){
 // A bounded batch with at most four concurrent network checks.
 const last=Number(await s.get(P+'seed')||0),rev=await s.get(P+'revision');
 if(rev!==REVISION)await s.put(P+'revision',REVISION);
 const seedDue=rev!==REVISION||!last||now-last>=DAY;
 if(seedDue){await enqueue(s,{type:'index',url:ORIGIN+'/',kind:''},now,true);await enqueue(s,{type:'index',url:ORIGIN+'/genre/ramadan-arabi-2026.html',kind:'tv'},now,true);await enqueue(s,{type:'work',url:ORIGIN+'/watch/gztyqowfz11u.html',id:'alooytv:gztyqowfz11u',kind:'tv'},now,true);await s.put(P+'seed',now);}
 // Read each lane independently so an episode backlog cannot starve discovery.
 const lanes=await Promise.all(['0','1','2'].map(n=>s.list({prefix:P+'q:'+n+':',limit:1000})));
 const eligible=j=>j.revision!==REVISION||j.after<=now;
 const ready=lanes.map(rows=>[...rows].filter(([,j])=>eligible(j)).map(([key,j])=>{const u=source(j.url);return [key,{...j,url:u?ORIGIN+u.pathname+u.search:j.url,tries:j.revision===REVISION?j.tries:0,revision:REVISION}];}));
 const jobs=[];const indexFirst=ready[2].length>0;const order=indexFirst?[2,2,2,2,2,1]:[1,0,0,0,0];while(jobs.length<budget&&ready.some(a=>a.length)){let added=false;for(const lane of order){if(jobs.length>=budget)break;if(ready[lane].length){jobs.push(ready[lane].shift());added=true;}}if(!added)break;}
 let done=0,failed=0;const start=Date.now();const errors=[];const prior=await s.get(P+'status')||{};const totals={...(prior.totals||{processed:0,failed:0})};
 // Parallelize only network reads; serialize storage commits to avoid races between episodes.
 const parallel=indexFirst?6:4;
 for(let i=0;i<jobs.length&&Date.now()-start<20000;i+=parallel){
  const batch=jobs.slice(i,i+parallel),results=await Promise.allSettled(batch.map(([,j])=>prepareJob(j,fetcher,s,now)));
  for(let k=0;k<batch.length;k++){
   const [key,j]=batch[k],r=results[k];
   try{if(r.status==='rejected')throw r.reason;await processJob(s,j,fetcher,now,r.value);await s.put(P+'seen:'+key,now);if(j.type==='index')await s.put(P+'seen:'+REVISION+':'+key,now);await s.delete(key);done++;}
   catch(e){failed++;const reason=String(e.message||e).slice(0,160);errors.push({type:j.type,reason,path:new URL(j.url).pathname});const tries=j.tries+1;if(tries>=4){await s.put(P+'error:'+key,{url:j.url,reason,at:now});await s.delete(key);}else await s.put(key,{...j,tries,after:now+Math.min(3600000,60000*2**tries)});}
  }
  await s.put(P+'status',{...prior,revision:REVISION,state:'running',at:now,processed:done,failed,errors:errors.slice(0,5),totals:{processed:totals.processed+done,failed:totals.failed+failed}});
 }
 const pendingLanes=await Promise.all(['0','1','2'].map(n=>s.list({prefix:P+'q:'+n+':',limit:1000})));const pending=new Map(pendingLanes.flatMap(m=>[...m]));const works=await s.list({prefix:P+'work:',limit:1000}),drafts=await s.list({prefix:P+'draft:',limit:1000});const readyCount=[...pending.values()].filter(eligible).length;const nextRetry=[...pending.values()].filter(j=>!eligible(j)).reduce((m,j)=>Math.min(m,j.after),Infinity);totals.processed+=done;totals.failed+=failed;
 const result={at:now,revision:REVISION,source:ORIGIN,processed:done,failed,queuedSample:pending.size,queueSampleTruncated:pendingLanes.some(m=>m.size===1000),ready:readyCount,waiting:pending.size-readyCount,nextRetry:Number.isFinite(nextRetry)?nextRetry:null,published:[...works.values()].filter(w=>!w.partial&&w.source!=='personal-import').length,availableWorks:works.size,publishedEpisodes:[...works.values()].filter(w=>w.source!=='personal-import').reduce((n,w)=>n+(w.availableCount??w.count),0),importedWorks:[...works.values()].filter(w=>w.source==='personal-import').length,importedEpisodes:[...works.values()].filter(w=>w.source==='personal-import').reduce((n,w)=>n+(w.availableCount??w.count),0),discovered:(await getFastIndex(s)).length,drafts:drafts.size,verifiedDraftEpisodes:[...drafts.values()].reduce((n,d)=>n+d.count-d.remaining,0),totals,errors:errors.length?errors.slice(0,5):[],state:done?'working':failed?'source-error':pending.size?'retry-wait':'idle'};await s.put(P+'status',result);return result;
}
// On-demand catalog lookup uses only known source page identities, never an arbitrary URL.
// Metadata and the exact episode index are separate from verified playback.
async function lookupPreview(s,id,fetcher=fetch,now=Date.now()){
 const cached=await s.get(P+'preview:'+id);
 if(cached?.graphVersion===7&&now-cached.checkedAt<60*60000)return cached;
 const record=await s.get(wk(id))||await s.get(P+'discovered:'+id)||await s.get(dk(id));
 if(!record)throw Error('unknown-work');
 const page=source(record.sourcePage);if(!page||!workPath(page)||workId(page)!==id)throw Error('invalid-work-source');
 const url=ORIGIN+page.pathname;
 const html=await getPage(url,fetcher),m=metadata(html,url,record.kind),g=pageGraph(html,url,m);
 const kind=g.kind;if(!m.title||!['tv','movie','play'].includes(kind)||!g.slots.length)throw Error('unclassified-or-incomplete-work');
 const preview={id,title:m.title,kind,year:m.year||record.year,story:m.story||record.story,poster:m.poster||record.poster,banner:m.banner||record.banner,genres:m.genres,sourcePage:url,count:g.expected||g.slots.length,checkedAt:now,graphVersion:7,slots:g.slots,conflicts:g.conflicts,gaps:g.gaps};
 await s.put(P+'preview:'+id,preview);return preview;
}
export async function previewWork(s,id,fetcher=fetch,now=Date.now()){
 const p=await lookupPreview(s,id,fetcher,now);const {slots,...meta}=p;return {...meta,slots:slots.map(({season,episode})=>({season,episode}))};
}
export async function resolveEpisode(s,id,season,episode,fetcher=fetch,now=Date.now()){
 if(!Number.isSafeInteger(season)||season<1||!Number.isSafeInteger(episode)||episode<1)throw Error('invalid-episode');
 const key=P+'ondemand:'+id+':'+season+':'+episode;
 const cached=await s.get(key);if(cached&&now-cached.verifiedAt<3600000)return cached;
 const p=await lookupPreview(s,id,fetcher,now),slot=p.slots.find(x=>x.season===season&&x.episode===episode);if(!slot)throw Error('episode-not-listed');
 const {html,url}=await loadEpisode(slot.page,slot.candidates,fetcher);
 const m=html?metadata(html,slot.page):{},a={id:id+':s'+season+':e'+episode,title:p.kind==='tv'?'الحلقة '+episode:p.title,season,episode,format:'mp4',url,sourcePage:slot.page,thumbnail:m.thumbnail&&m.thumbnail!==p.poster?m.thumbnail:null,story:m.story&&m.story!==p.story?m.story:'',verifiedAt:now};
 await s.put(key,a);return a;
}
const json=(x,status=200)=>Response.json(x,{status,headers:{'Cache-Control':'private, no-store','Vary':'Authorization'}});
export async function privateRequest(request,s){
 const u=new URL(request.url);
 if(u.pathname==='/private-sync'&&request.method==='POST')return json(await crawl(s));
 if(u.pathname==='/private-status')return json(await s.get(P+'status')||{at:null,processed:0,failed:0});
 if(u.pathname==='/private-preview'||u.pathname==='/private-episode'){const id=u.searchParams.get('id')||'';if(!/^alooytv:[a-z0-9-]+$/i.test(id))return json({error:'invalid-work'},400);try{return json(u.pathname==='/private-preview'?await previewWork(s,id):await resolveEpisode(s,id,Number(u.searchParams.get('season')),Number(u.searchParams.get('episode'))));}catch(e){return json({error:String(e.message||e).slice(0,160)},502);}}
 if(u.pathname==='/private-work'){
  const id=u.searchParams.get('id')||'';if(!/^alooytv:[a-z0-9-]+$/i.test(id))return json({error:'invalid-work'},400);
  const w=await s.get(wk(id));if(!w)return json({error:'not-found'},404);
  const rows=await s.list({prefix:epPrefix(id,w.gen),limit:1000});if(!rows.size||rows.size!==(w.availableCount??w.count))return json({error:'incomplete-work'},503);
  return json({...w,assets:[...rows.values()]});
 }
 if(u.pathname==='/private-list'){
  const q=(u.searchParams.get('q')||'').slice(0,200),kind=u.searchParams.get('kind')||'all',region=u.searchParams.get('region')||'all',year=u.searchParams.get('year')||'all',cursor=u.searchParams.get('cursor')||'0';
  if(!/^\d{1,8}$/.test(cursor))return json({error:'invalid-cursor'},400);
  const rows=await getFastIndex(s),result=searchCards(rows,{q,kind,region,year,ramadan:u.searchParams.get('ramadan')==='1',offset:Number(cursor)});
  return json({...result,facets:{regions:[...new Set(rows.map(t=>t.region).filter(Boolean))].sort(),years:[...new Set(rows.map(t=>t.year).filter(Boolean))].sort((a,b)=>Number(b)-Number(a))}});
 }

 return json({error:'not-found'},404);
}
export async function authorize(request,secret){if(typeof secret!=='string'||secret.length<32)return false;const v=request.headers.get('Authorization')||'';if(!v.startsWith('Bearer '))return false;const enc=new TextEncoder(),[a,b]=await Promise.all([crypto.subtle.digest('SHA-256',enc.encode(v.slice(7))),crypto.subtle.digest('SHA-256',enc.encode(secret))]);const x=new Uint8Array(a),y=new Uint8Array(b);let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0;}
