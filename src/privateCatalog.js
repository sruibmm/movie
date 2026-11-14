// Browser-only personal sources; never fetched from or written to a shared catalog.
export const PRIVATE_KEY='cinema_private_catalog_v1';
export function validatePrivateCatalog(doc){
 if(doc?.version!==1||!Array.isArray(doc.titles)||doc.titles.length>10000)throw Error('ملف مكتبة غير صالح');
 const ids=new Set(),assets=new Set(),out=[];
 for(const t of doc.titles){
  if(!t||typeof t.id!=='string'||!t.id||t.id.length>150||ids.has(t.id)||typeof t.title!=='string'||!t.title.trim()||!['tv','movie','play'].includes(t.kind)||!Array.isArray(t.assets)||!t.assets.length)throw Error('بيانات عمل غير صالحة أو مكررة');
  ids.add(t.id);const slots=new Set();
  const list=t.assets.map(a=>{
   let u;try{u=new URL(a.url)}catch{throw Error('رابط فيديو غير صالح')}
   if(u.protocol!=='https:'||u.username||u.password||!['mp4','hls'].includes(a.format)||typeof a.id!=='string'||!a.id||assets.has(a.id))throw Error('مصدر فيديو غير صالح أو مكرر');
   if(t.kind==='tv'&&(!Number.isSafeInteger(a.season)||a.season<1||!Number.isSafeInteger(a.episode)||a.episode<1))throw Error('رقم حلقة غير صالح');
   const slot=t.kind==='tv'?a.season+':'+a.episode:a.id;
   if(slots.has(slot))throw Error('حلقة مكررة');
   slots.add(slot);assets.add(a.id);
   return {id:a.id,title:typeof a.title==='string'?a.title:t.title,season:a.season,episode:a.episode,format:a.format,url:u.href};
  });
  out.push({id:t.id,title:t.title,kind:t.kind,year:t.year||null,poster:typeof t.poster==='string'&&/^https:\/\//.test(t.poster)?t.poster:null,assets:list.sort((a,b)=>(a.season||0)-(b.season||0)||(a.episode||0)-(b.episode||0))});
 }
 return {version:1,titles:out};
}
export function mergePrivateCatalog(oldDoc,newDoc){
 const old=validatePrivateCatalog(oldDoc),fresh=validatePrivateCatalog(newDoc),titles=new Map(old.titles.map(t=>[t.id,t]));
 for(const t of fresh.titles){
  const prior=titles.get(t.id);
  if(!prior){titles.set(t.id,t);continue;}
  if(prior.title!==t.title||prior.kind!==t.kind)throw Error('تعارض هوية العمل');
  const rows=new Map(prior.assets.map(a=>[a.id,a]));
  for(const a of t.assets){const b=rows.get(a.id);if(b&&(b.url!==a.url||b.season!==a.season||b.episode!==a.episode||b.format!==a.format))throw Error('تعارض رابط الحلقة');rows.set(a.id,a);}
  titles.set(t.id,{...prior,assets:[...rows.values()]});
 }
 return validatePrivateCatalog({version:1,titles:[...titles.values()]});
}
export function privateMovie(t,a){
 const safe=validatePrivateCatalog({version:1,titles:[{...t,assets:[a]}]}).titles[0],v=safe.assets[0];
 return {id:'private:'+v.id,title:safe.kind==='tv'?safe.title+' · الحلقة '+v.episode:safe.title,seriesTitle:safe.title,media_type:safe.kind==='tv'?'tv':'movie',season:v.season,episode:v.episode,isArabic:true,original_language:'ar',poster_path:null,licensedPoster:safe.poster,release_date:safe.year?safe.year+'-01-01':'',licensedSource:{stream_url:v.url,type:v.format,localOnly:true,rights:{nativeMp4:v.format==='mp4'},subtitles:[]}};
}
export function isPrivateMedia(s){
 try{const u=new URL(s?.stream_url);return s.localOnly===true&&u.protocol==='https:'&&!u.username&&!u.password&&['mp4','hls'].includes(s.type);}catch{return false;}
}
