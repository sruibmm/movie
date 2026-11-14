import assert from 'node:assert/strict';
import {PrivateRunner,ENGINE} from '../worker/private-catalog-runner.js';
class Store {
 constructor(){this.data=new Map();this.alarmAt=null;}
 async get(k){return this.data.get(k);}
 async put(k,v){this.data.set(k,structuredClone(v));}
 async getAlarm(){return this.alarmAt;}
 async setAlarm(at){this.alarmAt=at;}
}
let now=1000000,calls=0,release;
const s=new Store();
const r=new PrivateRunner(s,async()=>{calls++;return new Promise(resolve=>{release=resolve;});},()=>now);
const kicked=await r.kick();
assert.equal(kicked.engine,ENGINE);assert.equal(kicked.state,'queued');assert.equal(s.alarmAt,now+1000);assert.equal(calls,0);
s.alarmAt=null;const first=r.alarm();while(!release)await Promise.resolve();const second=r.alarm();
assert.equal((await r.status()).state,'running');assert.equal(calls,1);
release({ready:4,processed:12,failed:0,published:1,state:'working'});await Promise.all([first,second]);assert.equal(calls,1);
assert.equal(s.alarmAt,now+5000);assert.equal((await r.status()).published,1);
await r.kick();assert.equal(s.alarmAt,now+5000,'repeated kick must not reset scheduled alarm');
s.alarmAt=null;now+=5000;const wait=new PrivateRunner(s,async()=>({ready:0,nextRetry:now+180000,state:'retry-wait'}),()=>now);
await wait.alarm();assert.equal(s.alarmAt,now+180000);
const fail=new PrivateRunner(s,async()=>{throw Error('test-source-error');},()=>now);
s.alarmAt=null;await fail.alarm();assert.equal((await fail.status()).state,'engine-error');assert.equal((await fail.status()).error,'test-source-error');assert.equal(s.alarmAt,now+120000);
s.alarmAt=null;const idle=new PrivateRunner(s,async()=>({ready:0,nextRetry:null,state:'idle'}),()=>now);await idle.alarm();assert.equal(s.alarmAt,null);assert.equal((await idle.status()).state,'idle');
console.log('PRIVATE RUNNER PASS: instant acknowledgement, single execution, continuous batches, retry preservation, failure recovery');
