import React,{useEffect,useState,useRef} from 'react';
import DailymotionQualityPlayer from './DailymotionQualityPlayer.jsx';
import {approvedPublisherUrl} from './arabicSiteCatalog.js';
let smartPromise;
const loadSmart=()=>smartPromise||(smartPromise=import('./smartPublisherSources.js').catch(e=>{smartPromise=null;throw e;}));
let ytPromise;
function youtubeApi(){
 if(window.YT?.Player)return Promise.resolve(window.YT);
 if(ytPromise)return ytPromise;
 ytPromise=new Promise((resolve,reject)=>{
  const old=window.onYouTubeIframeAPIReady;let timer;
  window.onYouTubeIframeAPIReady=()=>{try{old?.();}catch{}clearTimeout(timer);resolve(window.YT);};
  const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;
  script.onerror=()=>{clearTimeout(timer);ytPromise=null;reject(Error('YouTube API'));};
  timer=setTimeout(()=>{ytPromise=null;reject(Error('YouTube API timeout'));},10000);
  document.head.appendChild(script);
 });
 return ytPromise;
}
function YoutubeFrame({src,title,onError,onPlaying,onEnded}){
 const frame=useRef(null),callbacks=useRef({onError,onPlaying,onEnded});
 callbacks.current={onError,onPlaying,onEnded};
 useEffect(()=>{
  let cancelled=false,player=null;
  youtubeApi().then(YT=>{if(cancelled||!frame.current)return;player=new YT.Player(frame.current,{events:{
   onError:e=>callbacks.current.onError?.(e.data),
   onStateChange:e=>{if(e.data===YT.PlayerState.PLAYING)callbacks.current.onPlaying?.();if(e.data===YT.PlayerState.ENDED)callbacks.current.onEnded?.();}
  }});}).catch(()=>{});
  return()=>{cancelled=true;try{player?.destroy?.();}catch{}};
 },[src]);
 const url=new URL(src);url.searchParams.set('enablejsapi','1');url.searchParams.set('origin',window.location.origin);
 return <iframe ref={frame} title={title} src={url.toString()} className="w-full h-full border-0" allow="autoplay; encrypted-media; fullscreen; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>;
}
export default function PublisherPlayer({movie,mode,onBack,onNext}){
 const original={...movie.publisherSource,provider:movie.publisherSource.provider||'youtube'};
 const [sources,setSources]=useState([original]),[index,setIndex]=useState(0),[revision,setRevision]=useState(0),[next,setNext]=useState(null),[notice,setNotice]=useState(''),[playing,setPlaying]=useState(false),[ended,setEnded]=useState(false);
 const [remote,setRemote]=useState({status:'loading',embed:null});
 const source=sources[index]||original,isDM=source.provider==='dailymotion';
 const attempt=useRef(new Set()),failed=useRef(null);
 const src=isDM?((remote.id===source.id?remote.embed:null)||approvedPublisherUrl(source,movie)):approvedPublisherUrl(source,movie);
 useEffect(()=>{let dead=false;loadSmart().then(m=>{if(dead)return;setSources(m.smartPublisherSources(movie));setNext(m.nextPublisherEpisode(movie));}).catch(()=>{});return()=>{dead=true;};},[movie.id]);
 useEffect(()=>{setPlaying(false);setEnded(false);setRemote({status:'loading',embed:null});if(!isDM)return;const c=new AbortController();fetch('/api/dailymotion-player?video='+encodeURIComponent(source.id),{signal:c.signal}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{if(c.signal.aborted)return;let valid=false;try{const u=new URL(d.embed);valid=u.origin==='https://geo.dailymotion.com'&&/^\/player\/[A-Za-z0-9]{3,32}\.html$/.test(u.pathname)&&u.searchParams.get('video')===source.id&&d.video===source.id;}catch{}setRemote({id:source.id,status:valid?'configured':'unconfigured',embed:valid?d.embed:null});}).catch(()=>{if(!c.signal.aborted)setRemote({status:'error',embed:null});});return()=>c.abort();},[source.id,isDM,revision]);
 const choose=i=>{failed.current=null;setIndex(i);setRevision(x=>x+1);setNotice('');};
 const fail=()=>{attempt.current.add(source.provider+':'+source.id);failed.current=source.id;const i=sources.findIndex(s=>!attempt.current.has(s.provider+':'+s.id));if(i>=0){setNotice('تعذّر تشغيل المصدر، تم اختيار البديل تلقائياً.');setIndex(i);setRevision(x=>x+1);}else setNotice('تعذّر تشغيل المصدر. جرّب إعادة التحميل أو اختر مصدراً آخر.');};
 useEffect(()=>{if(failed.current===source.id&&sources.length>1)fail();},[sources]);
 const label=s=>s.provider==='dailymotion'?'Dailymotion':s.provider==='licensed-embed'?'مشغل الناشر':'YouTube';
 return <div className="h-[100dvh] bg-black text-white flex flex-col overflow-hidden" dir="rtl">
 <header className="shrink-0 bg-[#101014] border-b border-white/10 px-4 py-3 flex gap-3 items-center"><button onClick={onBack} className="w-10 h-10 bg-white/10 rounded-full text-xl" aria-label="رجوع">‹</button><div className="flex-1 min-w-0"><p className="font-bold truncate">{movie.title}</p><p className="text-[10px] text-gray-400 truncate">Cinema · {source.publisher||label(source)}</p></div>{playing&&<span className="text-xs text-emerald-400">● يعمل</span>}{next&&onNext&&mode!=='couples'&&<button onClick={()=>onNext(next,ended)} className="bg-purple-700 rounded-lg px-3 py-2 text-xs font-bold">الحلقة التالية ›</button>}<button onClick={()=>{attempt.current.clear();choose(index);}} className="bg-white/10 rounded-lg px-3 py-2 text-xs">إعادة تحميل ↻</button></header>
 {sources.length>1&&<div className="shrink-0 flex gap-2 px-4 py-2 bg-zinc-900 overflow-x-auto" aria-label="مصادر المشاهدة">{sources.map((s,i)=><button key={s.provider+':'+s.id} onClick={()=>{attempt.current.clear();choose(i);}} aria-pressed={i===index} className={'shrink-0 rounded-lg px-3 py-2 text-xs '+(i===index?'bg-purple-700 font-bold':'bg-white/10')}>{i+1} · {label(s)}</button>)}<span className="self-center text-xs text-gray-400 whitespace-nowrap">{sources.length} مصادر مطابقة</span></div>}
 {notice&&<p role="status" className="shrink-0 bg-amber-950/60 text-amber-200 px-4 py-2 text-xs">{notice}</p>}
 <div className="flex-1 min-h-0 grid place-items-center bg-black relative">{src?(isDM?<DailymotionQualityPlayer key={source.id+'-'+revision} src={src} title={movie.title} onPlaying={()=>setPlaying(true)} onError={fail}/>:source.provider==='youtube'&&!source.playlist?<YoutubeFrame key={source.id+'-'+revision} src={src} title={movie.title} onError={fail} onPlaying={()=>setPlaying(true)} onEnded={()=>setEnded(true)}/>:<iframe key={source.id+'-'+revision} title={movie.title} src={src} className="w-full h-full border-0" sandbox="allow-scripts allow-same-origin allow-presentation" allow="autoplay; encrypted-media; fullscreen; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>):<div className="max-w-sm mx-5 text-center p-6 rounded-2xl bg-zinc-900 border border-white/10"><h2 className="font-black text-xl">المصدر غير متاح حالياً</h2><button onClick={fail} className="w-full bg-purple-600 rounded-xl p-3 mt-5 font-bold">جرّب مصدراً آخر</button></div>}{ended&&next&&onNext&&mode!=='couples'&&<button onClick={()=>onNext(next,true)} className="absolute bottom-12 right-6 z-10 rounded-xl bg-purple-700 px-6 py-4 font-bold">▶ الحلقة التالية</button>}</div>
 <footer className="shrink-0 bg-[#101014] p-3 text-xs text-gray-400" style={{paddingBottom:'max(12px, env(safe-area-inset-bottom))'}}>المشاهدة داخل Cinema · قد تظهر إعلانات أو قيود من {label(source)} {mode==='couples'?'· مزامنة التحكم غير متاحة لهذا المشغّل.':''}</footer></div>;
}
