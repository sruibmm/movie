// Offline read-only validation of all Akwam metadata chunks imported from Arabic-Nuvio.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir=new URL('../docs/akwam-nuvio-staging/',import.meta.url);
const manifest=JSON.parse(await fs.readFile(new URL('manifest.json',dir),'utf8'));
assert.equal(manifest.catalog.uniqueTitles,16389);
assert.equal(manifest.catalog.chunks,17);
const ids=new Set(),counts={movie:0,tv:0},sources=new Set(),bad=[],arabic=[];
for(const item of manifest.catalog.files){
 const file=JSON.parse(await fs.readFile(new URL(item.path,dir),'utf8'));
 assert.equal(file.schema,1);
 assert.equal(file.source,'SafaaSalam/Arabic-Nuvio');
 assert.equal(file.rows.length,item.rows);
 for(const row of file.rows){
  assert(/^akwam:(?:movie|tv):\d+$/.test(row.id),'Bad id '+row.id);
  assert(!ids.has(row.id),'Duplicate '+row.id);
  ids.add(row.id);
  assert(['movie','tv'].includes(row.kind)&&row.title.trim().length>0,'Bad title '+row.id);
  assert(row.playbackStatus==='unverified','Playback unverified '+row.id);
  assert(!Object.keys(row).some(k=>/stream|mp4|mediaUrl|download/i.test(k)),'Unexpected media field '+row.id);
  const u=new URL(row.sourcePage);
  assert(u.origin==='https://akwam.ss'&&!u.search&&!u.username&&!u.password,'Bad source URL '+row.id);
  const [kind,id]=row.id.split(':').slice(1);
  assert(u.pathname.startsWith('/'+(kind==='tv'?'series':'movie')+'/'+id+'/'),'Mismatched URL '+row.id);
  assert(row.nuvioId.startsWith('akwam_'+(kind==='tv'?'series':'movie')+'__'+id+'__'),'Nuvio ID mismatch '+row.id);
  if(row.poster){const p=new URL(row.poster);assert(p.protocol==='https:','Unsecured poster');}
  if(row.arabicCategory)arabic.push(row.id);
  counts[row.kind]++;
 }
}
assert.deepEqual(counts,{movie:manifest.catalog.movies,tv:manifest.catalog.series});
assert.equal(ids.size,manifest.catalog.uniqueTitles);
assert.equal(arabic.length,manifest.catalog.arabicSeriesCategory);
assert(ids.has('akwam:tv:4072'),'Jaafar Al Omda missing');
assert.equal(manifest.playback.contentDownloaded,0);
assert.equal(manifest.playback.verifiedPlaybackCount,0);
console.log('NUVIO AKWAM STAGING PASS',JSON.stringify({uniqueTitles:ids.size,movies:counts.movie,series:counts.tv,arabicTagged:arabic.length,chunks:manifest.catalog.chunks}));
