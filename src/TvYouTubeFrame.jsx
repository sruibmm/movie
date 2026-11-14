import React,{useEffect,useRef} from 'react';
let pending;
function loadYT(){
 if(window.YT?.Player)return Promise.resolve(window.YT);
 if(pending)return pending;
 pending=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;
  const prior=window.onYouTubeIframeAPIReady;
  const timer=setTimeout(()=>reject(Error('YouTube control API unavailable')),7000);
  window.onYouTubeIframeAPIReady=()=>{clearTimeout(timer);try{prior?.();}catch{}resolve(window.YT);};
  script.onerror=()=>{clearTimeout(timer);reject(Error('YouTube control API failed'));};document.head.appendChild(script);
 });
 pending.catch(()=>{pending=null;});return pending;
}
export default function TvYouTubeFrame({src,title,onController}){
 const frame=useRef(null);let url=new URL(src);url.searchParams.set('enablejsapi','1');url.searchParams.set('autoplay','1');if(/^https?:$/.test(location.protocol))url.searchParams.set('origin',location.origin);
 useEffect(()=>{let dead=false,player=null;onController(null);
  loadYT().then(YT=>{if(dead||!frame.current)return;player=new YT.Player(frame.current,{events:{onReady:e=>{if(dead)return;const p=e.target;onController({
    seek:async delta=>{const t=p.getCurrentTime(),d=p.getDuration();if(!Number.isFinite(t)||!Number.isFinite(d)||d<=0)return false;p.seekTo(Math.max(0,Math.min(d,t+delta)),true);return true;},
    toggle:async()=>{if(p.getPlayerState()===1)p.pauseVideo();else p.playVideo();return true;},
    play:()=>p.playVideo(),pause:()=>p.pauseVideo()
  });},onError:()=>{if(!dead)onController(null);}}});}).catch(()=>{if(!dead)onController(null);});
  return()=>{dead=true;try{player?.destroy?.();}catch{}};
 },[src,onController]);
 return <iframe ref={frame} title={title} src={url.toString()} tabIndex={-1} data-tv-remote-managed="true" className="w-full h-full border-0" sandbox="allow-scripts allow-same-origin allow-presentation" allow="autoplay; encrypted-media; fullscreen; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>;
}
