import React,{useEffect,useRef,useState} from 'react';
import {youtubeEmbed} from './watanLookup.js';
let apiPromise;
function loadApi(){
 if(window.YT?.Player)return Promise.resolve(window.YT);
 if(apiPromise)return apiPromise;
 apiPromise=new Promise((resolve,reject)=>{
  const previous=window.onYouTubeIframeAPIReady;
  const timeout=setTimeout(()=>reject(Error('YouTube API unavailable')),10000);
  window.onYouTubeIframeAPIReady=()=>{try{previous?.();}finally{clearTimeout(timeout);resolve(window.YT);}};
  let script=document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
  if(!script){script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;document.head.appendChild(script);}
  script.addEventListener('error',()=>{clearTimeout(timeout);reject(Error('YouTube API unavailable'));},{once:true});
 }).catch(e=>{apiPromise=null;throw e;});
 return apiPromise;
}
const clock=n=>{const t=Math.max(0,Math.floor(n||0));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0');};
export default function YouTubePublisherPlayer({video,onError,onProgress}){
 const mount=useRef(null),playerRef=useRef(null),shell=useRef(null),latest=useRef({onError,onProgress});
 const [ready,setReady]=useState(false),[playing,setPlaying]=useState(false),[time,setTime]=useState(0),[duration,setDuration]=useState(0);
 latest.current={onError,onProgress};
 useEffect(()=>{
  const host=mount.current;if(!host)return;
  let disposed=false,player=null,tick=null,failed=false;
  setReady(false);setPlaying(false);setTime(0);setDuration(0);
  const frame=document.createElement('iframe');
  frame.title=video.title||'Official publisher video';
  frame.src=youtubeEmbed(video.id)+'&origin='+encodeURIComponent(window.location.origin)+'&color=white&hl=ar&controls=1&fs=1';
  frame.className='block w-full h-full border-0';
  frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-presentation');
  frame.setAttribute('allow','autoplay; encrypted-media; fullscreen; picture-in-picture');
  frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';
  host.appendChild(frame);
  loadApi().then(YT=>{
   if(disposed||!YT?.Player)return;
   player=new YT.Player(frame,{events:{
    onError:e=>{if(!disposed&&!failed&&[2,5,100,101,150,153].includes(Number(e.data))){failed=true;latest.current.onError?.(Number(e.data));}},
    onStateChange:e=>{if(!disposed)setPlaying(e.data===YT.PlayerState.PLAYING);},
    onReady:()=>{if(disposed)return;setReady(true);tick=setInterval(()=>{try{const d=player?.getDuration?.(),t=player?.getCurrentTime?.();if(Number.isFinite(d)&&d>0&&Number.isFinite(t)&&t>=0){setTime(t);setDuration(d);latest.current.onProgress?.(t,d);}}catch{}},1000);}
   }});playerRef.current=player;
  }).catch(()=>{});
  return()=>{disposed=true;clearInterval(tick);playerRef.current=null;try{player?.destroy?.();}catch{}if(frame.parentNode===host)host.removeChild(frame);};
 },[video.id]);
 const action=fn=>{try{if(ready&&playerRef.current)fn(playerRef.current);}catch{}};
 return <div ref={shell} className="w-full h-full flex flex-col items-center justify-center bg-[#050408] min-h-0 overflow-hidden" dir="rtl">
  <div className="w-full flex-1 min-h-[200px] flex items-center justify-center bg-black">
    <div ref={mount} className="w-full h-full max-w-[1600px] bg-black min-h-[200px]"/>
  </div>
  <div className="w-full shrink-0 border-t border-white/10 bg-[#100d17] px-3 py-2 sm:px-5 flex items-center gap-3" style={{minHeight:48}}>
   <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-white truncate">{video.title||'المشاهدة الآن'}</p><p className="text-[10px] text-gray-400 truncate">{video.publisher||'الناشر الرسمي'}</p></div>
   {ready&&<div className="flex items-center gap-2 shrink-0" dir="ltr">
    <button aria-label="رجوع 10 ثوانٍ" onClick={()=>action(p=>p.seekTo(Math.max(0,p.getCurrentTime()-10),true))} className="text-xs rounded-lg bg-white/5 hover:bg-white/10 px-2 py-2 text-gray-300">↶ 10</button>
    <button aria-label={playing?'إيقاف مؤقت':'تشغيل'} onClick={()=>action(p=>playing?p.pauseVideo():p.playVideo())} className="w-9 h-9 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-sm">{playing?'Ⅱ':'▶'}</button>
    <button aria-label="تقديم 10 ثوانٍ" onClick={()=>action(p=>p.seekTo(Math.min(p.getDuration()||Infinity,p.getCurrentTime()+10),true))} className="text-xs rounded-lg bg-white/5 hover:bg-white/10 px-2 py-2 text-gray-300">10 ↷</button>
    {duration>0&&<span className="hidden sm:block text-xs text-gray-400 tabular-nums">{clock(time)} / {clock(duration)}</span>}
   </div>}
   <span className="hidden md:block text-[10px] text-gray-500 shrink-0">مشغّل الناشر · YouTube</span>
  </div>
 </div>;
}
