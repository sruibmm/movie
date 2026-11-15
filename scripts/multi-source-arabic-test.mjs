import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PUBLISHER_SERIES,importedEpisode} from '../src/publisherSeries.js';
import {multiSourceSeries,multiDailymotionMovie} from '../src/multiSourceArabic.js';
const bulk=JSON.parse(fs.readFileSync(new URL('../src/arabicBulkCatalog.json',import.meta.url)));
const rows=multiSourceSeries(PUBLISHER_SERIES,bulk.series);
assert(rows.length>0);assert.equal(new Set(rows.map(g=>g.id)).size,rows.length);
let n=0;
for(const g of rows)for(const s of g.seasons)for(const e of s.episodes){const y=importedEpisode(g.youtube,s.youtube,e.youtube),d=multiDailymotionMovie(g,s,e);assert.equal(y.episode,d.episode);assert.equal(y.season,d.season);assert.equal(d.release_date.slice(0,4),g.year);assert.equal(d.id,'dailymotion:'+e.dailymotion.id);assert.equal(y.id,'youtube:'+e.youtube.video);assert.equal(d.publisherSource.adsPossible,true);n++;}
const g=rows[0],b=g.dailymotion;
assert.equal(multiSourceSeries([g.youtube],[{...b,year:''}]).length,0);
assert.equal(multiSourceSeries([g.youtube],[b,{...b,id:'ambiguous'}]).length,0);
assert.equal(multiSourceSeries([g.youtube],[{...b,year:'1900'}]).length,0);
console.log('PASS exact multi-source catalogue:',rows.length,'series,',n,'episode pairs; no new media links activated');
