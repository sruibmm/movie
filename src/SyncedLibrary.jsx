import {tvEnabled} from './tvCatalogCache.js';
import React,{useEffect,useState} from 'react';
import {normalizeArabic} from './arabicDiscovery.js';
import {syncedMovie,validSyncedTitle} from './syncedPlaybackModel.js';
export default function SyncedLibrary({query='',onPlay}){
 const [titles,setTitles]=useState([]),[selected,setSelected]=useState(null),[limit,setLimit]=useState(()=>tvEnabled()?12:40);
 useEffect(()=>{const c=new AbortController();fetch('/api/source-sync/catalog',{signal:c.signal,cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(d=>{if(!c.signal.aborted)setTitles(Array.isArray(d.titles)?d.titles.filter(validSyncedTitle):[])}).catch(()=>{});return()=>c.abort();},[]);
 useEffect(()=>{setLimit(tvEnabled()?12:40);setSelected(null);},[query]);
 const filtered=titles.filter(t=>!query||normalizeArabic(t.title).includes(normalizeArabic(query)));
 if(!filtered.length)return null;
 return <section dir="rtl" className="mb-6 rounded-3xl border border-purple-500/25 p-5 bg-zinc-950" data-synced-library>
  <h2 className="font-black text-xl">Cinema Direct · المحتوى المتجدد</h2><p className="text-xs text-gray-400 mt-2">{filtered.length} عمل · فيديو مباشر من مصادر معتمدة</p>
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">{filtered.slice(0,limit).map(t=><button key={t.work} onClick={()=>t.kind==='tv'?setSelected(t):onPlay(syncedMovie(t,t.episodes[0]))} className="text-right rounded-2xl bg-zinc-900 border border-white/10 p-4"><p className="text-purple-300 text-xs">▶ Cinema Direct</p><p className="font-bold mt-2">{t.title}</p><p className="text-xs text-gray-400 mt-1">{t.year||''} · {t.episodes.length} فيديو</p></button>)}</div>
  {filtered.length>limit&&<button onClick={()=>setLimit(n=>n+(tvEnabled()?12:40))} className="mt-3 rounded-xl bg-white/10 p-3 w-full">عرض المزيد</button>}
  {selected&&<div role="dialog" aria-modal="true" aria-label={selected.title} className="fixed inset-0 z-[3000] bg-black/80 flex items-end md:items-center justify-center" onClick={()=>setSelected(null)}><section className="w-full max-w-lg bg-zinc-900 rounded-2xl p-5 max-h-[85dvh] overflow-auto" onClick={e=>e.stopPropagation()}><div className="flex justify-between"><h3 className="font-bold text-lg">{selected.title}</h3><button onClick={()=>setSelected(null)} aria-label="إغلاق">×</button></div><div className="grid grid-cols-2 gap-2 mt-4">{[...selected.episodes].sort((a,b)=>a.season-b.season||a.episode-b.episode).map(e=><button key={e.season+':'+e.episode} onClick={()=>{onPlay(syncedMovie(selected,e));setSelected(null);}} className="p-3 rounded-xl bg-white/10 text-sm">الموسم {e.season} · الحلقة {e.episode}</button>)}</div></section></div>}
 </section>;
}
