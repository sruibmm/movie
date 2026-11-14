import React,{useEffect,useRef,useState} from 'react';
import {youtubeEmbed} from './watanLookup.js';
let apiPromise;
function loadApi(){
 if(window.YT?.Player)return Promise.resolve(window.YT);
 if(apiPromise)return apiPromise;
 apiPromise=new Promise((resolve,reject)=>{
  const previous=window.onYouTubeIframeAPIReady;
  const timeout=setTimeout(()=>reject(Error('YouTube API unavailable')),8000);
  window.onYouTubeIframeAPIReady=()=>{try{previous?.();}finally{clearTimeout(timeout);resolve(window.YT);}};
  let script=document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
  if(!script){script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;document.head.appendChild(script);}
  script.addEventListener('error',()=>{clearTimeout(timeout);reject(Error('YouTube API unavailable'));},{once:true});
 }).catch(e=>{apiPromise=null;throw e;});
 return apiPromise;
}
const clock=n=>{const t=Math.max(0,Math.floor(n||0));return (t>=3600?Math.floor(t/3600)+':':'')+String(Math.floor(t%3600/60)).padStart(t>=3600?2:1,'0')+':'+String(t%60).padStart(2,'0');};
export default function YouTubePublisherPlayer({video,onError,onProgress}){
 const mount=useRef(null),playerRef=useRef(null),shell=useRef(null),latest=useRef({onError,onProgress});
 const [ready,setReady]=useState(false),[playing,setPlaying]=useState(false),[time,setTime]=useState(0),[duration,setDuration]=useState(0),[native,setNative]=useState(false),[muted,setMuted]=useState(false),[expanded,setExpanded]=useState(false),[loading,setLoading]=useState(true);
 latest.current={onError,onProgress};
 useEffect(()=>{
  const host=mount.current;if(!host)return;
  let disposed=false,player=null,tick=null,failed=false,frame=null,wait=null,readyTimer=null;
  setReady(false);setPlaying(false);setTime(0);setDuration(0);setLoading(true);setMuted(false);
  const src=(controls)=>youtubeEmbed(video.id)+'&origin='+encodeURIComponent(window.location.origin)+'&color=white&hl=ar&controls='+controls+'&fs=1&autoplay=1';
  const makeFrame=(controls)=>{if(disposed)return null;const f=document.createElement('iframe');f.title=video.title||'Official publisher video';f.src=src(controls);f.className='block w-full h-full border-0';f.setAttribute('sandbox','allow-scripts allow-same-origin allow-presentation');f.setAttribute('allow','autoplay; encrypted-media; fullscreen; picture-in-picture');f.allowFullscreen=true;f.referrerPolicy='strict-origin-when-cross-origin';host.appendChild(f);return f;};
  if(native){frame=makeFrame(1);setLoading(false);}
  else {
   Promise.race([loadApi(),new Promise((_,reject)=>{wait=setTimeout(()=>reject(Error('Player timeout')),3500);})]).then(YT=>{
    clearTimeout(wait);if(disposed||!YT?.Player)return;
    frame=makeFrame(0);if(!frame)return;setLoading(false);
    readyTimer=setTimeout(()=>{if(!disposed&&!failed)setNative(true);},10000);
    player=new YT.Player(frame,{events:{
     onError:e=>{if(!disposed&&!failed&&[2,5,100,101,150,153].includes(Number(e.data))){failed=true;clearTimeout(readyTimer);latest.current.onError?.(Number(e.data));}},
     onStateChange:e=>{if(!disposed)setPlaying(e.data===YT.PlayerState.PLAYING);},
     onReady:()=>{if(disposed)return;clearTimeout(readyTimer);setReady(true);tick=setInterval(()=>{try{const d=player?.getDuration?.(),t=player?.getCurrentTime?.();if(Number.isFinite(d)&&d>0&&Number.isFinite(t)&&t>=0){setTime(t);setDuration(d);latest.current.onProgress?.(t,d);}}catch{}},1000);}
    }});playerRef.current=player;
   }).catch(()=>{clearTimeout(wait);if(!disposed)setNative(true);});
  }
  return()=>{disposed=true;clearTimeout(wait);clearTimeout(readyTimer);clearInterval(tick);playerRef.current=null;try{player?.destroy?.();}catch{}if(frame?.parentNode===host)host.removeChild(frame);};
 },[video.id,native]);
 const action=fn=>{try{if(ready&&playerRef.current)fn(playerRef.current);}catch{}};
 async function fullscreen(){if(expanded){setExpanded(false);return;}if(document.fullscreenElement){await document.exitFullscreen?.().catch(()=>{});return;}try{if(shell.current?.requestFullscreen){await shell.current.requestFullscreen();return;}}catch{}setExpanded(true);}
 return <div ref={shell} className={(expanded?'fixed inset-0 z-[1200] ':'')+'w-full h-full flex flex-col items-center justify-center bg-[#050408] min-h-0 overflow-hidden'} dir="rtl">
  <div className="w-full flex-1 min-h-[200px] flex items-center justify-center bg-black relative">
    {loading&&<div className="text-sm text-gray-400 flex items-center gap-2"><span className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"/>جاري تهيئة السينما…</div>}
    <div ref={mount} className={(loading?'absolute opacity-0 pointer-events-none ':'')+'w-full h-full max-w-[1600px] bg-black min-h-[200px]'}/>
  </div>
  <div className="w-full shrink-0 border-t border-white/10 bg-gradient-to-b from-[#16121f] to-[#0c0a11] px-3 py-2 sm:px-5">
   {!native&&ready&&duration>0&&<div className="flex items-center gap-2 mb-2" dir="ltr"><span className="text-[10px] text-gray-400 tabular-nums">{clock(time)}</span><input type="range" aria-label="موضع المشاهدة" min={0} max={duration} step={1} value={Math.min(time,duration)} onChange={e=>{const t=Number(e.target.value);setTime(t);action(p=>p.seekTo(t,true));}} className="w-full h-1.5 accent-purple-500"/><span className="text-[10px] text-gray-400 tabular-nums">{clock(duration)}</span></div>}
   <div className="flex items-center gap-2 sm:gap-3">
    <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-white truncate">{video.title||'المشاهدة الآن'}</p><p className="text-[10px] text-gray-400 truncate">{video.publisher||'الناشر الرسمي'}</p></div>
    {!native&&ready&&<div className="flex items-center gap-1.5 shrink-0" dir="ltr">
     <button aria-label="رجوع 10 ثوانٍ" onClick={()=>action(p=>p.seekTo(Math.max(0,p.getCurrentTime()-10),true))} className="text-[11px] rounded-lg bg-white/5 hover:bg-white/10 px-2 py-2 text-gray-300">↶10</button>
     <button aria-label={playing?'إيقاف مؤقت':'تشغيل'} onClick={()=>action(p=>playing?p.pauseVideo():p.playVideo())} className="w-9 h-9 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-sm">{playing?'Ⅱ':'▶'}</button>
     <button aria-label="تقديم 10 ثوانٍ" onClick={()=>action(p=>p.seekTo(Math.min(p.getDuration()||Infinity,p.getCurrentTime()+10),true))} className="text-[11px] rounded-lg bg-white/5 hover:bg-white/10 px-2 py-2 text-gray-300">10↷</button>
     <button aria-label={muted?'إلغاء كتم الصوت':'كتم الصوت'} onClick={()=>action(p=>{muted?p.unMute():p.mute();setMuted(!muted);})} className="rounded-lg bg-white/5 p-2 text-xs">{muted?'🔇':'🔊'}</button>
    </div>}
    <button aria-label="ملء الشاشة" onClick={fullscreen} className="rounded-lg bg-white/5 p-2 text-xs shrink-0">{expanded?'✕':'⛶'}</button>
    <button aria-label="تبديل نمط التحكم" title="تبديل نمط التحكم" onClick={()=>setNative(v=>!v)} className="rounded-lg bg-white/5 px-2 py-2 text-[10px] shrink-0">{native?'سينما':'⚙'}</button>
   </div>
  </div>
 </div>;
}
