import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {normalizeArabic} from './arabicDiscovery.js';
import {DUBAI_PLUS_HOME,DUBAI_PLUS_TERMS,DUBAI_PLUS_TITLES,officialDubaiUrl} from './dubaiPlusCatalog.js';

function SourceViewer({item,onClose}){
 const [revision,setRevision]=useState(0),[loaded,setLoaded]=useState(false);
 const frame=useRef(null),shell=useRef(null),close=useRef(null);
 const url=officialDubaiUrl(item.url);
 useEffect(()=>{
   const last=document.activeElement,old=document.body.style.overflow;
   document.body.style.overflow='hidden';close.current?.focus();
   const escape=e=>{if(e.key==='Escape')onClose();};
   window.addEventListener('keydown',escape);
   return()=>{document.body.style.overflow=old;window.removeEventListener('keydown',escape);last?.focus?.();};
 },[onClose]);
 const fullscreen=()=>{if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});else shell.current?.requestFullscreen?.().catch(()=>{});};
 return createPortal(<div ref={shell} role="dialog" aria-modal="true" aria-label={'Dubai+ · '+item.title} dir="rtl" className="fixed inset-0 z-[3000] bg-[#09090d] text-white flex flex-col" style={{height:'100dvh'}}>
  <header className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-[#14141b]" style={{paddingTop:'max(8px,env(safe-area-inset-top))'}}>
   <button ref={close} onClick={onClose} aria-label="العودة إلى Cinema" className="rounded-xl bg-white/10 px-3 py-2 text-sm font-bold">‹ رجوع</button>
   <div className="flex-1 min-w-0"><p className="font-bold truncate">{item.title}</p><p className="text-[10px] text-violet-300">Dubai+ · المصدر الرسمي</p></div>
   <button onClick={()=>{setLoaded(false);setRevision(n=>n+1)}} aria-label="إعادة تحميل المصدر" className="rounded-xl bg-white/10 px-3 py-2 text-sm">↻</button>
   <button onClick={fullscreen} aria-label="ملء الشاشة" className="rounded-xl bg-white/10 px-3 py-2 text-sm">⛶</button>
  </header>
  <div className="relative flex-1 min-h-0 bg-black">
   {!loaded&&<div className="absolute inset-0 grid place-items-center text-sm text-gray-400 pointer-events-none">جاري تحميل صفحة المصدر…</div>}
   {url&&<iframe ref={frame} key={revision} title={'Dubai+ · '+item.title} src={url} className="absolute inset-0 w-full h-full border-0" style={{width:'100%',height:'100%'}} allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" onLoad={()=>setLoaded(true)}/>}
  </div>
  <footer className="shrink-0 flex flex-wrap items-center gap-2 px-3 py-2 text-[11px] text-gray-400 bg-[#14141b]" style={{paddingBottom:'max(8px,env(safe-area-inset-bottom))'}}>
   <span className="flex-1">عرض الصفحة الرسمية · التوفر والتسجيل والجودة والإعلانات بحسب المصدر.</span>
   <a href={url||DUBAI_PLUS_HOME} target="_blank" rel="noopener noreferrer" className="text-purple-300 underline">فتح المصدر مباشرة إذا تعذّر العرض</a>
  </footer>
 </div>,document.body);
}
export default function DubaiPlusLibrary({query='',kind='all',standalone=false}){
 const [selected,setSelected]=useState(null);
 const [limit,setLimit]=useState(12);
 useEffect(()=>setLimit(12),[query,kind]);
 const q=normalizeArabic(query);
 const titles=DUBAI_PLUS_TITLES.filter(x=>(kind==='all'||x.kind===kind)&&(!q||normalizeArabic(x.title).includes(q)));
 const home={title:'مكتبة Dubai+ الكاملة',url:DUBAI_PLUS_HOME};
 if(!standalone&&q&&!titles.length)return null;
 return <section dir="rtl" className="mt-6 mb-6" aria-label="مكتبة دبي بلس">
  <div className="rounded-3xl p-5 border border-violet-400/20 bg-gradient-to-br from-[#241842] via-[#191522] to-[#101014]">
   <div className="flex flex-wrap gap-3 items-center justify-between"><div><p className="text-[10px] font-bold tracking-widest text-violet-300">CINEMA · OFFICIAL SOURCE</p><h3 className="text-xl font-black mt-1">Dubai+ <span className="text-sm font-normal text-gray-400">· أوان سابقًا</span></h3><p className="text-xs text-gray-300 mt-2">أعمال عربية حديثة وكلاسيكية · مسلسلات وأفلام وبرامج</p></div><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-violet-200">{DUBAI_PLUS_TITLES.length} عنوان مفهرس</span></div>
   <button onClick={()=>setSelected(home)} className="mt-4 w-full rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-3 font-bold text-sm text-white">استكشف مكتبة Dubai+ داخل Cinema ‹</button>
   <p className="mt-2 text-[11px] leading-relaxed text-gray-400">معاينة مدمجة للصفحة الأصلية. التشغيل يعتمد على المصدر؛ قد تظهر إعلانات أو يلزم تسجيل الدخول أو اشتراك لبعض العناوين.</p>
  </div>
  {!!titles.length&&<div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">{titles.slice(0,limit).map(item=><button key={item.id} onClick={()=>setSelected(item)} className="rounded-2xl bg-[#17171c] border border-white/10 hover:border-purple-500/60 text-right p-4"><span className="text-[10px] text-violet-300">Dubai+ · مسلسل</span><p className="font-black text-lg mt-1">{item.title}</p><p className="text-xs text-gray-400 mt-1">{[item.year,item.episodes?item.episodes+' حلقة مفهرسة':null,item.seasons?item.seasons+' موسم':null].filter(Boolean).join(' · ')||'صفحة المسلسل الرسمية'}</p><p className="text-xs text-violet-200 mt-3">▶ افتح صفحة المسلسل داخل Cinema</p></button>)}</div>}
  {titles.length>limit&&<button onClick={()=>setLimit(n=>n+24)} className="mt-3 w-full rounded-xl bg-white/10 py-3 text-sm">عرض المزيد ({titles.length-limit})</button>}
  {standalone&&q&&!titles.length&&<p className="mt-3 text-xs text-gray-400">استخدم البحث داخل مكتبة المصدر لتصفح بقية الأعمال. لم نفهرس كل العناوين محليًا بعد.</p>}
  <p className="text-[10px] text-gray-500 mt-3">المصدر يحتفظ بواجهته وحقوقه. <a href={DUBAI_PLUS_TERMS} target="_blank" rel="noopener noreferrer" className="underline">شروط الاستخدام</a></p>
  {selected&&<SourceViewer item={selected} onClose={()=>setSelected(null)}/>}
 </section>;
}
