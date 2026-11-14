import React,{useEffect,useRef,useState,useId} from 'react';
const libs=new Map();
function loadLibrary(id){
 if(window.dailymotion?.createPlayer)return Promise.resolve(window.dailymotion);
 if(libs.has(id))return libs.get(id);
 const promise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://geo.dailymotion.com/libs/player/'+id+'.js';script.async=true;
  const timer=setTimeout(()=>{script.remove();reject(Error('SDK timeout'));},5000);
  script.onload=()=>{clearTimeout(timer);window.dailymotion?.createPlayer?resolve(window.dailymotion):reject(Error('SDK unavailable'));};
  script.onerror=()=>{clearTimeout(timer);script.remove();reject(Error('SDK failed'));};document.head.appendChild(script);
 });libs.set(id,promise);promise.catch(()=>libs.delete(id));return promise;
}
export function highestQuality(list){return (Array.isArray(list)?list:[]).map(String).filter(x=>['240','380','480','720','1080','1440','2160'].includes(x)).sort((a,b)=>Number(b)-Number(a))[0]||null;}
export default function DailymotionQualityPlayer({src,title}){
 const id='dm-'+useId().replace(/[^a-zA-Z0-9_-]/g,'');
 const [fallback,setFallback]=useState(false),[quality,setQuality]=useState(''),[started,setStarted]=useState(false);
 const host=useRef(null);
 const url=new URL(src);url.searchParams.set('autoplay','true');
 useEffect(()=>{
  if(fallback)return;
  let dead=false,player=null,watchdog,interval,stopTimer,busy=false,lastBest=null,attempts=0,playing=false,adPlaying=false,lastTime=0;
  const pid=url.pathname.split('/').pop().replace('.html',''),video=url.searchParams.get('video');
  function fail(){if(!dead)setFallback(true);}
  function markPlaying(){if(dead)return;playing=true;clearTimeout(watchdog);setStarted(true);}
  function checkStart(){if(dead||playing)return;if(adPlaying){watchdog=setTimeout(checkStart,10000);return;}fail();}
  watchdog=setTimeout(checkStart,10000);
  async function inspect(){
   if(dead||busy||!player)return;
   busy=true;
   try{
    let state=await player.getState();if(dead||state.videoId!==video)return;
    const time=Number(state.videoTime||0);if(time>lastTime+0.15)markPlaying();lastTime=time;
    const best=highestQuality(state.videoQualitiesList);if(!best)return;
    if(best!==lastBest){lastBest=best;attempts=0;}
    const actual=String(state.videoQuality||'');
    if(actual!==best&&attempts<2){attempts++;await player.setQuality(best);if(dead)return;state=await player.getState();}
    const confirmed=String(state.videoQuality||'');
    if(!dead)setQuality(confirmed===best?best+'p':'متاح حتى '+best+'p');
   }catch{}finally{busy=false;}
  }
  loadLibrary(pid).then(async dm=>{
   if(dead)return;
   const p=await dm.createPlayer(id,{player:pid,video,params:{autoplay:true}});if(dead){p.destroy?.();return;}
   player=p;
   const on=(name,fn)=>{const event=dm.events?.[name];if(event)p.on(event,fn);};
   on('VIDEO_PLAYING',markPlaying);on('VIDEO_TIMECHANGE',inspect);
   on('VIDEO_QUALITIESREADY',inspect);on('VIDEO_START',inspect);on('PLAYER_CRITICALPATHREADY',inspect);
   on('PLAYER_ERROR',fail);on('VIDEO_ERROR',fail);
   on('AD_START',()=>{adPlaying=true;});on('AD_END',()=>{adPlaying=false;});
   interval=setInterval(inspect,800);stopTimer=setTimeout(()=>clearInterval(interval),30000);inspect();
  }).catch(fail);
  return()=>{dead=true;clearTimeout(watchdog);clearInterval(interval);clearTimeout(stopTimer);try{player?.destroy?.();}catch{}};
 },[src,id,fallback]);
 // Explicit dimensions: the SDK host cannot collapse to zero height on mobile.
 return <div className="w-full h-full min-h-0 relative flex items-center justify-center bg-black" data-dm-mode={fallback?'iframe':'sdk'}>
  <div className="relative w-full overflow-hidden" style={{aspectRatio:'16 / 9',maxHeight:'100%',maxWidth:'calc(100dvh * 16 / 9)'}}>
   {fallback?<iframe title={title} src={url.toString()} className="absolute inset-0 w-full h-full border-0" allow="autoplay; encrypted-media; fullscreen; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>:<div ref={host} id={id} className="absolute inset-0 w-full h-full" style={{width:'100%',height:'100%'}}/>}
  </div>
  {!fallback&&!started&&<div className="absolute top-3 right-3 text-xs text-gray-400 pointer-events-none">جاري تشغيل الفيديو…</div>}
  {!fallback&&quality&&<span className="absolute top-3 left-3 bg-black/70 rounded px-2 py-1 text-xs pointer-events-none">{quality}</span>}
 </div>;
}
