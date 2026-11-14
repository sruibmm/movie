import React,{useEffect,useMemo,useRef,useState} from 'react';
const origin='https://movie.o-a-f-a.workers.dev';
export default function TvYouTubeFrame({src,title,onController}){
 const frame=useRef(null),requests=useRef(new Map()),seq=useRef(0);
 const [status,setStatus]=useState('loading');
 const channel=useMemo(()=>{const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');},[src]);
 const bridge=useMemo(()=>{const u=new URL(src),out=new URL('/tv-youtube-bridge.html',origin),id=u.pathname.split('/').pop(),list=u.searchParams.get('list');if(/^[A-Za-z0-9_-]{11}$/.test(id))out.searchParams.set('v',id);if(/^PL[A-Za-z0-9_-]{10,80}$/.test(list||''))out.searchParams.set('list',list);out.searchParams.set('channel',channel);return out.href;},[src,channel]);
 useEffect(()=>{let dead=false;setStatus('loading');onController(null);
  const command=(name,delta)=>new Promise(resolve=>{const target=frame.current?.contentWindow;if(dead||!target){resolve(false);return;}const requestId=String(++seq.current);const timer=setTimeout(()=>{requests.current.delete(requestId);resolve(false);},2500);requests.current.set(requestId,{resolve,timer});target.postMessage({type:'cinema-youtube:command',channel,command:name,delta,requestId},origin);});
  const onMessage=e=>{if(e.origin!==origin||e.source!==frame.current?.contentWindow||e.data?.channel!==channel)return;const d=e.data;if(d.type==='cinema-youtube:ready'){setStatus('ready');onController({seek:delta=>command('seek',delta),toggle:()=>command('toggle'),play:()=>command('play'),pause:()=>command('pause')});}else if(d.type==='cinema-youtube:ack'){const p=requests.current.get(d.requestId);if(p){clearTimeout(p.timer);requests.current.delete(d.requestId);p.resolve(d.ok===true);}}else if(d.type==='cinema-youtube:error'){setStatus('error');onController(null);}else if(d.type==='cinema-youtube:autoplay-blocked'){setStatus('autoplay');}};
  window.addEventListener('message',onMessage);
  const timeout=setTimeout(()=>setStatus(s=>s==='loading'?'timeout':s),20000);
  return()=>{dead=true;clearTimeout(timeout);window.removeEventListener('message',onMessage);for(const v of requests.current.values()){clearTimeout(v.timer);v.resolve(false);}requests.current.clear();onController(null);};
 },[channel,onController]);
 return <div className="w-full h-full relative bg-black"><iframe ref={frame} title={title} src={bridge} tabIndex={-1} data-tv-remote-managed="true" className="w-full h-full border-0" sandbox="allow-scripts allow-same-origin allow-presentation" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>{status==='timeout'&&<p className="absolute top-3 left-3 right-3 bg-zinc-900 rounded-xl p-3 text-sm text-white">تعذر الاتصال بمشغّل Cinema. جرّب إعادة تحميل الفيديو.</p>}{status==='autoplay'&&<p className="absolute top-3 left-3 right-3 bg-zinc-900 rounded-xl p-3 text-sm text-white">اضغط زر التشغيل للبدء.</p>}</div>;
}
