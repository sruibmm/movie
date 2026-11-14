import {normalizeArabic as norm} from '../src/arabicDiscovery.js';
import {WATAN_SERIES} from '../src/watanSeries.js';
import fs from 'node:fs';
const B='https://api.dailymotion.com/';
const users=['SyrianaArtproduction','ImediaSeries','goldenlinefortvproduction','clacketmediaproductions','SamaArtInternational','kabandartproduction','EBLATVProduction','alnahareg','CBCDrama','LeenArtProduction','OnlineartProduction','FGForArtProduction','ajprodist','shammedia','OscarProductionDistribution'];
const get=async p=>{for(let i=0;i<2;i++)try{const r=await fetch(B+p,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('HTTP '+r.status);return await r.json()}catch(e){if(i)throw e;await new Promise(r=>setTimeout(r,300));}};
const fields='id,title,duration,allow_embed,created_time,geoblocking';
const kwAllowed=v=>{const g=v.geoblocking;if(!Array.isArray(g))return false;const a=g.map(x=>String(x).toLowerCase());return !a.length||(a[0]==='deny'?!a.includes('kw'):a.length===1&&a[0]==='allow'||a.includes('kw'));};
const clean=s=>norm(s).replace(/^مسلسل\s+/,'').replace(/\bhd\b/g,'').replace(/\s+/g,' ').trim();
const words={'الاولي':1,'الاول':1,'الاولى':1,'الثانيه':2,'الثانية':2,'الثاني':2,'الثالثه':3,'الثالثة':3,'الثالث':3,'الرابعه':4,'الرابعة':4,'الرابع':4,'الخامسه':5,'الخامسة':5,'الخامس':5,'السادسه':6,'السادسة':6,'السادس':6,'السابعه':7,'السابعة':7,'السابع':7,'الثامنه':8,'الثامنة':8,'الثامن':8,'التاسعه':9,'التاسعة':9,'التاسع':9,'العاشره':10,'العاشرة':10,'العاشر':10,'الحاديه':1,'الحادية':1,'الحادي':1,'الواحده':1,'الواحدة':1,'الواحد':1};
function epNo(t){const s=norm(t);let m=s.match(/(?:الحلق[هة]|episode|\bep)\s*(\d{1,3})(?:\s|$)/i);if(m)return +m[1];m=s.match(/(?:الحلق[هة]|episode)\s+(.{1,60})/i);if(!m)return null;let p=m[1].split(' '),n=words[p[0]];if(n){let z=p.slice(1,5).join(' ');if(/عشر/.test(z))return n===10?10:n+10;let tens=z.match(/(?:و)?(العشرون|العشرين|الثلاثون|الثلاثين|الاربعون|الاربعين|الخمسون|الخمسين|الستون|الستين)/);if(tens)return n+({'العشرون':20,'العشرين':20,'الثلاثون':30,'الثلاثين':30,'الاربعون':40,'الاربعين':40,'الخمسون':50,'الخمسين':50,'الستون':60,'الستين':60}[tens[1]]);return n;}return null}
const rows=WATAN_SERIES.filter(x=>x.episodes.length>=8&&x.kind==='مسلسل').map(x=>({...x,nt:clean(x.title),nb:clean(x.seriesTitle||x.title)})).sort((a,b)=>b.nt.length-a.nt.length);
const matched=new Map(),unknown=new Map(),owners=new Map();
function insert(map,k,v,n,row,owner){if(!map.has(k))map.set(k,{row,owner,items:new Map(),final:null});const g=map.get(k);if(!g.items.has(n)||g.items.get(n).duration<v.duration)g.items.set(n,{...v,number:n,owner});if(/(?:الاخير[هة]|والاخير[هة]|last episode|final episode)/i.test(norm(v.title)))g.final=n;}
function process(v,owner){if(!v.allow_embed||!kwAllowed(v)||v.duration<1100||v.duration>7200||!/^x[a-z0-9]+$/i.test(v.id))return;const n=epNo(v.title);if(!n||n>150)return;const t=norm(v.title);const before=t.split(/الحلق[هة]|episode|\bep\s/)[0];const candidates=rows.filter(r=>r.nt.length>=3&&(clean(before)===r.nt||(' '+t+' ').includes(' '+r.nt+' ')));if(candidates.length){let best=candidates[0];const ties=candidates.filter(x=>x.nt.length===best.nt.length);if(ties.length>1)return;if(n>best.episodes.length)return;insert(matched,best.id,v,n,best,owner);return;}
const m=t.match(/^مسلسل\s+(.+?)\s+الحلق[هة]\s/);if(!m)return;const title=clean(m[1]);if(title.length<3||/مشهد|اعلان|اغنية|ملخص|كواليس/.test(title))return;insert(unknown,title,v,n,{title,seriesTitle:title,season:1,year:''},owner);}
async function crawl(u){let n=0,errs=0,before='',seen=new Set();for(let window=0;window<16;window++){let min=Infinity,more=false,added=0;for(let p=1;p<=10;p+=5){const rs=await Promise.allSettled(Array.from({length:5},(_,i)=>get('user/'+u+'/videos?fields='+fields+'&limit=100&page='+(p+i)+(before?'&created_before='+before:''))));more=false;for(const x of rs){if(x.status==='fulfilled'){const d=x.value;more=more||d.has_more;for(const v of d.list||[]){min=Math.min(min,+v.created_time||Infinity);if(!seen.has(v.id)){seen.add(v.id);process(v,u);n++;added++;}}}else errs++;}if(!more)break;}if(!added||!Number.isFinite(min)||String(min)===before||added<1000)break;before=String(min);}console.log('CRAWL',u,n,errs);owners.set(u,n);}
async function playlists(u){try{const d=await get('user/'+u+'/playlists?fields=id,name,videos_total&limit=100');const ps=(d.list||[]).filter(x=>x.videos_total>=8);for(let i=0;i<ps.length;i+=6){await Promise.allSettled(ps.slice(i,i+6).map(async p=>{const v=await get('playlist/'+p.id+'/videos?fields='+fields+'&limit=100');for(const item of v.list||[])process(item,u);}))}console.log('PLAYLISTS',u,ps.length);}catch(e){console.log('PLAYLISTERR',u,e.message);}}
await Promise.all(users.map(async u=>{await crawl(u);await playlists(u); }));
const result=[];for(const [key,g] of matched){const max=g.row.episodes.length;const items=[...g.items.values()].sort((a,b)=>a.number-b.number);if(items.length!==max||items.some((v,i)=>v.number!==i+1))continue;result.push({title:g.row.title,seriesTitle:g.row.seriesTitle||g.row.title,season:g.row.season,year:g.row.year,source:g.row.source,poster:g.row.poster||null,owner:g.owner,expected:max,finalMarker:g.final===max,episodes:items.map(x=>({number:x.number,id:x.id,duration:x.duration,owner:x.owner,videoTitle:x.title}))});}
for(const [key,g] of unknown){if(!g.final||g.final<8)continue;const items=[...g.items.values()].sort((a,b)=>a.number-b.number);if(items.length!==g.final||items.some((v,i)=>v.number!==i+1))continue;if(result.some(x=>clean(x.title)===key))continue;result.push({title:g.row.title,seriesTitle:g.row.title,season:1,year:'',owner:g.owner,expected:g.final,finalMarker:true,episodes:items.map(x=>({number:x.number,id:x.id,duration:x.duration,owner:x.owner,videoTitle:x.title}))});}
const grouped=new Map();for(const x of result){const k=clean(x.seriesTitle);if(!grouped.has(k))grouped.set(k,[]);grouped.get(k).push(x);}
const complete=[...grouped].filter(([k,a])=>{const known=rows.filter(x=>x.nb===k);return !known.length||known.every(r=>a.some(x=>x.season===r.season&&clean(x.title)===r.nt));}).flatMap(x=>x[1]);

const canonical=x=>clean(x.seriesTitle||x.title).replace(/(?:\s+(?:الجزء|الموسم)\s*(?:الاول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|\d+))\b/g,'').replace(/\s+/g,' ').trim();
const groups=new Map();
for(const x of complete){const k=canonical(x);if(!k)continue;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(x)}
const usedIds=new Set(),verified=[];
const existingComplete=new Set(['مزاج الخير'].map(clean));
for(const [k,rr] of groups){
 if(existingComplete.has(k))continue;
 const seasons=new Map();
 let reject=false;
 for(const x of rr){const t=clean(x.title),m=t.match(/(?:الجزء|الموسم)\s+(الاول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|\d+)/);
  const ns=m?({'الاول':1,'الثاني':2,'الثالث':3,'الرابع':4,'الخامس':5,'السادس':6,'السابع':7,'الثامن':8,'التاسع':9,'العاشر':10}[m[1]]||+m[1]):x.season;
  if(!Number.isInteger(ns)||ns<1||seasons.has(ns)){reject=true;break;}
  if(!x.finalMarker||x.episodes.length!==x.expected||x.episodes.some((e,i)=>e.number!==i+1||!e.owner||!e.videoTitle||!e.duration||/\b(?:trailer|teaser|clip)\b|(?:^|\s)(?:اعلان|برومو|ملخص|مقطع|مشهد)(?:\s|$)/i.test(norm(e.videoTitle)))){reject=true;break;}
  const durations=x.episodes.map(e=>e.duration).sort((a,b)=>a-b),median=durations[Math.floor(durations.length/2)];
  if(durations[0]<median*.65||new Set(x.episodes.map(e=>e.id)).size!==x.expected){reject=true;break;}
  const compact=a=>clean(a).replace(/\s+/g,'').replace(/ة/g,'ه');
  const wanted=compact(x.title),base=compact(x.seriesTitle||x.title);
  if(x.episodes.some(e=>{const n=norm(e.videoTitle);const before=n.split(/الحلق[هة]|episode|\bep\s/)[0];return !compact(before).includes(wanted)&&!(ns===1&&compact(before)===base)})){reject=true;break;}
  seasons.set(ns,{season:ns,title:x.title,expected:x.expected,episodes:x.episodes.map(e=>({number:e.number,id:e.id,duration:e.duration,owner:e.owner}))});
 }
 const ordered=[...seasons.values()].sort((a,b)=>a.season-b.season);
 if(reject||!ordered.length||ordered.some((x,i)=>x.season!==i+1))continue;
 const ids=ordered.flatMap(x=>x.episodes.map(e=>e.id));
 if(ids.some(id=>usedIds.has(id))||new Set(ids).size!==ids.length)continue;
 ids.forEach(id=>usedIds.add(id));
 verified.push({id:'dm-series:'+k,title:rr[0].seriesTitle||rr[0].title,year:rr[0].year||'',poster:rr[0].poster||null,seasons:ordered});
}
verified.sort((a,b)=>a.title.localeCompare(b.title,'ar'));
const films=[];
for(const [id,title,year,runtime] of [['x8p3ftp','سحر العيون','2002',110],['x8p3ftj','رجل لهذا الزمان','1986',107],['x8p3ftm','دلع البنات','1969',96]]){
 const v=await get('video/'+id+'?fields=id,title,duration,allow_embed,owner.username,geoblocking');
 if(v.allow_embed&&kwAllowed(v)&&v['owner.username']==='IMediaMovies'&&v.duration>=runtime*60*.90&&v.duration<=runtime*60*1.12)films.push({id,title,year,duration:v.duration,owner:v['owner.username']});
}
console.log('RELEASE_GATE',JSON.stringify({series:verified.length,seasons:verified.reduce((n,x)=>n+x.seasons.length,0),episodes:usedIds.size,films:films.length,candidates:complete.length}));
if(verified.length<100||films.length<1)throw Error('Release gate: fewer than 100 distinct complete series or no full films. No deployment.');
for(let i=0;i<verified.length;i+=15)console.log('RELEASE_TITLES',JSON.stringify(verified.slice(i,i+15).map(x=>[x.title,x.seasons.length,x.seasons.reduce((n,s)=>n+s.expected,0)])));
fs.writeFileSync('src/arabicBulkCatalog.json',JSON.stringify({series:verified,films,auditedAt:new Date().toISOString()},null,2));
console.log('BULK_CATALOG_READY');
