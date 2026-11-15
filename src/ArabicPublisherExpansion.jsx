import React,{useState,useEffect,useMemo} from 'react';
import data from './arabicPublisherExpansion.json';
import {normalizeArabic} from './arabicDiscovery.js';
import {expansionMovie} from './arabicPublisherExpansion.js';
const seasons=data.series;
const grouped=[...new Set(seasons.map(s=>s.tmdbId))].map(id=>{const rows=seasons.filter(s=>s.tmdbId===id).sort((a,b)=>a.season-b.season);return {...rows[0],seasons:rows};});
export default function ArabicPublisherExpansion({query='',onPlay}){
 const [opened,setOpened]=useState(false),[consent,setConsent]=useState(false),[kind,setKind]=useState('all'),[limit,setLimit]=useState(18),[selected,setSelected]=useState(null),[season,setSeason]=useState(0);
 const q=normalizeArabic(query);
 const rows=useMemo(()=>[...(kind==='tv'?[]:data.films),...(kind==='movie'?[]:grouped)].filter(w=>!q||normalizeArabic(w.title+' '+(w.raw||'')).includes(q)),[kind,q]);
 useEffect(()=>{setLimit(18);setSelected(null);},[kind,q]);
 const current=selected?.seasons[season];
 if(q&&!rows.length)return null;
 return <section dir="rtl" className="my-5 rounded-3xl border border-purple-500/30 bg-zinc-900 p-4">
 <button className="w-full text-right" onClick={()=>setOpened(v=>!v)} aria-expanded={opened}><p className="text-purple-300 text-xs font-bold">CINEMA · NEW RELEASES</p><h2 className="text-xl font-black mt-1">إضافات الناشرين الجديدة</h2><p className="text-sm text-gray-300 mt-2">{data.films.length} فيلم · {grouped.length} مسلسلات · {seasons.length} مواسم · {seasons.reduce((n,s)=>n+s.episodes.length,0)} حلقة</p><p className="text-xs text-amber-200 mt-2">معاينة اختيارية · روابط الناشرين · قد تظهر إعلانات</p></button>
 {(opened||q)&&<><p className="text-xs text-gray-300 mt-3">طابقت الأفلام مع بيانات المدة والعنوان، والمواسم مع عدد الحلقات. التشغيل والجودة على جهازك غير مضمونين؛ هذه الدفعة ليست ضمن المكتبة الخالية من الإعلانات.</p>
 {!consent?<button onClick={()=>setConsent(true)} className="mt-4 w-full rounded-xl bg-purple-700 p-3 font-bold">عرض البوسترات والمشاهدة — أوافق على احتمال الإعلانات</button>:<>
 <div className="flex gap-2 mt-4">{[['all','الكل'],['movie','أفلام'],['tv','مسلسلات']].map(([k,label])=><button key={k} className={'px-4 py-2 rounded-full '+(k===kind?'bg-purple-700':'bg-white/10')} onClick={()=>setKind(k)}>{label}</button>)}</div>
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-4">{rows.slice(0,limit).map(w=><button key={w.id} className="text-right min-w-0" onClick={()=>{if(w.seasons){setSelected(w);setSeason(0);}else onPlay(expansionMovie(w,null,true));}}><div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-zinc-800"><img loading="lazy" decoding="async" src={w.poster} alt={w.title} className="w-full h-full object-cover"/><span className="absolute bottom-2 right-2 bg-black/80 rounded px-2 py-1 text-xs">{w.seasons?'مسلسل':'فيلم'}</span></div><p className="font-bold text-sm truncate mt-2">{w.title}</p><p className="text-xs text-gray-400">{w.year}{w.seasons?' · '+w.seasons.length+' موسم':''}</p></button>)}</div>
 {rows.length>limit&&<button onClick={()=>setLimit(n=>n+18)} className="w-full mt-3 rounded-xl bg-white/10 p-3">عرض المزيد ({rows.length-limit})</button>}
 {selected&&current&&<div className="fixed inset-0 bg-black/80 z-[1000] flex items-end md:items-center justify-center" onClick={()=>setSelected(null)}><section role="dialog" aria-modal="true" aria-label={selected.title} className="w-full md:max-w-2xl max-h-[90dvh] overflow-auto rounded-3xl bg-zinc-900 p-5" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between"><h3 className="text-xl font-bold">{selected.title}</h3><button className="rounded-full bg-white/10 w-10 h-10" aria-label="إغلاق" onClick={()=>setSelected(null)}>×</button></div><select aria-label="الموسم" value={season} onChange={e=>setSeason(Number(e.target.value))} className="w-full rounded-xl bg-zinc-800 p-3 mt-4">{selected.seasons.map((s,i)=><option key={s.id} value={i}>الموسم {s.season} · {s.expected} حلقة</option>)}</select><div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">{current.episodes.map(e=><button key={e.id} className="rounded-xl overflow-hidden bg-white/5 text-right" onClick={()=>{onPlay(expansionMovie(current,e,true));setSelected(null);}}><img loading="lazy" src={current.provider==='dailymotion'?'https://www.dailymotion.com/thumbnail/video/'+e.id:'https://i.ytimg.com/vi/'+e.id+'/mqdefault.jpg'} alt="" className="w-full aspect-video object-cover"/><p className="p-3 text-sm">الحلقة {e.number}</p></button>)}</div></section></div>}
 </>}</>}
 </section>;
}
