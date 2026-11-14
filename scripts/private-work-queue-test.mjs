import assert from 'node:assert/strict';
import {selectGroups,summarizeGroup,queueStatus,rollingPool} from '../worker/private-work-queue.js';
import {nextHealth} from '../worker/private-turbo-scheduler.js';
import {crawl} from '../worker/private-catalog-sync.js';

const now=Date.now(),origin='https://af.alooytv16.com';
const drafts=new Map(),summaries=new Map(),health=new Map();
for(let i=0;i<536;i++){
 const id='alooytv:'+String(i).padStart(4,'0'),count=i<134?57:56,d={id,gen:1,count,remaining:count};
 drafts.set(id,d);
 const rows=new Map(Array.from({length:count},(_,n)=>['q:'+id+':'+n,{type:'episode',id,phase:n===0?'verify':'extract',after:i===1?now+60000:0}]));
 summaries.set(id,summarizeGroup(d,rows,null,now));
}
const stats=queueStatus(drafts,summaries,new Map(),new Map(),now);
assert.equal(stats.queuedSample,30150);
assert.equal(stats.waiting,57);
assert.equal(stats.ready,30093);
assert.equal(stats.queueEstimated,false);
const first=drafts.get('alooytv:0000');drafts.set(first.id,{...first,remaining:2});
const selected=selectGroups(drafts,summaries,health,now,24);
assert.equal(selected.length,24);assert.equal(selected[0].id,'alooytv:0000');
assert.ok(!selected.some(d=>d.id==='alooytv:0001'));
summaries.delete('alooytv:0002');
const estimated=queueStatus(drafts,summaries,new Map(),new Map(),now);
assert.equal(estimated.unknownGroups,1);assert.equal(estimated.queueEstimated,true);
let h={success:true,failures:0};
for(let i=0;i<4;i++)h=nextHealth(h,false,'missing-direct-source',now);
assert.equal(h.until,now+15*60000);assert.equal(nextHealth(h,true,'',now).until,0);

// A slow request must not block the next wave; follow-up verification gets a slot.
let active=0,max=0,release,started=[],committed=[];
const items=[0,1,2,3,4,5,6,7];
const run=rollingPool(items,{concurrency:3,prepare:async i=>{
 started.push(i);active++;max=Math.max(max,active);
 if(i===0)await new Promise(r=>release=r);else await Promise.resolve();
 active--;return i;
},commit:async(i,r,enqueue)=>{
 assert.equal(r.status,'fulfilled');committed.push(i);if(i===1)enqueue(99);
}});
for(let i=0;i<200&&!started.includes(6);i++)await Promise.resolve();
assert.ok(started.includes(6));assert.ok(started.includes(99));assert.ok(!committed.includes(0));release();
const result=await run;assert.equal(result.completed,9);assert.equal(max,3);assert.equal(result.maxActive,3);

// Integration benchmark: the production crawl uses group prefixes rather than
// scanning the entire 30,150-episode queue before and after every batch.
class Storage{
 constructor(){this.data=new Map();this.episodeReads=0;this.groupReads=0;this.fullScans=0;}
 async get(k){return Array.isArray(k)?new Map(k.filter(x=>this.data.has(x)).map(x=>[x,structuredClone(this.data.get(x))])):structuredClone(this.data.get(k));}
 async put(k,v){if(typeof k==='object'){for(const [key,value] of Object.entries(k))this.data.set(key,structuredClone(value));}else this.data.set(k,structuredClone(v));}
 async delete(k){for(const x of Array.isArray(k)?k:[k])this.data.delete(x);}
 async list(o){
  const prefix=o.prefix||'';
  if(prefix==='pc:q:0:'){this.fullScans++;throw Error('full-episode-queue-scan');}
  const entries=[...this.data].filter(([k])=>k.startsWith(prefix)&&(!o.startAfter||k>o.startAfter)).sort(([a],[b])=>a<b?-1:a>b?1:0).slice(0,o.limit||1000);
  if(prefix.startsWith('pc:q:0:')){this.episodeReads+=entries.length;this.groupReads++;}
  return new Map(entries.map(([k,v])=>[k,structuredClone(v)]));
 }
 async transaction(fn){return fn(this);}
}
const store=new Storage();
store.data.set('pc:seed',now);store.data.set('pc:revision','auto-v9');store.data.set('pc:reconcile',{at:now,offset:0,remaining:0});
const preserved={id:'alooytv:preserved',title:'Existing verified work',kind:'movie',count:1,availableCount:1,partial:false,gen:99};
const preservedAsset={id:'alooytv:preserved:s1:e1',title:'Existing verified work',season:1,episode:1,format:'mp4',url:'https://vid4.zvde-dsn-01.site/file/preserved.jpg',verifiedAt:now};
store.data.set('pc:work:'+preserved.id,preserved);store.data.set('pc:e:'+preserved.id+':99:0001',preservedAsset);
let queued=0;
for(let i=0;i<536;i++){
 const suffix='fixture'+String(i).padStart(4,'0'),id='alooytv:'+suffix,count=i<134?57:56,page=origin+'/watch/'+suffix+'.html';
 store.data.set('pc:draft:'+id,{id,title:'Fixture '+i,kind:'tv',count,expectedCount:count,remaining:count,season:1,gen:1,sourcePage:page,signature:'fixture'});
 for(let n=1;n<=count;n++){
  const key='pc:q:0:'+id+':1:'+String(n).padStart(4,'0');
  store.data.set(key,{type:'episode',id,gen:1,n,season:1,episode:n,kind:'tv',url:page+'?key=ep'+n,tries:0,after:0,revision:'auto-v9'});queued++;
 }
}
assert.equal(queued,30150);
let pageHits=0,probes=0;
const fake=async raw=>{
 const u=new URL(String(raw));
 if(u.hostname==='vid4.zvde-dsn-01.site'){
  probes++;return new Response(Uint8Array.from([0,0,0,24,102,116,121,112,105,115,111,109,0,0,0,0]),{status:206});
 }
 pageHits++;
 const key=u.searchParams.get('key'),suffix=u.pathname.split('/').pop().replace('.html','');
 const mp4='https://vid4.zvde-dsn-01.site/file/'+suffix+'-'+key+'.jpg';
 const encoded=pageHits%2?btoa(mp4).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''):mp4;
 // Standard data attributes and both explicit URL/base64 forms must retain exact refs.
 return new Response('<h1>Fixture episode</h1><button data-url="/download_video.php?ref='+encodeURIComponent(u.pathname+u.search)+'&amp;video_url='+encodeURIComponent(encoded)+'">Download</button>');
};
const batch=await crawl(store,fake,now,64);
assert.equal(batch.revision,'auto-v10');assert.equal(store.fullScans,0);
assert.equal(batch.selectedWorkGroups,24);assert.ok(batch.inspectedEpisodeJobs<=1368);
assert.ok(store.episodeReads<3000);assert.ok(batch.networkRequests<=45);
assert.ok(batch.maxConcurrent<=6);assert.ok(batch.extracted>0);assert.ok(batch.publishedEpisodes>1);
assert.ok(batch.knownGroups>0);assert.equal(batch.queueEstimated,true);
assert.deepEqual(await store.get('pc:work:'+preserved.id),preserved);
assert.deepEqual(await store.get('pc:e:'+preserved.id+':99:0001'),preservedAsset);
assert.equal(pageHits+probes,batch.networkRequests);
console.log('WORK QUEUE PASS: 30150 episodes / 536 works; episode rows read '+store.episodeReads+'; source requests '+batch.networkRequests+'; extracted '+batch.extracted+'; verified '+(batch.publishedEpisodes-1));
