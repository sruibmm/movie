import React,{useEffect,useRef,useState,useId} from 'react';
const libs=new Map();
function loadLibrary(id){
 if(window.dailymotion?.createPlayer)return Promise.resolve(window.dailymotion);
 if(libs.has(id))return libs.get(id);
 const promise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://geo.dailymotion.com/libs/player/'+id+'.js';script.async=true;
  const timer=setTimeout(()=>{script.remove();reject(Error('SDK timeout'));},8000);
  script.onload=()=>{clearTimeout(timer);window.dailymotion?.createPlayer?resolve(window.dailymotion):reject(Error('SDK unavailable'));};
  script.onerror=()=>{clearTimeout(timer);script.remove();reject(Error('SDK failed'));};document.head.appendChild(script);
 });libs.set(id,promise);promise.catch(()=>libs.delete(id));return promise;
}
export function highestQuality(list){return (Array.isArray(list)?list:[]).map(String).filter(x=>['240','380','480','720','1080','1440','2160'].includes(x)).sort((a,b)=>Number(b)-Number(a))[0]||null;}
export default function DailymotionQualityPlayer({src,title}){
 const id='dm-'+useId().replace(/[^a-zA-Z0-9_-]/g,'');
 const [fallback,setFallback]=useState(false),[quality,setQuality]=useState('');
 const ref=useRef(null);
 useEffect(()=>{
  if(fallback)return;
  let dead=false,player=null,timer,interval,selected=false;
  const url=new URL(src),pid=url.pathname.split('/').pop().replace('.html',''),video=url.searchParams.get('video');
  function fail(){if(!dead)setFallback(true);}
  timer=setTimeout(fail,15000);
  async function choose(){
   if(dead||selected||!player)return;
   try{const state=await player.getState();if(dead||selected||state.videoId!==video)return;
    const best=highestQuality(state.videoQualitiesList);if(!best)return;
    selected=true;await player.setQuality(best);if(!dead)setQuality(best+'p');clearInterval(interval);
   }catch{selected=false;}
  }
  loadLibrary(pid).then(async dm=>{
   if(dead)return;
   const p=await dm.createPlayer(id,{player:pid,video});if(dead){p.destroy?.();return;}
   player=p;ref.current=p;clearTimeout(timer);
   for(const event of ['VIDEO_QUALITIESREADY','VIDEO_START','PLAYER_CRITICALPATHREADY']){const ev=dm.events?.[event];if(ev)player.on(ev,choose);}
   interval=setInterval(choose,800);choose();
  }).catch(fail);
  return()=>{dead=true;clearTimeout(timer);clearInterval(interval);try{player?.destroy?.();}catch{}ref.current=null;};
 },[src,id,fallback]);
 if(fallback)return <iframe title={title} src={src} className="w-full h-full border-0" allow="autoplay; encrypted-media; fullscreen; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>;
 return <div className="w-full h-full relative flex items-center justify-center"><div id={id} className="w-full max-h-full"/>{quality&&<span className="absolute top-2 left-2 bg-black/70 rounded px-2 py-1 text-xs pointer-events-none">{quality}</span>}<button type="button" onClick={()=>setFallback(true)} className="absolute bottom-2 left-2 bg-black/70 rounded px-2 py-1 text-xs">المشغّل الاحتياطي</button></div>;
}
