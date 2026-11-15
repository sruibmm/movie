import fs from 'node:fs';
import {normalizeArabic} from '../src/arabicDiscovery.js';
import {PUBLISHER_SERIES} from '../src/publisherSeries.js';
import {PUBLISHER_FILMS} from '../src/officialCatalog.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const norm=s=>normalizeArabic(s||'').normalize('NFKC').replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[^\p{L}\p{N} ]/gu,' ').replace(/\s+/g,' ').trim();
const fold=s=>norm(s).replace(/[ةه]/g,'ه').replace(/[ئؤء]/g,'').replace(/\s+/g,''); const raw=read('docs/publisher-mega-catalog.json'); if(fs.existsSync('docs/publisher-mega-additional.json'))raw.rows.push(...read('docs/publisher-mega-additional.json').rows);
const bulk=read('src/arabicBulkCatalog.json'),preview=read('src/arabicPublisherBatch.json'),out=read('src/arabicPublisherExpansion.json');
const token=process.env.TMDB_TOKEN||fs.readFileSync('src/main.jsx','utf8').match(/const TMDB_TOKEN = '([^']+)'/)?.[1];
const existingIds=new Set([...PUBLISHER_FILMS.map(f=>f.video),...bulk.films.map(f=>f.id),...PUBLISHER_SERIES.flatMap(g=>g.seasons.flatMap(s=>s.episodes.map(e=>e.video))),...bulk.series.flatMap(g=>g.seasons.flatMap(s=>s.episodes.map(e=>e.id))),...preview.flatMap(s=>s.episodes.map(e=>e.video)),...out.films.map(f=>f.id),...out.series.flatMap(s=>s.episodes.map(e=>e.id))]);
const filmsKnown=new Set([...PUBLISHER_FILMS,...bulk.films,...out.films].map(f=>fold(f.title)));
const seriesKnown=new Set([...PUBLISHER_SERIES,...bulk.series,...preview,...out.series].map(g=>fold(g.title)));
const filmKeys=new Set(out.films.map(f=>f.tmdbId)),seriesKeys=new Set(out.series.map(s=>s.tmdbId+':'+s.season));
const cachePath='.cinema-mega-metadata-cache.json',cache=fs.existsSync(cachePath)?read(cachePath):{};
const tmdb=async(p,params={})=>{const u='https://api.themoviedb.org/3/'+p+'?'+new URLSearchParams({language:'ar-SA',...params});if(cache[u])return cache[u];for(let a=0;a<2;a++)try{const r=await fetch(u,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('HTTP '+r.status);return cache[u]=await r.json();}catch(e){if(a===1)return {};await new Promise(r=>setTimeout(r,500));}};
const blocked=/مشاهد|تجميع|مقطع|ملخص|اعلان|إعلان|trailer|clip|مسلسليكو|مسرحي/i;
const clean=t=>t.replace(/[ـ_]+/g,' ').replace(/^[\s|\-–]+|[\s|\-–]+$/g,'').trim();
const ord={'الاول':1,'الاولى':1,'الثاني':2,'الثانيه':2,'الثالث':3,'الثالثه':3,'الرابع':4,'الرابعه':4,'الخامس':5,'الخامسه':5,'السادس':6,'السادسه':6};
const number=s=>Number(s)||ord[norm(s)]||0;
function seriesInfo(v){
 const s=v.title.replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632));
 const m=s.match(/(?:الحلقة|الحلقه|حلقة|حلقه)\s*[_ـ\-:]*\s*(\d+)/);
 if(!m)return null;
 let title=clean(s.slice(0,m.index).replace(/^.*?مسلسل\s+/,'').split('|').at(-1));
 let season=1;
 const sm=title.match(/(?:الموسم|الجزء)\s*(\d+|الأول|الاول|الثاني|الثالث|الرابع|الخامس|السادس)/);
 if(sm){season=number(sm[1]);title=clean(title.slice(0,sm.index));}
 if(!title||!season||title.length>60||!/[\u0600-\u06ff]/.test(title)||/[A-Za-z]/.test(title)||blocked.test(title))return null;
 return {title,season,number:Number(m[1])};
}
const groups=new Map(),filmJobs=new Map();
for(const v of raw.rows){
 if(existingIds.has(v.id)||blocked.test(v.title))continue;
 const owner=v['owner.username'];
 if(owner==='IMediaMovies'&&v.duration>=3600){
 let t=v.title.replace(/^\s*(?:حصري[اً]*\s*)?(?:الفيلم|فيلم)\s*(?:العربي|الرعب|الكوميدي|الرائع)?\s*/,'').split(/\s+[-–|]\s+|بطولة|بطوله|بجودة|جودة|[A-Za-z]{2,}/)[0];t=clean(t);
 if(t.length>=3&&t.length<55&&!filmsKnown.has(fold(t))&&!/الحلقة|الجزء|مسلسل/.test(t)){const key=norm(t);const old=filmJobs.get(key);if(!old||v.duration>old.v.duration)filmJobs.set(key,{kind:'movie',title:t,v});}
 }else{
 const x=seriesInfo(v);if(!x||seriesKnown.has(fold(x.title)))continue;
 const key=owner+':'+norm(x.title)+':'+x.season;let g=groups.get(key);if(!g)groups.set(key,g={kind:'tv',title:x.title,season:x.season,owner,episodes:new Map()});
 const old=g.episodes.get(x.number);if(!old||v.duration>old.duration)g.episodes.set(x.number,v);
 }
}
const jobs=[...filmJobs.values(),...[...groups.values()].filter(g=>g.episodes.size>=5&&[...g.episodes.keys()].sort((a,b)=>a-b).every((n,i)=>n===i+1))];
let cursor=0;const accepted=[],held=[];
async function check(j){
 try{
 const variants=[j.title,j.title.replace(/ى/g,'ي').replace(/ه(?=\s|$)/g,'ة'),j.title.replace(/ى/g,'ي'),norm(j.title)];const found=new Map();for(const query of new Set(variants)){const r=await tmdb('search/'+j.kind,{query});for(const m of r.results||[])if(m.original_language==='ar'&&[m.title,m.original_title,m.name,m.original_name].some(t=>fold(t)===fold(j.title)))found.set(m.id,m);if(found.size===1)break;}const matches=[...found.values()];
 if(matches.length!==1)throw Error('identity:'+matches.length);
 const m=matches[0];if(!m.poster_path)throw Error('poster');
 const poster='https://image.tmdb.org/t/p/w342'+m.poster_path;
 if(j.kind==='movie'){
 const v=j.v,d=await tmdb('movie/'+m.id);
 if(!d.runtime||Math.abs(d.runtime*60-v.duration)>Math.max(480,d.runtime*60*.12))throw Error('runtime');
 return {kind:j.kind,row:{id:v.id,provider:'dailymotion',title:/[\u0600-\u06ff]/.test(m.original_title||'')?m.original_title:m.title,tmdbId:m.id,year:(m.release_date||'').slice(0,4),poster,publisher:v['owner.username'],source:'https://www.dailymotion.com/video/'+v.id,duration:v.duration,runtime:d.runtime,raw:v.title,adsPossible:true,evidence:'publisher JSON HD/embeddable, canonical title and runtime; live playback and ads unverified'}};
 }
 const s=await tmdb('tv/'+m.id+'/season/'+j.season);
 if(s.episodes?.length!==j.episodes.size)throw Error('season-length:'+s.episodes?.length);
 if(!s.episodes.every(e=>j.episodes.has(e.episode_number)))throw Error('episode-number');
 return {kind:j.kind,row:{id:'tmdb:'+m.id+':'+j.season,provider:'dailymotion',title:/[\u0600-\u06ff]/.test(m.original_name||'')?m.original_name:m.name,tmdbId:m.id,year:(s.air_date||m.first_air_date||'').slice(0,4),poster,publisher:j.owner,source:'https://www.dailymotion.com/'+j.owner,season:j.season,expected:j.episodes.size,episodes:[...j.episodes.entries()].sort((a,b)=>a[0]-b[0]).map(([number,v])=>({number,id:v.id})),adsPossible:true,evidence:'publisher JSON HD/embeddable; canonical season count and numbered episodes; live playback and ads unverified'}};
 }catch(e){held.push({title:j.title,kind:j.kind,reason:e.message});}
}
await Promise.all(Array.from({length:8},async()=>{while(cursor<jobs.length){const j=jobs[cursor++];const x=await check(j);if(x)accepted.push(x);}}));
fs.writeFileSync(cachePath,JSON.stringify(cache));
let films=0,seasons=0,episodes=0;const added=[];
for(const x of accepted){const r=x.row;if(x.kind==='movie'){if(filmKeys.has(r.tmdbId)||existingIds.has(r.id))continue;filmKeys.add(r.tmdbId);existingIds.add(r.id);out.films.push(r);films++;}else{const k=r.tmdbId+':'+r.season;if(seriesKeys.has(k)||r.episodes.some(e=>existingIds.has(e.id)))continue;seriesKeys.add(k);r.episodes.forEach(e=>existingIds.add(e.id));out.series.push(r);seasons++;episodes+=r.episodes.length;}added.push({kind:x.kind,title:r.title,id:r.id,episodes:r.episodes?.length||0});}
out.films.sort((a,b)=>b.year.localeCompare(a.year));out.series.sort((a,b)=>b.year.localeCompare(a.year));
fs.writeFileSync('src/arabicPublisherExpansion.json',JSON.stringify(out,null,2)+'\n');
const summary={rawEligible:raw.rows.length,filmCandidates:filmJobs.size,seriesGroups:groups.size,checked:jobs.length,newFilms:films,newSeasons:seasons,newEpisodes:episodes,previewOnly:true};
fs.writeFileSync('docs/publisher-mega-import-report.json',JSON.stringify({summary,added,held},null,2)+'\n');console.log('IMPORT',JSON.stringify(summary));console.log('ADDED',JSON.stringify(added));
