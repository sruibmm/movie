// A fair scheduler: discover titles, extract links, then verify media independently.
export const VERSION='auto-v8';
export const structural=e=>/^(missing-direct-source|unresolved-episode-identities|unclassified-or-incomplete-work|missing-title|empty-index|episode-not-listed|ambiguous-season-or-episode|declared-count-mismatch|incomplete-episode-index)$/.test(String(e));
export function pickJobs(lanes,budget,health=new Map(),now=Date.now()){
 const [episodes,works,indexes]=lanes;
 const groups=new Map(),verify=[],extract=[];
 for(const entry of episodes){const j=entry[1];if(j.phase==='verify'){verify.push(entry);continue;}const group=groups.get(j.id)||[];group.push(entry);groups.set(j.id,group);}
 // Sample different works before revisiting a work with an unsupported layout.
 for(const [id,group] of groups){const h=health.get(id);if(h?.until>now)continue;extract.push(group.shift());}
 for(const [id,group] of groups){const h=health.get(id);if(h?.until>now)continue;if(h?.success)extract.push(...group);}
 const pools=[indexes.slice(),works.slice(),extract,verify],order=[0,1,1,2,2,2,3];
 const jobs=[];while(jobs.length<budget&&pools.some(q=>q.length)){for(const n of order){if(jobs.length>=budget)break;if(pools[n].length)jobs.push(pools[n].shift());}}
 return jobs;
}
export function nextHealth(old,ok,reason,now){
 if(ok)return {success:true,failures:0,until:0};
 if(!structural(reason)||reason!=='missing-direct-source')return old||{success:false,failures:0,until:0};
 const failures=(old?.failures||0)+1;
 return {success:!!old?.success,failures,until:!old?.success&&failures>=2?now+15*60000:0};
}
