import {matchPublisherSeries,publisherEpisode} from './publisherSeries.js';
import {matchPublisherFilm,publisherFilmSource} from './officialCatalog.js';
export function verifiedYoutubeAlternative(movie){
 const year=String(movie.release_date||'').slice(0,4);
 if(!/^\d{4}$/.test(year))return null;
 if(movie.media_type==='tv'){
  const group=matchPublisherSeries(movie);
  if(!group||group.year!==year)return null;
  const row=group.seasons.find(s=>s.season===Number(movie.season));
  if(!row||row.year!==year)return null;
  const source=publisherEpisode(group,movie.season,movie.episode);
  return source?{...source,provider:'youtube'}:null;
 }
 const film=matchPublisherFilm(movie);
 return film?{...publisherFilmSource(film),provider:'youtube'}:null;
}
export function fullyCoveredByYoutube(g){
 return g.seasons.every(s=>s.episodes.every(e=>verifiedYoutubeAlternative({media_type:'tv',seriesTitle:g.title,title:s.title,release_date:g.year,season:s.season,episode:e.number})));
}
