import assert from 'node:assert/strict';
import { ACTIVE_SERVER_IDS, RETIRED_SERVER_IDS, normalizeServerId, nextServerId, pickProtectedSource } from '../src/sourceMaintenance.js';
const cases=[
['stable ids',()=>assert.deepEqual(ACTIVE_SERVER_IDS,[0,2,3,4,5,6,7,8])],
['retired IDs excluded',()=>assert.equal(ACTIVE_SERVER_IDS.some(i=>RETIRED_SERVER_IDS.has(i)),false)],
['old history maps retired slots safely',()=>{assert.equal(normalizeServerId(1),0);assert.equal(normalizeServerId(9),0);assert.equal(normalizeServerId('2'),2);assert.equal(normalizeServerId(999),0)}],
['next skips retired',()=>{assert.equal(nextServerId(0),2);assert.equal(nextServerId(8),0)}],
['clean retired never selected',()=>assert.equal(pickProtectedSource({1:{status:'clean'},9:{status:'clean'},3:{status:'clean'}},10),3)],
['blocked sources skipped',()=>assert.equal(pickProtectedSource({0:{status:'ad'},2:{status:'blocked'}},10),3)],
['all exhausted returns null',()=>assert.equal(pickProtectedSource(Object.fromEntries(ACTIVE_SERVER_IDS.map(i=>[i,{status:'ad'}])),10),null)]
];
for(const [name,run] of cases){run();console.log('SOURCE POLICY PASS: '+name);}
