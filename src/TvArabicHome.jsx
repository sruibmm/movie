import React,{useEffect,useMemo,useState} from 'react';
import {PUBLISHER_FILMS,importedFilm} from './officialCatalog.js';
import {PUBLISHER_SERIES,importedEpisode} from './publisherSeries.js';
import {normalizeArabic} from './arabicDiscovery.js';
import ArabicDiscovery from './ArabicDiscovery.jsx';
import AutoLibrary from './AutoLibrary.jsx';
import SyncedLibrary from './SyncedLibrary.jsx';
import LicensedLibrary from './LicensedLibrary.jsx';
const artwork=(item,type)=>globalThis.__TV_ARABIC_ART__?.[type+':'+item.id]||item.poster||(type==='film'&&item.video?'https://i.ytimg.com/vi/'+item.video+'/hqdefault.jpg':item.seasons?.[0]?.episodes?.[0]?.video?'https://i.ytimg.com/vi/'+item.seasons[0].episodes[0].video+'/hqdefault.jpg':null);
const tabs=[['featured','مختارات'],['films','أفلام'],['series','مسلسلات'],['all','كل المكتبة'],['direct','المشاهدة المباشرة'],['synced','Cinema Direct'],['licensed','المكتبة المحفوظة']];
let previousTab='featured',returnSeries=null,returnSeason=0;
function Poster({item,type,onClick}){const [failed,setFailed]=useState(false),url=artwork(item,type);return <button data-tv-focus={'arabic:'+type+':'+item.id} className="tv-poster-card group text-right min-w-0" onClick={onClick}><div className="tv-arabic-poster relative aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-900 border border-white/10">{url&&!failed?<img src={url} alt={item.title} loading="lazy" decoding="async" onError={()=>setFailed(true)} className="w-full h-full object-cover"/>:<div className="tv-art-placeholder"><span>🎬</span><strong>{item.title}</strong></div>}<span className="absolute bottom-2 right-2 bg-black/80 rounded-lg px-2 py-1 text-xs">{type==='series'?'مسلسل':item.kind||'فيلم'}</span></div><h3 className="mt-2 text-sm font-bold truncate">{item.title}</h3><p className="text-xs text-gray-400">{item.year||''}</p></button>}
export default function TvArabicHome({query,options,onMovie,onPlay}){
 const [tab,setTab]=useState(previousTab),[limit,setLimit]=useState(12),[selected,setSelected]=useState(returnSeries),[season,setSeason]=useState(returnSeason),[episodeLimit,setEpisodeLimit]=useState(24);
 useEffect(()=>{returnSeries=null;returnSeason=0;},[]);
 useEffect(()=>{setLimit(12);},[tab,query]);
 const q=normalizeArabic(query);
 const films=useMemo(()=>PUBLISHER_FILMS.filter(x=>x.video&&(!q||normalizeArabic(x.title+' '+(x.aliases||'')).includes(q))),[q]);
 const series=useMemo(()=>PUBLISHER_SERIES.filter(x=>x.kind==='tv'&&x.seasons?.length&&(!q||normalizeArabic(x.title+' '+x.seasons.map(s=>s.title).join(' ')).includes(q))),[q]);
 const change=t=>{previousTab=t;setTab(t);setSelected(null);};
 const row=selected?.seasons[season];
 const open=g=>{setSelected(g);setSeason(0);setEpisodeLimit(24);};
 const close=()=>{returnSeries=null;setSelected(null);};
 const playEpisode=e=>{returnSeries=selected;returnSeason=season;onPlay(importedEpisode(selected,row,e));};
 const section=(title,items,type)=>items.length>0&&<section className="tv-arabic-shelf"><h2 className="text-2xl font-black mb-3">{title}</h2><div className="tv-poster-grid">{items.slice(0,limit).map(item=><Poster key={type+':'+item.id} item={item} type={type} onClick={()=>type==='film'?onPlay(importedFilm(item)):open(item)}/>)}</div>{items.length>limit&&<button data-tv-focus={'arabic:more:'+type} className="bg-white/10 rounded-xl px-6 py-3 mt-4 font-bold" onClick={()=>setLimit(n=>n+12)}>عرض المزيد ({items.length-limit})</button>}</section>;
 return <div dir="rtl" className="tv-arabic-home"><nav className="flex flex-wrap gap-3 mb-6" aria-label="أقسام السينما العربية">{tabs.map(([id,label])=><button key={id} data-tv-focus={'arabic:tab:'+id} aria-pressed={tab===id} onClick={()=>change(id)} className={'rounded-xl px-5 py-3 font-bold '+(tab===id?'bg-purple-600':'bg-white/10')}>{label}</button>)}</nav>
 {(tab==='featured'||tab==='films')&&section('الأفلام والمسرحيات',films,'film')}
 {(tab==='featured'||tab==='series')&&section('المسلسلات العربية',series,'series')}
 {['featured','films','series'].includes(tab)&&query&&!films.length&&!series.length&&<p className="tv-notice">لا توجد نتائج في المختارات. اختر «كل المكتبة» أو «المشاهدة المباشرة» للبحث في المصادر الأخرى.</p>}
 {tab==='all'&&<ArabicDiscovery query={query} existing={[]} options={options} onMovie={onMovie} onEpisode={onPlay}/>}
 {tab==='direct'&&<AutoLibrary query={query} onPlay={onPlay} options={options}/>}
 {tab==='synced'&&<SyncedLibrary query={query} onPlay={onPlay}/>}
 {tab==='licensed'&&<LicensedLibrary query={query} onPlay={onPlay}/>}
 {selected&&row&&<div className="fixed inset-0 z-[4000] bg-black/80 flex items-center justify-center" onClick={close}><section role="dialog" aria-modal="true" aria-label={selected.title} className="tv-arabic-dialog bg-zinc-900 rounded-3xl p-6 overflow-y-auto" onClick={e=>e.stopPropagation()}><div className="flex gap-5 items-start"><img src={artwork(selected,'series')} className="w-28 rounded-xl object-cover" alt=""/><div className="flex-1"><h2 className="text-3xl font-black">{selected.title}</h2><p className="text-gray-400 mt-2">{selected.year} · اختر الحلقة</p></div><button data-tv-focus="arabic:close" aria-label="إغلاق" onClick={close} className="rounded-full bg-white/10 w-12 h-12 text-2xl">×</button></div><div className="flex flex-wrap gap-2 my-5">{selected.seasons.map((s,i)=><button key={s.id} data-tv-focus={'arabic:season:'+i} aria-pressed={season===i} onClick={()=>{setSeason(i);setEpisodeLimit(24);}} className={'rounded-xl px-5 py-3 '+(season===i?'bg-purple-600':'bg-white/10')}>{s.title||'الموسم '+s.season}</button>)}</div><div className="grid grid-cols-4 gap-3">{row.episodes.slice(0,episodeLimit).map(e=><button key={e.video} data-tv-focus={'arabic:episode:'+e.video} onClick={()=>playEpisode(e)} className="rounded-xl bg-white/10 py-4 font-bold">▶ الحلقة {e.number}</button>)}</div>{row.episodes.length>episodeLimit&&<button className="mt-5 bg-purple-600 rounded-xl px-6 py-3" onClick={()=>setEpisodeLimit(n=>n+24)}>المزيد من الحلقات</button>}</section></div>}
 </div>;
}
