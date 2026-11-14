// Arabic-only supplemental discovery. The main movie search is untouched.
export const normalizeArabic=v=>String(v||'').normalize('NFKC').toLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function queryVariants(q){const raw=String(q||'').trim().slice(0,120);return [...new Set([raw,normalizeArabic(raw),normalizeArabic(raw).replace(/\b8\b/g,'ثمانية')].filter(Boolean))].slice(0,3);}
export function mergeArabic(rows,existing=[]){const used=new Set(existing.map(x=>(x.media_type||'movie')+':'+x.id));return rows.flat().filter(x=>{const type=x.media_type||'movie';const key=type+':'+x.id;if(!['tv','movie'].includes(type)||x.original_language!=='ar'||!Number.isInteger(x.id)||x.adult||used.has(key))return false;used.add(key);return true;}).map(x=>({...x,media_type:x.media_type||'movie',title:x.title||x.name,release_date:x.release_date||x.first_air_date}));}
export function episodeMovie(show,season,episode){if(!Number.isInteger(show.id)||!Number.isInteger(season)||season<1||!Number.isInteger(episode.episode_number)||episode.episode_number<1)throw Error('Invalid episode');return {id:'tv:'+show.id+':'+season+':'+episode.episode_number,tmdbId:show.id,media_type:'tv',season,episode:episode.episode_number,title:(show.name||show.title)+' · S'+season+' E'+episode.episode_number,seriesTitle:show.name||show.title,runtime:episode.runtime,release_date:show.first_air_date||show.release_date,poster_path:show.poster_path,original_language:show.original_language,isArabic:show.original_language==='ar'};}
export function embedwaveUrl(movie){if(movie.media_type==='tv'){if(!Number.isInteger(movie.tmdbId)||!Number.isInteger(movie.season)||!Number.isInteger(movie.episode)||movie.season<1||movie.episode<1)throw Error('Invalid TV route');return 'https://embedwave.cc/embed/tv/'+movie.tmdbId+'/'+movie.season+'/'+movie.episode+'?server=cinesrc';}return 'https://embedwave.cc/embed/movie/'+encodeURIComponent(movie.id)+'?server=cinesrc';}

export const ARABIC_GENRES=Object.freeze([{id:'',label:'كل الأنواع'},{id:'18',label:'دراما'},{id:'35',label:'كوميديا'},{id:'10751',label:'عائلي'},{id:'80',label:'جريمة'},{id:'9648',label:'غموض'},{id:'99',label:'وثائقي'}]);
export const ARABIC_SORTS=Object.freeze(['popular','newest','top']);
export function arabicCatalogJobs({query='',kind='all',genre='',sort='popular',page=1}={}){
 const types=kind==='tv'?['tv']:kind==='movie'?['movie']:['movie','tv'];
 const p=String(Math.max(1,Math.min(500,Number(page)||1)));
 const common={language:'ar-SA',page:p,include_adult:'false'};
 if(String(query).trim())return queryVariants(query).flatMap(q=>types.map(type=>({type,path:'search/'+type,params:{...common,query:q}})));
 return types.map(type=>({type,path:'discover/'+type,params:{...common,with_original_language:'ar',sort_by:sort==='newest'?(type==='tv'?'first_air_date.desc':'primary_release_date.desc'):sort==='top'?'vote_average.desc':'popularity.desc',...(genre?{with_genres:String(genre)}:{}),...(sort==='top'?{'vote_count.gte':'20'}:{})}}));
}
export function arabicCatalogPage(previous,rows,existing=[]){return mergeArabic([previous,rows],existing);}
export function arabicCatalogPageCount(responses){return Math.max(1,...responses.map(d=>Math.min(500,Math.max(1,Number(d?.total_pages)||1))));}
