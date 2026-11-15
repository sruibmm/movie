import {normalizeArabic} from './arabicDiscovery.js';
import {PUBLISHER_SERIES,publisherEpisode} from './publisherSeries.js';
import {PUBLISHER_FILMS,publisherFilmSource} from './officialCatalog.js';
import base from './arabicBulkCatalog.json' with {type:'json'};
import alts from './publisherMegaAlternates.json' with {type:'json'};
const bulk={films:base.films,series:[...base.series,...alts]};
import {ARABIC_SITE_SERIES,arabicSiteEpisode} from './arabicSiteCatalog.js';
import {dailymotionEmbedUrl} from './dailymotionPlayer.js';
import expansion from './arabicPublisherExpansion.json' with {type:'json'};
import batch from './arabicPublisherBatch.json' with {type:'json'};
const norm=s=>normalizeArabic(s||'').replace(/\s+/g,'');
const year=y=>String(y||'').slice(0,4);
const validYear=y=>/^\d{4}$/.test(y);
const records=new Map();
const key=(type,title,y,s,e)=>[type,norm(title),y,s||0,e||0].join('|');
const valid=s=>s?.provider==='dailymotion'?!!dailymotionEmbedUrl(s.id):s?.provider==='youtube'&&/^[-_A-Za-z0-9]{11}$/.test(s.id||'');
function put(type,title,y,s,e,source,tmdbId){
 y=year(y);if(!title||!validYear(y)||!valid(source))return;
 const k=key(type,title,y,s,e);const arr=records.get(k)||[];
 if(!arr.some(r=>r.source.id===source.id&&r.source.provider===source.provider))arr.push({source,tmdbId});
 records.set(k,arr);
}
const yt=(id,publisher,source,title)=>({id,provider:'youtube',publisher,source,title,adsPossible:true});
const dm=(id,publisher,title)=>({id,provider:'dailymotion',publisher,title,source:'https://www.dailymotion.com/video/'+id,embed:dailymotionEmbedUrl(id),adsPossible:true});
for(const g of PUBLISHER_SERIES)if(g.kind==='tv')for(const s of g.seasons)for(const e of s.episodes){const src=publisherEpisode(g,s.season,e.number);if(src)put('tv',g.title,g.year,s.season,e.number,{...src,provider:'youtube'});}
for(const g of bulk.series)for(const s of g.seasons)for(const e of s.episodes)put('tv',g.title,g.year,s.season,e.number,dm(e.id,e.owner,g.title),g.tmdbId);
for(const g of ARABIC_SITE_SERIES)for(const e of g.episodes)put('tv',g.title,g.year,1,e.number,arabicSiteEpisode(g,e.number));
for(const s of expansion.series)for(const e of s.episodes)put('tv',s.title,s.year,s.season,e.number,s.provider==='youtube'?yt(e.id,s.publisher,s.source,s.title):dm(e.id,s.publisher,s.title),s.tmdbId);
for(const s of batch)for(const e of s.episodes)put('tv',s.title,s.year,s.season,e.number,yt(e.video,s.publisher,s.source,s.title));
for(const f of bulk.films)put('movie',f.title,f.year,0,0,dm(f.id,f.owner,f.title),f.tmdbId);
for(const f of expansion.films)put('movie',f.title,f.year,0,0,f.provider==='youtube'?yt(f.id,f.publisher,f.source,f.title):dm(f.id,f.publisher,f.title),f.tmdbId);
for(const f of PUBLISHER_FILMS){const s=publisherFilmSource(f);if(s)put('movie',f.title,f.year,0,0,{...s,provider:'youtube'},f.tmdbId);}
const identity=m=>({type:m.media_type==='tv'?'tv':'movie',title:m.media_type==='tv'?m.seriesTitle:m.title,y:year(m.release_date||m.first_air_date),s:Number(m.season)||1,e:Number(m.episode)||0});
function matching(m,n){const a=identity(m);if(!a.title||!validYear(a.y))return [];const rows=records.get(key(a.type,a.title,a.y,a.type==='tv'?a.s:0,a.type==='tv'?n??a.e:0))||[];
 const canonical=new Set(rows.map(x=>x.tmdbId).filter(Boolean).map(String));if(canonical.size>1)return [];
 if(m.tmdbId&&canonical.size&&!canonical.has(String(m.tmdbId)))return [];
 return rows.map(x=>x.source);
}
export function smartPublisherSources(m){
 const original=m.publisherSource;if(!original)return [];
 const out=[{...original,provider:original.provider||'youtube'}];
 for(const s of matching(m))if(!out.some(x=>x.id===s.id&&x.provider===s.provider))out.push(s);
 return out;
}
export function nextPublisherEpisode(m){
 const a=identity(m);if(a.type!=='tv'||!a.e)return null;const n=a.e+1,srcs=matching(m,n);if(!srcs.length)return null;
 const src=srcs.find(s=>s.provider===(m.publisherSource?.provider||'youtube'))||srcs[0];
 return {...m,id:src.provider+':'+src.id,title:a.title+' · الحلقة '+n,episode:n,publisherSource:src};
}
export const smartSourceStats=()=>({slots:records.size,multi:[...records.values()].filter(a=>a.length>1).length});
