import {APPROVED_EMBEDS,attachApprovedEmbed} from './approvedEmbedCatalog.js';
import {normalizeArabic} from './arabicDiscovery.js';
export function independentArabicMovie(item){
 const movie={id:item.movieId,title:item.title,original_title:item.originalTitle,media_type:'movie',release_date:item.year+'-01-01',isArabic:true,original_language:'ar',runtime:Math.round(item.duration/60),licensedPoster:item.poster,overview:item.overview};
 return attachApprovedEmbed(movie);
}
export function independentArabicItems(query='',category='all'){
 const q=normalizeArabic(query);
 return APPROVED_EMBEDS.filter(x=>x.kind==='movie'&&x.adsPossible===false&&x.category&&(!q||normalizeArabic(x.title+' '+x.originalTitle+' '+x.publisher+' '+(x.overview||'')).includes(q))&&(category==='all'||x.category===category)).map(item=>({item,movie:independentArabicMovie(item)})).filter(x=>x.movie.publisherSource).sort((a,b)=>b.item.year-a.item.year||a.item.title.localeCompare(b.item.title,'ar'));
}
export function observedQuality(item){const o=item.observed;return o?.height>=1080?'1080p':o?.height>=720?'720p':o?.width>=1920&&o?.height>=800?'1080p عريض':o?.width>=1280&&o?.height>=540?'720p عريض':'جودة غير مؤكدة';}
