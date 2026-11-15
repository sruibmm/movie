import {officialEmbed} from './officialCatalog.js';
import {dailymotionEmbedUrl} from './dailymotionPlayer.js';
export function expansionMovie(work,episode,consent=false){
 if(!consent||!work)return null;
 const isSeries=Array.isArray(work.episodes);
 if(isSeries&&!work.episodes.includes(episode))return null;
 const id=isSeries?episode.id:work.id;
 const embed=work.provider==='youtube'?officialEmbed(id):dailymotionEmbedUrl(id);
 if(!embed)return null;
 const title=isSeries?work.title+' — الحلقة '+episode.number:work.title;
 return {id:work.provider+':'+id,title,tmdbId:work.tmdbId,seriesTitle:isSeries?work.title:undefined,media_type:isSeries?'tv':'movie',season:isSeries?work.season:undefined,episode:isSeries?episode.number:undefined,release_date:work.year?work.year+'-01-01':'',isArabic:true,original_language:'ar',licensedPoster:work.poster,publisherSource:{id,provider:work.provider,title,publisher:work.publisher,source:work.source,embed,adsPossible:true,duration:isSeries?undefined:work.duration}};
}
