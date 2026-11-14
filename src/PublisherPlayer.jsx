import React,{useState} from 'react';
import {approvedPublisherUrl} from './arabicSiteCatalog.js';
import {verifiedYoutubeAlternative} from './publisherAvailability.js';
export default function PublisherPlayer({movie,mode,onBack}){
 const [revision,setRevision]=useState(0);
 const original=movie.publisherSource;
 const blocked=original?.provider==='dailymotion';
 const alternative=blocked?verifiedYoutubeAlternative(movie):null;
 const [choice,setChoice]=useState('original');
 const source=choice==='youtube'&&alternative?alternative:original;
 const src=blocked&&choice==='original'?null:approvedPublisherUrl(source);
 const provider=source?.provider==='dailymotion'?'Dailymotion':'YouTube';
 return <div className="h-[100dvh] bg-black text-white flex flex-col overflow-hidden" dir="rtl">
 <header className="shrink-0 bg-[#101014] border-b border-white/10 px-4 py-3 flex gap-3 items-center"><button onClick={onBack} className="w-10 h-10 bg-white/10 rounded-full text-xl" aria-label="رجوع">‹</button><div className="flex-1 min-w-0"><p className="font-bold truncate">{movie.title}</p><p className="text-[10px] text-gray-400 truncate">Cinema · {source?.publisher||provider}</p></div>{src&&<button onClick={()=>setRevision(x=>x+1)} className="bg-white/10 rounded-lg px-3 py-2 text-xs">إعادة تحميل ↻</button>}</header>
 <div className="flex-1 min-h-0 grid place-items-center bg-black">{src?<iframe key={revision} title={movie.title} src={src} className="w-full h-full border-0" sandbox="allow-scripts allow-same-origin allow-presentation" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>:<div className="max-w-sm mx-5 text-center p-6 rounded-2xl bg-zinc-900 border border-white/10"><h2 className="font-black text-xl">المشاهدة من هذا المصدر متوقفة مؤقتاً</h2><p className="text-sm text-gray-400 mt-3">تعذر تشغيل مشغّل Dailymotion داخل الموقع. لن نعرضه كمصدر جاهز حتى نتأكد من تشغيله.</p>{alternative?<button className="w-full bg-purple-600 rounded-xl p-3 mt-5 font-bold" onClick={()=>setChoice('youtube')}>▶ مشاهدة نفس الحلقة عبر YouTube</button>:<p className="mt-4 text-sm text-gray-300">لا يوجد بديل مطابق مؤكد في المكتبة الحالية.</p>}<button onClick={onBack} className="mt-3 bg-white/10 w-full rounded-xl p-3">العودة للمكتبة</button></div>}</div>
 <footer className="shrink-0 bg-[#101014] p-3 text-xs text-gray-400" style={{paddingBottom:'max(12px, env(safe-area-inset-bottom))'}}>{src?'المشاهدة داخل Cinema · قد تظهر إعلانات أو قيود من '+provider:'مصدر الناشر محفوظ في الفهرس؛ التشغيل المدمج غير مؤكد.'} {mode==='couples'?'مزامنة التحكم غير متاحة لهذا المشغّل.':''}</footer></div>;
}
