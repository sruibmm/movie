import fs from 'node:fs';
import assert from 'node:assert/strict';
console.log('CLOUDFLARE_SOURCE', JSON.stringify({branch:process.env.CF_PAGES_BRANCH||'local',commit:process.env.CF_PAGES_COMMIT_SHA||'local'}));
const c=JSON.parse(fs.readFileSync('src/arabicBulkCatalog.json','utf8'));
assert(c.series.length>=102 && c.films.length>=2,'Incomplete saved catalogue');
const ids=new Set(),titles=new Set();let episodes=0;
for(const g of c.series){assert(!titles.has(g.id),'Duplicate series');titles.add(g.id);assert(g.seasons.length>0);for(const s of g.seasons){assert.equal(s.episodes.length,s.expected);for(const [i,e] of s.episodes.entries()){assert.equal(e.number,i+1);assert(/^x[a-z0-9]+$/i.test(e.id));assert(!ids.has(e.id),'Duplicate episode');ids.add(e.id);episodes++;}}}
console.log('SNAPSHOT PASS',c.series.length,episodes,c.films.length);
