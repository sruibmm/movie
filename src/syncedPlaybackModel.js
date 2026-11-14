import {eligibleAsset} from './licensedCatalog.js';
export function validSyncedTitle(t){
 return !!(t&&typeof t.work==='string'&&t.work.length>0&&t.work.length<=160&&typeof t.title==='string'&&t.title.trim()&&['tv','movie','play'].includes(t.kind)&&Array.isArray(t.episodes)&&t.episodes.length&&t.episodes.every(e=>t.kind==='tv'?Number.isSafeInteger(e.season)&&e.season>0&&Number.isSafeInteger(e.episode)&&e.episode>0:e.season===null&&e.episode===null));
}
export function syncedMovie(t,e){
 if(!validSyncedTitle(t)||!t.episodes.some(a=>a.season===e.season&&a.episode===e.episode))throw Error('invalid episode');
 const sourceSync={work:t.work,season:e.season,episode:e.episode};
 return {id:'sync:'+encodeURIComponent(t.work)+':'+(e.season??0)+':'+(e.episode??0),title:t.kind==='tv'?t.title+' · الحلقة '+e.episode:t.title,seriesTitle:t.title,media_type:t.kind==='tv'?'tv':'movie',season:e.season,episode:e.episode,release_date:t.year?t.year+'-01-01':'',isArabic:true,original_language:'ar',sourceSync};
}
export function resolveUrl(d){
 if(!d||typeof d.work!=='string'||!d.work||d.work.length>160)throw Error('invalid work');
 if((d.season===null)!==(d.episode===null)||d.season!==null&&(!Number.isSafeInteger(d.season)||d.season<1||!Number.isSafeInteger(d.episode)||d.episode<1))throw Error('invalid episode');
 const p=new URLSearchParams({work:d.work});if(d.season!==null){p.set('season',d.season);p.set('episode',d.episode);}
 return '/api/source-sync/resolve?'+p;
}
export function filterCandidates(data,now=Date.now()){
 const seen=new Set();
 return (Array.isArray(data?.candidates)?data.candidates:[]).filter(a=>{
  if(!a||seen.has(a.id)||!Number.isFinite(a.height)||a.height<720||!Number.isFinite(a.duration)||a.duration<60||!Number.isFinite(a.checkedAt)||a.checkedAt>now||now-a.checkedAt>86400000||!eligibleAsset({...a,title:'Video'},now)||a.rights.provider!==a.provider)return false;
  try{const u=new URL(a.url);if(u.search||u.hash||u.port)return false;}catch{return false;}
  seen.add(a.id);return true;
 }).sort((a,b)=>b.height-a.height||b.checkedAt-a.checkedAt||a.id.localeCompare(b.id));
}
