import assert from 'node:assert/strict';
import {syncedMovie,validSyncedTitle,resolveUrl,filterCandidates} from '../src/syncedPlaybackModel.js';
const t={work:'example:work',title:'Synthetic',kind:'tv',year:2026,episodes:[{season:1,episode:1},{season:1,episode:2}]};
assert(validSyncedTitle(t));const m=syncedMovie(t,t.episodes[1]);assert.equal(m.id,'sync:example%3Awork:1:2');assert.equal(resolveUrl(m.sourceSync),'/api/source-sync/resolve?work=example%3Awork&season=1&episode=2');assert.throws(()=>syncedMovie(t,{season:1,episode:3}));assert.throws(()=>resolveUrl({work:'x',season:1,episode:null}));
const now=Date.parse('2026-11-14T12:00:00Z');
const rights={provider:'test',reference:'synthetic',adFree:true,webPlayback:true,territories:['KW'],expires:'2027-01-01'};
const a={id:'a',provider:'test',url:'https://media.example.com/1.mp4',format:'mp4',height:720,duration:100,checkedAt:now,rights};
assert.deepEqual(filterCandidates({candidates:[a,{...a,id:'b',height:1080},{...a,id:'c',height:480},{...a,id:'d',url:a.url+'?token=x'},{...a,id:'e',rights:{...rights,expires:'2020-01-01'}},a]},now).map(x=>x.id),['b','a']);
console.log('PASS canonical movie identity, exact episode, candidate ordering and rights checks');

const opaque={...a,id:'opaque',url:'https://media.example.com/delivery/asset123',rights:{...rights,nativeMp4:true}};
assert.deepEqual(filterCandidates({candidates:[opaque,{...opaque,id:'unapproved',rights}]},now).map(x=>x.id),['opaque']);
console.log('PASS provider-declared opaque MP4 delivery');

import {exactSyncedAlternative,verifiedSyncedAlternative} from '../src/privatePlaybackFallback.js';
const work={id:'alooytv:fixture',title:'Synthetic',kind:'tv',year:'2026'},slot={season:1,episode:2};
assert.equal(exactSyncedAlternative(work,slot,[t]).sourceSync.episode,2);
assert.equal(exactSyncedAlternative(work,{season:2,episode:2},[t]),null);
assert.equal(exactSyncedAlternative({...work,year:'2025'},slot,[t]),null);
assert.equal(exactSyncedAlternative(work,slot,[t,{...t,work:'ambiguous'}]),null);
const current=Date.now(),asset={...a,checkedAt:current,rights:{...rights,expires:new Date(current+86400000).toISOString()}};
const mock=async url=>Response.json(url.includes('/catalog')?{titles:[t]}:{candidates:[asset]});
assert.equal((await verifiedSyncedAlternative(work,slot,mock)).sourceSync.episode,2);
const empty=async url=>Response.json(url.includes('/catalog')?{titles:[t]}:{candidates:[]});
assert.equal(await verifiedSyncedAlternative(work,slot,empty),null);
console.log('PASS exact approved fallback, no wrong year, season, ambiguous identity or empty source');
