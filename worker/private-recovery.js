// Emergency browse/play path: no Durable Object, no persistent writes.
// All access is authenticated by the outer Worker. This is a partial live catalogue,
// not a replacement for or copy of the stored library.
import {getPage,indexLinks,previewWork,resolveEpisode} from './private-catalog-sync.js';
import {searchCards} from './private-fast-index.js';
const ORIGIN='https://af.alooytv16.com',TTL=300000;
const json=(x,status=200)=>Response.json(x,{status,headers:{'Cache-Control':'private, no-store','Vary':'Authorization'}});
const memo=new Map();
const storage={async get(k){return memo.get(k);},async put(k,v){if(typeof k==='object'){for(const [key,value] of Object.entries(k))await this.put(key,value);return;}memo.delete(k);memo.set(k,v);while(memo.size>1200)memo.delete(memo.keys().next().value);},async delete(k){for(const key of Array.isArray(k)?k:[k])memo.delete(key);}};
let catalog=null,loading=null,pauseUntil=0;
function bounded(fetcher,now){let n=0;return async(...args)=>{if(++n>12)throw Error('recovery-request-budget');if(pauseUntil>now)throw Error('source-rate-limited');const r=await fetcher(...args);if(r.status===429){pauseUntil=now+Math.max(60000,Math.min(1800000,(Number(r.headers?.get('Retry-After'))||120)*1000));}return r;};}
function cards(links){return links.filter(x=>x.type==='work'&&x.title&&x.title.length>2&&!/^(?:watch|عرض|مشاهدة|تحميل|play)$/i.test(x.title)).map(j=>({id:j.id,title:j.title,kind:j.kind||'unknown',poster:j.poster||null,year:j.year||null,region:j.region||null,ramadan:!!j.ramadan,sourcePage:j.url,discovered:true,count:null,recovery:true,genres:[]}));}
async function loadCatalog(fetcher,now){
 if(catalog&&now-catalog.at<TTL)return catalog.rows;
 if(loading)return loading;
 loading=(async()=>{
  const f=bounded(fetcher,now);
  const seeds=[ORIGIN+'/',ORIGIN+'/genre/ramadan-arabi-2026.html'];
  const pages=await Promise.allSettled(seeds.map(async url=>indexLinks(await getPage(url,f),url)));
  let links=pages.flatMap(r=>r.status==='fulfilled'?r.value:[]);
  const extra=[...new Map(links.filter(j=>j.type==='index'&&!seeds.includes(j.url)).map(j=>[j.url,j])).values()].slice(0,3);
  const more=await Promise.allSettled(extra.map(async j=>indexLinks(await getPage(j.url,f),j.url,j.kind)));
  links.push(...more.flatMap(r=>r.status==='fulfilled'?r.value:[]));
  const rows=[...new Map(cards(links).map(t=>[t.id,t])).values()];
  if(!rows.length){if(catalog?.rows.length)return catalog.rows;throw Error('live-source-unavailable');}
  for(const row of rows)await storage.put('pc:discovered:'+row.id,row);
  catalog={at:now,rows};return rows;
 })().finally(()=>{loading=null;});
 return loading;
}
export async function recoveryRequest(route,request,fetcher=fetch,now=Date.now()){
 const u=new URL(request.url),q=u.searchParams;
 try{
  if(route==='/private-list'){
   const cursor=q.get('cursor')||'0';if(!/^\d{1,8}$/.test(cursor))return json({error:'invalid-cursor'},400);
   const rows=await loadCatalog(fetcher,now);
   const result=searchCards(rows,{q:(q.get('q')||'').slice(0,200),kind:q.get('kind')||'all',region:q.get('region')||'all',year:q.get('year')||'all',ramadan:q.get('ramadan')==='1',offset:Number(cursor)});
   return json({...result,recovery:true,partialCatalog:true,facets:{regions:[...new Set(rows.map(t=>t.region).filter(Boolean))].sort(),years:[...new Set(rows.map(t=>t.year).filter(Boolean))].sort((a,b)=>Number(b)-Number(a))}});
  }
  if(route==='/private-preview'||route==='/private-episode'||route==='/private-work'){
   const id=q.get('id')||'';if(!/^alooytv:[a-z0-9-]{1,80}$/i.test(id))return json({error:'invalid-work'},400);
   // Use only a known source identity or a strictly constrained watch pathname.
   if(!await storage.get('pc:discovered:'+id))await storage.put('pc:discovered:'+id,{id,sourcePage:ORIGIN+'/watch/'+id.slice(8)+'.html',kind:''});
   const f=bounded(fetcher,now);
   if(route==='/private-episode')return json(await resolveEpisode(storage,id,Number(q.get('season')),Number(q.get('episode')),f,now));
   const preview=await previewWork(storage,id,f,now);
   if(route==='/private-work')return json({...preview,recovery:true,discovered:true,assets:[]});
   return json({...preview,recovery:true});
  }
  return json({error:'storage-quota-or-limit'},503);
 }catch(e){return json({error:String(e?.message||e).slice(0,160),recovery:true},502);}
}
