import fs from 'node:fs';
import assert from 'node:assert/strict';
import {expansionMovie} from '../src/arabicPublisherExpansion.js';
import {approvedPublisherUrl} from '../src/arabicSiteCatalog.js';
const d=JSON.parse(fs.readFileSync('src/arabicPublisherExpansion.json','utf8'));
const q=JSON.parse(fs.readFileSync('docs/arabic-bulk-queue.json','utf8'));
const pending=new Set(q.pending.map(r=>r.provider+':'+r.id));const ids=new Set();
for(const f of d.films){const m=expansionMovie(f,null,true);assert(m&&approvedPublisherUrl(m.publisherSource,m));assert(!expansionMovie(f,null,false));assert(pending.has(m.id));assert(!ids.has(m.id));ids.add(m.id);assert(f.poster&&f.runtime);}
for(const s of d.series){assert.equal(s.episodes.length,s.expected);for(const [i,e] of s.episodes.entries()){assert.equal(e.number,i+1);const m=expansionMovie(s,e,true);assert(m&&approvedPublisherUrl(m.publisherSource,m));assert(pending.has(m.id));assert(!ids.has(m.id));ids.add(m.id);assert.equal(m.season,s.season);assert.equal(m.episode,e.number);}}
console.log('EXPANSION PASS',d.films.length,d.series.length,ids.size);
