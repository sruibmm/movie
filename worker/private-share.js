import {validatePrivateCatalog} from '../src/privateCatalog.js';
const P='pc:';
export async function shareLocalCatalog(storage,doc,now=Date.now()){
 const checked=validatePrivateCatalog(doc);
 if(checked.titles.length>20||checked.titles.reduce((n,t)=>n+t.assets.length,0)>200)throw Error('share-batch-too-large');
 const titles=checked.titles.filter(t=>/^alooytv:[a-z0-9-]+$/i.test(t.id));
 for(const t of titles){
  const ids=new Set();for(const a of t.assets){const u=new URL(a.url);if(!/^vid\d+\.zvde-dsn-01\.site$/i.test(u.hostname)||a.format!=='mp4'||u.port||u.hash)throw Error('unsupported-shared-media');if(t.kind==='tv'&&a.id!==t.id+':s'+a.season+':e'+a.episode)throw Error('shared-episode-identity');const slot=t.kind==='tv'?a.season+':'+a.episode:a.id;if(ids.has(slot))throw Error('duplicate-shared-episode');ids.add(slot);}
  if(t.kind==='tv'&&t.assets.some((a,i)=>i>0&&a.season===t.assets[i-1].season&&a.episode!==t.assets[i-1].episode+1))throw Error('shared-episode-gap');
 }
 let added=0;
 for(const t of titles){
  const gen='import-'+now,workKey=P+'work:'+t.id;
  const {assets,...meta}=t;
  const changed=await storage.transaction(async tx=>{
   const old=await tx.get(workKey);if(old&&!old.partial&&old.count>=assets.length)return false;
   if(old?.count>assets.length)return false;
   const record={...meta,gen,count:assets.length,availableCount:assets.length,partial:false,source:'personal-import'};
   for(let i=0;i<assets.length;i++)await tx.put(P+'e:'+t.id+':'+gen+':'+String(i+1).padStart(4,'0'),{...assets[i],verifiedAt:null,verification:'personal-import'});
   await tx.put(workKey,record);return true;
  });if(changed)added++;
 }
 return {added,accepted:titles.length};
}
