import assert from 'node:assert/strict';
import {reviewSourceSnapshot,retainLastGood} from '../src/sourceSyncGate.js';
const now=Date.parse('2026-11-14T12:00:00Z');
const policy={approved:true,provider:'synthetic-test',grantReference:'TEST-ONLY',hosts:['media.example.com'],minimumNewTitles:50};
const rights={provider:policy.provider,reference:policy.grantReference,webPlayback:true,adFree:true,territories:['KW'],expires:'2027-01-01'};
function fixture(n=50,revision=1){
 const titles=Array.from({length:n},(_,i)=>({id:'t'+i,title:'Synthetic '+i,kind:'tv',year:2026,expectedEpisodes:{1:2},assets:[1,2].map(e=>({id:'a'+i+'-'+e,title:'Episode '+e,season:1,episode:e,url:'https://media.example.com/'+i+'/'+e+'.m3u8',format:'hls',rights:{...rights}}))}));
 const snapshot={version:1,provider:policy.provider,revision,titles};
 const observations=Object.fromEntries(titles.flatMap(t=>t.assets.map(a=>[a.id,{url:a.url,played:true,height:1080,duration:1800,checkedAt:now-1000}])));
 return {snapshot,observations};
}
const f=fixture();const run=(s=f.snapshot,o=f.observations,p=policy,prev=null)=>reviewSourceSnapshot(prev,s,p,o,now);
assert.equal(run().ok,true);assert.equal(run().assets,100);
const cases=[
 ['unapproved source',s=>s,{approved:false},'provider-not-approved'],
 ['empty snapshot',s=>({...s,titles:[]}),{},'invalid-or-empty-snapshot'],
 ['missing episode',s=>{s.titles[0].assets.pop();return s;},{},'incomplete-series'],
 ['duplicate episode',s=>{s.titles[0].assets[1].episode=1;return s;},{},'duplicate-episode-or-asset'],
 ['changed domain',s=>{s.titles[0].assets[0].url='https://evil.example/a.m3u8';return s;},{},'unapproved-or-session-url'],
 ['session URL',s=>{s.titles[0].assets[0].url+='?token=test';return s;},{},'unapproved-or-session-url'],
 ['expired rights',s=>{s.titles[0].assets[0].rights.expires='2020-01-01';return s;},{},'invalid-rights-or-media'],
 ['wrong provider',s=>{s.titles[0].assets[0].rights.provider='other';return s;},{},'invalid-rights-or-media'],
 ['small batch',s=>({...s,titles:s.titles.slice(0,49)}),{},'new-title-batch-too-small']
];
for(const [name,mut,patch,reason] of cases){const result=run(mut(structuredClone(f.snapshot)),f.observations,{...policy,...patch});assert.equal(result.reason,reason);console.log('PASS',name);}
for(const patch of [{height:480},{played:false},{checkedAt:now-90000000},{url:'https://media.example.com/other.m3u8'}]){const o=structuredClone(f.observations);Object.assign(o['a0-1'],patch);assert.equal(run(f.snapshot,o).reason,'playback-not-verified');}
const next=fixture(50,2);assert.equal(run(next.snapshot,next.observations,policy,f.snapshot).ok,true);
assert.equal(run(f.snapshot,f.observations,policy,f.snapshot).reason,'stale-revision');
const deleted=structuredClone(next.snapshot);deleted.titles.pop();assert.equal(retainLastGood(f.snapshot,deleted,policy,next.observations,now).active,f.snapshot);
const remapped=structuredClone(next.snapshot);remapped.titles[0].assets[0].id='new-id';const obs={...next.observations,'new-id':next.observations['a0-1']};assert.equal(run(remapped,obs,policy,f.snapshot).reason,'episode-deleted-or-remapped');
const changed=structuredClone(next.snapshot);changed.titles[0].assets[0].url='https://media.example.com/new.m3u8';const updated={...next.observations,'a0-1':{...next.observations['a0-1'],url:changed.titles[0].assets[0].url}};assert.equal(run(changed,updated,policy,f.snapshot).ok,true);
console.log('PASS quality, observation freshness, stable IDs, stale revisions, rollback, safe URL refresh; synthetic fixtures only');
