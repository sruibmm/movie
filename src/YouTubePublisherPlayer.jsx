import React,{useEffect,useRef} from 'react';
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
 });
 return apiPromise;
}
export default function YouTubePublisherPlayer({video,onError,onProgress}){
 const mount=useRef(null),latest=useRef({onError,onProgress});
 latest.current={onError,onProgress};
 useEffect(()=>{
  const host=mount.current;if(!host)return;
  let disposed=false,player=null,tick=null,failed=false;
  const frame=document.createElement('iframe');
  frame.title=video.title||'Official publisher video';
  frame.src=youtubeEmbed(video.id)+'&origin='+encodeURIComponent(window.location.origin);
  frame.className='w-full h-full border-0';
  frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-presentation');
  frame.setAttribute('allow','autoplay; encrypted-media; fullscreen; picture-in-picture');
  frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';
  host.appendChild(frame);
  // The iframe works independently even when API loading is blocked.
  loadApi().then(YT=>{
   if(disposed||!YT?.Player)return;
   player=new YT.Player(frame,{events:{
    onError:e=>{if(!disposed&&!failed&&[2,5,100,101,150,153].includes(Number(e.data))){failed=true;latest.current.onError?.(Number(e.data));}},
    onReady:()=>{if(disposed)return;tick=setInterval(()=>{try{const d=player?.getDuration?.(),t=player?.getCurrentTime?.();if(Number.isFinite(d)&&d>0&&Number.isFinite(t)&&t>=0)latest.current.onProgress?.(t,d);}catch{}},5000);}
   }});
  }).catch(()=>{});
  return()=>{disposed=true;clearInterval(tick);try{player?.destroy?.();}catch{}if(frame.parentNode===host)host.removeChild(frame);};
 },[video.id]);
 return <div ref={mount} className="w-full h-full bg-black"/>;
}
