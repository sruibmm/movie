import fs from 'node:fs';
import assert from 'node:assert/strict';
import {normalizeArabic} from '../src/arabicDiscovery.js';
import {PUBLISHER_SERIES} from '../src/publisherSeries.js';
import {PUBLISHER_FILMS} from '../src/officialCatalog.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const norm=s=>normalizeArabic(s||'').replace(/[ةه]/g,'ه').replace(/\s+/g,'');
const b=read('src/arabicBulkCatalog.json'),p=read('src/arabicPublisherBatch.json'),out=read('src/arabicPublisherExpansion.json'),alt=read('src/publisherMegaAlternates.json');
const used=new Set([...PUBLISHER_SERIES.flatMap(g=>g.seasons.flatMap(s=>s.episodes.map(e=>e.video))),...[...b.series,...alt].flatMap(g=>g.seasons.flatMap(s=>s.episodes.map(e=>e.id))),...p.flatMap(s=>s.episodes.map(e=>e.video)),...out.series.flatMap(s=>s.episodes.map(e=>e.id)),...out.films.map(f=>f.id),...b.films.map(f=>f.id),...PUBLISHER_FILMS.map(f=>f.video)]);
const titles=new Set([...PUBLISHER_SERIES.flatMap(g=>g.seasons.map(s=>norm(g.title)+':'+s.season)),...[...b.series,...alt].flatMap(g=>g.seasons.map(s=>norm(g.title)+':'+s.season)),...p.map(s=>norm(s.title)+':'+s.season),...out.series.map(s=>norm(s.title)+':'+s.season)]);
const keys=new Set(out.series.map(s=>s.tmdbId+':'+s.season));
const filmTitles=new Set([...PUBLISHER_FILMS,...b.films,...out.films].map(f=>norm(f.title)));
const filmKeys=new Set(out.films.map(f=>f.tmdbId));
const sources=['docs/publisher-hub-series-verified.json','docs/publisher-playlist-mega-verified.json'];
const rows=sources.flatMap(read),added=[],held=[],films=[];
const labels={224885:'دجلة وفرات',259725:'السبنسة',228029:'قلوب'};
for(const r of rows){
 if(labels[r.tmdbId])r.title=labels[r.tmdbId];
 const k=r.tmdbId+':'+r.season,t=norm(r.title)+':'+r.season;
 if(keys.has(k)||titles.has(t)||r.episodes.some(e=>used.has(e.id))){held.push({title:r.title,season:r.season,reason:'existing title, canonical season or video overlap'});continue;}
 assert.equal(r.expected,r.episodes.length);
 assert(r.episodes.every((e,i)=>e.number===i+1&&/^[-_A-Za-z0-9]{11}$/.test(e.id)));
 assert.equal(new Set(r.episodes.map(e=>e.id)).size,r.expected);
 assert(r.evidence.includes('all individual publisher oEmbed'));
 keys.add(k);titles.add(t);r.episodes.forEach(e=>used.add(e.id));out.series.push(r);added.push({title:r.title,season:r.season,episodes:r.expected,publisher:r.publisher});
}
const filmSources=['docs/publisher-aflam-approved.json','docs/publisher-direct-film-v2-approved.json'];
for(const f of filmSources.filter(x=>fs.existsSync(x)).flatMap(read)){
 if(used.has(f.id)||filmKeys.has(f.tmdbId)||filmTitles.has(norm(f.title)))continue;
 assert(/^[-_A-Za-z0-9]{11}$/.test(f.id)&&f.runtime&&f.poster);
 used.add(f.id);filmKeys.add(f.tmdbId);filmTitles.add(norm(f.title));out.films.push(f);films.push({title:f.title,id:f.id,publisher:f.publisher});
}
out.series.sort((a,b)=>b.year.localeCompare(a.year)||a.title.localeCompare(b.title,'ar')||a.season-b.season);
out.films.sort((a,b)=>b.year.localeCompare(a.year)||a.title.localeCompare(b.title,'ar'));
fs.writeFileSync('src/arabicPublisherExpansion.json.tmp',JSON.stringify(out,null,2)+'\n');fs.renameSync('src/arabicPublisherExpansion.json.tmp','src/arabicPublisherExpansion.json');
const summary={addedSeasons:added.length,addedEpisodes:added.reduce((n,s)=>n+s.episodes,0),addedTitles:new Set(added.map(s=>s.title)).size,addedFilms:films.length,held:held.length,totals:{films:out.films.length,seasons:out.series.length,episodes:out.series.reduce((n,s)=>n+s.episodes.length,0)}};
fs.writeFileSync('docs/publisher-mega-v2-report.json',JSON.stringify({summary,added,films,held},null,2)+'\n');
console.log('MERGE V2',JSON.stringify(summary));console.log('HELD',JSON.stringify(held));
