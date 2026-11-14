import fs from 'node:fs';
import {normalizeArabic as norm} from '../src/arabicDiscovery.js';
const base='https://api.dailymotion.com/';
const get=async p=>{const r=await fetch(base+p,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error(r.status);return r.json()};
const fields='id,title,duration,allow_embed,geoblocking,owner.username,description,created_time';
const targets=[{title:'محرومين',year:'2017',expected:49,poster:'https://watanflix.com/images/series/1506769637.jpg'},{title:'عشق النساء',year:'2014',expected:55,poster:'https://watanflix.com/images/series/Ishq-Al-Nissa1464101411.jpg'},{title:'علاقات خاصة',year:'2015',expected:85,poster:null}];
const kw=v=>{if(!Array.isArray(v.geoblocking))return false;let a=v.geoblocking.map(x=>String(x).toLowerCase());return !a.length||(a[0]==='deny'?!a.includes('kw'):a.length===1&&a[0]==='allow'||a.includes('kw'));};
const compact=s=>norm(s).replace(/\s+/g,'').replace(/ة/g,'ه');
const words={'الاولى':1,'الاول':1,'الثانيه':2,'الثانية':2,'الثاني':2,'الثالثه':3,'الثالثة':3,'الثالث':3,'الرابعه':4,'الرابعة':4,'الرابع':4,'الخامسه':5,'الخامسة':5,'الخامس':5,'السادسه':6,'السادسة':6,'السادس':6,'السابعه':7,'السابعة':7,'السابع':7,'الثامنه':8,'الثامنة':8,'الثامن':8,'التاسعه':9,'التاسعة':9,'التاسع':9,'العاشره':10,'العاشرة':10,'العاشر':10,'الحاديه':1,'الحادية':1,'الحادي':1,'الواحده':1,'الواحدة':1,'الواحد':1};
function epNo(t){const s=norm(t);let m=s.match(/(?:الحلق[هة]|episode|\bep)\s*(\d{1,3})(?:\s|$)/i);if(m)return +m[1];m=s.match(/(?:الحلق[هة]|episode)\s+(.{1,60})/i);if(!m)return null;let p=m[1].split(' '),n=words[p[0]];if(n){let z=p.slice(1,5).join(' ');if(/عشر/.test(z))return n===10?10:n+10;let tens=z.match(/(?:و)?(العشرون|العشرين|الثلاثون|الثلاثين|الاربعون|الاربعين|الخمسون|الخمسين|الستون|الستين)/);if(tens)return n+({'العشرون':20,'العشرين':20,'الثلاثون':30,'الثلاثين':30,'الاربعون':40,'الاربعين':40,'الخمسون':50,'الخمسين':50,'الستون':60,'الستين':60}[tens[1]]);return n;}return null}

const maps=new Map(targets.map(t=>[t.title,new Map()]));
function process(v){
 if(!v.allow_embed||!kw(v)||v.duration<1100||v.duration>7200||v['owner.username']!=='OnlineartProduction')return;
 const title=norm(v.title),before=compact(title.split(/الحلق[هة]|episode|\bep\s/)[0]).replace(/^(?:المسلسلالسوري|المسلسل|مسلسل)/,'');
 for(const t of targets){if(before!==compact(t.title))continue;const n=epNo(v.title);if(!n||n>t.expected)continue;
 const old=maps.get(t.title).get(n);if(!old||old.duration<v.duration)maps.get(t.title).set(n,v);}
}
await Promise.all(targets.map(async t=>{try{for(let page=1;page<=4;page++){const d=await get('user/OnlineartProduction/videos?search='+encodeURIComponent(t.title)+'&fields='+fields+'&limit=100&page='+page);for(const v of d.list||[])process(v);if(!d.has_more)break;}}catch(e){console.log('SEARCH_ERROR',t.title,e.message);}}));
console.log('TARGET_INITIAL',JSON.stringify(targets.map(t=>[t.title,maps.get(t.title).size])));
if(targets.some(t=>maps.get(t.title).size<t.expected)){
 let before='',seen=new Set();
 for(let win=0;win<12;win++){let min=Infinity,added=0;
 for(let p=1;p<=10;p+=5){const rs=await Promise.allSettled(Array.from({length:5},(_,i)=>get('user/OnlineartProduction/videos?fields='+fields+'&limit=100&page='+(p+i)+(before?'&created_before='+before:''))));let more=false;
 for(const x of rs){if(x.status==='fulfilled'){more=more||x.value.has_more;for(const v of x.value.list||[]){min=Math.min(min,+v.created_time||Infinity);if(seen.has(v.id))continue;seen.add(v.id);added++;process(v);}}}
 if(!more)break;}
 if(targets.every(t=>maps.get(t.title).size===t.expected)||!added||!Number.isFinite(min)||before===String(min)||added<1000)break;before=String(min);}
}
const data=JSON.parse(fs.readFileSync('src/arabicBulkCatalog.json','utf8'));data.series=data.series.filter(g=>g.title!=='آباء وأمهات');const existing=new Set(data.series.flatMap(g=>g.seasons.flatMap(s=>s.episodes.map(e=>e.id))));
for(const t of targets){const m=maps.get(t.title);const ep=Array.from({length:t.expected},(_,i)=>m.get(i+1));const final=ep.at(-1);console.log('TARGET_RESULT',t.title, m.size,final?.title);
 if(ep.some(v=>!v)||!final||!/الاخير[هة]|والاخير[هة]|last episode|final episode/i.test(norm(final.title)))continue;
 if(ep.some(v=>existing.has(v.id)))continue;
 const e=ep.map((v,i)=>({number:i+1,id:v.id,duration:v.duration,owner:v['owner.username']}));
 data.series.push({id:'dm-series:'+norm(t.title),title:t.title,year:t.year,poster:t.poster,seasons:[{season:1,title:t.title,expected:t.expected,episodes:e}]});
 for(let i=0;i<e.length;i+=12)console.log('RECOVER_CHUNK '+JSON.stringify({title:t.title,year:t.year,poster:t.poster,expected:t.expected,episodes:e.slice(i,i+12)}));}
fs.writeFileSync('src/arabicBulkCatalog.json',JSON.stringify(data));console.log('RECOVER_COUNT',data.series.length);
