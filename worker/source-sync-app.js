import {configureMediaHosts} from './private-media-policy.js';
import {recoveryRequest} from './private-recovery.js';
import cinema from './index.js';
import sync,{SourceSync} from './source-sync.js';
import {authorize} from './private-catalog-sync.js';
import {createInvitation,verifyInvitation} from './private-invite.js';
export {SourceSync};
const fail=(error,status)=>Response.json({error},{status,headers:{'Cache-Control':'private, no-store'}});
const stub=env=>env.SOURCE_SYNC.get(env.SOURCE_SYNC.idFromName('catalogue'));
// Recovery does not touch storage for synchronization requests or cron events.
const maintenance=()=>Response.json({engine:'auto-v10',state:'maintenance',paused:true,message:'Catalogue recovery; stored content retained.'},{status:202,headers:{'Cache-Control':'private, no-store'}});
function recoveryError(e){const m=String(e?.message||e||'');if(/rows read|rows written|free tier|daily limit|quota|spending cap|spending limit/i.test(m))return 'storage-quota-or-limit';if(/overload|too many|storage operation|timeout/i.test(m))return 'storage-overloaded-or-timeout';if(/reset|code was updated/i.test(m))return 'storage-restarting';return 'catalogue-storage-unavailable';}
let quotaUntil=0;
const recoverable=new Set(['/private-list','/private-preview','/private-work','/private-episode']);
const recoveryStatus=()=>Response.json({engine:'auto-v10',state:'maintenance',paused:true,recovery:true,storageUnavailable:true,message:'Stored library unavailable; live source recovery active.'},{headers:{'Cache-Control':'private, no-store','Vary':'Authorization'}});
async function fallback(route,request,owner,reason){
 if(route==='/private-status')return recoveryStatus();
 if(recoverable.has(route))return recoveryRequest(route,request);
 return fail(owner?reason:'catalogue-temporarily-unavailable',503);
}
async function privateRead(env,route,request,owner,publicRead=false){
 if(Date.now()<quotaUntil)return fallback(route,request,owner,'storage-quota-or-limit');
 try{
  const internal=new URL('https://internal'+route+new URL(request.url).search);internal.searchParams.delete('_public');if(publicRead)internal.searchParams.set('_public','1');
  const r=await stub(env).fetch(internal.href,{method:request.method});
  if(r.status===502&&(route==='/private-preview'||route==='/private-episode')){const data=await r.json().catch(()=>null);return fail(typeof data?.error==='string'?data.error.slice(0,240):'source-unavailable',502);}
  if(r.status>=500){
   const m=await r.text(),reason=recoveryError(m);
   if(reason==='storage-quota-or-limit'){quotaUntil=Date.now()+60000;return fallback(route,request,owner,reason);}
   return fail(owner?reason:'catalogue-temporarily-unavailable',503);
  }
  return r;
 }catch(e){
  console.error('Private catalogue recovery',route,String(e?.message||e).slice(0,350));
  const reason=recoveryError(e);if(reason==='storage-quota-or-limit'){quotaUntil=Date.now()+60000;return fallback(route,request,owner,reason);}
  return fail(owner?reason:'catalogue-temporarily-unavailable',503);
 }
}

const privateRoutes={'/api/private-catalog/list':'/private-list','/api/private-catalog/work':'/private-work','/api/private-catalog/status':'/private-status','/api/private-catalog/sync':'/private-sync','/api/private-catalog/share':'/private-share','/api/private-catalog/preview':'/private-preview','/api/private-catalog/episode':'/private-episode'};
export default {
 async fetch(request,env){
  const u=new URL(request.url);
  if(u.pathname.startsWith('/api/private-catalog/')){
   try{configureMediaHosts(env.PRIVATE_MEDIA_HOSTS);}catch{return fail('invalid-media-host-config',503);}
   const configured=typeof env.PRIVATE_CATALOG_KEY==='string'&&env.PRIVATE_CATALOG_KEY.length>=32;
   const owner=configured&&await authorize(request,env.PRIVATE_CATALOG_KEY);
   const token=(request.headers.get('Authorization')||'').slice(7);
   const invited=!!(configured&&token&&!owner&&await verifyInvitation(token,env.PRIVATE_CATALOG_KEY));
   if(u.pathname==='/api/private-catalog/invite'){if(!owner||request.method!=='POST')return fail('forbidden',403);return Response.json(await createInvitation(env.PRIVATE_CATALOG_KEY),{headers:{'Cache-Control':'private, no-store'}});}
   const route=privateRoutes[u.pathname],write=route==='/private-sync'||route==='/private-share';
   if(!route||request.method!==(write?'POST':'GET'))return fail('not-found',404);
   if(write&&!owner)return fail('forbidden',403);
   if(route==='/private-status'&&!owner&&!invited)return Response.json({engine:'auto-v10',paused:true,public:true},{headers:{'Cache-Control':'private, no-store'}});
   if(route==='/private-sync')return maintenance();
   if(route==='/private-share'){if(Date.now()<quotaUntil)return fail('storage-quota-or-limit',503);if(Number(request.headers.get('Content-Length'))>1000000)return fail('share-too-large',413);const body=await request.text();if(body.length>1000000)return fail('share-too-large',413);try{return await stub(env).fetch('https://internal'+route,{method:'POST',body,headers:{'Content-Type':'application/json'}});}catch(e){const reason=recoveryError(e);if(reason==='storage-quota-or-limit')quotaUntil=Date.now()+60000;return fail(reason,503);}}
   const response=await privateRead(env,route,request,owner,!owner&&!invited);
   // Samsung Tizen packaged web app uses a local widget origin. Only the
   // already-public, anonymous read endpoints receive cross-origin access.
   if(!token&&!owner&&!invited&&recoverable.has(route)){
    const headers=new Headers(response.headers);headers.set('Access-Control-Allow-Origin','*');
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
   }
   return response;
  }
  return u.pathname.startsWith('/api/source-sync/')?sync.fetch(request,env):cinema.fetch(request,env);
 },
 scheduled(event,env,ctx){
  if(event.cron==='0 */6 * * *')return sync.scheduled(event,env,ctx);
  // Private crawler intentionally paused during recovery.
 }
};
