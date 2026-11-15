import fs from 'node:fs';
const owners=[['KonozAlDrama',''],['EmarAlSham',''],['CBCDrama',''],['RoyaDrama',''],['alnahareg','مسلسل'],['SharjahTV','مسلسل']];
const fields='id,title,duration,allow_embed,owner.username,owner.verified,available_formats,advertising_instream_blocked,created_time,thumbnail_url';
const get=async u=>{for(let i=0;i<3;i++)try{const r=await fetch(u,{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('HTTP '+r.status);return await r.json();}catch(e){if(i===2)throw e;await new Promise(r=>setTimeout(r,250*(i+1)));}};
const output={publishers:[],rows:[]};let pos=0;
await Promise.all(Array.from({length:6},async()=>{while(pos<owners.length){const [owner,search]=owners[pos++];try{
const info=await get('https://api.dailymotion.com/user/'+owner+'?fields=username,verified,videos_total,website_url');
if(!info.verified)continue;
let before=Math.floor(Date.now()/1000)+86400;const seen=new Map();
for(let w=0;w<30;w++){
let oldest=before,last=0,more=true,added=0;
for(let page=1;page<=10;page++){
 const d=await get('https://api.dailymotion.com/user/'+owner+'/videos?'+new URLSearchParams({limit:100,page,created_before:before,sort:'recent',fields,...(search?{search}:{})}));
 const list=d.list||[];last=list.length;for(const v of list){if(!seen.has(v.id)){seen.set(v.id,v);added++;}oldest=Math.min(oldest,v.created_time||before);}more=d.has_more;if(!more||!last)break;
}
if((!more&&last<100)||!added||oldest>=before)break;before=oldest+1;
}
const eligible=[...seen.values()].filter(v=>v.allow_embed&&v.duration>=900&&v.available_formats?.some(x=>/^hd/.test(x))&&v['owner.verified']&&v['owner.username']?.toLowerCase()===owner.toLowerCase());
output.publishers.push({owner,reported:info.videos_total,retrieved:seen.size,eligible:eligible.length,search});output.rows.push(...eligible);console.log('NEW SOURCE',owner,seen.size,eligible.length);
}catch(e){console.log(owner,e.message);}}}));
fs.writeFileSync('docs/publisher-mega-additional.json',JSON.stringify(output)+'\n');
console.log('ADDITIONAL',output.rows.length);
