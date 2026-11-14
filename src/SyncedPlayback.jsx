import React,{useEffect,useMemo,useRef,useState,useCallback} from 'react';
import {resolveUrl,filterCandidates} from './syncedPlaybackModel.js';
export default function SyncedPlayback({movie,PlayerComponent,onBack,onProgressUpdate,...props}){
 const [state,setState]=useState({status:'loading',list:[],index:0}),[retry,setRetry]=useState(0);
 const resume=useRef(0),failed=useRef(new Set());
 useEffect(()=>{
  const c=new AbortController();const timeout=setTimeout(()=>c.abort(),12000);
  setState({status:'loading',list:[],index:0});failed.current.clear();
  Promise.resolve().then(()=>fetch(resolveUrl(movie.sourceSync),{signal:c.signal,cache:'no-store'})).then(r=>{if(!r.ok)throw Error('lookup failed');return r.json();}).then(data=>{if(!c.signal.aborted){const list=filterCandidates(data);setState({status:list.length?'ready':'empty',list,index:0});}}).catch(()=>{if(!c.signal.aborted||!disposed)setState({status:'error',list:[],index:0});}).finally(()=>clearTimeout(timeout));
  let disposed=false;
  return()=>{disposed=true;clearTimeout(timeout);c.abort();};
 },[movie.id,retry]);
 const candidate=state.list[state.index];
 const selected=useMemo(()=>candidate?{...movie,licensedSource:{stream_url:candidate.url,type:candidate.format,rights:candidate.rights,subtitles:[]}}:null,[movie,candidate]);
 const onFailure=useCallback(({time,duration})=>{
  if(!candidate||failed.current.has(candidate.id))return;
  failed.current.add(candidate.id);
  if(Number.isFinite(time)&&time>0){resume.current=time;if(Number.isFinite(duration)&&duration>0)onProgressUpdate?.(Math.min(100,time/duration*100));}
  setState(s=>s.index+1<s.list.length?{...s,index:s.index+1}:{...s,status:'exhausted',index:s.list.length});
 },[candidate,onProgressUpdate]);
 if(state.status==='ready'&&selected)return <PlayerComponent key={candidate.id} {...props} movie={selected} onBack={onBack} onProgressUpdate={onProgressUpdate} onNativeFailure={onFailure} initialResumeSeconds={resume.current}/>;
 return <div dir="rtl" className="h-[100dvh] bg-black text-white grid place-items-center p-6" data-synced-playback-state={state.status}><section className="max-w-sm w-full bg-zinc-900 rounded-3xl p-6 border border-white/10 text-center"><h2 className="font-black text-xl">{movie.title}</h2><p role="status" className="text-sm text-gray-300 mt-3">{state.status==='loading'?'جاري اختيار أفضل مصدر للحلقة…':state.status==='empty'?'لا يوجد فيديو مباشر معتمد ومتاح لهذه الحلقة.':state.status==='exhausted'?'تعذر تشغيل كل النسخ المطابقة. لن نستبدل الحلقة بفيديو آخر.':'تعذر الاتصال بمصدر الفيديو.'}</p>{state.status!=='loading'&&<button className="w-full rounded-xl bg-purple-600 p-3 mt-5" onClick={()=>setRetry(n=>n+1)}>إعادة المحاولة</button>}<button className="w-full rounded-xl bg-white/10 p-3 mt-3" onClick={onBack}>العودة للمكتبة</button></section></div>;
}
