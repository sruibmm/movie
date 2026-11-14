import {privateRequest,crawl} from './private-catalog-sync.js';
import {PrivateRunner} from './private-catalog-runner.js';
import {reviewSourceSnapshot} from '../src/sourceSyncGate.js';
import {eligibleAsset,approvedDelivery} from '../src/licensedCatalog.js';

const MAX_BYTES=8*1024*1024;
const validUrl=(raw,hosts)=>{
 const u=new URL(raw);
 if(u.protocol!=='https:'||u.port||u.username||u.password||u.hash||u.search||!hosts.includes(u.hostname))throw Error('unapproved-feed-url');
 return u.href;
};
export async function readFeed(raw,hosts,fetcher=fetch){
 const url=validUrl(raw,hosts);
 const r=await fetcher(url,{redirect:'error',headers:{accept:'application/json'},signal:AbortSignal.timeout(15000)});
 if(!r.ok||!/^application\/(?:[\w.+-]*\+)?json(?:;|$)/i.test(r.headers.get('content-type')||''))throw Error('feed-unavailable');
 if(r.url&&r.url!==url)throw Error('unexpected-feed-origin');
 if(Number(r.headers.get('content-length'))>MAX_BYTES)throw Error('feed-too-large');
 const reader=r.body?.getReader();if(!reader)throw Error('empty-feed');
 let size=0;const chunks=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BYTES)throw Error('feed-too-large');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
 const buffer=new Uint8Array(size);let at=0;for(const c of chunks){buffer.set(c,at);at+=c.length;}
 return JSON.parse(new TextDecoder().decode(buffer));
}
export function policies(env){
 const data=JSON.parse(env.SOURCE_POLICIES||'[]');
 if(!Array.isArray(data)||data.length>20)throw Error('invalid-policies');
 const ids=new Set();
 for(const p of data){if(!p||typeof p.provider!=='string'||!/^[a-z0-9-]{1,64}$/.test(p.provider)||ids.has(p.provider)||p.approved!==true||!p.grantReference||!Array.isArray(p.feedHosts)||!p.feedHosts.length||!Array.isArray(p.hosts)||!p.hosts.length||!p.crosswalk||typeof p.crosswalk!=='object'||Array.isArray(p.crosswalk))throw Error('invalid-policy');ids.add(p.provider);validUrl(p.feedUrl,p.feedHosts);validUrl(p.observationsUrl,p.feedHosts);}
 return data;
}
export async function synchronize(storage,policy,fetcher=fetch,now=Date.now()){
 const key='source:'+policy.provider;
 const previous=await storage.get(key);
 try{
  const [snapshot,evidence]=await Promise.all([readFeed(policy.feedUrl,policy.feedHosts,fetcher),readFeed(policy.observationsUrl,policy.feedHosts,fetcher)]);
  if(evidence.provider!==policy.provider||evidence.revision!==snapshot.revision||!evidence.observations||typeof evidence.observations!=='object')throw Error('evidence-mismatch');
  const same=snapshot.revision===previous?.snapshot.revision;
  // Equal revisions may renew independent evidence, but cannot silently change media.
  if(same&&JSON.stringify(snapshot)!==JSON.stringify(previous.snapshot))throw Error('same-revision-content-changed');
  if(same&&Object.entries(previous.observations).some(([id,o])=>Number(evidence.observations[id]?.checkedAt)<Number(o.checkedAt)))throw Error('evidence-regression');
  const review=reviewSourceSnapshot(same?null:previous?.snapshot??null,snapshot,same?{...policy,minimumNewTitles:0}:policy,evidence.observations,now);
  if(!review.ok)throw Error(review.reason);
  const record={snapshot:review.snapshot,observations:evidence.observations,checkedAt:now};
  await storage.transaction(async tx=>{const current=await tx.get(key);if(current&&(current.snapshot.revision>snapshot.revision||(!same&&current.snapshot.revision===snapshot.revision)||(same&&current.checkedAt>now)))throw Error('concurrent-stale-revision');await tx.put(key,record);});
  return {provider:policy.provider,status:same?'unchanged':'updated',revision:snapshot.revision,titles:review.titles,assets:review.assets};
 }catch(e){return {provider:policy.provider,status:'retained',revision:previous?.snapshot.revision??null,reason:String(e.message||e).slice(0,120)};}
}
// Cross-provider identity is an explicitly reviewed, canonical work ID mapping.
// Never guess by title or silently substitute an episode.
export async function resolveCandidates(storage,config,request,now=Date.now()){
 const {work,season,episode,exclude=[]}=request;
 if(typeof work!=='string'||!work||work.length>160||!Array.isArray(exclude))return [];
 const options=[];
 for(const p of config){
  const record=await storage.get('source:'+p.provider);if(!record)continue;
  for(const t of record.snapshot.titles){
   if(!Object.hasOwn(p.crosswalk,t.id)||p.crosswalk[t.id]!==work)continue;
   if(t.kind==='tv'&&(!Number.isInteger(season)||!Number.isInteger(episode)))continue;
   if(t.kind!=='tv'&&(season!==null||episode!==null))continue;
   for(const a of t.assets){
    if(t.kind==='tv'&&(a.season!==season||a.episode!==episode))continue;
    const id=p.provider+':'+a.id;
    if(exclude.includes(id)||!eligibleAsset(a,now,p.region??'KW')||a.rights.provider!==p.provider||a.rights.reference!==p.grantReference)continue;
    try{validUrl(a.url,p.hosts);}catch{continue;}
    const o=record.observations[a.id];
    if(!approvedDelivery(a,p,o)||!approvedDelivery(a,p,o)||!o||o.url!==a.url||o.played!==true||!Number.isFinite(o.height)||o.height<720||!Number.isFinite(o.checkedAt)||o.checkedAt>now||now-o.checkedAt>(p.maxAgeMs??86400000))continue;
    options.push({id,provider:p.provider,url:a.url,format:a.format,height:o.height,duration:o.duration,checkedAt:o.checkedAt,rights:a.rights});
   }
  }
 }
 return options.sort((a,b)=>b.height-a.height||b.checkedAt-a.checkedAt||a.id.localeCompare(b.id));
}
// Public catalogue contains only canonical IDs and episode metadata, never unreviewed URLs.
export async function listSyncedTitles(storage,config,now=Date.now()){
 const result=new Map();
 for(const p of config){
  const record=await storage.get('source:'+p.provider);if(!record)continue;
  for(const t of record.snapshot.titles){
   if(!Object.hasOwn(p.crosswalk,t.id))continue;
   const work=p.crosswalk[t.id];
   if(typeof work!=='string'||!work||work.length>160||result.has(work))continue;
   const assets=t.assets.filter(a=>{
    const o=record.observations[a.id];
    if(!eligibleAsset(a,now,p.region??'KW')||a.rights.provider!==p.provider||a.rights.reference!==p.grantReference||!o||o.url!==a.url||o.played!==true||!Number.isFinite(o.height)||o.height<720||!Number.isFinite(o.checkedAt)||o.checkedAt>now||now-o.checkedAt>(p.maxAgeMs??86400000))return false;
    try{validUrl(a.url,p.hosts);return true;}catch{return false;}
   });
   if(!assets.length||assets.length!==t.assets.length)continue;
   result.set(work,{work,title:t.title,kind:t.kind,year:t.year??null,episodes:assets.map(a=>({season:t.kind==='tv'?a.season:null,episode:t.kind==='tv'?a.episode:null}))});
  }
 }
 return [...result.values()];
}
export class SourceSync{
 constructor(state,env){this.storage=state.storage;this.env=env;this.running=null;this.privateRunner=new PrivateRunner(this.storage,crawl);}
 async alarm(){if(typeof this.env.PRIVATE_CATALOG_KEY==='string'&&this.env.PRIVATE_CATALOG_KEY.length>=32)await this.privateRunner.alarm();}
 async fetch(request){
  const u=new URL(request.url);
  if(u.pathname.startsWith('/private-')){const headers={'Cache-Control':'private, no-store','Vary':'Authorization'};if(u.pathname==='/private-sync'&&request.method==='POST')return Response.json(await this.privateRunner.kick(),{status:202,headers});if(u.pathname==='/private-status')return Response.json(await this.privateRunner.status(),{headers});return privateRequest(request,this.storage);}
  let config;try{config=policies(this.env);}catch{return Response.json({error:'invalid-configuration'},{status:503});}
  if(u.pathname==='/sync'&&request.method==='POST'){
   if(!this.running)this.running=(async()=>{const results=[];for(const p of config)results.push(await synchronize(this.storage,p));await this.storage.put('lastRun',{at:Date.now(),results});return results;})().finally(()=>{this.running=null;});
   return Response.json({results:await this.running});
  }
  if(u.pathname==='/status')return Response.json({configured:config.length,lastRun:await this.storage.get('lastRun')??null});
  if(u.pathname==='/catalog')return Response.json({titles:await listSyncedTitles(this.storage,config)},{headers:{'Cache-Control':'no-store'}});
  if(u.pathname==='/resolve'){
   const n=k=>u.searchParams.has(k)?Number(u.searchParams.get(k)):null;
   const candidates=await resolveCandidates(this.storage,config,{work:u.searchParams.get('work'),season:n('season'),episode:n('episode'),exclude:u.searchParams.getAll('exclude').slice(0,20)});
   return Response.json({candidates},{headers:{'Cache-Control':'no-store'}});
  }
  return new Response('Not found',{status:404});
 }
}
export default {
 async fetch(request,env){
  const u=new URL(request.url);
  if(request.method!=='GET'||!['/api/source-sync/status','/api/source-sync/resolve','/api/source-sync/catalog'].includes(u.pathname))return new Response('Not found',{status:404});
  const stub=env.SOURCE_SYNC.get(env.SOURCE_SYNC.idFromName('catalogue'));
  return stub.fetch('https://internal'+u.pathname.replace('/api/source-sync','')+u.search);
 },
 async scheduled(_event,env,ctx){
  const stub=env.SOURCE_SYNC.get(env.SOURCE_SYNC.idFromName('catalogue'));
  ctx.waitUntil(stub.fetch('https://internal/sync',{method:'POST'}).then(r=>{if(!r.ok)throw Error('sync-failed');}));
 }
};
