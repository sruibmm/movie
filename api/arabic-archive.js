import {ARCHIVE_ORIGIN,ARCHIVE_GENRES,parseArchiveCatalogue,archiveVideoCandidates,validateArchiveVideo} from '../src/arabicArchive.js';
import {titleKey} from '../src/watanLookup.js';
async function get(url,json=false){
 const c=new AbortController(),t=setTimeout(()=>c.abort(),12000);
 try{const r=await fetch(url,{signal:c.signal,redirect:'follow',headers:{Accept:json?'application/json':'text/html','User-Agent':'CinemaCatalogueLinkResolver/1.0'}});if(!r.ok)return null;const end=new URL(r.url);if(json?end.hostname!=='www.youtube.com':end.origin!==ARCHIVE_ORIGIN)return null;const b=await r.text();if(b.length>4_000_000)return null;return json?JSON.parse(b):b;}catch{return null;}finally{clearTimeout(t);}
}
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'GET only'});
 const genre=String(req.query.genre||'drama');if(!Object.hasOwn(ARCHIVE_GENRES,genre))return res.status(400).json({error:'Unknown category'});
 const page=Math.max(1,Math.min(100,Math.floor(Number(req.query.page)||1)));
 const id=String(req.query.id||'');const title=String(req.query.title||'').trim().slice(0,280);
 res.setHeader('Cache-Control','public, max-age=60, s-maxage=900');
 if(id){if(!/^\d{1,8}$/.test(id)||!title)return res.status(400).json({error:'Invalid work'});
  const html=await get(ARCHIVE_ORIGIN+'/A4A/news/arabicmovie_watch.php?id='+id);if(!html)return res.status(502).json({source:null,error:'Work unavailable'});
  const candidates=archiveVideoCandidates(html);
  for(const video of candidates){const meta=await get('https://www.youtube.com/oembed?'+new URLSearchParams({url:'https://www.youtube.com/watch?v='+video,format:'json'}),true);const source=validateArchiveVideo(video,meta,title);if(source)return res.json({source,verified:true});}
  return res.json({source:null,verified:false});
 }
 const q=String(req.query.q||'').trim().slice(0,120);
 const html=await get(ARCHIVE_ORIGIN+'/A4A/news/arabicmovie.php?'+new URLSearchParams(page===1?{genre}:{genre,page:String(page)}));if(!html)return res.status(502).json({error:'Catalogue unavailable'});
 const data=parseArchiveCatalogue(html,genre);
 if(q)data.items=data.items.filter(x=>titleKey(x.title).includes(titleKey(q)));
 return res.json({...data,genre,page,source:'arabicArchive',partial:false});
}
