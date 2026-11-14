import {normalizeArabic} from './arabicDiscovery.js';
import {WATAN_SERIES} from './watanSeries.js';
const valid=id=>/^[-_A-Za-z0-9]{11}$/.test(id||'');
const norm=s=>normalizeArabic(s).replace(/\s+/g,' ').trim();
const collections=new Set(['حول العالم في 30 طبخة','أفلام عرب دراما','افلام شام دراما','زاد الروح','هو الله','حقائق قرآنية','نساء عصر النبوة','معالم أثرية','إذاعة فيتامين','طرائف العرب'].map(norm));
const grouped=new Map();
for(const row of WATAN_SERIES){
 if(!row.episodes?.length)continue;
 const key=norm(row.seriesTitle||row.title);
 if(!grouped.has(key))grouped.set(key,{id:'wf:'+key,title:row.seriesTitle||row.title,year:row.year,kind:collections.has(key)?'collection':'tv',poster:row.poster,seasons:[]});
 const g=grouped.get(key);g.seasons.push(row);
 if(row.poster&&!g.poster)g.poster=row.poster;
 if(row.year&&(!g.year||row.year<g.year))g.year=row.year;
}
export const PUBLISHER_SERIES=[...grouped.values()].map(g=>({...g,seasons:g.seasons.sort((a,b)=>a.season-b.season)}));
export const PUBLISHER_EPISODES=WATAN_SERIES.reduce((n,s)=>n+s.episodes.length,0);
export function matchPublisherSeries(movie){
 const names=[movie.seriesTitle,movie.original_name,movie.name,movie.original_title,movie.title].filter(Boolean).map(norm);
 const candidates=PUBLISHER_SERIES.filter(g=>g.kind==='tv'&&(names.includes(norm(g.title))||g.seasons.some(s=>names.includes(norm(s.title)))));
 if(candidates.length!==1)return null;
 const g=candidates[0],year=String(movie.release_date||movie.first_air_date||'').slice(0,4);
 // Same title, different releases are not silently treated as the same work.
 if(year&&g.year&&g.seasons.length===1&&g.seasons[0].season===1&&year!==g.year)return null;
 return g;
}
export function publisherEpisode(g,season,number){
 const rows=g.seasons.filter(s=>s.season===Number(season));
 if(rows.length!==1)return null;
 const e=rows[0].episodes.find(x=>x.number===Number(number)&&valid(x.video));
 return e?{id:e.video,title:rows[0].title+' · الحلقة '+e.number,publisher:rows[0].channel,embed:'https://www.youtube-nocookie.com/embed/'+e.video+'?playsinline=1&rel=0',adsPossible:true,source:rows[0].source}:null;
}
export function attachPublisherEpisode(movie){
 if(movie.publisherSource||movie.media_type!=='tv')return movie;
 const g=matchPublisherSeries(movie);
 const source=g&&publisherEpisode(g,movie.season,movie.episode);
 return source?{...movie,publisherSource:source}:movie;
}
export function importedEpisode(g,row,e){
 if(!valid(e.video))throw Error('Invalid video ID');
 const source={id:e.video,title:row.title+' · الحلقة '+e.number,publisher:row.channel,embed:'https://www.youtube-nocookie.com/embed/'+e.video+'?playsinline=1&rel=0',adsPossible:true,source:row.source};
 return {id:'youtube:'+e.video,title:row.title+' · الحلقة '+e.number,seriesTitle:g.title,media_type:g.kind==='tv'?'tv':'movie',season:row.season,episode:e.number,release_date:row.year?row.year+'-01-01':'',isArabic:true,original_language:'ar',licensedPoster:row.poster||g.poster,publisherSource:source};
}
