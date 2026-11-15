import React from 'react';
import {APPROVED_EMBEDS,attachApprovedEmbed} from './approvedEmbedCatalog.js';
import {normalizeArabic} from './arabicDiscovery.js';
export function independentArabicMovie(item){
 const movie={id:item.movieId,title:item.title,original_title:item.originalTitle,media_type:'movie',release_date:item.year+'-01-01',isArabic:true,original_language:'ar',runtime:Math.round(item.duration/60),licensedPoster:item.poster,overview:item.overview};
 return attachApprovedEmbed(movie);
}
export default function IndependentArabic({query='',onPlay}){
 const q=normalizeArabic(query);
 const films=APPROVED_EMBEDS.filter(x=>x.kind==='movie'&&x.adsPossible===false&&x.category&&(!q||normalizeArabic(x.title+' '+x.originalTitle+' '+x.publisher).includes(q))).map(item=>({item,movie:independentArabicMovie(item)})).filter(x=>x.movie.publisherSource);
 if(!films.length)return null;
 return <section dir="rtl" aria-label="سينما عربية مستقلة" className="mb-6 rounded-3xl bg-gradient-to-br from-violet-950/40 to-zinc-950 border border-violet-500/20 p-4 md:p-5">
 <div className="flex flex-wrap justify-between items-start gap-2"><div><p className="text-xs font-bold text-violet-300">CINEMA · INDEPENDENT</p><h2 className="text-xl font-black mt-1">سينما عربية مستقلة</h2><p className="text-xs text-gray-300 mt-2">أعمال كاملة من صناعها · اختبرنا بدء التشغيل بدقة HD · بلا إعلانات فيديو من Vimeo.</p></div><span className="text-xs bg-white/10 px-3 py-1.5 rounded-full">{films.length} عمل</span></div>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">{films.map(({item,movie})=><button key={item.movieId} onClick={()=>onPlay(movie)} className="text-right rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 group hover:border-violet-400 focus-visible:ring-2 ring-violet-400 outline-none"><div className="aspect-video relative bg-zinc-800"><img loading="lazy" decoding="async" src={item.poster} alt="" className="w-full h-full object-cover"/><span className="absolute bottom-2 right-2 rounded-lg bg-black/80 px-2 py-1 text-xs">▶ شاهد الآن</span></div><div className="p-3"><h3 className="font-black text-base">{item.title}</h3><p className="text-xs text-gray-400 mt-1">{item.originalTitle} · {item.year} · {Math.round(item.duration/60)} دقيقة</p><p className="text-xs text-violet-300 mt-1">{item.category} · 720p</p><p className="text-xs text-gray-400 mt-2">{item.language}</p></div></button>)}</div>
 </section>;
}
