import React,{useEffect,useState} from 'react';
import DubaiPublisherMatches from './DubaiPublisherMatches.jsx';
import {normalizeArabic} from './arabicDiscovery.js';
import {DUBAI_PLUS_HOME,DUBAI_PLUS_TITLES,officialDubaiUrl} from './dubaiPlusCatalog.js';

export default function DubaiPlusLibrary({query='',kind='all',standalone=false,onPlay}){
 const [limit,setLimit]=useState(12),[directoryOpen,setDirectoryOpen]=useState(false);
 useEffect(()=>setLimit(12),[query,kind]);
 const q=normalizeArabic(query);
 const titles=DUBAI_PLUS_TITLES.filter(x=>(kind==='all'||x.kind===kind)&&(!q||normalizeArabic(x.title).includes(q)));
 if(!standalone)return null;
 return <section dir="rtl" className="mt-6 mb-6" aria-label="Dubai+ · حالة توفر المشاهدة">
  <div className="rounded-3xl p-5 border border-violet-400/20 bg-gradient-to-br from-[#241842] via-[#191522] to-[#101014]">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div><p className="text-[10px] font-bold tracking-widest text-violet-300">CINEMA · DUBAI+</p><h3 className="text-xl font-black mt-1">Dubai+ <span className="text-sm font-normal text-gray-400">· أوان سابقًا</span></h3></div>
    <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-gray-300">المشغّل المباشر غير متاح</span>
   </div>
   <p className="text-sm text-gray-300 mt-3 leading-relaxed">مشاهدة فيديو Dubai+ داخل Cinema غير متاحة حاليًا. لن نفتح موقعًا كاملًا داخل المشغّل أو نعرض زر مشاهدة لفيديو غير مؤكد.</p>
  </div>
  <DubaiPublisherMatches query={query} kind={kind} onPlay={onPlay}/>
  <details open={directoryOpen} onToggle={e=>setDirectoryOpen(e.currentTarget.open)} className="mt-5 rounded-2xl border border-white/10 bg-[#17171c] p-4">
   <summary className="cursor-pointer font-bold text-sm text-gray-300">فهرس Dubai+ الرسمي · {titles.length} عنوان مطابق</summary>
   <p className="text-xs text-gray-400 leading-relaxed mt-3">هذه صفحات تعريف بالمصدر وليست روابط فيديو. فتح المصدر اختياري وخارج Cinema وقد يتطلب تسجيل دخول.</p>
   {!!titles.length&&<div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">{titles.slice(0,limit).map(item=><article key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-4"><span className="text-[10px] text-violet-300">Dubai+ · {item.kind==='movie'?'فيلم':'مسلسل'}</span><p className="font-bold mt-1">{item.title}</p><p className="text-xs text-gray-400 mt-1">{[item.year,item.episodes?item.episodes+' حلقة':null,item.seasons?item.seasons+' موسم':null].filter(Boolean).join(' · ')||'صفحة المصدر'}</p><p className="text-[11px] text-gray-400 mt-3">لا يوجد رابط فيديو مباشر مؤكد</p>{officialDubaiUrl(item.url)&&<a href={officialDubaiUrl(item.url)} target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-violet-300 underline mt-2">صفحة المصدر الرسمية ↗</a>}</article>)}</div>}
   {titles.length>limit&&<button onClick={()=>setLimit(n=>n+24)} className="mt-3 w-full rounded-xl bg-white/10 py-3 text-sm">عرض المزيد ({titles.length-limit})</button>}
   {!titles.length&&<p className="mt-3 text-xs text-gray-400">لا توجد نتيجة في الفهرس المحلي.</p>}
   <a href={DUBAI_PLUS_HOME} target="_blank" rel="noopener noreferrer" className="inline-block mt-4 text-xs text-violet-300 underline">زيارة Dubai+ خارج Cinema ↗</a>
  </details>
 </section>;
}
