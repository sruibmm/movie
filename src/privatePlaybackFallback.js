import {normalizeArabic} from './arabicDiscovery.js';
import {dailymotionEmbedUrl} from './dailymotionPlayer.js';
// Do not use a similar title, another season, or another episode as a substitute.
export function savedEpisode(work,slot,titles){
 const t=titles.find(t=>t.id===work.id&&t.kind===work.kind);
 return t?.assets?.find(a=>a.id===slot.id&&a.season===slot.season&&a.episode===slot.episode&&a.url&&['mp4','hls'].includes(a.format))||null;
}
export function publisherAlternative(work,slot,catalog){
 const year=String(work.year||'').slice(0,4),name=normalizeArabic(work.title);
 if(!/^\d{4}$/.test(year)||!name)return null;
 const matches=(work.kind==='tv'?catalog.series:work.kind==='movie'?catalog.films:[]).filter(t=>String(t.year||'').slice(0,4)===year&&normalizeArabic(t.title)===name);
 if(matches.length!==1)return null;
 const t=matches[0];let e=t,s=null;
 if(work.kind==='tv'){
  const seasons=t.seasons.filter(x=>x.season===slot.season);if(seasons.length!==1)return null;s=seasons[0];
  const episodes=s.episodes.filter(x=>x.number===slot.episode);if(episodes.length!==1)return null;e=episodes[0];
 }
 const embed=dailymotionEmbedUrl(e.id);if(!embed)return null;
 return {id:'dailymotion:'+e.id,title:s?t.title+' · الحلقة '+slot.episode:t.title,seriesTitle:t.title,media_type:work.kind,season:slot.season,episode:slot.episode,release_date:year+'-01-01',isArabic:true,original_language:'ar',licensedPoster:t.poster||work.poster,publisherSource:{id:e.id,provider:'dailymotion',title:t.title,publisher:e.owner,source:'https://www.dailymotion.com/video/'+e.id,embed,adsPossible:true}};
}
