import {WATAN_ORIGIN,slug,cataloguePages,parseWatanPage,verifyWatanVideo} from '../src/watanLookup.js';
async function get(url,ms=5500,json=false){const c=new AbortController();const t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{signal:c.signal,redirect:'follow',headers:{Accept:json?'application/json':'text/html','User-Agent':'CinemaCatalogueLinkResolver/1.0'}});if(!r.ok)return null;const end=new URL(r.url);if(json?end.hostname!=='www.youtube.com':!['watanflix.com','www.watanflix.com'].includes(end.hostname))return null;const body=await r.text();if(body.length>4_000_000)return null;return json?JSON.parse(body):body;}catch{return null;}finally{clearTimeout(t);}}
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'GET only'});
 const title=String(req.query.title||'').trim().slice(0,120),type=req.query.type==='tv'?'tv':'movie',episode=Number(req.query.episode)||0,season=Number(req.query.season)||1;
 if(!title||!slug(title)||(type==='tv'&&(!Number.isInteger(episode)||episode<1||!Number.isInteger(season)||season<1)))return res.status(400).json({error:'Invalid title'});
 const query={title,type,episode,season};
 res.setHeader('Cache-Control','public, max-age=60, s-maxage=3600');
 const variants=[slug(title),slug(title.replace(/ة/g,'ه')),slug(title.replace(/ه/g,'ة'))].filter(Boolean);
 const urls=[...new Set(variants)].slice(0,3).map(s=>WATAN_ORIGIN+'/series/'+encodeURIComponent(s));
 const checked=new Set();let items=[],reachable=false;
 async function tryPages(pages){
  for(const page of pages){if(checked.has(page))continue;checked.add(page);const html=await get(page);if(!html)continue;reachable=true;const candidates=parseWatanPage(html,title,type,episode,season);
   for(const candidate of candidates){const o='https://www.youtube.com/oembed?'+new URLSearchParams({url:'https://www.youtube.com/watch?v='+candidate.id,format:'json'});const meta=await get(o,4500,true);const match=verifyWatanVideo(candidate,meta,query);if(match){items.push(match);return;}}
  }
 }
 await tryPages(urls);
 if(!items.length){const lists=type==='tv'?['/ar/home','/ar/category/'+encodeURIComponent('مسلسلات')]:['/ar/category/'+encodeURIComponent('الأفلام'),'/ar/category/'+encodeURIComponent('مسرحيات')];const pages=await Promise.all(lists.map(x=>get(WATAN_ORIGIN+x)));await tryPages([...new Set(pages.filter(Boolean).flatMap(p=>cataloguePages(p,title)))].slice(0,3));}
 return res.status(200).json({items,source:'watanflix',reachable,verified:items.length>0});
}
