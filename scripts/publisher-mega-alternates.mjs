import fs from 'node:fs';
import {normalizeArabic} from '../src/arabicDiscovery.js';
import {PUBLISHER_SERIES} from '../src/publisherSeries.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const norm=s=>normalizeArabic(s||'').replace(/[ةه]/g,'ه').replace(/\s+/g,'');
const raw=read('docs/publisher-mega-catalog.json');
const extra=fs.existsSync('docs/publisher-mega-additional.json')?read('docs/publisher-mega-additional.json'):{rows:[]};
const bulk=read('src/arabicBulkCatalog.json'),exp=read('src/arabicPublisherExpansion.json');
const known=new Set([...bulk.series.flatMap(g=>g.seasons.flatMap(s=>s.episodes.map(e=>e.id))),...exp.series.filter(s=>s.provider==='dailymotion').flatMap(s=>s.episodes.map(e=>e.id))]);
const existing=new Set(bulk.series.map(g=>norm(g.title)));
const token=process.env.TMDB_TOKEN||fs.readFileSync('src/main.jsx','utf8').match(/const TMDB_TOKEN = '([^']+)'/)?.[1];
const cachePath='.cinema-mega-metadata-cache.json',cache=fs.existsSync(cachePath)?read(cachePath):{};
async function tmdb(p,q={}){const u='https://api.themoviedb.org/3/'+p+'?'+new URLSearchParams({language:'ar-SA',...q});if(cache[u])return cache[u];try{const r=await fetch(u,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(12000)});return r.ok?cache[u]=await r.json():{};}catch{return {};}}
const groups=new Map();
const blocked=/مشاهد|تجميع|مقطع|ملخص|اعلان|إعلان|تريلر|trailer|clip|برومو|مقدمة|اغنية|أغنية/i;
const clean=s=>s.replace(/[ـ_]+/g,' ').replace(/^[\s|\-–]+|[\s|\-–]+$/g,'').trim();
const ord={'الاول':1,'الاولى':1,'الثاني':2,'الثانيه':2,'الثالث':3,'الثالثه':3,'الرابع':4,'الرابعه':4,'الخامس':5,'الخامسه':5,'السادس':6,'السادسه':6};
for(const v of [...raw.rows,...extra.rows]){
 if(blocked.test(v.title)||known.has(v.id)||v.duration<900)continue;
 const title=v.title.replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632));
 const m=title.match(/(?:الحلقة|الحلقه|حلقة|حلقه)\s*[_ـ\-:]*\s*(\d+)/);if(!m)continue;
 let t=clean(title.slice(0,m.index).replace(/^.*?مسلسل\s+/,'').split('|').at(-1));let season=1;
 const s=t.match(/(?:الموسم|الجزء)\s*(\d+|الأول|الاول|الثاني|الثالث|الرابع|الخامس|السادس)/);
 if(s){season=Number(s[1])||ord[normalizeArabic(s[1])]||0;t=clean(t.slice(0,s.index));}
 if(!season||!t||t.length>60||!/[\u0600-\u06ff]/.test(t)||/[A-Za-z]/.test(t)||blocked.test(t))continue;
 const key=v['owner.username']+':'+norm(t)+':'+season;
 let g=groups.get(key);if(!g)groups.set(key,g={title:t,season,owner:v['owner.username'],episodes:new Map()});
 const n=Number(m[1]),prev=g.episodes.get(n);if(!prev||v.duration>prev.duration)g.episodes.set(n,v);
}
const jobs=[...groups.values()].filter(g=>g.episodes.size>=5&&[...g.episodes.keys()].sort((a,b)=>a-b).every((n,i)=>n===i+1));
const out=[],held=[];let pos=0;
await Promise.all(Array.from({length:8},async()=>{while(pos<jobs.length){const g=jobs[pos++];try{
 const matches=PUBLISHER_SERIES.filter(x=>x.kind==='tv'&&norm(x.title)===norm(g.title));
 if(matches.length!==1)continue;const p=matches[0];
 if(existing.has(norm(p.title)))continue;
 const seasons=p.seasons.filter(s=>s.season===g.season&&s.episodes.length===g.episodes.size&&s.episodes.every(e=>g.episodes.has(e.number)));
 if(seasons.length!==1)continue;const s=seasons[0],year=String(s.year||p.year||'');
 if(!/^\d{4}$/.test(year))continue;
 const r=await tmdb('search/tv',{query:p.title});
 const exact=(r.results||[]).filter(m=>m.original_language==='ar'&&[m.name,m.original_name].some(t=>norm(t)===norm(p.title))&&String(m.first_air_date||'').slice(0,4)===String(p.year));
 if(exact.length!==1){held.push({title:g.title,reason:'canonical-year'});continue;}
 const m=exact[0],canonical=await tmdb('tv/'+m.id+'/season/'+g.season);
 if(canonical.episodes?.length!==g.episodes.size){held.push({title:g.title,reason:'canonical-count'});continue;}
 const episodes=[...g.episodes.entries()].sort((a,b)=>a[0]-b[0]).map(([number,v])=>({number,id:v.id,duration:v.duration,owner:v['owner.username']}));
 out.push({id:p.id,title:p.title,year:String(p.year),poster:m.poster_path?'https://image.tmdb.org/t/p/w342'+m.poster_path:p.poster,seasons:[{season:g.season,title:s.title,year,expected:episodes.length,episodes}],evidence:'Exact existing title, release year, numbered season length and official publisher HD metadata'});
 }catch(e){held.push({title:g.title,reason:e.message});}}}));
const merged=new Map(),used=new Set();for(const g of [...(fs.existsSync("src/publisherMegaAlternates.json")?read("src/publisherMegaAlternates.json"):[]),...out]){let x=merged.get(g.id);if(!x)merged.set(g.id,x={...g,seasons:[]});for(const s of g.seasons){if(x.seasons.some(y=>y.season===s.season)||s.episodes.some(e=>used.has(e.id)))continue;s.episodes.forEach(e=>used.add(e.id));x.seasons.push(s);}}
const result=[...merged.values()].filter(g=>g.seasons.length);
fs.writeFileSync('src/publisherMegaAlternates.json',JSON.stringify(result,null,2)+'\n');fs.writeFileSync(cachePath,JSON.stringify(cache));
console.log('ALTERNATES',JSON.stringify({groups:groups.size,complete:jobs.length,series:result.length,seasons:result.reduce((n,g)=>n+g.seasons.length,0),episodes:used.size,titles:result.map(g=>g.title),held:held.length}));
