import cinema from './index.js';
import sync,{SourceSync} from './source-sync.js';
import {authorize} from './private-catalog-sync.js';
export {SourceSync};
const fail=(error,status)=>Response.json({error},{status,headers:{'Cache-Control':'private, no-store'}});
const stub=env=>env.SOURCE_SYNC.get(env.SOURCE_SYNC.idFromName('catalogue'));
const privateRoutes={'/api/private-catalog/list':'/private-list','/api/private-catalog/work':'/private-work','/api/private-catalog/status':'/private-status','/api/private-catalog/sync':'/private-sync'};
export default {
 async fetch(request,env){
  const u=new URL(request.url);
  if(u.pathname.startsWith('/api/private-catalog/')){
   if(!env.PRIVATE_CATALOG_KEY||env.PRIVATE_CATALOG_KEY.length<32)return fail('private-catalog-not-configured',503);
   if(!await authorize(request,env.PRIVATE_CATALOG_KEY))return fail('unauthorized',401);
   const route=privateRoutes[u.pathname];
   if(!route||request.method!==(route==='/private-sync'?'POST':'GET'))return fail('not-found',404);
   return stub(env).fetch('https://internal'+route+u.search,{method:request.method});
  }
  return u.pathname.startsWith('/api/source-sync/')?sync.fetch(request,env):cinema.fetch(request,env);
 },
 scheduled(event,env,ctx){
  if(event.cron==='0 */6 * * *')return sync.scheduled(event,env,ctx);
  if(event.cron==='*/2 * * * *'&&typeof env.PRIVATE_CATALOG_KEY==='string'&&env.PRIVATE_CATALOG_KEY.length>=32)ctx.waitUntil(stub(env).fetch('https://internal/private-sync',{method:'POST'}).then(r=>{if(!r.ok)throw Error('private-sync-failed');}));
 }
};
