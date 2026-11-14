import assert from 'node:assert/strict';
import catalog from '../src/arabicBulkCatalog.json' with {type:'json'};
import {highestQuality} from '../src/dailymotionPlayer.js';
assert.equal(highestQuality(['auto','480','1080','720']),'1080');
assert.equal(highestQuality(['2160','1440','720']),'2160');
assert.equal(highestQuality([]),null);
import {dailymotionPlayerResponse} from '../worker/dailymotion-player.js';
const req=id=>new Request('https://movie.o-a-f-a.workers.dev/api/dailymotion-player?video='+id);
const env={DAILYMOTION_PLAYER_ID:'test123',DAILYMOTION_PUBLISHER_PLAYERS:'{"OnlineartProduction":"test456"}'};
let n=0;for(const g of catalog.series)for(const s of g.seasons)for(const e of s.episodes){
 const d=await dailymotionPlayerResponse(req(e.id),env).json();
 assert.equal(d.video,e.id);assert.equal(d.title,g.title);assert.equal(d.episode,e.number);assert.equal(d.season,s.season);assert.equal(d.publisher,e.owner);
 const u=new URL(d.embed);assert.equal(u.searchParams.get('video'),e.id);assert.equal(u.pathname,'/player/'+(e.owner==='OnlineartProduction'?'test456':'test123')+'.html');assert.equal(d.playback,'unverified');n++;
}
assert(n>=3235);
const target=await dailymotionPlayerResponse(req('x6rtfip'),env).json();
assert.equal(target.title,'محرومين');assert.equal(target.episode,35);
const missing=await dailymotionPlayerResponse(req('x6rtfip'),{}).json();
assert.equal(missing.configured,true);assert.equal(missing.embed,'https://geo.dailymotion.com/player/x8lr5.html?video=x6rtfip');
assert.equal(dailymotionPlayerResponse(req('x000000'),env).status,404);
for(const f of catalog.films){const d=await dailymotionPlayerResponse(req(f.id),env).json();assert.equal(d.title,f.title);assert.equal(new URL(d.embed).searchParams.get('video'),f.id);}
console.log('DAILYMOTION MAPPING PASS',n,'episodes',catalog.films.length,'films; test IDs only, no playback claim');
