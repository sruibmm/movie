import {WATAN_ORIGIN,slug,titleKey,parseWatanPage,verifyWatanVideo} from '../src/watanLookup.js';
import {WATAN_CATEGORIES,validSlug,parseCatalogue,parseWork} from '../src/watanCatalog.js';
async function get(url,json=false){const c=new AbortController();const t=setTimeout(()=>c.abort(),7000);try{const r=await fetch(url,{signal:c.signal,redirect:'follow',headers:{Accept:json?'application/json':'text/html','User-Agent':'CinemaCatalogueLinkResolver/1.0'}});if(!r.ok)return null;const end=new URL(r.url);if(json?end.hostname!=='www.youtube.com':!['watanflix.com','www.watanflix.com'].includes(end.hostname))return null;const body=await r.text();if(body.length>4_000_000)return null;return json?JSON.parse(body):body;}catch{return null;}finally{clearTimeout(t);}}
const pageUrl=(category,page)=>WATAN_ORIGIN+'/ar/category/'+encodeURIComponent(WATAN_CATEGORIES[category])+'?page='+page;
const workUrl=id=>WATAN_ORIGIN+'/ar/series/'+encodeURIComponent(id);
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'GET only'});
 const category=String(req.query.category||'series');if(!Object.hasOwn(WATAN_CATEGORIES,category))return res.status(400).json({error:'Unknown category'});
 const id=String(req.query.work||'');const q=String(req.query.q||'').trim().slice(0,120);const page=Math.max(1,Math.min(200,Math.floor(Number(req.query.page)||1)));
 res.setHeader('Cache-Control','public, max-age=30, s-maxage=900');
 if(id){if(!validSlug(id))return res.status(400).json({error:'Invalid work'});const html=await get(workUrl(id));if(!html)return res.status(404).json({error:'Work not available'});const work=parseWork(html,id,category);if(!work)return res.status(404).json({error:'Work not available'});
  if(req.query.play!=='1')return res.json({work});
  const episode=work.type==='tv'?Number(req.query.episode):0;if(work.type==='tv'&&(!Number.isInteger(episode)||episode<1||episode>work.episodes))return res.status(400).json({error:'Invalid episode'});
  const candidates=parseWatanPage(html,work.title,work.type,episode,1);
  for(const candidate of candidates){const meta=await get('https://www.youtube.com/oembed?'+new URLSearchParams({url:'https://www.youtube.com/watch?v='+candidate.id,format:'json'}),true);const source=verifyWatanVideo(candidate,meta,{title:work.title,type:work.type,episode,season:1});if(source)return res.json({work,source,verified:true});}
  return res.json({work,source:null,verified:false});
 }
 const html=await get(pageUrl(category,page));if(!html)return res.status(502).json({error:'Catalogue unavailable'});
 const result=parseCatalogue(html,category);
 if(q){const key=titleKey(q);result.items=result.items.filter(v=>titleKey(v.title).includes(key)||titleKey(v.slug.replace(/-/g,' ')).includes(key));const variants=[...new Set([slug(q),slug(q.replace(/ة/g,'ه')),slug(q.replace(/ه/g,'ة'))])].filter(validSlug);
  const exact=await Promise.all(variants.map(async id=>{const h=await get(workUrl(id));const w=h&&parseWork(h,id,category);return w&&titleKey(w.title)===key?w:null;}));
  const byId=new Map(result.items.map(x=>[x.slug,x]));for(const w of exact.filter(Boolean))if(!byId.has(w.slug))byId.set(w.slug,{slug:w.slug,title:w.title,category});result.items=[...byId.values()];
 }
 return res.json({...result,category,page,source:'watanflix',partial:false});
}
