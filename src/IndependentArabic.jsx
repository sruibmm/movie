import React,{useState,useEffect} from 'react';
import {independentArabicItems,observedQuality} from './independentArabicModel.js';
export {independentArabicMovie} from './independentArabicModel.js';
export default function IndependentArabic({query='',onPlay}){
 const [category,setCategory]=useState('all'),[limit,setLimit]=useState(8);
 useEffect(()=>{setCategory('all');setLimit(8);},[query]);
 const all=independentArabicItems(query),films=independentArabicItems(query,category);
 const categories=[['all','كل الأعمال'],...Array.from(new Set(all.map(x=>x.item.category))).map(x=>[x,x])];
 if(!all.length)return null;
 return <section dir="rtl" aria-label="سينما عربية مستقلة" className="mb-6 rounded-3xl bg-gradient-to-br from-violet-950/40 to-zinc-950 border border-violet-500/20 p-4 md:p-5">
 <div className="flex flex-wrap justify-between items-start gap-2"><div><p className="text-xs font-bold text-violet-300">CINEMA · INDEPENDENT</p><h2 className="text-xl font-black mt-1">سينما عربية مستقلة</h2><p className="text-xs text-gray-300 mt-2">أعمال كاملة من صناعها · اختبرنا التشغيل بدقة HD · Vimeo وBrightcove · لم تظهر إعلانات أثناء اختبار بدء التشغيل.</p></div><span className="text-xs bg-white/10 px-3 py-1.5 rounded-full">{all.length} عمل</span></div>
 <div className="flex flex-wrap gap-2 mt-4" role="group" aria-label="نوع الفيلم المستقل">{categories.map(([id,label])=><button key={id} aria-pressed={category===id} onClick={()=>{setCategory(id);setLimit(8);}} className={'rounded-full px-3 py-2 text-xs font-bold '+(category===id?'bg-violet-700':'bg-white/10')}>{label} · {id==='all'?all.length:all.filter(x=>x.item.category===id).length}</button>)}</div>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">{films.slice(0,limit).map(({item,movie})=><button key={item.movieId} onClick={()=>onPlay(movie)} className="text-right rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 group hover:border-violet-400 focus-visible:ring-2 ring-violet-400 outline-none"><div className="aspect-video relative bg-zinc-800"><img loading="lazy" decoding="async" src={item.poster} alt="" className="w-full h-full object-cover"/><span className="absolute bottom-2 right-2 rounded-lg bg-black/80 px-2 py-1 text-xs">▶ شاهد الآن</span><span className="absolute top-2 left-2 rounded-lg bg-black/80 px-2 py-1 text-[10px]">{observedQuality(item)}</span></div><div className="p-3"><h3 className="font-black text-base">{item.title}</h3><p className="text-xs text-gray-400 mt-1">{item.originalTitle} · {item.year} · {Math.round(item.duration/60)} دقيقة</p><p className="text-xs text-violet-300 mt-1">{item.category} · {item.origin==='https://players.brightcove.net'?'Brightcove':'Vimeo'}</p><p className="text-xs text-gray-400 mt-2">{item.language}</p></div></button>)}</div>
 {!films.length&&<p className="text-sm text-gray-400 mt-4">لا توجد أعمال بهذا التصنيف.</p>}
 {films.length>limit&&<button onClick={()=>setLimit(n=>n+12)} className="w-full mt-4 rounded-xl bg-white/10 p-3 text-sm">عرض المزيد ({films.length-limit})</button>}
 </section>;
}
