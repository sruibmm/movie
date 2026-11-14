import React,{useState,useEffect} from 'react';

import {OFFICIAL_CATALOG as CLASSICS,officialEmbed} from './officialCatalog.js';
function norm(s){return String(s||'').toLowerCase().normalize('NFKC').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/[\u064B-\u065F]/g,'').replace(/٨/g,'8').replace(/[^\p{L}\p{N}]+/gu,' ').trim();}
export default function ArabicClassics({query='',mode}){
 const [selected,setSelected]=useState(null);
 const [filter,setFilter]=useState('all');
 const [play,setPlay]=useState(false);
 const q=norm(query);
 const items=CLASSICS.filter(m=>(filter==='all'||m.kind===filter)&&(!q||norm(m.title+' '+m.aliases).includes(q)));
 useEffect(()=>{setSelected(null);setPlay(false);},[query,filter]);
 if(!items.length)return null;
 return <section dir="rtl" className="mb-7 rounded-3xl border border-purple-500/20 bg-gradient-to-b from-purple-950/30 to-zinc-950 p-4">
 <div className="flex flex-wrap justify-between items-center gap-2"><div><h2 className="font-black text-lg text-white">كنوز السينما والمسرح</h2><p className="text-xs text-gray-400 mt-1">أعمال مصرية قديمة ومسرحيات من مصادر رسمية</p></div><span className="text-[10px] text-purple-200">مصادر إضافية</span></div>
 <div className="flex gap-2 mt-4">{[['all','الكل'],['فيلم','أفلام'],['مسرحية','مسرحيات']].map(([v,label])=><button key={v} onClick={()=>setFilter(v)} className={`rounded-full px-3 py-1.5 text-xs ${filter===v?'bg-purple-600 text-white':'bg-white/5 text-gray-300'}`}>{label}</button>)}</div>
 <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">{items.map(m=><button key={m.id} onClick={()=>{setSelected(m);setPlay(false);}} className="text-right rounded-2xl overflow-hidden bg-white/5 border border-white/5 hover:border-purple-500/50">
 <div className="aspect-video bg-zinc-900 relative">{m.video?<img src={`https://i.ytimg.com/vi/${m.video}/hqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover"/>:<div className="h-full flex items-center justify-center text-3xl">{m.kind==='مسرحية'?'🎭':'🎬'}</div>}<span className="absolute top-2 right-2 bg-black/80 rounded-md text-[10px] px-2 py-1">{m.kind}</span></div>
 <div className="p-3"><h3 className="text-sm font-bold text-white">{m.title}</h3><p className="text-[11px] text-gray-400 mt-1">{m.year} · {m.channel}</p><p className="text-[10px] text-purple-300 mt-2">{m.video?'نسخة كاملة منشورة':m.url?'صفحة المشاهدة الرسمية':'لا يوجد تشغيل مؤكد'}</p></div>
 </button>)}</div>
 {selected&&<div className="fixed inset-0 z-[1000] bg-black/80 flex items-end md:items-center justify-center" onClick={()=>setSelected(null)}><section role="dialog" aria-modal="true" aria-label={selected.title} className="bg-[#141419] w-full md:max-w-3xl max-h-[90dvh] overflow-y-auto rounded-t-3xl md:rounded-3xl p-4 border border-white/10" onClick={e=>e.stopPropagation()}>
 <div className="flex justify-between items-center gap-2 mb-4"><div><h3 className="text-lg font-bold">{selected.title}</h3><p className="text-xs text-gray-400">{selected.channel} · {selected.year}</p></div><button onClick={()=>setSelected(null)} aria-label="إغلاق" className="w-10 h-10 rounded-full bg-white/10 text-xl">×</button></div>
 {selected.video?(play?<iframe title={selected.title} src={officialEmbed(selected.video)} className="w-full aspect-video border-0 rounded-xl bg-black" sandbox="allow-scripts allow-same-origin allow-presentation" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>:<div className="relative aspect-video rounded-2xl overflow-hidden bg-black"><img src={`https://i.ytimg.com/vi/${selected.video}/hqdefault.jpg`} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50"/><div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/10 flex flex-col items-center justify-center gap-3 px-4 text-center"><button onClick={()=>setPlay(true)} className="rounded-full bg-purple-600 hover:bg-purple-500 w-16 h-16 text-2xl shadow-xl" aria-label="تشغيل داخل السينما">▶</button><p className="font-bold text-white">شاهد داخل Cinema</p><p className="text-xs text-gray-300">نسخة رسمية · قد تظهر إعلانات من الناشر</p></div></div>):<p className="text-sm text-gray-300">{selected.url?'هذا العمل متاح بصفحة رسمية منفصلة. قد يتطلب اشتراكاً أو يعرض إعلانات حسب البلد.':'لم نجد نسخة كاملة موثقة لهذه المسرحية. لا نعرض مقاطع بدلاً منها.'}</p>}
 {mode==='couples'&&selected.video&&<p className="text-xs text-gray-400 mt-3">المشغّل الرسمي هنا مستقل؛ المزامنة بين الجهازين غير مدعومة حالياً لهذا المصدر.</p>}
 {(selected.video||selected.url||selected.info)&&<a className="block mt-4 text-sm text-purple-300 underline" href={selected.video?'https://www.youtube.com/watch?v='+selected.video:selected.url||selected.info} target="_blank" rel="noopener noreferrer">{selected.video?'فتح النسخة الرسمية عند تعذر التضمين':selected.url?'فتح صفحة المشاهدة الرسمية':'معلومات المسرحية'}</a>}
 </section></div>}
 </section>;
}
