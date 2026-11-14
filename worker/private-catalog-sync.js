import {validMedia,isWarningMedia,mediaTotalBytes,mp4HeaderDuration} from './private-media-policy.js';
import {groupKey,groupPrefix,selectGroups,summarizeGroup,queueStatus,rollingPool} from './private-work-queue.js';
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
  if(workPath(u)){u.search='';const id=workId(u);const img=a.html.match(/<img\b[^>]*>/i)?.[0]||'';const poster=image(attr(img,'data-src')||attr(img,'data-original')||attr(img,'data-lazy-src')||attr(img,'src'),page);const title=clean(attr(img,'alt')||attr(img,'title')||attr(a.html.match(/<[^>]+>/)?.[0]||'','title')||a.label).slice(0,300);const info=categoryInfo(page);const previous=out.get('w:'+id);if(!previous||title.length>previous.title.length||poster&&!previous.poster)out.set('w:'+id,{type:'work',url:u.href,id,kind:kindHint(u,a.label)||kind,poster,title,...info,year:title.match(/\b(?:19|20)\d{2}\b/)?.[0]||info.year,categories:[new URL(page).pathname]});}
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
 const ep=source(page),matches=ep?candidatesFor(directGraph(html,page),ep):[];
 if(matches.length!==1)throw Error('missing-or-ambiguous-direct-source');
 return matches[0];
}
// Accept only ordinary links exposed by the source, with exact episode refs.
function decodeMediaValue(raw){
 const v=String(raw||'').trim();if(/^https:\/\//i.test(v))return new URL(v).href;
 const b64=v.replace(/-/g,'+').replace(/_/g,'/');return new URL(atob(b64+'='.repeat((4-b64.length%4)%4))).href;
}
function downloadAnchors(html,page){
 const out=anchors(html,page);
 for(const m of html.matchAll(/<(?:a|button|input)\b[^>]*>/gi)){
  for(const name of ['data-href','data-url','data-download','data-link']){
   const u=source(attr(m[0],name),page);
   if(u?.pathname==='/download_video.php')out.push({u,label:'',html:''});
  }
 }
 return out;
}
function directGraph(html,page){const base=source(page);return mediaByEpisode(downloadAnchors(html,page),base,{source,allowedMedia:validMedia,decode:decodeMediaValue});}
function sourceEvidence(html,page){
 const base=source(page),key=base?.searchParams.get('key')||'';
 let links=0,exact=0,approved=0;const hosts=new Set();
 for(const a of downloadAnchors(html,page)){
  if(a.u.pathname!=='/download_video.php')continue;links++;
  const ref=source(a.u.searchParams.get('ref'),page);
  if(!ref||ref.pathname!==base.pathname||(ref.searchParams.get('key')||'')!==key)continue;
  exact++;try{const url=decodeMediaValue(a.u.searchParams.get('video_url'));if(validMedia(url))approved++;else hosts.add(new URL(url).hostname);}catch{}
 }
 return {downloadLinks:links,exactRefs:exact,approvedLinks:approved,otherHosts:[...hosts].slice(0,3)};
}
function pageGraph(html,page,m){
 const base=source(page),links=anchors(html,page),plain=clean(html);
 const declared=plain.match(/(?:عدد الحلقات|Episodes)\s*[:：]\s*(\d+)/i)?.[1];
 const g=buildEpisodeGraph(links,base,m.season,declared);
 const kind=g.slots.length||g.conflicts.length?'tv':['tv','movie','play'].includes(m.kind)?m.kind:kindHint(base,m.title);
 const media=directGraph(html,page),explicit=explicitVideoLinks(html,page);
 if(explicit.length){const key=base.searchParams.get('key')||'';media.set(key,new Set([...explicit,...(media.get(key)||[])]));}
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
 const errors=[];for(const url of urls){try{return await probe(url,fetcher);}catch(e){if(String(e.message||e)==='batch-network-budget')throw e;errors.push(String(e.message||e));}}
 throw Error('direct-sources-unavailable: '+errors.join('; ').slice(0,120));
}
async function loadEpisode(page,candidates,fetcher){
 // Some work pages already expose exact media links for multiple episodes.
 // Only use those links when their ref matches the precise episode key.
 if(candidates?.length){try{return {url:await chooseMedia(candidates,fetcher),html:''};}catch(e){if(String(e.message||e)==='batch-network-budget')throw e;}}
 const html=await getPage(page,fetcher),base=source(page);
 // Prefer the explicitly identified player media over download anchors.
 const graph=directGraph(html,page),urls=[...explicitVideoLinks(html,page),...candidatesFor(graph,base)];
 if(!urls.length){const e=sourceEvidence(html,page);throw Error('missing-direct-source · links:'+e.downloadLinks+' · exact:'+e.exactRefs+(e.otherHosts.length?' · unsupported-hosts:'+e.otherHosts.join(','):''));}
 return {html,url:await chooseMedia(urls,fetcher)};
}
export async function getPage(url,fetcher){
 const requested=source(url);let r;
 for(let hop=0;hop<4;hop++){
  r=await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(8000),headers:{accept:'text/html'}});
  if(![301,302,303,307,308].includes(r.status))break;
  const next=source(r.headers.get('Location'),url);await r.body?.cancel().catch(()=>{});
  if(!next)throw Error('unapproved-redirect');
  // Never interpret a redirect to a different work or episode as the requested one.
  if(requested&&workPath(requested)&&(next.pathname!==requested.pathname||requested.searchParams.has('key')&&next.searchParams.get('key')!==requested.searchParams.get('key')))throw Error('source-identity-redirect-mismatch');
  url=next.href;
 }
 if(!r.ok){await r.body?.cancel().catch(()=>{});throw Error('page-'+r.status);}
 if(Number(r.headers?.get('Content-Length'))>3000000){await r.body?.cancel().catch(()=>{});throw Error('page-too-large');}
 const body=await r.text();if(body.length>3000000)throw Error('page-too-large');return body;
}
export async function probe(url,fetcher=fetch){
 if(isWarningMedia(url))throw Error('media-warning-clip');
 if(!validMedia(url))throw Error('unsupported-media-host');
 const seen=new Set(),signal=AbortSignal.timeout(12000);let current=new URL(url).href;
 for(let hop=0;hop<=4;hop++){
  if(seen.has(current))throw Error('media-redirect-loop');seen.add(current);
  const r=await fetcher(current,{redirect:'manual',signal,headers:{Range:'bytes=0-4095'}});
  if([301,302,303,307,308].includes(r.status)){
   const location=r.headers?.get('Location');await r.body?.cancel().catch(()=>{});
   if(!location)throw Error('media-redirect-'+r.status+': missing-location');
   let target;try{target=new URL(location,current);}catch{throw Error('media-redirect-'+r.status+': invalid-location');}
   if(isWarningMedia(target.href))throw Error('media-warning-clip');
   if(!validMedia(target.href))throw Error('media-redirect-'+r.status+': unapproved-host '+target.hostname);
   if(hop===4)throw Error('media-redirect-limit');
   current=target.href;continue;
  }
  if(!r.ok||!r.body){await r.body?.cancel().catch(()=>{});throw Error('media-'+r.status);}
  const total=mediaTotalBytes(r);
  // Reject obvious teaser/warning-sized files, not an arbitrary 500 MB
  // requirement: legitimate compressed episodes can be much smaller.
  if(total!==null&&total<2000000){await r.body.cancel().catch(()=>{});throw Error('media-too-small: '+total);}
  const reader=r.body.getReader();let bytes=[];
  try{while(bytes.length<4096){const {done,value}=await reader.read();if(done)break;bytes.push(...value.subarray(0,4096-bytes.length));}}finally{await reader.cancel().catch(()=>{});}
  if(bytes.length<12||String.fromCharCode(...bytes.slice(4,8))!=='ftyp')throw Error('not-mp4');
  const duration=mp4HeaderDuration(bytes);
  if(duration!==null&&duration<60)throw Error('media-too-short: '+duration);
  return current;
 }
 throw Error('media-redirect-limit');
}
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
 // A smaller or incomplete generation must not replace a stronger published one.
 if(old&&old.gen!==d.gen&&((old.availableCount??old.count)>d.count||!old.partial&&d.indexIncomplete&&old.count>=d.count)){
  await s.delete(dk(d.id));await s.delete(groupKey(d.id));return;
 }
 const {remaining,signature,...record}=d;
 if(old&&old.gen!==d.gen)await s.put(P+'archive:'+d.id+':'+old.gen,old);
 await s.put(wk(d.id),{...record,count:Math.max(d.count,d.expectedCount||0),partial:!!d.indexIncomplete,graphSignature:d.signature,availableCount:d.count});
 invalidateIndex(s);await s.delete(dk(d.id));await s.delete(groupKey(d.id));
 // Retain prior verified generations for rollback. Do not remove working media.
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
  const identity=value(ld.mainEntityOfPage)||ld.mainEntityOfPage?.['@id']||value(ld.url)||ld['@id'];
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
 const graph=directGraph(html,page);
 const explicit=explicitVideoLinks(html,page);if(explicit.length){const key=base.searchParams.get('key')||'';graph.set(key,new Set([...explicit,...(graph.get(key)||[])]));}
 const entries=[...graph].slice(0,1000).map(([key,urls])=>[mediaKey(id,key),[...urls].slice(0,3)]);
 const old=await getMany(s,entries.map(([key])=>key)),writes=[];
 for(const [key,urls] of entries){
  const previous=old.get(key),merged=[...new Set([...urls,...(previous?.urls||[])])].slice(0,3);
  const changed=!previous||merged.length!==previous.urls?.length||merged.some(u=>!previous.urls.includes(u));
  if(changed||now-(previous.seenAt||previous.at||0)>3600000)writes.push([key,{urls:merged,at:changed?now:previous.at,seenAt:now}]);
 }
 if(writes.length)await putMany(s,writes);return graph;
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
  const candidates=j.refreshLinks?[]:saved&&now-(saved.seenAt||saved.at)<DAY?saved.urls:j.candidates||[];
  if(j.phase==='verify'&&!j.refreshLinks){
   // A resolved link is never mistaken for a verified playable asset.
   const url=await chooseMedia(candidates,fetcher);
   return {url,html:'',details:j.details||{}};
  }
  if(candidates.length)return {extracted:true,candidates,details:j.details||{}};
  const html=await getPage(j.url,fetcher);
  const graph=await harvestLinks(s,j.id,j.url,html,now);
  const urls=candidatesFor(graph,page);
  if(!urls.length){const e=Error('missing-direct-source');e.evidence=sourceEvidence(html,j.url);throw e;}
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
  await s.put(P+'discovered:'+j.id,{...known,...d,discovered:true});await s.put(P+'preview:'+j.id,preview);await s.delete(groupKey(j.id));invalidateIndex(s);
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
 const latest=await s.get(dk(j.id));if(latest&&latest.gen===j.gen){if(latest.remaining===0)await publish(s,latest);else{const old=await s.get(wk(j.id));const availableCount=latest.count-latest.remaining;if(!old||old.partial===true&&(old.gen===latest.gen||availableCount>=(old.availableCount||0))){const {remaining,signature,...record}=latest;if(old&&old.gen!==latest.gen)await s.put(P+'archive:'+j.id+':'+old.gen,old);await s.put(wk(j.id),{...record,count:Math.max(latest.count,latest.expectedCount||0),partial:true,availableCount});invalidateIndex(s);}}}
}
// Only load one selected work generation, never all 30,000 episode jobs.
async function inspectWorkGroup(s,d,health,now){
 const rows=await queueRows(s,groupPrefix(d.id,d.gen));
 if(d.remaining===0){
  const assets=await queueRows(s,epPrefix(d.id,d.gen));
  if(assets.size===d.count){await publish(s,d);return {rows:new Map(),summary:null,ready:[]};}
  if(assets.size<d.count){d={...d,remaining:d.count-assets.size};await s.put(dk(d.id),d);}
 }
 if(rows.size<d.remaining){
  const preview=await s.get(P+'preview:'+d.id),slots=preview?.slots||[];
  if(slots.length===d.count&&graphSignature(slots)===d.signature){
   const jobs=slots.map((v,i)=>({type:'episode',url:v.page,id:d.id,gen:d.gen,n:i+1,season:v.season,episode:v.episode,kind:d.kind,candidates:v.candidates||[]}));
   const keys=jobs.map(jobKey),assetKeys=jobs.map(j=>epPrefix(j.id,j.gen)+String(j.n).padStart(4,'0'));
   const existing=await getMany(s,assetKeys),missing=jobs.filter((j,i)=>!rows.has(keys[i])&&!existing.has(assetKeys[i]));
   const errors=await getMany(s,missing.map(j=>P+'error:'+jobKey(j)));
   const writes=missing.map(j=>{const old=errors.get(P+'error:'+jobKey(j));const plan=old&&Number.isFinite(old.at)?retryPlan(old.reason,1,old.at):{after:0,tries:0};return [jobKey(j),{...j,...plan,revision:REVISION}];});
   await putMany(s,writes);for(const [k,v] of writes)rows.set(k,v);
  }else if(d.sourcePage){
   const u=source(d.sourcePage);if(u&&workPath(u)&&workId(u)===d.id)await enqueue(s,{type:'work',url:ORIGIN+u.pathname,id:d.id,kind:d.kind,title:d.title,poster:d.poster},now,true);
  }
 }
 // Migrate old delay reasons only within this selected work, not the entire queue.
 const delayed=[...rows].filter(([,j])=>j.after>now&&!j.reason);
 const oldErrors=await getMany(s,delayed.map(([key])=>P+'error:'+key)),repaired=[];
 for(const [key,j] of delayed){const old=oldErrors.get(P+'error:'+key);if(!old||!Number.isFinite(old.at))continue;const plan=retryPlan(old.reason,j.tries||1,old.at);const v={...j,reason:old.reason,structural:plan.structural,deferredAt:old.at,after:Math.min(j.after,plan.after)};rows.set(key,v);repaired.push([key,v]);}
 await putMany(s,repaired);
 const keys=[...rows.values()].flatMap(j=>{const u=source(j.url);return u?[mediaKey(j.id,u.searchParams.get('key')||'')]:[];});
 const saved=await getMany(s,keys),writes=[],ready=[];
 for(const [key,j] of rows){
  const u=source(j.url);if(!u)continue;
  const raw=saved.get(mediaKey(j.id,u.searchParams.get('key')||'')),link=raw&&now-(raw.seenAt||raw.at)<DAY?raw:null;
  const fresh=!!(link?.urls?.length&&link.at>(j.deferredAt||j.after||0)),candidates=link?.urls||j.candidates||[];
  const direct=(!j.refreshLinks||fresh)&&candidates.length>0;
  const v={...j,url:ORIGIN+u.pathname+u.search,revision:REVISION};
  if(direct){v.phase='verify';v.candidates=candidates;if(fresh){v.after=0;v.tries=0;v.refreshLinks=false;v.rescued=true;}}
  const changed=v.phase!==j.phase||v.after!==j.after||v.refreshLinks!==j.refreshLinks||v.tries!==j.tries||JSON.stringify(v.candidates||[])!==JSON.stringify(j.candidates||[]);
  if(changed){rows.set(key,v);writes.push([key,v]);}
  if(effectiveDue(v,health,now,fresh)<=now)ready.push([key,v]);
 }
 await putMany(s,writes);
 const missing=Math.max(0,d.remaining-rows.size);
 return {d,rows,ready,summary:summarizeGroup(d,rows,health,now,{missing})};
}
async function reconcileTitles(s,workRows,now){
 if(workRows.size>=80)return false;
 const state=await s.get(P+'reconcile')||{at:0,offset:0};
 if(now-state.at<30000)return false;
 const rows=(await getFastIndex(s)).filter(t=>t.discovered&&t.sourcePage&&!(Number(t.count)>0));
 const queued=new Set([...workRows.values()].map(j=>j.id));
 const candidates=rows.filter(t=>!queued.has(t.id)).flatMap(t=>{const u=source(t.sourcePage);return u&&workPath(u)&&workId(u)===t.id?[{type:'work',id:t.id,url:ORIGIN+u.pathname,kind:t.kind,title:t.title,poster:t.poster}]:[];});
 const start=candidates.length?state.offset%candidates.length:0,page=candidates.slice(start,start+200);
 const known=await getMany(s,page.flatMap(j=>[P+'preview:'+j.id,P+'draft:'+j.id,P+'seen:'+jobKey(j),P+'error:'+jobKey(j)]));
 const missing=page.filter(j=>(!known.get(P+'preview:'+j.id)||!known.get(P+'draft:'+j.id))&&!(Number(known.get(P+'seen:'+jobKey(j)))>now-DAY)&&!(Number(known.get(P+'error:'+jobKey(j))?.at)>now-6*3600000)).slice(0,80-workRows.size);
 const entries=missing.map(j=>[jobKey(j),{...j,tries:0,after:0,revision:REVISION}]);
 await putMany(s,entries);for(const [k,v] of entries)workRows.set(k,v);
 await s.put(P+'reconcile',{at:now,offset:candidates.length?(start+page.length)%candidates.length:0,remaining:candidates.length});
 return entries.length>0;
}
export async function crawl(s,fetcher=fetch,now=Date.now(),budget=64){
 const pause=Number(await s.get(P+'source-pause')||0);
 if(pause>now){const old=await s.get(P+'status')||{};return {...old,revision:REVISION,ready:0,nextRetry:pause,sourcePausedUntil:pause,state:'retry-wait'};}
 const last=Number(await s.get(P+'seed')||0),rev=await s.get(P+'revision');if(rev!==REVISION)await s.put(P+'revision',REVISION);
 if(!last||now-last>=DAY){
  await enqueue(s,{type:'index',url:ORIGIN+'/',kind:''},now,true);
  await enqueue(s,{type:'index',url:ORIGIN+'/genre/ramadan-arabi-2026.html',kind:'tv'},now,true);
  await enqueue(s,{type:'work',url:ORIGIN+'/watch/gztyqowfz11u.html',id:'alooytv:gztyqowfz11u',kind:'tv'},now,true);
  await s.put(P+'seed',now);
 }
 const [workRows,indexRows,draftRows,summaryRows,healthRows]=await Promise.all([
  queueRows(s,P+'q:1:'),queueRows(s,P+'q:2:'),queueRows(s,P+'draft:'),queueRows(s,P+'group:'),queueRows(s,P+'health:')
 ]);
 await reconcileTitles(s,workRows,now);
 const drafts=new Map([...draftRows.values()].map(d=>[d.id,d])),summaries=new Map([...summaryRows.values()].map(v=>[v.id,v]));
 const health=new Map([...healthRows].map(([k,v])=>[k.slice((P+'health:').length),v]));
 const normalizeJob=([key,j])=>{const u=source(j.url);return u&&Number(j.after||0)<=now?[[key,{...j,url:ORIGIN+u.pathname+u.search,revision:REVISION}]]:[];};
 const readyWork=[...workRows].flatMap(normalizeJob),readyIndex=[...indexRows].flatMap(normalizeJob),mappingIds=new Set(readyWork.map(([,j])=>j.id));
 const selectable=new Map([...drafts].filter(([id])=>!mappingIds.has(id))),groups=selectGroups(selectable,summaries,health,now,24);
 const selected=new Map(),episodeReady=[];let inspected=0;
 // Bound storage reads even when a work has hundreds of episodes.
 for(const d of groups){
  if(inspected>=3000)break;
  const g=await inspectWorkGroup(s,d,health.get(d.id),now);inspected+=g.rows.size;
  if(g.summary){selected.set(d.id,{d,...g});summaries.set(d.id,g.summary);episodeReady.push(...g.ready);}
  else{drafts.delete(d.id);summaries.delete(d.id);}
 }
 const jobs=pickJobs([episodeReady,readyWork,readyIndex],budget,health,now,drafts);
 let done=0,failed=0,skipped=0,extracted=0,networkRequests=0,mapped=0;
 const start=Date.now(),errors=[],touched=new Set(),prior=await s.get(P+'status')||{},totals={processed:0,failed:0,extracted:0,...prior.totals};
 let throttled=false,rateUntil=0;
 const boundedFetch=async(...args)=>{
  if(networkRequests>=45||throttled)throw Error('batch-network-budget');networkRequests++;
  const r=await fetcher(...args);
  if(r.status===429){throttled=true;const seconds=Number(r.headers?.get('Retry-After'));rateUntil=now+Math.min(30*60000,Math.max(60000,Number.isFinite(seconds)&&seconds>0?seconds*1000:120000));}
  return r;
 };
 const pool=await rollingPool(jobs,{concurrency:6,canLaunch:()=>Date.now()-start<20000&&networkRequests<45&&!throttled,
  prepare:([key,j])=>prepareJob(j,boundedFetch,s,now),
  commit:async([key,j],r,enqueueNext)=>{
   if(j.type==='episode')touched.add(j.id);
   try{
    if(r.status==='rejected')throw r.reason;
    if(r.value?.extracted){
     const h=nextHealth(health.get(j.id),true,'',now);health.set(j.id,h);await s.put(healthKey(j.id),h);
     const next={...j,phase:'verify',candidates:r.value.candidates,details:r.value.details,refreshLinks:false,tries:0,after:0,revision:REVISION};
     await s.put(key,next);extracted++;
     if(budget>1&&jobs.length<budget+24&&networkRequests<45)enqueueNext([key,next]);
     return;
    }
    await processJob(s,j,fetcher,now,r.value);
    await s.put(P+'seen:'+key,now);if(j.type==='index')await s.put(P+'seen:'+REVISION+':'+key,now);await s.delete(key);
    if(r.value?.skip)skipped++;else{done++;if(j.type==='work'){mapped++;summaries.delete(j.id);}}
   }catch(e){
    const reason=String(e.message||e).slice(0,160);if(reason==='batch-network-budget')return;
    failed++;errors.push({type:j.type,reason,path:new URL(j.url).pathname,episode:j.episode||j.n,season:j.season,...(e.evidence?{evidence:e.evidence}:{})});
    const tries=(j.tries||0)+1;
    if(j.type==='episode'&&j.phase!=='verify'){const h=nextHealth(health.get(j.id),false,reason,now);health.set(j.id,h);await s.put(healthKey(j.id),h);}
    const plan=retryPlan(reason,tries,now),dead=j.type==='episode'&&j.phase==='verify'&&reason.includes('media-404');
    const refresh=j.type==='episode'&&j.phase==='verify'&&(dead||tries>=2&&reason.startsWith('direct-sources-unavailable'));
    if(dead){const n=(j.staleRefreshes||0)+1;plan.after=now+(n===1?60000:n===2?15*60000:6*3600000);plan.structural=n>=3;}
    await s.put(P+'error:'+key,{url:j.url,reason,at:now});
    await s.put(key,{...j,...plan,...(refresh?{phase:'extract',refreshLinks:true,candidates:[],tries:0,staleRefreshes:(j.staleRefreshes||0)+1}:{}),deferredAt:now,revision:REVISION});
   }
  }
 });
 // Refresh touched groups only; untouched deadline summaries remain valid.
 const latestDraftRows=await queueRows(s,P+'draft:'),latestDrafts=new Map([...latestDraftRows.values()].map(d=>[d.id,d])),summaryWrites=[];
 for(const [id,g] of selected){
  const d=latestDrafts.get(id);if(!d){summaries.delete(id);await s.delete(groupKey(id));continue;}
  if(d.gen!==g.d.gen){summaries.delete(id);continue;}
  const updated=touched.has(id)?await inspectWorkGroup(s,d,health.get(id),now):g;
  if(updated.summary){summaryWrites.push([groupKey(id),updated.summary]);summaries.set(id,updated.summary);}
  else{summaries.delete(id);latestDrafts.delete(id);}
 }
 await putMany(s,summaryWrites);
 const [pendingWorks,pendingIndexes,works]=await Promise.all([queueRows(s,P+'q:1:'),queueRows(s,P+'q:2:'),queueRows(s,P+'work:')]);
 const q=queueStatus(latestDrafts,summaries,pendingWorks,pendingIndexes,now);
 totals.processed+=done;totals.failed+=failed;totals.extracted+=extracted;
 const refreshCatalog=!prior.discovered||mapped>0||readyIndex.length>0||now-(prior.catalogAt||0)>60000,titleIndex=refreshCatalog?await getFastIndex(s):null;
 const mappedWorks=titleIndex?titleIndex.filter(t=>Number(t.count)>0).length:(prior.mappedWorks||0);
 const result={at:now,revision:REVISION,source:ORIGIN,processed:done,failed,skipped,extracted,networkRequests,inspectedEpisodeJobs:inspected,selectedWorkGroups:selected.size,maxConcurrent:pool.maxActive,mapped,...q,
  ...(throttled?{ready:0,waiting:q.queuedSample,sourcePausedUntil:rateUntil,nextRetry:rateUntil}:{}),
  published:[...works.values()].filter(w=>!w.partial&&w.source!=='personal-import').length,availableWorks:works.size,
  publishedEpisodes:[...works.values()].filter(w=>w.source!=='personal-import').reduce((n,w)=>n+(w.availableCount??w.count),0),
  importedWorks:[...works.values()].filter(w=>w.source==='personal-import').length,importedEpisodes:[...works.values()].filter(w=>w.source==='personal-import').reduce((n,w)=>n+(w.availableCount??w.count),0),
  discovered:titleIndex?titleIndex.length:prior.discovered,mappedWorks,catalogAt:refreshCatalog?now:prior.catalogAt,
  drafts:latestDrafts.size,verifiedDraftEpisodes:[...latestDrafts.values()].reduce((n,d)=>n+d.count-d.remaining,0),totals,errors:errors.slice(0,5),state:throttled?'retry-wait':done||extracted?'working':failed?'source-error':q.queuedSample?'retry-wait':'idle'};
 const reconciliation=await s.get(P+'reconcile');
 if(!throttled&&reconciliation?.remaining>0&&q.ready===0)result.nextRetry=Math.min(result.nextRetry??Infinity,Math.max(now+1000,reconciliation.at+30000));
 if(throttled)await s.put(P+'source-pause',rateUntil);
 await s.put(P+'status',result);return result;
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
 const p=await lookupPreview(s,id,fetcher,now);const {slots,...meta}=p;return {...meta,seasonCount:new Set(slots.map(a=>a.season)).size,mappedCount:slots.length,slots:slots.map(({season,episode})=>({season,episode}))};
}
export async function resolveEpisode(s,id,season,episode,fetcher=fetch,now=Date.now()){
 if(!Number.isSafeInteger(season)||season<1||!Number.isSafeInteger(episode)||episode<1)throw Error('invalid-episode');
 const key=P+'ondemand:'+id+':'+season+':'+episode;
 const cached=await s.get(key);const exact=a=>a?.id===id+':s'+season+':e'+episode&&a.season===season&&a.episode===episode&&a.format==='mp4'&&validMedia(a.url);
 if(exact(cached)&&now-cached.verifiedAt<3600000)return cached;
 // Use the published work first. Its verified asset is already stored and exactly identified.
 if(typeof s.list==='function'){const w=await s.get(wk(id));if(w?.gen){const rows=await s.list({prefix:epPrefix(id,w.gen),limit:1000});const a=[...rows.values()].find(v=>exact(v)&&Number.isFinite(v.verifiedAt));if(a)return a;}}
 const p=await lookupPreview(s,id,fetcher,now),slot=p.slots.find(x=>x.season===season&&x.episode===episode);if(!slot)throw Error('episode-not-listed');
 const saved=await s.get(mediaKey(id,source(slot.page).searchParams.get('key')||''));const {html,url}=await loadEpisode(slot.page,saved&&now-(saved.seenAt||saved.at)<DAY?saved.urls:slot.candidates,fetcher);if(html)await harvestLinks(s,id,slot.page,html,now);
 const m=html?metadata(html,slot.page):{},a={id:id+':s'+season+':e'+episode,title:p.kind==='tv'?'الحلقة '+episode:p.title,season,episode,format:'mp4',url,sourcePage:slot.page,thumbnail:m.thumbnail&&m.thumbnail!==p.poster?m.thumbnail:null,story:m.story&&m.story!==p.story?m.story:'',verifiedAt:now};
 await s.put(key,a);await s.delete(groupKey(id));return a;
}
const json=(x,status=200)=>Response.json(x,{status,headers:{'Cache-Control':'private, no-store','Vary':'Authorization'}});
export async function privateRequest(request,s){
 const u=new URL(request.url),publicRead=u.searchParams.get('_public')==='1';
 if(publicRead&&['/private-work','/private-preview','/private-episode'].includes(u.pathname)){const id=u.searchParams.get('id')||'';if(/^alooytv:[a-z0-9-]+$/i.test(id)&&(await s.get(wk(id)))?.source==='personal-import')return json({error:'not-found'},404);}
 if(u.pathname==='/private-sync'&&request.method==='POST')return json(await crawl(s));
 if(u.pathname==='/private-status')return json(await s.get(P+'status')||{at:null,processed:0,failed:0});
 if(u.pathname==='/private-preview'||u.pathname==='/private-episode'){const id=u.searchParams.get('id')||'';if(!/^alooytv:[a-z0-9-]+$/i.test(id))return json({error:'invalid-work'},400);try{return json(u.pathname==='/private-preview'?await previewWork(s,id):await resolveEpisode(s,id,Number(u.searchParams.get('season')),Number(u.searchParams.get('episode'))));}catch(e){const m=String(e.message||e);if(/rows read|rows written|free tier|daily limit|quota|spending cap|spending limit/i.test(m))throw e;return json({error:m.slice(0,240)},502);}}
 if(u.pathname==='/private-work'){
  const id=u.searchParams.get('id')||'';if(!/^alooytv:[a-z0-9-]+$/i.test(id))return json({error:'invalid-work'},400);
  const w=await s.get(wk(id));if(!w)return json({error:'not-found'},404);
  const rows=await s.list({prefix:epPrefix(id,w.gen),limit:1000});if(!rows.size||rows.size!==(w.availableCount??w.count))return json({error:'incomplete-work'},503);
  return json({...w,assets:[...rows.values()]});
 }
 if(u.pathname==='/private-list'){
  const q=(u.searchParams.get('q')||'').slice(0,200),kind=u.searchParams.get('kind')||'all',region=u.searchParams.get('region')||'all',year=u.searchParams.get('year')||'all',cursor=u.searchParams.get('cursor')||'0';
  if(!/^\d{1,8}$/.test(cursor))return json({error:'invalid-cursor'},400);
  const all=await getFastIndex(s),rows=publicRead?all.filter(t=>t.source!=='personal-import'):all,result=searchCards(rows,{q,kind,region,year,ramadan:u.searchParams.get('ramadan')==='1',offset:Number(cursor)});
  const previews=await getMany(s,result.titles.map(t=>P+'preview:'+t.id));
  result.titles=result.titles.map(t=>{const v=previews.get(P+'preview:'+t.id);return v?{...t,poster:t.poster||v.poster,banner:t.banner||v.banner,story:t.story||v.story,year:t.year||v.year,kind:t.kind==='unknown'?v.kind:t.kind,count:t.count??v.count,seasonCount:new Set((v.slots||[]).map(x=>x.season)).size}:t;});
  return json({...result,facets:{regions:[...new Set(rows.map(t=>t.region).filter(Boolean))].sort(),years:[...new Set(rows.map(t=>t.year).filter(Boolean))].sort((a,b)=>Number(b)-Number(a))}});
 }

 return json({error:'not-found'},404);
}
export async function authorize(request,secret){if(typeof secret!=='string'||secret.length<32)return false;const v=request.headers.get('Authorization')||'';if(!v.startsWith('Bearer '))return false;const enc=new TextEncoder(),[a,b]=await Promise.all([crypto.subtle.digest('SHA-256',enc.encode(v.slice(7))),crypto.subtle.digest('SHA-256',enc.encode(secret))]);const x=new Uint8Array(a),y=new Uint8Array(b);let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0;}
