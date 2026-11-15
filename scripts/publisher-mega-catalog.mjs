import fs from 'node:fs';
const owners=['IMediaMovies','ImediaSeries','shammedia','FGForArtProduction','SyrianaArtproduction','LeenArtProduction','goldenlinefortvproduction','ajprodist','clacketmediaproductions','EBLATVProduction','kabandartproduction','SamaArtInternational','OnlineartProduction'];
const fields='id,title,duration,allow_embed,owner.username,owner.verified,available_formats,advertising_instream_blocked,created_time,thumbnail_url';
const get=async u=>{for(let i=0;i<3;i++){try{const r=await fetch(u,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('HTTP '+r.status);return await r.json();}catch(e){if(i===2)throw e;await new Promise(r=>setTimeout(r,300*(i+1)));}}};
const rows=[],stats=[];let next=0;
async function crawl(owner){
 const info=await get('https://api.dailymotion.com/user/'+owner+'?fields=id,username,verified,videos_total');
 if(!info.verified)throw Error('Unverified '+owner);
 const seen=new Map();let before=Math.floor(Date.now()/1000)+86400,stalled=false;
 for(let window=0;window<30;window++){
 let oldest=before,more=true,added=0,lastLength=0;
 for(let page=1;page<=10;page++){
 const u='https://api.dailymotion.com/user/'+owner+'/videos?'+new URLSearchParams({limit:100,page,created_before:before,sort:'recent',fields});
 const d=await get(u);const list=d.list||[];lastLength=list.length;
 for(const v of list){if(!seen.has(v.id)){seen.set(v.id,v);added++;}oldest=Math.min(oldest,v.created_time||before);}
 more=!!d.has_more;if(!more||!list.length)break;
 }
 if(!more&&lastLength<100)break;
 if(!added||oldest>=before){stalled=true;break;}
 before=oldest+1;
 }
 const videos=[...seen.values()].filter(v=>v['owner.verified']&&v['owner.username']?.toLowerCase()===owner.toLowerCase());
 rows.push(...videos);stats.push({owner,reported:info.videos_total,retrieved:videos.length,stalled});
 console.log('OWNER',owner,videos.length,'/',info.videos_total);
}
await Promise.all(Array.from({length:6},async()=>{while(next<owners.length){const owner=owners[next++];try{await crawl(owner);}catch(e){stats.push({owner,error:e.message});console.log('FAIL',owner,e.message);}}}));
const unique=[...new Map(rows.map(v=>[v.id,v])).values()];
const eligible=unique.filter(v=>v.allow_embed&&v.duration>=900&&v.available_formats?.some(x=>/^hd/.test(x)));
const output={schema:1,source:'Official public Dailymotion publisher JSON catalogues',checkedAt:new Date().toISOString(),summary:{publishers:stats.length,reported:stats.reduce((n,s)=>n+(s.reported||0),0),retrieved:unique.length,hdEmbeddableLong:eligible.length},publishers:stats,rows:eligible};
fs.writeFileSync('docs/publisher-mega-catalog.json',JSON.stringify(output)+'\n');
console.log('MEGA',JSON.stringify(output.summary));
