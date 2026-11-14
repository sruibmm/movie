// Durable Object alarm runner: acknowledge immediately, keep a single crawler active,
// persist status before network I/O, and continue without a browser tab.
export const ENGINE='auto-v8';
const STATUS='pc:status';
const errorText=e=>String(e?.message||e).slice(0,180);
export class PrivateRunner{
 constructor(storage,crawl,clock=()=>Date.now()){this.s=storage;this.crawl=crawl;this.clock=clock;this.running=null;}
 async status(){
  const s=await this.s.get(STATUS)||{};
  return {...s,engine:ENGINE,alarmAt:await this.s.getAlarm(),running:!!this.running};
 }
 async kick(){
  if(this.running)return this.status();
  const now=this.clock(),old=await this.s.get(STATUS)||{},alarm=await this.s.getAlarm();
  if(alarm!==null&&old.engine===ENGINE)return this.status();
  await this.s.setAlarm(now+1000);
  await this.s.put(STATUS,{...old,engine:ENGINE,state:'queued',requestedAt:now});
  return this.status();
 }
 async alarm(){
  if(this.running)return this.running;
  this.running=this.run().finally(()=>{this.running=null;});
  return this.running;
 }
 async run(){
  const now=this.clock(),old=await this.s.get(STATUS)||{};
  await this.s.put(STATUS,{...old,engine:ENGINE,state:'running',startedAt:now});
  try{
   const result=await this.crawl(this.s,undefined,now);
   const next=result.ready>0?this.clock()+2000:result.nextRetry?Math.max(this.clock()+2000,result.nextRetry):null;
   if(next!==null)await this.s.setAlarm(next);
   const final={...result,engine:ENGINE,startedAt:now,finishedAt:this.clock(),nextRunAt:next};
   await this.s.put(STATUS,final);return final;
  }catch(e){
   const next=this.clock()+120000;
   const current=await this.s.get(STATUS)||old;
   const final={...current,engine:ENGINE,state:'engine-error',at:this.clock(),error:errorText(e),nextRunAt:next};
   await this.s.put(STATUS,final);await this.s.setAlarm(next);return final;
  }
 }
}
