import assert from 'node:assert/strict';
import {BULK_CATALOG,BULK_STATS,BULK_ENABLED,bulkSearch,bulkEpisodeMovie,bulkFilmMovie,findBulkPublisherSource,attachBulkArabicSource} from '../src/bulkArabicCatalog.js';
assert.equal(BULK_STATS.series,102);assert.equal(BULK_STATS.episodes,3235);assert.equal(BULK_STATS.films,2);
const ids=new Set();const titles=new Set();for(const g of BULK_CATALOG.series){assert.ok(!titles.has(g.id));titles.add(g.id);for(const [i,s] of g.seasons.entries()){assert.equal(s.season,i+1);assert.equal(s.episodes.length,s.expected);for(const [j,e] of s.episodes.entries()){assert.equal(e.number,j+1);assert.match(e.id,/^x[a-z0-9]{5,12}$/);assert.ok(e.duration>=1100&&e.owner);assert.ok(!ids.has(e.id));ids.add(e.id);}}}
for(const f of BULK_CATALOG.films){assert.ok(!ids.has(f.id));assert.ok(f.duration>4500);ids.add(f.id);}
assert.equal(ids.size,3237);assert.equal(bulkSearch('محرومين').series[0].seasons[0].expected,49);assert.equal(bulkSearch('عشق النساء').series[0].seasons[0].expected,55);assert.equal(bulkSearch('علاقات خاصة').series[0].seasons[0].expected,85);
assert.equal(bulkSearch('سحر العيون','movie').films.length,1);
const g=bulkSearch('محرومين').series[0],s=g.seasons[0],e=s.episodes[0];assert.equal(bulkEpisodeMovie(g,s,e).publisherSource.id,e.id);assert.equal(bulkFilmMovie(BULK_CATALOG.films[0]).publisherSource.provider,'dailymotion');
const movie={media_type:'tv',title:'محرومين',first_air_date:'2017-01-01',season:1,episode:49};assert.equal(findBulkPublisherSource(movie).id,s.episodes[48].id);assert.equal(findBulkPublisherSource({...movie,first_air_date:'2020-01-01'}),null);assert.equal(findBulkPublisherSource({...movie,episode:50}),null);assert.equal(BULK_ENABLED,false);assert.equal(attachBulkArabicSource(movie),movie);
console.log('BULK METADATA PASS: 102 distinct series, 3235 consecutive unique episode IDs, 2 films; playback gated pending verified Player ID');
