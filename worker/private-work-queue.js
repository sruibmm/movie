// Work-level scheduler: existing queue records remain durable.
// Read only selected work generations; summarize the rest with compact deadline buckets.
import {effectiveDue} from './private-turbo-scheduler.js';
export const groupKey=id=>'pc:group:'+id;
export const groupPrefix=(id,gen)=>'pc:q:0:'+id+':'+gen+':';
export const freshSummary=(d,s)=>s&&s.gen===d.gen;
export function selectGroups(drafts,summaries,health,now,limit=24){
 const rows=[...drafts.values()].filter(d=>d?.id&&Number.isFinite(d.remaining)).map(d=>{
  const s=summaries.get(d.id),valid=freshSummary(d,s),h=health.get(d.id);
  const active=!valid||d.remaining===0||s.nextDue===null||s.nextDue<=now||now-s.checkedAt>=30*60000;
  const verified=Math.max(0,(d.count||0)-d.remaining),near=d.remaining<=5&&verified>0;
  const score=(near?3000:0)+(h?.success?500:0)+(valid&&s.verify>0?600:0)+Math.min(verified*5,250)-Math.min(d.remaining,200);
  return {d,active,score,last:valid?s.lastServed||0:0};
 }).filter(x=>x.active);
 const result=[],seen=new Set(),add=x=>{if(result.length<limit&&!seen.has(x.d.id)){seen.add(x.d.id);result.push(x.d);}};
 // Reserve a third of the window for never/least recently served works.
 const fast=rows.slice().sort((a,b)=>b.score-a.score||a.last-b.last||a.d.id.localeCompare(b.d.id));
 for(const x of fast.slice(0,Math.max(1,Math.floor(limit*2/3))))add(x);
 for(const x of rows.slice().sort((a,b)=>a.last-b.last||b.score-a.score||a.d.id.localeCompare(b.d.id)))add(x);
 return result;
}
export function summarizeGroup(d,rows,health,now,{missing=0,repairAt=now+6*3600000,lastServed=now}={}){
 const buckets=new Map();
 const add=(due,stage,reason,n=1)=>{const k=due+'|'+stage+'|'+reason,old=buckets.get(k);if(old)old[3]+=n;else buckets.set(k,[due,stage,reason,n]);};
 let verify=0,extract=0;
 for(const [,j] of rows){
  const stage=j.phase==='verify'?'verify':'extract';if(stage==='verify')verify++;else extract++;
  const due=effectiveDue(j,health,now),reason=due<=now?'ready':(j.after||0)>=due?(j.structural?'structural':'transient'):'cooldown';
  add(due,stage,reason);
 }
 if(missing>0){extract+=missing;add(repairAt,'extract','structural',missing);}
 const values=[...buckets.values()];
 return {id:d.id,gen:d.gen,checkedAt:now,lastServed,total:verify+extract,verify,extract,missing,buckets:values,nextDue:values.length?Math.min(...values.map(v=>v[0])):null};
}
export function queueStatus(drafts,summaries,workRows,indexRows,now){
 const stages={index:indexRows.size,work:workRows.size,extract:0,verify:0},delayed={structural:0,transient:0,cooldown:0};
 let total=0,ready=0,nextRetry=Infinity,unknownGroups=0,knownGroups=0,unmappedJobs=0;
 const add=(due,reason,n)=>{total+=n;if(due<=now)ready+=n;else{nextRetry=Math.min(nextRetry,due);delayed[reason]=(delayed[reason]||0)+n;}};
 for(const rows of [workRows,indexRows])for(const [,j] of rows)add(Number(j.after)||0,j.structural?'structural':'transient',1);
 for(const d of drafts.values()){
  const s=summaries.get(d.id);
  if(!freshSummary(d,s)){
   unknownGroups++;const n=Math.max(1,Number(d.remaining)||0);
   stages.extract+=n;total+=n;ready+=n;continue;
  }
  knownGroups++;unmappedJobs+=s.missing||0;stages.extract+=s.extract;stages.verify+=s.verify;
  for(const [due,stage,reason,n] of s.buckets)add(due,reason==='ready'?'transient':reason,n);
  if(d.remaining===0&&s.total===0){total++;ready++;stages.work++;}
 }
 return {queuedSample:total,ready,waiting:Math.max(0,total-ready),nextRetry:Number.isFinite(nextRetry)?nextRetry:null,stages,delayed,queueSampleTruncated:false,queueEstimated:unknownGroups>0,knownGroups,unknownGroups,unmappedJobs};
}
// No batch barrier: a fast request immediately frees a slot for the next job.
// Network preparation may be parallel; commits remain serialized.
export async function rollingPool(items,{concurrency=6,canLaunch=()=>true,prepare,commit}){
 let cursor=0,maxActive=0,completed=0;const active=new Map();
 function fill(){
  while(cursor<items.length&&active.size<concurrency&&canLaunch()){
   const item=items[cursor++],token=Symbol();
   const promise=Promise.resolve().then(()=>prepare(item)).then(value=>({token,item,status:'fulfilled',value}),reason=>({token,item,status:'rejected',reason}));
   active.set(token,promise);maxActive=Math.max(maxActive,active.size);
  }
 }
 fill();
 while(active.size){
  const result=await Promise.race(active.values());active.delete(result.token);
  await commit(result.item,result);completed++;fill();
 }
 return {completed,maxActive};
}
