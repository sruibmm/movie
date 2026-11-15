import {normalizeArabic} from './arabicDiscovery.js';
import {dailymotionEmbedUrl} from './dailymotionPlayer.js';
const norm=t=>normalizeArabic(t);
const year=y=>/^\d{4}$/.test(String(y||''))?String(y):null;
const ytId=id=>/^[-_A-Za-z0-9]{11}$/.test(id||'');
// Exact title/year, unique group and exact numbered episode only.
// Keep existing source-specific movie IDs so saved history is not overwritten.
export function multiSourceSeries(yt,dm){
 const result=[];
 for(const g of yt){
  if(g.kind!=='tv'||!year(g.year))continue;
  const matches=dm.filter(d=>norm(d.title)===norm(g.title)&&year(d.year)===year(g.year));
  if(matches.length!==1||yt.filter(x=>x.kind==='tv'&&norm(x.title)===norm(g.title)&&year(x.year)===year(g.year)).length!==1)continue;
  const d=matches[0],seasons=[];
  for(const s of g.seasons){
   const ds=d.seasons.filter(x=>x.season===s.season);
   if(ds.length!==1||g.seasons.filter(x=>x.season===s.season).length!==1||year(s.year)!==year(g.year))continue;
   const b=ds[0];if(b.year&&year(b.year)!==year(s.year))continue;
   const episodes=[];
   for(const e of s.episodes){
    if(!Number.isSafeInteger(e.number)||e.number<1||!ytId(e.video)||s.episodes.filter(x=>x.number===e.number).length!==1)continue;
    const es=b.episodes.filter(x=>x.number===e.number);
    if(es.length!==1||!dailymotionEmbedUrl(es[0].id))continue;
    episodes.push({number:e.number,youtube:e,dailymotion:es[0]});
   }
   if(episodes.length)seasons.push({season:s.season,youtube:s,dailymotion:b,episodes});
  }
  if(seasons.length)result.push({id:g.id,title:g.title,year:g.year,poster:g.poster||d.poster,youtube:g,dailymotion:d,seasons});
 }
 return result.sort((a,b)=>String(b.year).localeCompare(String(a.year))||a.title.localeCompare(b.title,'ar'));
}
export function multiDailymotionMovie(g,s,e){
 const source=e.dailymotion,embed=dailymotionEmbedUrl(source.id);
 if(!embed)return null;
 return {id:'dailymotion:'+source.id,title:s.dailymotion.title+' · الحلقة '+e.number,seriesTitle:g.title,media_type:'tv',season:s.season,episode:e.number,release_date:g.year+'-01-01',isArabic:true,original_language:'ar',licensedPoster:g.poster,publisherSource:{id:source.id,provider:'dailymotion',title:s.dailymotion.title+' · الحلقة '+e.number,publisher:source.owner,source:'https://www.dailymotion.com/video/'+source.id,embed,adsPossible:true}};
}
