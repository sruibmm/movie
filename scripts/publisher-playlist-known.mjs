import fs from 'node:fs';
import {PUBLISHER_SERIES} from '../src/publisherSeries.js';
import {PUBLISHER_FILMS} from '../src/officialCatalog.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const b=read('src/arabicBulkCatalog.json'),p=read('src/arabicPublisherBatch.json'),e=read('src/arabicPublisherExpansion.json');
const a=read('src/publisherMegaAlternates.json');
fs.writeFileSync('.cinema-playlist-known.json',JSON.stringify({series:[...PUBLISHER_SERIES.map(g=>({title:g.title,seasons:g.seasons.map(s=>({season:s.season,title:s.title,ids:s.episodes.map(x=>x.video)}))})),...[...b.series,...a].map(g=>({title:g.title,seasons:g.seasons.map(s=>({season:s.season,title:s.title,ids:s.episodes.map(x=>x.id)}))})),...p.map(s=>({title:s.title,seasons:[{season:s.season,ids:s.episodes.map(x=>x.video)}]})),...e.series.map(s=>({title:s.title,seasons:[{season:s.season,ids:s.episodes.map(x=>x.id)}]}))],films:[...PUBLISHER_FILMS.map(x=>x.video),...b.films.map(x=>x.id),...e.films.map(x=>x.id)]}));
