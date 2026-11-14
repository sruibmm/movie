import assert from 'node:assert/strict';
import {syncedMovie,validSyncedTitle,resolveUrl,filterCandidates} from '../src/syncedPlaybackModel.js';
const t={work:'example:work',title:'Synthetic',kind:'tv',year:2026,episodes:[{season:1,episode:1},{season:1,episode:2}]};
assert(validSyncedTitle(t));const m=syncedMovie(t,t.episodes[1]);assert.equal(m.id,'sync:example%3Awork:1:2');assert.equal(resolveUrl(m.sourceSync),'/api/source-sync/resolve?work=example%3Awork&season=1&episode=2');assert.throws(()=>syncedMovie(t,{season:1,episode:3}));assert.throws(()=>resolveUrl({work:'x',season:1,episode:null}));
const now=Date.parse('2026-11-14T12:00:00Z');
const rights={provider:'test',reference:'synthetic',adFree:true,webPlayback:true,territories:['KW'],expires:'2027-01-01'};
const a={id:'a',provider:'test',url:'https://media.example.com/1.mp4',format:'mp4',height:720,duration:100,checkedAt:now,rights};
assert.deepEqual(filterCandidates({candidates:[a,{...a,id:'b',height:1080},{...a,id:'c',height:480},{...a,id:'d',url:a.url+'?token=x'},{...a,id:'e',rights:{...rights,expires:'2020-01-01'}},a]},now).map(x=>x.id),['b','a']);
console.log('PASS canonical movie identity, exact episode, candidate ordering and rights checks');
