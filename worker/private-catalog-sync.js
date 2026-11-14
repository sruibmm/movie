import {VERSION,structural,pickJobs,nextHealth,queueRows,effectiveDue,retryPlan} from './private-turbo-scheduler.js';
import {buildEpisodeGraph,mediaByEpisode,candidatesFor,graphSignature} from './private-episode-graph.js';
import {categoryInfo,getFastIndex,searchCards,putMany,getMany,invalidateIndex} from './private-fast-index.js';
// Private, incremental catalog crawler. Only ordinary public source pages and authorized direct media.
// No proxy, cookies, access-control bypass, or public playback endpoint.
const ORIGIN='https://af.alooytv16.com';
const SOURCE_HOSTS=new Set(['af.alooytv16.com','ae.alooytv16.com','alooytv16.com','e.alooytv16.com']);
const REVISION=VERSION;
const P='pc:', DAY=86400000;
const decode=s=>String(s||'').replace(/&amp;|&#38;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&nbsp;/gi,' ').replace(/&#(\d+);/g,(_,n)=>{try{return String.fromCodePoint(Number(n))}catch{return ''}});
const clean=s=>decode(String(s||'').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
const attr=(tag,key)=>{const m=tag.match(new RegExp('(?:^|\\s)'+key+'\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))','i'));return m?decode(m[1]??m[2]??m[3]):'';};
function source(raw,base=ORIGIN){if(!raw)return null;try{const u=new URL(raw,base);if(u.protocol!=='https:'||!SOURCE_HOSTS.has(u.hostname)||u.port||u.username||u.password||u.hash)return null;return u;}catch{return null}}
function image(raw,base=ORIGIN){if(!raw)return null;try{const u=new URL(raw,base);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null}}
function anchors(html,base){const out=[];for(const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi)){const u=source(attr(m[1],'href'),base);if(u){const active=new URL(u.pathname+u.search,base);if(source(active.href))out.push({u:active,label:clean(m[2]),html:m[2],season:attr(m[1],'data-season'),episode:attr(m[1],'data-episode')});}}return out;}
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
 const kind=g.slots.length||g.conflicts.length?'tv':['tv','movie','play'].includes(m.kind)?m.kind:kindHint(base,m.title);
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
 const errors=[];for(const url of urls){try{await probe(url,fetcher);return url;}catch(e){if(String(e.message||e)==='batch-network-budget')throw e;errors.push(String(e.message||e));}}
 throw Error('direct-sources-unavailable: '+errors.join('; ').slice(0,120));
}
async function loadEpisode(page,candidates,fetcher){
 // Some work pages already expose exact media links for multiple episodes.
 // Only use those links when their ref matches the precise episode key.
 if(candidates?.length){try{return {url:await chooseMedia(candidates,fetcher),html:''};}catch(e){if(String(e.message||e)==='batch-network-budget')throw e;}}
 const html=await getPage(page,fetcher),base=source(page);
 const graph=mediaByEpisode(anchors(html,page),base,{source,allowedMedia:validMedia,decode:x=>new URL(atob(x)).href});
 return {html,url:await chooseMedia([...candidatesFor(graph,base),...explicitVideoLinks(html,page)],fetcher)};
}
async function getPage(url,fetcher){let r;for(let hop=0;hop<4;hop++){r=await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(8000),headers:{accept:'text/html'}});if(![301,302,303,307,308].includes(r.status))break;const next=source(r.headers.get('Location'),url);if(!next)throw Error('unapproved-redirect');url=next.href;}if(!r.ok)throw Error('page-'+r.status);const body=await r.text();if(body.length>3000000)throw Error('page-too-large');return body;}
export async function probe(url,fetcher=fetch){const r=await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(8000),headers:{Range:'bytes=0-4095'}});if(r.status>=300&&r.status<400){await r.body?.cancel().catch(()=>{});throw Error('media-redirect-'+r.status);}if(!r.ok||!r.body){await r.body?.cancel().catch(()=>{});throw Error('media-'+r.status);}const reader=r.body.getReader();let bytes=[];try{while(bytes.length<12){const {done,value}=await reader.read();if(done)break;bytes.push(...value.subarray(0,32));}}finally{await reader.cancel().catch(()=>{});}if(bytes.length<12||String.fromCharCode(...bytes.slice(4,8))!=='ftyp')throw Error('not-mp4');}
const jobKey=j=>P+'q:'+({episode:'0',work:'1',index:'2'}[j.type])+':'+(j.type==='episode'?j.id+':'+j.gen+':'+String(j.n).padStart(4,'0'):j.url);
async function enqueue(s,j,now,force=false){if(j.type==='work'&&j.title&&j.title.length>2&&!/^(?:watch|عرض|مشاهدة|تحميل|play)$/i.test(j.title)){const k=P+'discovered:'+j.id,old=await s.get(k)||{};await s.put(k,{...old,id:j.id,title:old.title||j.title,kind:old.kind||j.kind||'unknown',poster:old.poster||j.poster||null,sourcePage:j.url,discovered:true,count:old.count??null});}const key=jobKey(j);const existing=await s.get(key);if(existing){if(j.type==='work'&&(!existing.kind&&j.kind||!existing.poster&&j.poster))await s.put(key,{...existing,kind:existing.kind||j.kind,poster:existing.poster||j.poster});return;}if(!force&&Number(await s.get(P+'seen:'+key))>now-DAY)return;await s.put(key,{...j,tries:0,after:0,revision:REVISION});}
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
const mediaKey=(id,key)=>P+'links:'+id+':'+encodeURIComponent(key);
const healthKey=id=>P+'health:'+id;
// Standard video markup is accepted only when the page explicitly identifies this episode.
export function explicitVideoLinks(html,page){
 const base=source(page);if(!base)return [];
 const same=raw=>{const u=source(raw,page);return !!u&&u.pathname===base.pathname&&(u.searchParams.get('key')||'')===(base.searchParams.get('key')||'');};
 const canonical=[...html.matchAll(/<link\b[^>]*>/gi)].find(m=>attr(m[0],'rel').toLowerCase()==='canonical');
 const declared=meta(html,'og:url')||attr(canonical?.[0]||'','href');
 const out=new Set();
 const add=raw=>{const url=image(raw,page);if(url&&validMedia(url))out.add(url);};
 for(const ld of schema(html)){
  if(!types(ld).includes('VideoObject'))continue;
  const identity=value(ld.mainEntityOfPage)||value(ld.url)||ld['@id'];
  if(identity&&same(identity))add(value(ld.contentUrl));
 }
 if(declared&&same(declared)){
  const videos=[...html.matchAll(/<video\b([^>]*)>([\s\S]*?)<\/video\s*>/gi)];
  if(videos.length===1){add(attr(videos[0][1],'src'));for(const m of videos[0][2].matchAll(/<source\b[^>]*>/gi))add(attr(m[0],'src'));}
 }
 return [...out].slice(0,3);
}
async function harvestLinks(s,id,page,html,now){
 const base=source(page);if(!base)return new Map();
 const graph=mediaByEpisode(anchors(html,page),base,{source,allowedMedia:validMedia,decode:x=>new URL(atob(x)).href});
 const explicit=explicitVideoLinks(html,page);if(explicit.length){const key=base.searchParams.get('key')||'';const set=graph.get(key)||new Set();explicit.forEach(u=>set.add(u));graph.set(key,set);}
 const entries=[...graph].slice(0,1000).map(([key,urls])=>[mediaKey(id,key),{urls:[...urls].slice(0,3),at:now}]);
 if(entries.length)await putMany(s,entries);
 return graph;
}
async function prepareJob(j,fetcher,s,now){
 if(j.type==='episode'){
  const d=await s.get(dk(j.id));if(!d||d.gen!==j.gen)return {skip:true};
  const key=epPrefix(j.id,j.gen)+String(j.n).padStart(4,'0');if(await s.get(key))return d.remaining===0?{recover:true}:{skip:true};
  const season=j.season||d.season,episode=j.episode||j.n;
  const cached=await s.get(P+'ondemand:'+j.id+':'+season+':'+episode);
  if(cached&&cached.sourcePage===j.url&&now-cached.verifiedAt<3600000)return {asset:cached,html:'',url:cached.url};
  const page=source(j.url),k=page.searchParams.get('key')||'';
  const saved=await s.get(mediaKey(j.id,k));
  const candidates=j.refreshLinks?[]:saved&&now-saved.at<DAY?saved.urls:j.candidates||[];
  if(j.phase==='verify'&&!j.refreshLinks){
   // A resolved link is never mistaken for a verified playable asset.
   const url=await chooseMedia(candidates,fetcher);
   return {url,html:'',details:j.details||{}};
  }
  if(candidates.length)return {extracted:true,candidates,details:j.details||{}};
  const html=await getPage(j.url,fetcher);
  const graph=await harvestLinks(s,j.id,j.url,html,now);
  const urls=candidatesFor(graph,page);
  if(!urls.length)throw Error('missing-direct-source');
  const m=metadata(html,j.url);
  return {extracted:true,candidates:urls,details:{thumbnail:m.thumbnail,story:m.story}};
 }
 return {html:await getPage(j.url,fetcher)};
}
async function processJob(s,j,fetcher,now,prepared){
 const result=prepared||await prepareJob(j,fetcher,s,now),{html='',url:preparedUrl}=result;
 if(result.skip)return;
 if(result.extracted)return;
 if(j.type==='index'){const links=indexLinks(html,j.url,j.kind);if(!links.length)throw Error('empty-index');await enqueueIndex(s,links,now);return;}
 if(j.type==='work'){
  const m=metadata(html,j.url,j.kind);if(!m.title)throw Error('missing-title');
  const g=pageGraph(html,j.url,m),kind=g.kind;await harvestLinks(s,j.id,j.url,html,now);
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
 const season=j.season||d.season,episode=j.episode||j.n,m=html?metadata(html,j.url):result.details||{};
 const asset=result.asset||{id:j.id+':s'+season+':e'+episode,title:d.kind==='tv'?'الحلقة '+episode:d.title,season,episode,format:'mp4',url:preparedUrl,sourcePage:j.url,thumbnail:m.thumbnail&&m.thumbnail!==d.poster?m.thumbnail:null,story:m.story&&m.story!==d.story?m.story:'',verifiedAt:now};
 await s.transaction(async tx=>{const latest=await tx.get(dk(j.id));if(!latest||latest.gen!==j.gen||await tx.get(key))return;await tx.put(key,asset);latest.remaining--;await tx.put(dk(j.id),latest);});
 const latest=await s.get(dk(j.id));if(latest&&latest.gen===j.gen){if(latest.remaining===0)await publish(s,latest);else{const old=await s.get(wk(j.id));const availableCount=latest.count-latest.remaining;if(!old||old.partial===true&&(old.gen===latest.gen||availableCount>=(old.availableCount||0))){const {remaining,signature,...record}=latest;await s.put(wk(j.id),{...record,count:Math.max(latest.count,latest.expectedCount||0),partial:true,availableCount});invalidateIndex(s);}}}
}
export async function crawl(s,fetcher=fetch,now=Date.now(),budget=48){
 // A bounded batch with at most four concurrent network checks.
 const last=Number(await s.get(P+'seed')||0),rev=await s.get(P+'revision');
 if(rev!==REVISION)await s.put(P+'revision',REVISION);
 const seedDue=!last||now-last>=DAY;
 if(rev!==REVISION){for(const id of ['asix3ql1l2cf','eo0d9c52j0k8','ewi7bvciic6u','0savdpd5wt7z','06v44abenwn6','b1fofd5a2ccl','mnfdrzi1l8a4','029tbb8b6shb','vrag6g9jmzjm']){const known=await s.get(P+'discovered:alooytv:'+id);if(known&&!await s.get(P+'preview:alooytv:'+id))await enqueue(s,{type:'work',url:ORIGIN+'/watch/'+id+'.html',id:'alooytv:'+id,kind:known.kind,title:known.title,poster:known.poster},now,true);}}if(seedDue){await enqueue(s,{type:'index',url:ORIGIN+'/',kind:''},now,true);await enqueue(s,{type:'index',url:ORIGIN+'/genre/ramadan-arabi-2026.html',kind:'tv'},now,true);await enqueue(s,{type:'work',url:ORIGIN+'/watch/gztyqowfz11u.html',id:'alooytv:gztyqowfz11u',kind:'tv'},now,true);await s.put(P+'seed',now);}
 // Read each lane independently so an episode backlog cannot starve discovery.
 const lanes=await Promise.all(['0','1','2'].map(n=>queueRows(s,P+'q:'+n+':')));
 // Recover catalogue titles that were discovered before their work job was queued.
 // Scan the local index, not the external site, and only add truly unmapped titles.
 if(lanes[1].size<80){
  const rows=(await getFastIndex(s)).filter(t=>t.discovered&&t.sourcePage);
  const queued=new Set([...lanes[1].values()].map(j=>j.id));
  const candidates=rows.filter(t=>!queued.has(t.id)).flatMap(t=>{const u=source(t.sourcePage);return u&&workPath(u)&&workId(u)===t.id?[{type:'work',id:t.id,url:ORIGIN+u.pathname,kind:t.kind,title:t.title,poster:t.poster}]:[];});
  const keys=candidates.flatMap(j=>[P+'preview:'+j.id,P+'seen:'+jobKey(j),P+'error:'+jobKey(j)]);
  const known=await getMany(s,keys);
  const missing=candidates.filter(j=>!known.get(P+'preview:'+j.id)&&!(Number(known.get(P+'seen:'+jobKey(j)))>now-DAY)&&!(Number(known.get(P+'error:'+jobKey(j))?.at)>now-6*3600000)).slice(0,80-lanes[1].size);
  const entries=missing.map(j=>[jobKey(j),{...j,tries:0,after:0,revision:REVISION}]);
  await putMany(s,entries);for(const [k,v] of entries)lanes[1].set(k,v);
 }
 // Restore reasons for deferred jobs created by v8 without changing their identity.
 const oldDeferred=lanes.flatMap(rows=>[...rows].filter(([,j])=>j.after>now&&!j.reason));
 const oldErrors=await getMany(s,oldDeferred.map(([k])=>P+'error:'+k));
 const migrated=[];
 for(const rows of lanes)for(const [k,j] of rows){
  const previous=oldErrors.get(P+'error:'+k);
  if(!previous)continue;
  const plan=retryPlan(previous.reason,j.tries||1,previous.at);
  const v={...j,reason:previous.reason,structural:plan.structural,deferredAt:previous.at,after:Math.min(j.after,plan.after)};
  rows.set(k,v);migrated.push([k,v]);
 }
 await putMany(s,migrated);
 const draftRows=await queueRows(s,P+'draft:');
 const draftsById=new Map([...draftRows.values()].map(d=>[d.id,d]));
 const episodeRows=[...lanes[0]];
 const healthRows=await getMany(s,[...new Set(episodeRows.map(([,j])=>healthKey(j.id)))]);
 const health=new Map([...healthRows].map(([k,v])=>[k.slice((P+'health:').length),v]));
 // Read the exact saved links in bulk, not per deferred job.
 const linkKeys=episodeRows.flatMap(([,j])=>{const u=source(j.url);return u&&j.phase!=='verify'?[mediaKey(j.id,u.searchParams.get('key')||'')]:[];});
 const savedLinks=await getMany(s,linkKeys);
 const stale=episodeRows.filter(([,j])=>draftsById.get(j.id)?.gen!==j.gen).map(([k])=>k);
 for(let i=0;i<stale.length;i+=100)await s.delete(stale.slice(i,i+100));
 const ready=lanes.map(rows=>[...rows].flatMap(([key,j])=>{
  if(j.type==='episode'&&draftsById.get(j.id)?.gen!==j.gen)return [];
  const u=source(j.url);if(!u)return [];
  const rawLink=j.type==='episode'&&j.phase!=='verify'?savedLinks.get(mediaKey(j.id,u.searchParams.get('key')||'')):null;
  const link=rawLink&&now-rawLink.at<DAY?rawLink:null;
  const newLink=!!(link?.urls?.length&&now-link.at<DAY&&link.at>(j.deferredAt||j.after||0));
  if(effectiveDue(j,health.get(j.id),now,newLink)>now)return [];
  const direct=j.type==='episode'&&j.phase!=='verify'&&!j.refreshLinks&&(link?.urls?.length||j.candidates?.length);
  return [[key,{...j,url:ORIGIN+u.pathname+u.search,revision:REVISION,rescued:newLink,phase:direct?'verify':j.phase,candidates:link?.urls||j.candidates}]];
 }));
 const jobs=pickJobs(ready,budget,health,now,draftsById);
 let done=0,failed=0,skipped=stale.length,extracted=0;const start=Date.now();const errors=[];const prior=await s.get(P+'status')||{};const totals={processed:0,failed:0,extracted:0,...prior.totals};
 // Parallelize only network reads; serialize storage commits to avoid races between episodes.
 const parallel=6;let networkRequests=0;const boundedFetch=(...args)=>{if(networkRequests>=45)throw Error('batch-network-budget');networkRequests++;return fetcher(...args);};
 for(let i=0;i<jobs.length&&Date.now()-start<20000&&networkRequests<45;i+=parallel){
  const batch=jobs.slice(i,i+parallel),results=await Promise.allSettled(batch.map(([,j])=>prepareJob(j,boundedFetch,s,now)));
  for(let k=0;k<batch.length;k++){
   const [key,j]=batch[k],r=results[k];
   try{
    if(r.status==='rejected')throw r.reason;
    if(r.value?.extracted){
     const h=nextHealth(health.get(j.id),true,'',now);health.set(j.id,h);await s.put(healthKey(j.id),h);
     await s.put(key,{...j,phase:'verify',candidates:r.value.candidates,details:r.value.details,refreshLinks:false,tries:0,after:0,revision:REVISION});extracted++;continue;
    }
    await processJob(s,j,fetcher,now,r.value);await s.put(P+'seen:'+key,now);if(j.type==='index')await s.put(P+'seen:'+REVISION+':'+key,now);await s.delete(key);if(r.value?.skip)skipped++;else done++;
   }catch(e){
    const reason=String(e.message||e).slice(0,160);if(reason==='batch-network-budget')continue;failed++;errors.push({type:j.type,reason,path:new URL(j.url).pathname,episode:j.episode||j.n,season:j.season});
    const tries=j.tries+1;
    if(j.type==='episode'&&j.phase!=='verify'){const h=nextHealth(health.get(j.id),false,reason,now);health.set(j.id,h);await s.put(healthKey(j.id),h);}
    const plan=retryPlan(reason,tries,now);const refresh=j.type==='episode'&&j.phase==='verify'&&tries>=2&&reason.startsWith('direct-sources-unavailable');await s.put(P+'error:'+key,{url:j.url,reason,at:now});await s.put(key,{...j,...plan,...(refresh?{phase:'extract',refreshLinks:true,candidates:[],tries:0}:{}),deferredAt:now,revision:REVISION});
   }
  }
  await s.put(P+'status',{...prior,revision:REVISION,state:'running',at:now,processed:done,failed,skipped,extracted,errors:errors.slice(0,5),totals:{processed:totals.processed+done,failed:totals.failed+failed,extracted:totals.extracted+extracted}});
 }
 const pendingLanes=await Promise.all(['0','1','2'].map(n=>queueRows(s,P+'q:'+n+':')));
 const pending=new Map(pendingLanes.flatMap(m=>[...m]));
 const [workMap,draftMap]=await Promise.all([queueRows(s,P+'work:'),queueRows(s,P+'draft:')]);
 const works=workMap,drafts=draftMap;
 const pendingHealthRows=await getMany(s,[...new Set([...pending.values()].filter(j=>j.type==='episode'&&j.phase!=='verify').map(j=>healthKey(j.id)))]);
 const pendingLinkKeys=[...pending.values()].flatMap(j=>{const u=source(j.url);return u&&j.type==='episode'&&j.phase!=='verify'?[mediaKey(j.id,u.searchParams.get('key')||'')]:[];});
 const freshLinks=await getMany(s,pendingLinkKeys);
 const due=j=>{const u=source(j.url);const v=u&&j.type==='episode'&&j.phase!=='verify'?freshLinks.get(mediaKey(j.id,u.searchParams.get('key')||'')):null;return effectiveDue(j,pendingHealthRows.get(healthKey(j.id)),now,!!(v?.urls?.length&&now-v.at<DAY&&v.at>(j.deferredAt||j.after||0)));};
 const readyCount=[...pending.values()].filter(j=>due(j)<=now).length;
 const nextRetry=[...pending.values()].filter(j=>due(j)>now).reduce((m,j)=>Math.min(m,due(j)),Infinity);
 const stages={index:0,work:0,extract:0,verify:0};const delayed={structural:0,transient:0,cooldown:0};
 for(const j of pending.values()){stages[j.type==='episode'?(j.phase==='verify'?'verify':'extract'):j.type]++;if(due(j)>now){if(j.after>now){if(j.structural)delayed.structural++;else delayed.transient++;}else delayed.cooldown++;}}
 totals.processed+=done;totals.failed+=failed;totals.extracted+=extracted;
 const titleIndex=await getFastIndex(s),previewRows=await queueRows(s,P+'preview:');const mappedWorks=new Set([...previewRows.values()].filter(p=>p.slots?.length).map(p=>p.id));for(const w of works.values())mappedWorks.add(w.id);

 const result={at:now,revision:REVISION,source:ORIGIN,processed:done,failed,skipped,extracted,networkRequests,queuedSample:pending.size,queueSampleTruncated:false,stages,delayed,ready:readyCount,waiting:pending.size-readyCount,nextRetry:Number.isFinite(nextRetry)?nextRetry:null,published:[...works.values()].filter(w=>!w.partial&&w.source!=='personal-import').length,availableWorks:works.size,publishedEpisodes:[...works.values()].filter(w=>w.source!=='personal-import').reduce((n,w)=>n+(w.availableCount??w.count),0),importedWorks:[...works.values()].filter(w=>w.source==='personal-import').length,importedEpisodes:[...works.values()].filter(w=>w.source==='personal-import').reduce((n,w)=>n+(w.availableCount??w.count),0),discovered:titleIndex.length,mappedWorks:mappedWorks.size,drafts:drafts.size,verifiedDraftEpisodes:[...drafts.values()].reduce((n,d)=>n+d.count-d.remaining,0),totals,errors:errors.length?errors.slice(0,5):[],state:done||extracted?'working':failed?'source-error':pending.size?'retry-wait':'idle'};await s.put(P+'status',result);return result;
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
 const saved=await s.get(mediaKey(id,source(slot.page).searchParams.get('key')||''));const {html,url}=await loadEpisode(slot.page,saved&&now-saved.at<DAY?saved.urls:slot.candidates,fetcher);if(html)await harvestLinks(s,id,slot.page,html,now);
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
