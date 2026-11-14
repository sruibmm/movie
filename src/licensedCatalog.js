// Only provider-authorized, direct, ad-free media. No HTML embeds or extraction.
export function validMediaUrl(v,type){
 try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password&&['mp4','hls'].includes(type)&& (type==='mp4'?/\.mp4$/i:/\.m3u8$/i).test(u.pathname);}catch{return false;}
}
export function eligibleAsset(a,now=Date.now(),region='KW'){
 const r=a?.rights;
 return Boolean(a&&typeof a.id==='string'&&a.id&&typeof a.title==='string'&&a.title.trim()&&r?.reference&&r?.provider&&r?.adFree===true&&r?.webPlayback===true&&Array.isArray(r.territories)&&(r.territories.includes(region)||r.territories.includes('*'))&&Number.isFinite(Date.parse(r.expires))&&Date.parse(r.expires)>now&&validMediaUrl(a.url,a.format));
}
export function normalizeLicensedCatalog(doc,now=Date.now()){
 if(doc?.version!==1||!Array.isArray(doc.titles))throw Error('Unsupported catalog format');
 const ids=new Set(),assetIds=new Set();const titles=[];
 for(const t of doc.titles){
  if(!t||typeof t.id!=='string'||!t.id||typeof t.title!=='string'||!t.title.trim()||!['movie','tv','play'].includes(t.kind)||ids.has(t.id)||!Array.isArray(t.assets))continue;
  const assets=[];
  for(const a of t.assets){
   if(!eligibleAsset(a,now)||assetIds.has(a.id)|| (t.kind==='tv'&&(!Number.isInteger(a.season)||a.season<1||!Number.isInteger(a.episode)||a.episode<1)))continue;
   assetIds.add(a.id);assets.push(a);
  }
  if(!assets.length)continue;
  ids.add(t.id);titles.push({...t,assets:assets.sort((a,b)=>(a.season||0)-(b.season||0)||(a.episode||0)-(b.episode||0))});
 }
 return titles;
}
export function licensedMovie(title,asset){
 if(!eligibleAsset(asset))throw Error('Playback rights unavailable');
 return {id:'licensed:'+asset.id,title:title.kind==='tv'?title.title+' · S'+asset.season+' E'+asset.episode:title.title,seriesTitle:title.title,media_type:title.kind==='tv'?'tv':'movie',season:asset.season,episode:asset.episode,poster_path:null,licensedPoster:title.poster||null,isArabic:true,original_language:'ar',release_date:title.year?title.year+'-01-01':'',licensedSource:{stream_url:asset.url,type:asset.format,rights:asset.rights,subtitles:[]}};
}
