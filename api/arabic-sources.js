import {PUBLISHERS,matchPublisherVideo} from '../src/arabicSources.js';
const endpoint='https://www.googleapis.com/youtube/v3/';
async function yt(path,params,key){const u=new URL(path,endpoint);for(const [k,v] of Object.entries({...params,key}))u.searchParams.set(k,String(v));const c=new AbortController();const timer=setTimeout(()=>c.abort(),5500);try{const r=await fetch(u,{signal:c.signal});if(!r.ok)throw Error('Publisher API '+r.status);return r.json();}finally{clearTimeout(timer);}}
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'GET only'});
 const title=String(req.query.title||'').trim().slice(0,120);
 const type=req.query.type==='tv'?'tv':'movie';const season=Number(req.query.season)||1,episode=Number(req.query.episode)||0;
 if(!title||(type==='tv'&&(!Number.isInteger(episode)||episode<1||!Number.isInteger(season)||season<1)))return res.status(400).json({error:'Invalid title or episode'});
 const key=process.env.YOUTUBE_DATA_API_KEY;
 if(!key)return res.status(200).json({configured:false,items:[],publishers:PUBLISHERS.map(p=>({name:p.name,url:p.url}))});
 const query={title,type,season,episode,year:Number(req.query.year)||0,runtime:Number(req.query.runtime)||0};
 res.setHeader('Cache-Control','public, max-age=60, s-maxage=3600');
 try{
  const q=title+(type==='tv'?' الحلقة '+episode:' كامل');
  const searches=await Promise.allSettled(PUBLISHERS.map(p=>yt('search',{part:'snippet',type:'video',q,channelId:p.id,maxResults:15,videoEmbeddable:'true',videoDuration:type==='tv'?'any':'long',regionCode:'KW',relevanceLanguage:'ar'},key)));
  const ok=searches.filter(x=>x.status==='fulfilled');
  if(!ok.length)return res.status(502).json({configured:true,items:[],error:'Publisher search temporarily unavailable'});
  const ids=[...new Set(ok.flatMap(x=>(x.value.items||[]).map(v=>v.id?.videoId)).filter(x=>/^[-_A-Za-z0-9]{11}$/.test(x||'')))];
  if(!ids.length)return res.json({configured:true,items:[],partial:ok.length!==PUBLISHERS.length});
  const videos=await yt('videos',{part:'snippet,contentDetails,status',id:ids.slice(0,50).join(',')},key);
  const items=(videos.items||[]).map(v=>matchPublisherVideo(v,query)).filter(Boolean).sort((a,b)=>Math.abs(a.duration-query.runtime*60)-Math.abs(b.duration-query.runtime*60)).slice(0,8);
  return res.json({configured:true,items,partial:ok.length!==PUBLISHERS.length});
 }catch{return res.status(502).json({configured:true,items:[],error:'Publisher lookup temporarily unavailable'});}
}
