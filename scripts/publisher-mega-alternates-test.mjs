import fs from 'node:fs';
import assert from 'node:assert/strict';
import {PUBLISHER_SERIES} from '../src/publisherSeries.js';
import {multiSourceSeries} from '../src/multiSourceArabic.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const base=read('src/arabicBulkCatalog.json'),alt=read('src/publisherMegaAlternates.json');
const ids=new Set(base.series.flatMap(g=>g.seasons.flatMap(s=>s.episodes.map(e=>e.id))));
for(const g of alt){assert(!base.series.some(b=>b.title===g.title));for(const s of g.seasons){assert.equal(s.expected,s.episodes.length);for(const [i,e] of s.episodes.entries()){assert.equal(e.number,i+1);assert(!ids.has(e.id));ids.add(e.id);}}}
const matches=multiSourceSeries(PUBLISHER_SERIES,[...base.series,...alt]);
for(const g of alt)assert(matches.some(x=>x.id===g.id));
console.log('ALTERNATE PASS',alt.length,alt.reduce((n,g)=>n+g.seasons.reduce((m,s)=>m+s.episodes.length,0),0),'total multsource',matches.length);
