import {normalizeArabic} from './arabicDiscovery.js';
import {importedEpisode} from './publisherSeries.js';
export function batchGroups(rows) {
 const groups=new Map();
 for(const row of rows){
  const key=normalizeArabic(row.title);
  if(!groups.has(key))groups.set(key,{id:'batch:'+key,title:row.title,year:row.year,kind:'tv',poster:'https://i.ytimg.com/vi/'+row.episodes[0].video+'/hqdefault.jpg',seasons:[]});
  const g=groups.get(key);g.year=Math.min(g.year,row.year);g.seasons.push({...row,title:row.title,channel:row.publisher,poster:'https://i.ytimg.com/vi/'+row.episodes[0].video+'/hqdefault.jpg'});
 }
 return [...groups.values()].map(g=>({...g,seasons:g.seasons.sort((a,b)=>a.season-b.season)}));
}
export function batchMovie(g,s,e,allowed){
 if(!allowed||!g?.seasons.includes(s)||!s?.episodes.includes(e))return null;
 return importedEpisode(g,s,e);
}
