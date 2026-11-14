import React,{useEffect,useRef,useState} from 'react';
import {highestQuality,PUBLIC_DAILYMOTION_PLAYER_ID} from './dailymotionPlayer.js';
let library;
function loadLibrary(){
 if(window.dailymotion?.createPlayer)return Promise.resolve(window.dailymotion);
 if(!library)library=new Promise((resolve,reject)=>{
  const s=document.createElement('script');s.src='https://geo.dailymotion.com/libs/player/'+PUBLIC_DAILYMOTION_PLAYER_ID+'.js';s.async=true;
  s.onload=()=>{const d=window.dailymotion;if(!d?.createPlayer){reject(Error('SDK missing'));return;}Promise.resolve(d.onScriptLoaded?.()).then(()=>resolve(d),reject);};
  s.onerror=()=>reject(Error('SDK unavailable'));document.body.appendChild(s);
 }).catch(e=>{library=null;throw e;});
 return library;
}
let serial=0;
export default function DailymotionPlayer({src,video,title}){
 const host=useRef(null);const [fallback,setFallback]=useState(false);const [quality,setQuality]=useState('');
 useEffect(()=>{
  if(fallback)return;
  let alive=true,player=null,interval=null,selected=false,choosing=false;
  const el=host.current;const id='cinema-dm-'+(++serial);el.id=id;
  const playerId=new URL(src).pathname.split('/').pop().replace('.html','');
  const fail=()=>{if(alive)setFallback(true);};
  const timer=setTimeout(fail,12000);
  async function choose(){
   if(!alive||!player||selected||choosing)return;
   choosing=true;
   try{const state=await player.getState();if(state.videoId&&state.videoId!==video)return;
     const best=highestQuality(state.videoQualitiesList);if(best){await player.setQuality(best);if(alive){selected=true;setQuality(best);}}}
   catch{}finally{choosing=false;}
  }
  loadLibrary().then(d=>d.createPlayer(id,{video,player:playerId})).then(p=>{
   if(!alive){p.destroy?.();return;}player=p;clearTimeout(timer);
   const ev=window.dailymotion?.events;
   if(ev?.VIDEO_QUALITIESREADY)p.on(ev.VIDEO_QUALITIESREADY,choose);
   if(ev?.PLAYER_ERROR)p.on(ev.PLAYER_ERROR,fail);
   choose();interval=setInterval(()=>{if(selected)clearInterval(interval);else choose();},1000);
  }).catch(fail);
  return()=>{alive=false;clearTimeout(timer);clearInterval(interval);try{player?.destroy?.();}catch{}};
 },[src,video,fallback]);
 if(fallback)return <iframe title={title} src={src} className="w-full h-full border-0" allow="autoplay; fullscreen; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>;
 return <div className="w-full h-full flex flex-col justify-center"><div ref={host} className="w-full aspect-video max-h-full"/>{quality&&<span className="text-[10px] text-gray-400 text-center mt-1">الجودة المختارة: {quality}p</span>}</div>;
}
