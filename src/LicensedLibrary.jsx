import React,{useEffect,useState,useMemo} from 'react';
import {normalizeArabic} from './arabicDiscovery.js';
import {normalizeLicensedCatalog,licensedMovie} from './licensedCatalog.js';
export default function LicensedLibrary({query,onPlay}){
 const [titles,setTitles]=useState([]),[status,setStatus]=useState('loading'),[kind,setKind]=useState('all'),[selected,setSelected]=useState(null),[count,setCount]=useState(40);
 useEffect(()=>{const c=new AbortController();fetch('/licensed-arabic.json',{signal:c.signal}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{if(!c.signal.aborted){setTitles(normalizeLicensedCatalog(d));setStatus('ready');}}).catch(()=>{if(!c.signal.aborted)setStatus('error');});return()=>c.abort();},[]);
 useEffect(()=>{setCount(40);setSelected(null);},[query,kind]);
 const filtered=useMemo(()=>titles.filter(t=>(kind==='all'||t.kind===kind)&&(!query||normalizeArabic(t.title+' '+(t.aliases||'')).includes(normalizeArabic(query)))),[titles,query,kind]);
 const assetCount=titles.reduce((n,t)=>n+t.assets.length,0);
 if(status==='loading')return null;
 return <section dir="rtl" className="rounded-3xl border border-purple-500/20 bg-zinc-950 p-5 mb-6">
 <h2 className="text-xl font-black">Cinema Direct · المكتبة المباشرة</h2>
 <p className="text-xs text-gray-400 mt-2">{status==='error'?'تعذر تحميل المكتبة المباشرة.':titles.length?titles.length+' عمل · '+assetCount+' فيديو متاح وفق بيانات الترخيص':'لا توجد أعمال مرخّصة مضافة بعد. هذا القسم مخصص للفيديو المباشر من الناشرين دون مشغّل خارجي.'}</p>
 {!!titles.length&&<><div className="flex flex-wrap gap-2 mt-4">{[['all','الكل'],['movie','أفلام'],['tv','مسلسلات'],['play','مسرحيات']].map(([k,l])=><button key={k} onClick={()=>setKind(k)} className={'rounded-full px-3 py-2 text-xs '+(kind===k?'bg-purple-600':'bg-white/10')}>{l}</button>)}</div>
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-4">{filtered.slice(0,count).map(t=><button key={t.id} onClick={()=>setSelected(t)} className="text-right min-w-0"><div className="aspect-[2/3] rounded-xl bg-zinc-900 overflow-hidden">{t.poster?<img loading="lazy" src={t.poster} alt="" className="w-full h-full object-cover"/>:<div className="w-full h-full grid place-items-center text-3xl">🎬</div>}</div><p className="mt-2 text-sm font-bold truncate">{t.title}</p><p className="text-xs text-gray-400">{t.year||''} · {t.assets.length} فيديو</p></button>)}</div>
 {filtered.length>count&&<button onClick={()=>setCount(n=>n+40)} className="mt-4 bg-purple-700 rounded-xl px-4 py-2">تحميل المزيد</button>}
 {!filtered.length&&<p className="mt-4 text-sm text-gray-400">لا توجد نتائج مطابقة.</p>}</>}
 {selected&&<div className="fixed inset-0 z-[1000] bg-black/80 flex items-end md:items-center justify-center" onClick={()=>setSelected(null)}><section role="dialog" aria-modal="true" aria-label={selected.title} className="bg-zinc-900 rounded-2xl p-5 w-full max-w-lg max-h-[85dvh] overflow-auto" onClick={e=>e.stopPropagation()}><div className="flex justify-between"><h3 className="font-bold text-lg">{selected.title}</h3><button onClick={()=>setSelected(null)} aria-label="إغلاق">×</button></div><div className="mt-3 space-y-2">{selected.assets.map(a=><button key={a.id} onClick={()=>{try{onPlay(licensedMovie(selected,a));setSelected(null);}catch{setSelected(null);}}} className="block w-full text-right rounded-xl bg-white/10 p-3">{selected.kind==='tv'?'الموسم '+a.season+' · الحلقة '+a.episode:a.title} <span className="float-left text-purple-300">▶</span></button>)}</div></section></div>}
 </section>;
}
