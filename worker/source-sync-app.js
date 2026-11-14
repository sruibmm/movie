import cinema from './index.js';
import sync,{SourceSync} from './source-sync.js';
import {authorize} from './private-catalog-sync.js';
import {createInvitation,verifyInvitation} from './private-invite.js';
export {SourceSync};
const fail=(error,status)=>Response.json({error},{status,headers:{'Cache-Control':'private, no-store'}});
const stub=env=>env.SOURCE_SYNC.get(env.SOURCE_SYNC.idFromName('catalogue'));
const privateRoutes={'/api/private-catalog/list':'/private-list','/api/private-catalog/work':'/private-work','/api/private-catalog/status':'/private-status','/api/private-catalog/sync':'/private-sync','/api/private-catalog/share':'/private-share','/api/private-catalog/preview':'/private-preview','/api/private-catalog/episode':'/private-episode'};
export default {
 async fetch(request,env){
  const u=new URL(request.url);
  if(u.pathname.startsWith('/api/private-catalog/')){
   if(!env.PRIVATE_CATALOG_KEY||env.PRIVATE_CATALOG_KEY.length<32)return fail('private-catalog-not-configured',503);
   const owner=await authorize(request,env.PRIVATE_CATALOG_KEY);
   const token=(request.headers.get('Authorization')||'').slice(7);
   if(!owner&&!await verifyInvitation(token,env.PRIVATE_CATALOG_KEY))return fail('unauthorized',401);
   if(u.pathname==='/api/private-catalog/invite'){if(!owner||request.method!=='POST')return fail('forbidden',403);return Response.json(await createInvitation(env.PRIVATE_CATALOG_KEY),{headers:{'Cache-Control':'private, no-store'}});}
   const route=privateRoutes[u.pathname],write=route==='/private-sync'||route==='/private-share';
   if(!route||request.method!==(write?'POST':'GET'))return fail('not-found',404);
   if(write&&!owner)return fail('forbidden',403);
   if(route==='/private-share'){if(Number(request.headers.get('Content-Length'))>1000000)return fail('share-too-large',413);const body=await request.text();if(body.length>1000000)return fail('share-too-large',413);return stub(env).fetch('https://internal'+route,{method:'POST',body,headers:{'Content-Type':'application/json'}});}
   return stub(env).fetch('https://internal'+route+u.search,{method:request.method});
  }
  return u.pathname.startsWith('/api/source-sync/')?sync.fetch(request,env):cinema.fetch(request,env);
 },
 scheduled(event,env,ctx){
  if(event.cron==='0 */6 * * *')return sync.scheduled(event,env,ctx);
  if(event.cron==='*/2 * * * *'&&typeof env.PRIVATE_CATALOG_KEY==='string'&&env.PRIVATE_CATALOG_KEY.length>=32)ctx.waitUntil(stub(env).fetch('https://internal/private-sync',{method:'POST'}).then(r=>{if(!r.ok)throw Error('private-sync-failed');}));
 }
};
