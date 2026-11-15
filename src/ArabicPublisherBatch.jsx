import React,{useState,useEffect} from 'react';
import rows from './arabicPublisherBatch.json';
import {batchGroups,batchMovie} from './arabicPublisherBatch.js';
import {normalizeArabic} from './arabicDiscovery.js';
const groups=batchGroups(rows);
const count=rows.reduce((n,s)=>n+s.episodes.length,0);
export default function ArabicPublisherBatch({query='',onPlay}){
 const deepLink=new URLSearchParams(window.location.search).get('publisherPreview')==='1';
 const [expanded,setExpanded]=useState(deepLink),[allowed,setAllowed]=useState(false),[selected,setSelected]=useState(null),[season,setSeason]=useState(0);
 useEffect(()=>{setSelected(null);},[query]);

 const matching=groups.filter(g=>!query||normalizeArabic(g.title).includes(normalizeArabic(query)));
 const current=selected?.seasons[season];
 if(!expanded)return <section dir='rtl' className='mb-5 mt-5 rounded-2xl border border-white/10 bg-zinc-900/70 p-4'><button className='w-full text-right rounded-xl bg-white/5 px-4 py-3 font-bold' onClick={()=>setExpanded(true)}>{'\u0623\u0639\u0645\u0627\u0644 \u0625\u0636\u0627\u0641\u064a\u0629 \u0645\u0646 \u0627\u0644\u0646\u0627\u0634\u0631\u064a\u0646'} · {groups.length} / {count} {'\u062d\u0644\u0642\u0629'} <span className='block text-xs text-amber-200 mt-1'>{'\u0645\u0639\u0627\u064a\u0646\u0629 \u0627\u062e\u062a\u064a\u0627\u0631\u064a\u0629 \u2014 \u0642\u062f \u062a\u0638\u0647\u0631 \u0625\u0639\u0644\u0627\u0646\u0627\u062a'}</span></button></section>;
 return <section dir="rtl" className="mb-7 mt-5 rounded-2xl border border-purple-500/30 bg-zinc-900/70 p-4">
 <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-lg font-black">دفعة الناشرين الجديدة · Cinema</h3><p className="text-xs text-gray-300 mt-1">{groups.length} مسلسل · {rows.length} موسم · {count} حلقة</p></div><span className="text-xs rounded-full bg-purple-600/20 px-3 py-1 text-purple-200">معاينة اختيارية</span></div>
 <p className="text-xs text-amber-200 mt-3 leading-relaxed">هذه الدفعة من قنوات YouTube؛ قد تظهر إعلانات من الناشر. الحلقات اجتازت فحص بيانات المصدر والتوفر بالكويت ودقة HD، لكن التشغيل الفعلي لكل حلقة لم يُختبر. ليست ضمن المكتبة النظيفة المعتمدة.</p>
 {!allowed?<button className="mt-4 w-full rounded-xl bg-purple-700 px-4 py-3 font-bold text-sm" onClick={()=>setAllowed(true)}>عرض الدفعة — أوافق على احتمال ظهور إعلانات</button>:<>
 <button className="mt-3 text-xs text-gray-300 underline" onClick={()=>{setAllowed(false);setSelected(null);}}>إغلاق المعاينة</button>
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-4">{matching.map(g=><button key={g.id} className="text-right min-w-0" onClick={()=>{setSelected(g);setSeason(0);}}><div className="aspect-[2/3] rounded-2xl overflow-hidden relative bg-zinc-800 border border-white/10"><img loading="lazy" src={g.poster} alt="" className="w-full h-full object-cover"/><span className="absolute bottom-2 right-2 bg-black/80 rounded-lg px-2 py-1 text-[10px]">▶ {g.seasons.reduce((n,s)=>n+s.episodes.length,0)} حلقة</span></div><p className="mt-2 text-sm font-bold truncate">{g.title}</p><p className="text-xs text-gray-400">{g.year} · {g.seasons.length} موسم</p></button>)}</div>
 {!matching.length&&<p className="text-sm text-gray-400 mt-3">لا توجد نتائج في هذه الدفعة.</p>}
 {selected&&current&&<div className="fixed inset-0 z-[1000] bg-black/80 flex items-end md:items-center justify-center" onClick={()=>setSelected(null)}><section role="dialog" aria-modal="true" aria-label={selected.title} onClick={e=>e.stopPropagation()} className="w-full md:max-w-2xl max-h-[90dvh] overflow-y-auto rounded-t-3xl md:rounded-3xl bg-[#17171c] border border-white/10 p-5"><div className="flex justify-between items-center"><h3 className="text-xl font-black">{selected.title}</h3><button aria-label="إغلاق" className="rounded-full bg-white/10 w-10 h-10" onClick={()=>setSelected(null)}>×</button></div><p className="text-xs text-amber-200 mt-2">قد يعرض YouTube إعلانات · {current.publisher}</p><select aria-label="الموسم" className="w-full mt-4 bg-zinc-800 rounded-xl p-3" value={season} onChange={e=>setSeason(Number(e.target.value))}>{selected.seasons.map((s,i)=><option key={s.id} value={i}>الموسم {s.season} · {s.year} · {s.episodes.length} حلقة</option>)}</select><div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">{current.episodes.map(e=><button key={e.video} className="rounded-xl bg-white/5 overflow-hidden text-right" onClick={()=>{const m=batchMovie(selected,current,e,allowed);if(m){onPlay(m);setSelected(null);}}}><img loading="lazy" src={'https://i.ytimg.com/vi/'+e.video+'/mqdefault.jpg'} alt="" className="w-full aspect-video object-cover"/><p className="text-xs font-bold p-3">الحلقة {e.number} · {e.quality}p</p></button>)}</div></section></div>}
 </>}
 </section>
}
