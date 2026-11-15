import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const input=process.argv[2]||'docs/publisher-hub-series-approved.json';
const output=process.argv[3]||'docs/publisher-hub-series-verified.json';
const rows=read(input),cachePath='.cinema-episode-embed-cache.json',cache=fs.existsSync(cachePath)?read(cachePath):{};
const unique=new Map();
for(const s of rows)for(const e of s.episodes)unique.set(e.id,{id:e.id,publisher:s.publisher});
let i=0,success=0,fail=0,hits=0;const results=new Map();
async function verify(e){
 const k=e.id+'|'+e.publisher,old=cache[k];
 if(old&&Date.now()-old.at<7*86400000&&old.ok){hits++;return true;}
 for(let a=0;a<2;a++)try{
 const r=await fetch('https://www.youtube.com/oembed?'+new URLSearchParams({url:'https://www.youtube.com/watch?v='+e.id,format:'json'}),{signal:AbortSignal.timeout(7000)});
 if([429,500,502,503,504].includes(r.status))throw Error('temporary '+r.status);
 if(!r.ok)return false;
 const o=await r.json(),ok=o.author_name?.trim()===e.publisher?.trim()&&o.html?.includes(e.id);
 if(ok)cache[k]={at:Date.now(),ok:true};return !!ok;
 }catch{if(a===0)await new Promise(r=>setTimeout(r,250));}
 return false;
}
const jobs=[...unique.values()],started=Date.now();
await Promise.all(Array.from({length:20},async()=>{while(i<jobs.length){const e=jobs[i++],ok=await verify(e);results.set(e.id+'|'+e.publisher,ok);if(ok)success++;else fail++;if((success+fail)%250===0)console.log('EMBED CHECK',success+fail,'/',jobs.length,'ok',success,'fail',fail);}}));
const verified=rows.filter(s=>s.episodes.every(e=>results.get(e.id+'|'+s.publisher))).map(s=>({...s,evidence:s.evidence.replace('first/last embed checked','all individual publisher oEmbed records checked')}));
fs.writeFileSync(cachePath+'.tmp',JSON.stringify(cache));fs.renameSync(cachePath+'.tmp',cachePath);
fs.writeFileSync(output,JSON.stringify(verified,null,2)+'\n');
console.log('VERIFY',JSON.stringify({rows:rows.length,refs:jobs.length,success,fail,cacheHits:hits,seasons:verified.length,episodes:verified.reduce((n,s)=>n+s.episodes.length,0),elapsedMs:Date.now()-started}));
