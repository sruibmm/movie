import React,{useEffect,useState,useRef} from 'react';
import {enrichWork} from './privateMetadata.js';
import {PRIVATE_ACTIVE_KEY,validatePrivateCatalog,privateMovie} from './privateCatalog.js';
const TOKEN='cinema_private_session';
const getToken=()=>{try{return sessionStorage.getItem(TOKEN)||''}catch{return ''}};
async function api(token,route,params={},method='GET',signal){
 const q=new URLSearchParams(params);const r=await fetch('/api/private-catalog/'+route+(q.size?'?'+q:''),{method,headers:{Authorization:'Bearer '+token},cache:'no-store',signal});
 if(!r.ok)throw Error(r.status===401?'مفتاح المكتبة غير صحيح':r.status===503?'المكتبة التلقائية غير مفعّلة على Cloudflare بعد':'تعذر الاتصال بالمكتبة');
 return r.json();
}
function Artwork({src,alt='',className=''}){const [bad,setBad]=useState(false);useEffect(()=>setBad(false),[src]);return src&&!bad?<img src={src} alt={alt} loading="lazy" decoding="async" onError={()=>setBad(true)} className={className}/>:<div className={'bg-zinc-800 grid place-items-center text-zinc-500 '+className} aria-label="لا توجد صورة">🎬</div>}
export default function AutoLibrary({query='',onPlay,options}){
 const [token,setToken]=useState(getToken),[draft,setDraft]=useState(''),[rows,setRows]=useState([]),[cursor,setCursor]=useState(null),[kind,setKind]=useState('all'),[error,setError]=useState(''),[busy,setBusy]=useState(false),[selected,setSelected]=useState(null),[stats,setStats]=useState(null),[revision,setRevision]=useState(0),[season,setSeason]=useState('all');
 const seq=useRef(0);
 function connect(e){e.preventDefault();const v=draft.trim();if(v.length<32){setError('المفتاح يجب أن يكون 32 حرفًا على الأقل');return;}sessionStorage.setItem(TOKEN,v);setToken(v);setDraft('');setError('');}
 function disconnect(){sessionStorage.removeItem(TOKEN);setToken('');setRows([]);setStats(null);setSelected(null);setError('');}
 async function load(next='',append=false,signal){
  if(!token)return;const id=++seq.current;setBusy(true);setError('');
  try{const data=await api(token,'list',{q:query,kind,cursor:next},'GET',signal);if(id!==seq.current)return;
   setRows(old=>append?[...new Map([...old,...data.titles].map(t=>[t.id,t])).values()]:data.titles);setCursor(data.next);
  }catch(e){if(id===seq.current&&!signal?.aborted)setError(e.message);}finally{if(id===seq.current)setBusy(false);}
 }
 useEffect(()=>{const c=new AbortController();setSelected(null);setCursor(null);setRows([]);if(token)load('',false,c.signal);return()=>{seq.current++;c.abort();}},[token,query,kind,revision]);
 useEffect(()=>{if(!token)return;let live=true;const check=()=>api(token,'status').then(s=>{if(live)setStats(s)}).catch(()=>{});check();const t=setInterval(check,30000);return()=>{live=false;clearInterval(t);};},[token]);
 useEffect(()=>{if(!token||rows.length>40||busy||error||selected)return;const t=setTimeout(()=>setRevision(v=>v+1),rows.length?120000:30000);return()=>clearTimeout(t);},[token,rows.length,busy,error,selected,revision]);
 async function refresh(){setBusy(true);setError('');try{await api(token,'sync',{},'POST');setStats(await api(token,'status'));setRevision(v=>v+1);}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function open(t){setBusy(true);setError('');try{const x=await api(token,'work',{id:t.id});const full=validatePrivateCatalog({version:1,titles:[x]}).titles[0];setSelected(full);setSeason('all');enrichWork(full,options).then(enriched=>setSelected(current=>current?.id===full.id?enriched:current));}catch(e){setError(e.message);}finally{setBusy(false);}}
 function play(a){try{sessionStorage.setItem(PRIVATE_ACTIVE_KEY,JSON.stringify(selected));onPlay(privateMovie(selected,a));setSelected(null);}catch(e){setError(e.message);}}
 const history=(()=>{try{return JSON.parse(localStorage.getItem('cinema_history')||'[]')}catch{return []}})();
 const resume=selected?.assets.map(a=>({a,h:history.find(x=>x.movieId==='private:'+a.id)})).filter(x=>x.h).sort((a,b)=>b.h.lastWatched-a.h.lastWatched)[0];
 const resumeAsset=resume?(resume.h.progress>=95?(selected.assets.find(a=>a.season===resume.a.season&&a.episode===resume.a.episode+1)||resume.a):resume.a):selected?.assets[0];
 const seasons=selected?[...new Set(selected.assets.map(a=>a.season))]:[];
 return <section dir="rtl" className="rounded-3xl border border-violet-500/30 bg-zinc-950 p-4 md:p-6 mb-6 text-white">
  <div className="flex justify-between items-start gap-3"><div><p className="text-xs font-bold text-violet-400">CINEMA AUTO</p><h2 className="text-xl font-black mt-1">مكتبتنا المتجددة تلقائيًا</h2><p className="text-xs text-zinc-400 mt-1">أفلام ومسلسلات · صور وقصص وحلقات · تشغيل داخل Cinema</p></div>{token&&<button onClick={disconnect} className="text-xs rounded-lg bg-white/10 p-2">قفل</button>}</div>
  {!token?<form onSubmit={connect} className="flex flex-wrap gap-2 mt-4"><input aria-label="مفتاح المكتبة الخاصة" type="password" value={draft} onChange={e=>setDraft(e.target.value)} placeholder="مفتاح المكتبة الخاصة" autoComplete="off" className="min-w-0 flex-1 bg-zinc-900 border border-white/10 rounded-xl p-3 text-sm"/><button className="bg-violet-600 rounded-xl px-4 font-bold text-sm">فتح المكتبة</button></form>:<>
   <div className="flex flex-wrap items-center gap-2 mt-4">{[['all','الكل'],['tv','مسلسلات'],['movie','أفلام'],['play','مسرحيات']].map(([v,l])=><button key={v} onClick={()=>setKind(v)} className={'rounded-full px-3 py-2 text-xs '+(kind===v?'bg-violet-600':'bg-white/10')}>{l}</button>)}<button disabled={busy} onClick={refresh} className="rounded-full px-3 py-2 text-xs border border-violet-500/40 text-violet-300 disabled:opacity-40">تحديث الآن</button></div>
   {stats&&<p className="mt-3 text-xs text-zinc-400">{stats.at?'آخر دفعة: '+new Date(stats.at).toLocaleString('ar-KW'):'المزامنة لم تبدأ بعد'} · {stats.processed||0} مهمة ناجحة · {stats.failed||0} تعذر فحصها في آخر دفعة</p>}
   <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">{rows.map(t=><button key={t.id} disabled={busy} onClick={()=>open(t)} className="text-right min-w-0 group"><div className="relative overflow-hidden rounded-2xl aspect-[2/3] bg-zinc-900"><Artwork src={t.poster||t.banner} alt={t.title} className="h-full w-full object-cover"/><span className="absolute bottom-2 right-2 bg-black/80 text-xs px-2 py-1 rounded-lg">{t.kind==='tv'?t.count+' حلقة':t.kind==='movie'?'فيلم':'مسرحية'}</span></div><h3 className="text-sm font-bold truncate mt-2 group-hover:text-violet-300">{t.title}</h3><p className="text-xs text-zinc-400">{t.year||'Cinema Direct'}</p></button>)}</div>
   {busy&&<p role="status" className="text-sm text-zinc-400 py-3">جاري التحميل…</p>}
   {!busy&&!rows.length&&!error&&<p className="text-sm text-zinc-400 mt-3">لا توجد أعمال مكتملة مطابقة الآن. ستظهر الأعمال تلقائيًا بعد فحصها.</p>}
   {cursor&&<button disabled={busy} onClick={()=>load(cursor,true)} className="mt-4 w-full rounded-xl bg-white/10 p-3 text-sm">عرض المزيد</button>}
  </>}
  {error&&<p role="alert" className="mt-3 text-sm text-amber-300">{error}</p>}
  {selected&&<div role="dialog" aria-modal="true" aria-label={selected.title} className="fixed inset-0 z-[4000] bg-black/80 flex items-end md:items-center justify-center" onClick={()=>setSelected(null)}>
   <section className="bg-zinc-950 w-full max-w-3xl rounded-t-3xl md:rounded-3xl max-h-[92dvh] overflow-y-auto border border-white/10" onClick={e=>e.stopPropagation()}>
    <div className="relative aspect-video overflow-hidden bg-zinc-900"><Artwork src={selected.banner||selected.poster} alt="" className={'w-full h-full object-cover '+(!selected.banner?'blur-sm scale-110':'')}/><div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-black/30 to-transparent"/><button aria-label="إغلاق" onClick={()=>setSelected(null)} className="absolute top-4 left-4 rounded-full bg-black/70 w-10 h-10 text-xl">×</button><div className="absolute bottom-4 right-4 left-4 flex items-end gap-4"><Artwork src={selected.poster} alt="" className="w-20 sm:w-28 aspect-[2/3] object-cover rounded-xl shrink-0"/><div className="min-w-0"><h2 className="text-xl sm:text-3xl font-black">{selected.title}</h2><p className="text-xs text-zinc-300 mt-2">{[selected.year,selected.kind==='tv'?selected.assets.length+' حلقة':selected.kind==='movie'?'فيلم':'مسرحية',...selected.genres].filter(Boolean).join(' · ')}</p></div></div></div>
    <div className="px-4 md:px-6 pb-6"><p className="text-sm leading-7 text-zinc-300 my-4">{selected.story||'لا يوجد ملخص منشور لهذا العمل بعد.'}</p><button onClick={()=>play(resumeAsset)} className="w-full bg-violet-600 rounded-xl py-3 font-bold">▶ {resume&&resume.h.progress<95?'استكمال المشاهدة':resume&&selected.kind==='tv'?'شاهد الحلقة '+resumeAsset.episode:selected.kind==='tv'?'شاهد الحلقة الأولى':'شاهد الآن'}</button>
    {selected.kind==='tv'&&<><div className="flex justify-between items-center mt-6 mb-3"><h3 className="font-bold">الحلقات</h3>{seasons.length>1&&<select value={season} onChange={e=>setSeason(e.target.value)} className="bg-zinc-900 rounded-lg p-2 text-sm"><option value="all">كل المواسم</option>{seasons.map(n=><option key={n} value={n}>الموسم {n}</option>)}</select>}</div><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{selected.assets.filter(a=>season==='all'||Number(season)===a.season).map(a=><button key={a.id} onClick={()=>play(a)} className="flex items-center gap-3 text-right bg-white/5 hover:bg-white/10 rounded-xl p-2"><div className="relative w-28 aspect-video shrink-0 rounded-lg overflow-hidden"><Artwork src={a.thumbnail||selected.banner||selected.poster} className="h-full w-full object-cover"/><span className="absolute inset-0 grid place-items-center bg-black/20">▶</span></div><div className="min-w-0"><p className="font-bold text-sm">الحلقة {a.episode}</p><p className="text-xs text-zinc-400">الموسم {a.season}{a.duration?' · '+Math.round(a.duration/60)+' د':''}</p>{history.some(h=>h.movieId==='private:'+a.id&&h.progress>=95)&&<span className="text-xs text-violet-300">تمت المشاهدة</span>}{a.story&&<p className="text-xs text-zinc-400 truncate mt-1">{a.story}</p>}</div></button>)}</div></>}
    </div>
   </section>
  </div>}
 </section>;
}
