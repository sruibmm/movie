import React,{useState,useEffect} from 'react';

const CLASSICS=[
 {id:'limby2002',title:'اللمبي',year:'2002',kind:'فيلم',channel:'السبكي للإنتاج الفني',video:'M9dM0ZW9AXc',aliases:'محمد سعد el limby el lembi'},
 {id:'zaeem',title:'الزعيم',year:'1993',kind:'مسرحية',channel:'ART نوستالجيا',video:'tLhJ7g4xDDo',aliases:'عادل امام عادل إمام al zaeem'},
 {id:'sayed',title:'الواد سيد الشغال',year:'1985',kind:'مسرحية',channel:'ART نوستالجيا',video:'M86-JJwg14U',aliases:'عادل امام عادل إمام sayed the servant'},
 {id:'limby8',title:'اللمبي 8 جيجا',year:'2010',kind:'فيلم',channel:'STARZPLAY',url:'https://starzplay.com/ar/movies/al-limbi-8-gega/763280423982',aliases:'محمد سعد اللمبي ٨ جيجا اللمبي ثمانية جيجا lembi 8 giga'},
 {id:'school',title:'مدرسة المشاغبين',year:'1973',kind:'مسرحية',channel:'شاهد',url:'https://shahid.mbc.net/ar/movies/Madrasat-Almoshagebin/movie-880870',aliases:'عادل امام عادل إمام سعيد صالح'},
 {id:'jahilia',title:'اللمبي في الجاهلية',year:'2021',kind:'مسرحية',channel:'لم نجد نسخة كاملة موثقة',info:'https://elcinema.com/work/2071802/',aliases:'محمد سعد اللمبي في الجاهليه el lemby'},
];
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
 {selected.video?(play?<iframe title={selected.title} src={`https://www.youtube.com/embed/${selected.video}?rel=0&playsinline=1`} className="w-full aspect-video border-0 rounded-xl bg-black" sandbox="allow-scripts allow-same-origin allow-presentation" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>:<div className="rounded-xl bg-black p-5 text-center"><p className="text-sm text-gray-300">نسخة منشورة من القناة الرسمية. قد يعرض YouTube إعلانات، والتشغيل داخل الموقع يعتمد على سماح الناشر بالتضمين.</p><button onClick={()=>setPlay(true)} className="mt-4 bg-purple-600 px-5 py-3 rounded-xl font-bold">تشغيل داخل السينما</button></div>):<p className="text-sm text-gray-300">{selected.url?'هذا العمل متاح بصفحة رسمية منفصلة. قد يتطلب اشتراكاً أو يعرض إعلانات حسب البلد.':'لم نجد نسخة كاملة موثقة لهذه المسرحية. لا نعرض مقاطع بدلاً منها.'}</p>}
 {mode==='couples'&&selected.video&&<p className="text-xs text-gray-400 mt-3">المشغّل الرسمي هنا مستقل؛ المزامنة بين الجهازين غير مدعومة حالياً لهذا المصدر.</p>}
 {(selected.video||selected.url||selected.info)&&<a className="block mt-4 text-sm text-purple-300 underline" href={selected.video?'https://www.youtube.com/watch?v='+selected.video:selected.url||selected.info} target="_blank" rel="noopener noreferrer">{selected.video?'فتح النسخة الرسمية عند تعذر التضمين':selected.url?'فتح صفحة المشاهدة الرسمية':'معلومات المسرحية'}</a>}
 </section></div>}
 </section>;
}
