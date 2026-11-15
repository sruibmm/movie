import React,{useState,useEffect,useMemo} from 'react';
import bulk from './arabicBulkCatalog.json';
import {PUBLISHER_SERIES,importedEpisode} from './publisherSeries.js';
import {normalizeArabic} from './arabicDiscovery.js';
import {multiSourceSeries,multiDailymotionMovie} from './multiSourceArabic.js';
const rows=multiSourceSeries(PUBLISHER_SERIES,bulk.series);
export default function MultiSourceArabic({query='',kind='all',onPlay}){
 const [selected,setSelected]=useState(null),[season,setSeason]=useState(0),[limit,setLimit]=useState(6);
 const q=normalizeArabic(query);
 const matches=useMemo(()=>rows.filter(g=>kind!=='movie'&&(!q||normalizeArabic(g.title).includes(q))),[q,kind]);
 useEffect(()=>{setSelected(null);setLimit(6);},[q,kind]);
 const current=selected?.seasons[season];
 const count=matches.reduce((n,g)=>n+g.seasons.reduce((m,s)=>m+s.episodes.length,0),0);
 return <section dir="rtl" className="mt-5 mb-7" aria-label="أعمال بأكثر من مصدر">
 <div className="rounded-3xl border border-purple-500/30 bg-gradient-to-br from-purple-950/50 to-zinc-900 p-5">
 <p className="text-xs text-purple-300 font-bold">CINEMA · MULTI-SOURCE</p><h3 className="text-xl font-black mt-1">مسلسلات بأكثر من مصدر</h3><p className="text-sm text-gray-300 mt-2">اختر نفس الحلقة من نسختين موجودتين في مكتبتنا، بدون تكرار المسلسل. التوفر والجودة والإعلانات يتبعان الناشر.</p>
 <div className="flex gap-3 mt-3 text-xs"><span className="rounded-xl bg-white/10 p-3"><strong className="block text-lg">{matches.length}</strong>مسلسل مطابق</span><span className="rounded-xl bg-white/10 p-3"><strong className="block text-lg">{count.toLocaleString()}</strong>حلقة لها مصدران</span></div></div>
 {!matches.length&&<p className="mt-4 text-sm text-gray-400">لا توجد مسلسلات مطابقة بهذا التصنيف.</p>}
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-4">{matches.slice(0,limit).map(g=><button key={g.id} className="group text-right min-w-0" onClick={()=>{setSelected(g);setSeason(0);}}><div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 group-hover:border-purple-500"><img loading="lazy" src={g.poster||'https://i.ytimg.com/vi/'+g.seasons[0].episodes[0].youtube.video+'/hqdefault.jpg'} alt="" className="w-full h-full object-cover"/><span className="absolute bottom-2 right-2 rounded-lg bg-black/80 px-2 py-1 text-[10px]">مصدران</span></div><p className="mt-2 font-bold text-sm truncate">{g.title}</p><p className="text-xs text-gray-400">{g.year} · {g.seasons.reduce((n,s)=>n+s.episodes.length,0)} حلقة مشتركة</p></button>)}</div>
 {matches.length>limit&&<button className="mt-4 w-full rounded-xl bg-white/10 p-3 text-sm" onClick={()=>setLimit(n=>n+18)}>عرض المزيد ({matches.length-limit})</button>}
 {selected&&current&&<div className="fixed inset-0 z-[1000] bg-black/80 flex items-end md:items-center md:justify-center" onClick={()=>setSelected(null)}><section role="dialog" aria-modal="true" aria-label={selected.title} className="w-full md:max-w-2xl max-h-[90dvh] overflow-y-auto bg-zinc-900 rounded-t-3xl md:rounded-3xl p-5" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between gap-3"><h3 className="font-black text-xl">{selected.title}</h3><button aria-label="إغلاق" onClick={()=>setSelected(null)} className="rounded-full bg-white/10 w-10 h-10">×</button></div><p className="text-xs text-gray-400 mt-2">اختر مصدر الحلقة. قد يعرض كلا الناشرين إعلانات؛ لا ضمان للجودة أو التوفر الحالي.</p>{selected.seasons.length>1&&<select aria-label="الموسم" value={season} onChange={e=>setSeason(Number(e.target.value))} className="w-full bg-zinc-800 rounded-xl p-3 mt-3">{selected.seasons.map((s,i)=><option key={s.season} value={i}>الموسم {s.season}</option>)}</select>}<div className="grid gap-2 mt-4">{current.episodes.map(e=><div key={e.number} className="rounded-xl bg-white/5 p-3"><p className="font-bold text-sm mb-2">الحلقة {e.number}</p><div className="grid grid-cols-2 gap-2"><button className="rounded-lg bg-purple-700 p-3 text-xs font-bold" onClick={()=>{onPlay(importedEpisode(selected.youtube,current.youtube,e.youtube));setSelected(null);}}>▶ YouTube</button><button className="rounded-lg bg-white/10 p-3 text-xs font-bold" onClick={()=>{const m=multiDailymotionMovie(selected,current,e);if(m){onPlay(m);setSelected(null);}}}>▶ Dailymotion</button></div></div>)}</div></section></div>}
 </section>;
}
