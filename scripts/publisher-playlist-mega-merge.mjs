import fs from 'node:fs';
import assert from 'node:assert/strict';
import {normalizeArabic} from '../src/arabicDiscovery.js';
import {PUBLISHER_SERIES} from '../src/publisherSeries.js';
import {PUBLISHER_FILMS} from '../src/officialCatalog.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const norm=s=>normalizeArabic(s||'').replace(/[ةه]/g,'ه').replace(/\s+/g,'');
const b=read('src/arabicBulkCatalog.json'),p=read('src/arabicPublisherBatch.json'),out=read('src/arabicPublisherExpansion.json');
const known=new Set([...PUBLISHER_SERIES.flatMap(g=>g.seasons.flatMap(s=>s.episodes.map(e=>e.video))),...b.series.flatMap(g=>g.seasons.flatMap(s=>s.episodes.map(e=>e.id))),...p.flatMap(s=>s.episodes.map(e=>e.video)),...out.series.flatMap(s=>s.episodes.map(e=>e.id)),...out.films.map(f=>f.id),...PUBLISHER_FILMS.map(f=>f.video)]);
const seasons=new Set([...PUBLISHER_SERIES.flatMap(g=>g.seasons.map(s=>norm(g.title)+':'+s.season)),...b.series.flatMap(g=>g.seasons.map(s=>norm(g.title)+':'+s.season)),...p.map(s=>norm(s.title)+':'+s.season),...out.series.map(s=>norm(s.title)+':'+s.season)]);
const canonical=new Set(out.series.map(s=>s.tmdbId+':'+s.season));
const rows=read('docs/publisher-playlist-mega-approved.json'),added=[],held=[];
for(const r of rows){const key=norm(r.title)+':'+r.season,k=r.tmdbId+':'+r.season;if(seasons.has(key)||canonical.has(k)||r.episodes.some(e=>known.has(e.id))){held.push(r.title);continue;}
 assert.equal(r.expected,r.episodes.length);assert(r.episodes.every((e,i)=>e.number===i+1&&/^[-_A-Za-z0-9]{11}$/.test(e.id)));assert.equal(new Set(r.episodes.map(e=>e.id)).size,r.expected);
 seasons.add(key);canonical.add(k);r.episodes.forEach(e=>known.add(e.id));out.series.push(r);added.push({title:r.title,season:r.season,episodes:r.expected,publisher:r.publisher});}
out.series.sort((a,b)=>b.year.localeCompare(a.year)||a.title.localeCompare(b.title,'ar')||a.season-b.season);
fs.writeFileSync('src/arabicPublisherExpansion.json.tmp',JSON.stringify(out,null,2)+'\n');fs.renameSync('src/arabicPublisherExpansion.json.tmp','src/arabicPublisherExpansion.json');
const summary={addedSeasons:added.length,addedEpisodes:added.reduce((n,s)=>n+s.episodes,0),addedTitles:new Set(added.map(s=>s.title)).size,held,added};
fs.writeFileSync('docs/publisher-playlist-mega-import-report.json',JSON.stringify(summary,null,2)+'\n');console.log('MERGE',JSON.stringify(summary));
