import catalog from './arabicBulkCatalog.json' with {type:'json'};
import {normalizeArabic} from './arabicDiscovery.js';
import {DM_PLAYER_CONFIGURED,dailymotionEmbed} from './arabicSiteCatalog.js';
export const BULK_CATALOG=catalog;
export const BULK_STATS=Object.freeze({series:catalog.series.length,episodes:catalog.series.reduce((n,g)=>n+g.seasons.reduce((m,s)=>m+s.episodes.length,0),0),films:catalog.films.length});
export const BULK_ENABLED=DM_PLAYER_CONFIGURED&&import.meta.env?.VITE_ARABIC_BULK_ENABLED==='true';
const key=s=>normalizeArabic(s).replace(/\s+/g,'').trim();
export function bulkSearch(query='',kind='all'){
 const q=key(query);return {series:kind==='movie'?[]:catalog.series.filter(g=>!q||key(g.title).includes(q)||g.seasons.some(s=>key(s.title).includes(q))),films:kind==='tv'?[]:catalog.films.filter(f=>!q||key(f.title).includes(q))};
}
function source(e,title){return {id:e.id,provider:'dailymotion',title,publisher:e.owner,source:'https://www.dailymotion.com/video/'+e.id,embed:dailymotionEmbed(e.id),adsPossible:true};}
export function bulkEpisodeMovie(g,s,e){const title=s.title+' · الحلقة '+e.number;return {id:'dailymotion:'+e.id,title,seriesTitle:g.title,media_type:'tv',season:s.season,episode:e.number,release_date:g.year?g.year+'-01-01':'',isArabic:true,original_language:'ar',licensedPoster:g.poster,publisherSource:source(e,title)};}
export function bulkFilmMovie(f){return {id:'dailymotion:'+f.id,title:f.title,media_type:'movie',release_date:f.year+'-01-01',isArabic:true,original_language:'ar',publisherSource:source(f,f.title)};}
export function findBulkPublisherSource(movie){
 if(!movie||movie.publisherSource||movie.licensedSource)return null;
 const names=[movie.seriesTitle,movie.title,movie.name,movie.original_name,movie.original_title].filter(Boolean).map(key);
 const year=String(movie.first_air_date||movie.release_date||'').slice(0,4);
 if(!/^\d{4}$/.test(year))return null;
 if(movie.media_type==='tv'){
  const found=catalog.series.filter(g=>g.year===year&&names.some(n=>n===key(g.title)));
  if(found.length!==1)return null;
  const s=found[0].seasons.find(x=>x.season===Number(movie.season));
  const e=s?.episodes.find(x=>x.number===Number(movie.episode));return e?source(e,s.title+' · الحلقة '+e.number):null;
 }
 const found=catalog.films.filter(f=>f.year===year&&names.includes(key(f.title)));
 return found.length===1?source(found[0],found[0].title):null;
}
export function attachBulkArabicSource(movie){if(!BULK_ENABLED)return movie;const s=findBulkPublisherSource(movie);return s?{...movie,publisherSource:s}:movie;}
