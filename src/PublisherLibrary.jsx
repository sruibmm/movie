import React,{useState,useEffect} from 'react';
import {normalizeArabic} from './arabicDiscovery.js';
import {PUBLISHER_SERIES,PUBLISHER_EPISODES,importedEpisode} from './publisherSeries.js';
import {PUBLISHER_FILMS,importedFilm} from './officialCatalog.js';
import PublisherPlaylists from './PublisherPlaylists.jsx';
import ArabicSiteLibrary from './ArabicSiteLibrary.jsx';
import {BulkArabicLibrary} from './BulkArabicLibrary.jsx';
import bulkCatalog from './arabicBulkCatalog.json';
import {ARABIC_SITE_SERIES} from './arabicSiteCatalog.js';
import {PLAYLIST_SERIES} from './publisherPlaylists.js';
import {OFFICIAL_SERIES_LINKS} from './officialSeriesLinks.js';
export default function PublisherLibrary({query='',kind='all',sort='popular',sourceFilter='all',onPlay}){
 const [selected,setSelected]=useState(null),[seasonIndex,setSeasonIndex]=useState(0),[limit,setLimit]=useState(30),[filmLimit,setFilmLimit]=useState(20);
 useEffect(()=>{setLimit(30);setFilmLimit(20);setSelected(null);},[query,kind,sort]);
 const q=normalizeArabic(query);
 let rows=PUBLISHER_SERIES.filter(g=>(kind==='all'||kind==='tv'&&g.kind==='tv')&&(!q||normalizeArabic(g.title+' '+g.seasons.map(s=>s.title).join(' ')).includes(q)));
 if(sort==='newest')rows=[...rows].sort((a,b)=>String(b.year).localeCompare(String(a.year)));
 const season=selected?.seasons[seasonIndex];
 let films=PUBLISHER_FILMS.filter(x=>(kind==='all'||kind==='movie'&&x.kind!=='مسلسل')&&(!q||normalizeArabic(x.title+' '+(x.aliases||'')).includes(q)));if(sort==='newest')films=[...films].sort((a,b)=>String(b.year||'').localeCompare(String(a.year||'')));
 const external=kind!=='movie'&&q?OFFICIAL_SERIES_LINKS.filter(x=>normalizeArabic(x.title+' '+x.aliases).includes(q)):[];
 const playlistMatch=kind!=='movie'&&PLAYLIST_SERIES.some(g=>!q||normalizeArabic(g.title+' '+g.aliases+' '+g.country).includes(q));
 const siteMatch=(kind!=='movie'&&ARABIC_SITE_SERIES.some(g=>!q||normalizeArabic(g.title).includes(q)))||(kind!=='movie'&&bulkCatalog.series.some(g=>!q||normalizeArabic(g.title).includes(q)||g.seasons.some(s=>normalizeArabic(s.title).includes(q))))||(kind!=='tv'&&bulkCatalog.films.some(f=>!q||normalizeArabic(f.title).includes(q)));
 if(sourceFilter==='sites')return <><BulkArabicLibrary query={query} kind={kind} onPlay={onPlay}/>{kind!=='movie'&&<ArabicSiteLibrary query={query} onPlay={onPlay}/>}</>;
 if(!rows.length&&!films.length&&!external.length&&!playlistMatch&&!siteMatch)return null;
 return <div dir="rtl" className="mt-5 mb-7">
 {sourceFilter!=='youtube'&&<BulkArabicLibrary query={query} kind={kind} onPlay={onPlay}/>}{sourceFilter!=='youtube'&&kind!=='movie'&&<ArabicSiteLibrary query={query} onPlay={onPlay}/>}
 {kind!=='movie'&&<PublisherPlaylists query={query} onPlay={onPlay}/>}
 {!!external.length&&<section className="mb-5 rounded-2xl bg-zinc-900 border border-white/10 p-4"><h3 className="font-bold text-white">مصادر مشاهدة رسمية خارجية</h3>{external.map(x=><div key={x.id} className="mt-3"><p className="font-bold">{x.title} · {x.year} · {x.episodes} حلقة</p><p className="text-xs text-gray-400 mt-1">لا تتوفر نسخة كاملة قابلة للتضمين في مكتبتنا حالياً.</p>{x.providers.map(p=><a key={p.url} href={p.url} target="_blank" rel="noopener noreferrer" className="block text-purple-300 underline text-sm mt-2">{p.name}</a>)}</div>)}</section>}

 {!!films.length&&<section className="mb-7"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-lg font-black">شاهد الآن · أفلام ومسرحيات</h3><p className="text-xs text-gray-400 mt-1">روابط فيديو مدمجة من القنوات المنشورة على YouTube</p></div><span className="text-xs rounded-full bg-purple-600/20 px-3 py-1 text-purple-200">{films.length} عنوان مطابق</span></div>
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-4">{films.slice(0,filmLimit).map(x=><button key={x.id} onClick={()=>onPlay(importedFilm(x))} className="group text-right min-w-0"><div className="aspect-[2/3] rounded-2xl overflow-hidden relative bg-zinc-900 border border-white/10 group-hover:border-purple-500">{x.video?<img loading="lazy" src={'https://i.ytimg.com/vi/'+x.video+'/hqdefault.jpg'} alt="" className="w-full h-full object-cover"/>:<div className="h-full grid place-items-center text-3xl">📺</div>}<span className="absolute bottom-2 right-2 bg-black/80 rounded-lg px-2 py-1 text-[10px]">▶ {x.kind}</span></div><p className="mt-2 text-sm font-bold truncate">{x.title}</p><p className="text-xs text-gray-400 truncate">{x.year||x.channel}</p></button>)}</div>
 {films.length>filmLimit&&<button onClick={()=>setFilmLimit(n=>n+20)} className="mt-4 w-full rounded-xl bg-purple-700 py-3 text-sm font-bold">تحميل المزيد من الأفلام ({films.length-filmLimit})</button>}</section>}
 {!!rows.length&&<><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-lg font-black">شاهد الآن · مكتبة المسلسلات</h3><p className="text-xs text-gray-400 mt-1">{PUBLISHER_SERIES.length} عنوان مجمّع · {PUBLISHER_EPISODES.toLocaleString('en-US')} رابط حلقة/فيديو · YouTube</p></div><span className="rounded-full bg-purple-600/20 text-purple-200 px-3 py-1 text-xs">{rows.length} عنوان مطابق</span></div>
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-4">{rows.slice(0,limit).map(g=><button key={g.id} onClick={()=>{setSelected(g);setSeasonIndex(0);}} className="text-right min-w-0 group"><div className="aspect-[2/3] bg-zinc-900 rounded-2xl overflow-hidden relative border border-white/10 group-hover:border-purple-500"><img loading="lazy" src={g.poster||'https://i.ytimg.com/vi/'+g.seasons[0].episodes[0].video+'/hqdefault.jpg'} alt="" className="w-full h-full object-cover"/><span className="absolute bottom-2 right-2 rounded-lg bg-black/80 px-2 py-1 text-[10px] text-white">▶ {g.kind==='tv'?'مسلسل':'مجموعة'} · {g.seasons.reduce((n,s)=>n+s.episodes.length,0)}</span></div><p className="mt-2 text-sm font-bold truncate">{g.title}</p><p className="text-xs text-gray-400">{g.year||''} · {g.seasons.length} موسم/جزء</p></button>)}</div>
 {rows.length>limit&&<button onClick={()=>setLimit(n=>n+30)} className="mt-4 w-full rounded-xl bg-purple-700 py-3 text-sm font-bold">تحميل المزيد ({rows.length-limit})</button>}
 {selected&&season&&<div className="fixed inset-0 z-[1000] bg-black/80 flex items-end md:items-center justify-center" onClick={()=>setSelected(null)}><section role="dialog" aria-modal="true" aria-label={selected.title} onClick={e=>e.stopPropagation()} className="w-full md:max-w-2xl max-h-[90dvh] overflow-y-auto rounded-t-3xl md:rounded-3xl bg-[#17171c] border border-white/10 p-5"><div className="flex gap-3 items-start"><img src={selected.poster||'https://i.ytimg.com/vi/'+season.episodes[0].video+'/hqdefault.jpg'} alt="" className="w-20 rounded-xl"/><div className="flex-1"><h3 className="text-xl font-black">{selected.title}</h3><p className="text-xs text-gray-400 mt-2">اختر الحلقة · قد يعرض YouTube إعلانات</p></div><button onClick={()=>setSelected(null)} className="rounded-full bg-white/10 w-10 h-10" aria-label="إغلاق">×</button></div>
 <select aria-label="الموسم" value={seasonIndex} onChange={e=>setSeasonIndex(Number(e.target.value))} className="w-full mt-4 bg-zinc-800 rounded-xl p-3">{selected.seasons.map((s,i)=><option key={s.id} value={i}>{s.title} · {s.year||''} · {s.episodes.length} فيديو</option>)}</select><div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">{season.episodes.map(e=><button key={e.video} onClick={()=>{onPlay(importedEpisode(selected,season,e));setSelected(null);}} className="rounded-xl bg-white/5 overflow-hidden text-right"><div className="relative aspect-video"><img loading="lazy" src={'https://i.ytimg.com/vi/'+e.video+'/mqdefault.jpg'} alt="" className="w-full h-full object-cover"/><span className="absolute bottom-1 right-1 rounded bg-black/80 px-2 py-1 text-xs">▶</span></div><p className="text-xs font-bold p-3">{selected.kind==='tv'?'الحلقة':'الفيديو'} {e.number}</p></button>)}</div></section></div>}
 </>}
 </div>;
}
