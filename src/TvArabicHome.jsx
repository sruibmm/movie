import React,{useEffect,useMemo,useState} from 'react';
import {PUBLISHER_FILMS,importedFilm} from './officialCatalog.js';
import {PUBLISHER_SERIES,importedEpisode} from './publisherSeries.js';
import {PLAYLIST_SERIES,playlistMovie} from './publisherPlaylists.js';
import {ARABIC_SITE_SERIES,siteEpisodeMovie} from './arabicSiteCatalog.js';
import {DUBAI_PLUS_TITLES} from './dubaiPlusCatalog.js';
import bulk from './arabicBulkCatalog.json';
import {movie as dmEpisode,filmMovie as dmFilm} from './BulkArabicLibrary.jsx';
import {validSyncedTitle,syncedMovie} from './syncedPlaybackModel.js';
import {normalizeLicensedCatalog,licensedMovie} from './licensedCatalog.js';
import {PRIVATE_KEY,validatePrivateCatalog,privateMovie} from './privateCatalog.js';
import {buildUnifiedCatalog,searchUnified,mixedUnified} from './tvUnifiedCatalog.js';
import ArabicDiscovery from './ArabicDiscovery.jsx';
import AutoLibrary from './AutoLibrary.jsx';
import SyncedLibrary from './SyncedLibrary.jsx';
import LicensedLibrary from './LicensedLibrary.jsx';
import DubaiPlusLibrary from './DubaiPlusLibrary.jsx';
const tabs=[['featured','كل المحتوى'],['movie','أفلام'],['tv','مسلسلات'],['play','مسرحيات'],['all','بحث موسّع'],['direct','المكتبة المتجددة'],['synced','Cinema Direct'],['licensed','المحفوظة'],['dubai','Dubai+']];
const labels={'youtube-film':'YouTube','youtube-series':'YouTube','dm-series':'Dailymotion','dm-film':'Dailymotion','dm-site':'Dailymotion','playlist':'قائمة الناشر','auto':'المكتبة المتجددة','synced':'Cinema Direct','licensed':'فيديو مرخّص','personal':'مكتبتك الشخصية','directory':'Dubai+ · فهرس'};
const kindLabel={movie:'فيلم',tv:'مسلسل',play:'مسرحية',collection:'مجموعة',unknown:'عمل'};
let lastTab='featured',lastRow=null,lastVariant=null,lastAuto=null;
export function resetTvArabicHome(){lastTab='featured';lastRow=null;lastVariant=null;lastAuto=null;}
const staticData={films:PUBLISHER_FILMS,series:PUBLISHER_SERIES,bulk,site:ARABIC_SITE_SERIES,playlists:PLAYLIST_SERIES,dubai:DUBAI_PLUS_TITLES};
function Poster({row,onClick}){
 const [bad,setBad]=useState(false);useEffect(()=>setBad(false),[row.poster]);
 return <button data-tv-focus={'arabic:unified:'+row.id} className="tv-poster-card group text-right min-w-0" onClick={onClick}><div className="tv-arabic-poster relative aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-900 border border-white/10">{row.poster&&!bad?<img src={row.poster} alt={row.title} loading="lazy" decoding="async" onError={()=>setBad(true)} className="w-full h-full object-cover"/>:<div className="tv-art-placeholder"><span>🎬</span><strong>{row.title}</strong></div>}<span className="absolute bottom-2 right-2 bg-black/80 rounded-lg px-2 py-1 text-xs">{kindLabel[row.kind]||'عمل'}</span></div><h3 className="mt-2 text-sm font-bold truncate">{row.title}</h3><p className="text-xs text-gray-400">{row.year||'Cinema'}{row.variants.every(v=>v.source==='directory')?' · فهرس فقط':''}</p></button>;
}
function entries(v){
 const x=v.item;const e=(key,label,play,season=null,episode=null)=>({key,label,play,season,episode});
 switch(v.source){
 case 'youtube-film':return [e(x.id,'▶ مشاهدة',()=>importedFilm(x))];
 case 'youtube-series':return x.seasons.flatMap(s=>s.episodes.map(a=>e(a.video,'الحلقة '+a.number,()=>importedEpisode(x,s,a),s.season,a.number)));
 case 'dm-series':return x.seasons.flatMap(s=>s.episodes.map(a=>e(a.id,'الحلقة '+a.number,()=>dmEpisode(x,s,a),s.season,a.number)));
 case 'dm-film':return [e(x.id,'▶ مشاهدة',()=>dmFilm(x))];
 case 'dm-site':return x.episodes.map(a=>e(a.id,'الحلقة '+a.number,()=>siteEpisodeMovie(x,a),1,a.number));
 case 'playlist':return x.seasons.map(s=>e(s.playlist,'▶ الموسم '+s.season,()=>playlistMovie(x,s),s.season));
 case 'synced':return x.episodes.map(a=>e(String(a.season)+':'+a.episode,x.kind==='tv'?'الحلقة '+a.episode:'▶ مشاهدة',()=>syncedMovie(x,a),a.season,a.episode));
 case 'licensed':case 'personal':return x.assets.map(a=>e(a.id,x.kind==='tv'?'الحلقة '+a.episode:'▶ مشاهدة',()=>v.source==='personal'?privateMovie(x,a):licensedMovie(x,a),a.season,a.episode));
 default:return [];
 }
}
export default function TvArabicHome({query,options,onMovie,onPlay}){
 const [tab,setTab]=useState(lastTab),[limit,setLimit]=useState(24),[selected,setSelected]=useState(lastRow),[variant,setVariant]=useState(lastVariant),[requested,setRequested]=useState(lastAuto),[season,setSeason]=useState(null),[episodeLimit,setEpisodeLimit]=useState(24),[error,setError]=useState('');
 const [live,setLive]=useState({auto:[],synced:[],licensed:[],next:null,status:'loading',recovery:false}),[refresh,setRefresh]=useState(0),[moreBusy,setMoreBusy]=useState(false);
 const [personal]=useState(()=>{try{return validatePrivateCatalog(JSON.parse(localStorage.getItem(PRIVATE_KEY)||'{"version":1,"titles":[]}')).titles;}catch{return [];}});
 const read=(url,signal)=>fetch(url,{signal,cache:'no-store'}).then(r=>{if(!r.ok)throw Error(String(r.status));return r.json();});
 const autoURL=cursor=>'/api/private-catalog/list?'+new URLSearchParams({q:query||'',kind:'all',region:'all',year:'all',ramadan:'0',cursor:cursor||''});
 useEffect(()=>{const c=new AbortController();setLive(x=>({...x,auto:[],next:null,status:'loading'}));setMoreBusy(false);
 Promise.allSettled([read(autoURL(''),c.signal),read('/api/source-sync/catalog',c.signal),read('/licensed-arabic.json',c.signal).then(normalizeLicensedCatalog)]).then(([a,s,l])=>{if(c.signal.aborted)return;setLive({auto:a.status==='fulfilled'&&Array.isArray(a.value.titles)?a.value.titles:[],next:a.status==='fulfilled'?a.value.next:null,recovery:a.status==='fulfilled'&&a.value.recovery===true,synced:s.status==='fulfilled'&&Array.isArray(s.value.titles)?s.value.titles.filter(validSyncedTitle):[],licensed:l.status==='fulfilled'?l.value:[],status:[a,s,l].some(x=>x.status==='rejected')?'partial':'ready'});});return()=>c.abort();
 },[query,refresh]);
 useEffect(()=>{setLimit(24);},[query,tab]);
 const rows=useMemo(()=>buildUnifiedCatalog({...staticData,auto:live.auto,synced:live.synced,licensed:live.licensed,personal}),[live,personal]);
 const shown=useMemo(()=>mixedUnified(searchUnified(rows,query,['movie','tv','play'].includes(tab)?tab:'all')),[rows,query,tab]);
 const change=t=>{lastTab=t;lastRow=null;lastVariant=null;lastAuto=null;setTab(t);setSelected(null);setVariant(null);setRequested(null);setError('');};
 useEffect(()=>{const back=e=>{if(selected||tab==='featured')return;change('featured');e.preventDefault();e.stopImmediatePropagation();};window.addEventListener('cinema-tv-back',back,true);return()=>window.removeEventListener('cinema-tv-back',back,true);},[tab,selected]);
 const open=row=>{setSelected(row);setVariant(row.variants[0]);setSeason(null);setEpisodeLimit(24);setError('');};
 const close=()=>{lastRow=null;lastVariant=null;setSelected(null);setVariant(null);setError('');};
 const select=v=>{setVariant(v);setSeason(null);setEpisodeLimit(24);setError('');};
 const launch=e=>{try{lastRow=selected;lastVariant=variant;lastTab=tab;onPlay(e.play());}catch(err){setError(err.message||'تعذر فتح مصدر المشاهدة');}};
 const openAuto=()=>{lastAuto=variant.item;lastTab='direct';lastRow=null;lastVariant=null;setRequested(variant.item);setSelected(null);setTab('direct');};
 const allEntries=useMemo(()=>variant?entries(variant):[],[variant]);
 const seasons=[...new Set(allEntries.map(e=>e.season).filter(n=>n!==null&&n!==undefined))];
 const shownEntries=allEntries.filter(e=>season===null||e.season===season);
 const more=async()=>{setLimit(n=>n+24);if(!live.next||moreBusy)return;setMoreBusy(true);const key=query;try{const r=await read(autoURL(live.next),AbortSignal.timeout(16000));if(!Array.isArray(r.titles))throw Error();setLive(x=>({...x,auto:[...new Map([...x.auto,...r.titles].map(v=>[v.id,v])).values()],next:r.next,recovery:r.recovery===true}));}catch{setError('تعذر تحميل المزيد من المكتبة المتجددة. جرّب إعادة المحاولة.');}finally{setMoreBusy(false);}};
 const grid=['featured','movie','tv','play'].includes(tab);
 return <div dir="rtl" className="tv-arabic-home"><nav className="flex flex-wrap gap-3 mb-6" aria-label="أقسام السينما العربية">{tabs.map(([id,label])=><button key={id} data-tv-focus={'arabic:tab:'+id} aria-pressed={tab===id} onClick={()=>change(id)} className={'rounded-xl px-5 py-3 font-bold '+(tab===id?'bg-purple-600':'bg-white/10')}>{label}</button>)}</nav>
 {grid&&<section className="tv-arabic-shelf"><h2 className="text-2xl font-black mb-3">{tab==='featured'?'السينما العربية · كل المكتبة':tabs.find(t=>t[0]===tab)?.[1]}</h2><p className="text-sm text-gray-400 mb-4">{shown.length} عنوان ظاهر في الفهرس الحالي · نفس مصادر الموقع</p>{live.status==='loading'&&<p className="text-xs text-gray-400 mb-3">جاري تحديث المكتبة المشتركة…</p>}{(live.status==='partial'||live.recovery)&&<p className="tv-notice">بعض المحتوى المباشر غير متاح حاليًا أو في وضع الاستعادة. المحتوى المحفوظ لم يُحذف. <button onClick={()=>setRefresh(n=>n+1)}>تحديث</button></p>}
 <div className="tv-poster-grid">{shown.slice(0,limit).map(row=><Poster key={row.id} row={row} onClick={()=>open(row)}/>)}</div>
 {(shown.length>limit||live.next)&&<button data-tv-focus="arabic:more:unified" className="bg-white/10 rounded-xl px-6 py-3 mt-4 font-bold" disabled={moreBusy} onClick={more}>{moreBusy?'جاري التحميل…':'عرض المزيد'}</button>}
 {!shown.length&&live.status!=='loading'&&<p className="tv-notice">لا توجد نتيجة في الفهرس الحالي. جرّب البحث الموسّع أو تحديث المكتبة.</p>}{error&&!selected&&<p role="alert" className="tv-notice">{error}</p>}</section>}
 {tab==='all'&&<ArabicDiscovery query={query} existing={[]} options={options} onMovie={onMovie} onEpisode={onPlay}/>}
 {tab==='direct'&&<AutoLibrary query={query} onPlay={onPlay} options={options} requestedWork={requested}/>}
 {tab==='synced'&&<SyncedLibrary query={query} onPlay={onPlay}/>}
 {tab==='licensed'&&<LicensedLibrary query={query} onPlay={onPlay}/>}
 {tab==='dubai'&&<DubaiPlusLibrary query={query} standalone onPlay={onPlay}/>}
 {selected&&variant&&<div className="fixed inset-0 z-[4000] bg-black/80 flex items-center justify-center" onClick={close}><section role="dialog" aria-modal="true" aria-label={selected.title} className="tv-arabic-dialog bg-zinc-900 rounded-3xl p-6 overflow-y-auto" onClick={e=>e.stopPropagation()}><div className="flex gap-5 items-start">{selected.poster&&<img src={selected.poster} className="w-28 rounded-xl object-cover" alt=""/>}<div className="flex-1"><h2 className="text-3xl font-black">{selected.title}</h2><p className="text-gray-400 mt-2">{selected.year} · {kindLabel[selected.kind]||'عمل'}</p></div><button data-tv-focus="arabic:close" aria-label="إغلاق" onClick={close} className="rounded-full bg-white/10 w-12 h-12 text-2xl">×</button></div>
 {selected.variants.length>1&&<div className="flex flex-wrap gap-2 my-5">{selected.variants.map((v,i)=><button key={v.id} aria-pressed={variant.id===v.id} onClick={()=>select(v)} className={'rounded-xl px-5 py-3 '+(variant.id===v.id?'bg-purple-600':'bg-white/10')}>{labels[v.source]||'المصدر'}{selected.variants.filter(x=>x.source===v.source).length>1?' '+(i+1):''}</button>)}</div>}
 {variant.source==='auto'?<button className="bg-purple-600 rounded-xl px-6 py-4 mt-5 font-bold" onClick={openAuto}>▶ فتح الحلقات والمشاهدة</button>:variant.source==='directory'?<p className="tv-notice">هذا عنوان في فهرس Dubai+ الرسمي. البث المباشر غير مؤكد داخل Cinema. اختر نسخة ناشر أخرى إن كانت متاحة.</p>:<>
 {seasons.length>1&&<div className="flex flex-wrap gap-2 my-5"><button onClick={()=>{setSeason(null);setEpisodeLimit(24);}} aria-pressed={season===null} className="rounded-xl px-5 py-3 bg-white/10">كل المواسم</button>{seasons.map(n=><button key={n} aria-pressed={season===n} onClick={()=>{setSeason(n);setEpisodeLimit(24);}} className={'rounded-xl px-5 py-3 '+(season===n?'bg-purple-600':'bg-white/10')}>الموسم {n}</button>)}</div>}
 <div className="grid grid-cols-4 gap-3 mt-5">{shownEntries.slice(0,episodeLimit).map(e=><button key={e.key} data-tv-focus={'arabic:episode:'+e.key} onClick={()=>launch(e)} className="rounded-xl bg-white/10 py-4 font-bold">{e.season&&seasons.length>1&&season===null?'م '+e.season+' · ':''}{e.label}</button>)}</div>{shownEntries.length>episodeLimit&&<button className="mt-5 bg-purple-600 rounded-xl px-6 py-3" onClick={()=>setEpisodeLimit(n=>n+24)}>المزيد من الحلقات</button>}</>}
 {error&&<p className="tv-notice" role="alert">{error}</p>}</section></div>}
 </div>;
}
