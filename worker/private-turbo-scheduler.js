// A fair scheduler: discover titles, extract links, then verify media independently.
export const VERSION='auto-v9';
export const structural=e=>/^(missing-direct-source|unresolved-episode-identities|unclassified-or-incomplete-work|missing-title|empty-index|episode-not-listed|ambiguous-season-or-episode|declared-count-mismatch|incomplete-episode-index)$/.test(String(e));
export function pickJobs(lanes,budget,health=new Map(),now=Date.now(),drafts=new Map()){
 const [episodes,works,indexes]=lanes;const ordered=orderByCompletion(episodes,drafts,health,now);
 const groups=new Map(),verify=[],extract=[];
 for(const entry of ordered){const j=entry[1];if(j.phase==='verify'){verify.push(entry);continue;}const group=groups.get(j.id)||[];group.push(entry);groups.set(j.id,group);}
 // Sample different works before revisiting a work with an unsupported layout.
 for(const [id,group] of groups){const h=health.get(id);if(h?.until>now&&!group[0][1].rescued)continue;extract.push(group.shift());}
 for(const [id,group] of groups){const h=health.get(id);if(h?.until>now)continue;if(h?.success)extract.push(...group);}
 const pools=[indexes.slice(),works.slice(),extract,verify],order=[0,1,2,3,3,2,3];
 const jobs=[];while(jobs.length<budget&&pools.some(q=>q.length)){for(const n of order){if(jobs.length>=budget)break;if(pools[n].length)jobs.push(pools[n].shift());}}
 return jobs;
}
export function nextHealth(old,ok,reason,now){
 if(ok)return {success:true,failures:0,until:0};
 if(!structural(reason)||reason!=='missing-direct-source')return old||{success:false,failures:0,until:0};
 const failures=(old?.failures||0)+1;
 return {success:!!old?.success,failures,until:!old?.success&&failures>=2?now+15*60000:0};
}

// Full paged scan prevents deferred keys at the front hiding ready jobs.
export async function queueRows(storage,prefix,pageSize=500){
 const out=new Map();let after;
 for(;;){const page=await storage.list({prefix,limit:pageSize,...(after?{startAfter:after}:{})});if(!page.size)break;for(const [k,v] of page)out.set(k,v);after=[...page.keys()].pop();if(page.size<pageSize)break;}
 return out;
}
export function effectiveDue(j,h,now,hasNewLink=false){
 const due=Number(j.after)||0;
 if(j.type!=='episode'||j.phase==='verify')return due;
 // A newly discovered exact URL can rescue a previously deferred episode.
 if(hasNewLink)return 0;
 return Math.max(due,h?.until||0);
}
export function orderByCompletion(entries,drafts,health,now){
 return entries.slice().sort((a,b)=>{
  const score=([,j])=>{const d=drafts.get(j.id);const remaining=d?.remaining??1000;const verified=(d?.count??0)-remaining;return (j.phase==='verify'?2000:0)+(j.candidates?.length?500:0)+(health.get(j.id)?.success?200:0)+(remaining<=5&&verified>0?1000:0)+Math.min(200,Math.max(0,verified)*4)-Math.min(100,remaining);};
  return score(b)-score(a);
 });
}
export function retryPlan(reason,tries,now){
 // Missing source format is not a transient HTTP failure: do not hammer it.
 if(structural(reason))return {after:now+6*3600000,tries:0,reason,structural:true};
 if(/(?:page|media)-429|rate.limit/i.test(reason))return {after:now+30*60000,tries:0,reason,structural:false};
 return {after:now+Math.min(3600000,30000*2**Math.min(tries,7)),tries:Math.min(tries,7),reason,structural:false};
}
