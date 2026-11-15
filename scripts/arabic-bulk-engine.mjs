import fs from 'node:fs';
import path from 'node:path';
import {normalizeArabic} from '../src/arabicDiscovery.js';
import {PUBLISHER_SERIES} from '../src/publisherSeries.js';
import {PUBLISHER_FILMS} from '../src/officialCatalog.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const atomic=(p,d)=>{fs.writeFileSync(p+'.tmp',JSON.stringify(d,null,2)+'\n');fs.renameSync(p+'.tmp',p);};
const norm=s=>normalizeArabic(s||'').normalize('NFKC').replace(/[^\p{L}\p{N} ]/gu,'').replace(/\s+/g,' ').trim();
const flag=(k,d)=>{const i=process.argv.indexOf(k);return i<0?d:process.argv[i+1]};
const workers=Math.max(1,Math.min(12,Number(flag('--workers','8'))||8));
const max=Math.max(1,Number(flag('--limit','1000'))||1000);
const dry=process.argv.includes('--dry-run');
const cachePath='.cinema-bulk-cache.json';
const cache=fs.existsSync(cachePath)?read(cachePath):{};
const started=Date.now();let hits=0,requests=0;
const token=process.env.TMDB_TOKEN||fs.readFileSync('src/main.jsx','utf8').match(/const TMDB_TOKEN = '([^']+)'/)?.[1];
async function get(key,url,headers={},ttl=7*86400000){
 const cached=cache[key];if(cached&&Date.now()-cached.at<ttl){hits++;return cached.data;}
 for(let i=0;i<2;i++){try{requests++;const r=await fetch(url,{headers,signal:AbortSignal.timeout(12000)});
 if(!r.ok){if([429,500,502,503,504].includes(r.status))throw Error('retryable '+r.status);return {error:'HTTP '+r.status};}
 const data=await r.json();cache[key]={at:Date.now(),data};return data;
 }catch(e){if(i===1)return {error:e.message};await new Promise(r=>setTimeout(r,300*(i+1)));}}
}
const tmdb=(p,params={})=>{const u='https://api.themoviedb.org/3/'+p+'?'+new URLSearchParams({language:'ar-SA',...params});return get('tmdb:'+u,u,{Authorization:'Bearer '+token},30*86400000)};
const yt=id=>get('yt:'+id,'https://www.youtube.com/oembed?'+new URLSearchParams({url:'https://www.youtube.com/watch?v='+id,format:'json'}));
const bulk=read('src/arabicBulkCatalog.json'),preview=read('src/arabicPublisherBatch.json'),out=read('src/arabicPublisherExpansion.json');
const knownIds=new Set([...PUBLISHER_FILMS.map(x=>x.video),...bulk.films.map(x=>x.id),...PUBLISHER_SERIES.flatMap(g=>g.seasons.flatMap(s=>s.episodes.map(e=>e.video))),...bulk.series.flatMap(g=>g.seasons.flatMap(s=>s.episodes.map(e=>e.id))),...preview.flatMap(s=>s.episodes.map(e=>e.video)),...out.films.map(f=>f.id),...out.series.flatMap(s=>s.episodes.map(e=>e.id))]);
const knownTitles=new Set([...PUBLISHER_FILMS,...bulk.films].map(x=>norm(x.title)));
const knownSeries=new Set([...PUBLISHER_SERIES,...bulk.series,...preview].map(x=>norm(x.title)));
const filmKeys=new Set(out.films.map(f=>f.tmdbId)),seasonKeys=new Set(out.series.map(s=>s.tmdbId+':'+s.season));
const sources=read('docs/arabic-catalog-expansion-audit-2026-11-15.json').candidates;
const groupSource=read('docs/arabic-series-episode-audit-2026-11-15.json').groups;
const allow=new Set(['Rotana Cinema KSA','Rotana Cinema - روتانا سينما','AlarabiaCinema','El Sobky production السبكي للإنتاج الفني','ماسبيرو زمان','ماسبيرو دراما','حكايات مصرية','حكايات بلس - Hekayat Plus','ElWadyDrama','MBAProductionEgypt','Verdi Production House','شركة غزال للإنتاج والتوزيع الفني','Sheikhani for Creative Vision شيخاني للإنتاج المرئي','روتانا خليجية','قناة ذكريات','Qatar Television تلفزيون قطر']);
const blocked=/مسرحي|مسرحية|مسلسل|حلقات|الحلقة|مشاهد|تجميع|من فيلم|اعلان|إعلان|تريلر|trailer|clip/i;
function guesses(raw){
 const variants=[raw.split(/[|׀│]/)[0],raw.split(/بطولة|حصريا|حصرياً|كامل|بجودة|جودة|HD|\.\./i)[0]];
 return [...new Set(variants.map(s=>s.replace(/^\s*(?:حصري[اً]*\s*)?(?:الفيلم|فيلم)\s*(?:العربي|الكوميدي|النادر|الرائع|الاكشن|الرعب|التليفزيوني)?\s*/,'').replace(/^\s*[-_:״"«]+|[-_:״"»\s]+$/g,'').trim()).filter(s=>s.length>=3&&s.length<=55))];
}
const jobs=[];
for(const f of sources){if(!knownIds.has(f.video)&&f.duration>=3000&&f.publisherCheck?.knownPublisher&&allow.has(f.publisherCheck.author)&&!blocked.test(f.title))jobs.push({kind:'movie',id:f.video,titles:guesses(f.title),raw:f.title,publisher:f.publisherCheck.author,source:f.publisherCheck.authorUrl,duration:f.duration});}
for(const g of groupSource){
 const match=g.title.match(/(?:الجزء|الموسم)\s+(?:ال)?(الأول|اول|اولى|الثاني|ثاني|الثالث|ثالث|الرابع|رابع|الخامس|خامس|السادس|سادس|\d+)/);
 const nums={'الأول':1,'اول':1,'اولى':1,'الثاني':2,'ثاني':2,'الثالث':3,'ثالث':3,'الرابع':4,'رابع':4,'الخامس':5,'خامس':5,'السادس':6,'سادس':6};
 const season=match?(nums[match[1]]||Number(match[1])||1):1;
 const title=g.title.replace(/^مسلسل\s+/,'').replace(/\s*[-–]?\s*(?:الجزء|الموسم)\s+.*$/,'').replace(/\s*[-–]?\s*رمضان\s+\d{4}$/,'').trim();
 if(g.episodes.some(([,id])=>!knownIds.has(id))&&allow.has(g.author))jobs.push({kind:'tv',id:g.id,titles:[title],raw:g.title,publisher:g.author,source:g.authorUrl,season,episodes:g.episodes.map(([number,id])=>({number,id}))});
}
// Optional input: canonical title, publisher, source URL, provider ID, runtime or numbered episodes.
const input=flag('--input',null);if(input)for(const j of read(input))jobs.push({...j,external:true});
// Discover from the saved public index, but use only original publisher embeds.
const discovery=read('docs/arabic-publisher-discovery-2026-11-15.json').candidates;
const existingGroups=new Set(groupSource.map(g=>g.id));
const ord=['الاولى','الثانية','الثالثة','الرابعة','الخامسة','السادسة','السابعة','الثامنة','التاسعة','العاشرة'];
function epNumber(t){
 const x=norm(t).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632));
 const m=x.match(/(?:الحلقه|حلقه|episode)\s*(\d+)/i)||x.match(/(?:الحلقه|حلقه|episode)\s*[^\d]{0,20}(\d+)/i);
 if(m)return Number(m[1]);
 const k=ord.findIndex(o=>x.includes(norm(o)));return k>=0?k+1:0;
}
function indexTitle(t){return t.replace(/^\s*(?:حصريا\s+)?مسلسل\s+/,'').replace(/["«»]/g,'').split(/\s+-\s+|\s+رمضان\s+|\s+بطولة\s+/)[0].trim();}
async function discover(c){
 try{
 const title=indexTitle(c.title);
 if(knownSeries.has(norm(title))||knownIds.has(c.posterVideo)||existingGroups.has(c.id))return null;
 const match=await search({kind:'tv',titles:[title]});
 if(match.length!==1)return null;
 const m=match[0];if(seasonKeys.has(m.id+':1'))return null;
 const season=await tmdb('tv/'+m.id+'/season/1');
 const expected=season.episodes?.length;if(!expected||expected>150)return null;
 const key='index:'+c.id;let cards=cache[key]?.data;
 if(!cards){requests++;const r=await fetch('https://arjoani.com/series/'+encodeURIComponent(c.id),{signal:AbortSignal.timeout(12000)});if(!r.ok)return null;
 const html=await r.text();cards=[];
 for(const match of html.matchAll(/<article class="card">([\s\S]*?)<\/article>/g)){
 const block=match[1];if(!block.includes('/episodes/'))continue;
 const id=block.match(/i\.ytimg\.com\/vi\/([-_A-Za-z0-9]{11})\//)?.[1];
 const label=block.match(/<h3>([\s\S]*?)<\/h3>/)?.[1]?.replace(/&quot;|&#039;|&amp;/g,' ');
 const minutes=Number(block.match(/<span>(\d+)\s*دقيقة<\/span>/)?.[1]||0);
 if(id&&label)cards.push({id,label,minutes,number:epNumber(label)});
 }
 cache[key]={at:Date.now(),data:cards};
 }
 const eps=cards.sort((a,b)=>a.number-b.number);
 if(eps.length!==expected||eps.some((e,i)=>e.number!==i+1||e.minutes<15||knownIds.has(e.id)||!norm(e.label).includes(norm(title))))return null;
 // The third-party index is not a license or playback source. Verify every original provider record.
 for(let i=0;i<eps.length;i+=4){const chunk=eps.slice(i,i+4);const checks=await Promise.all(chunk.map(e=>yt(e.id)));
 if(checks.some((o,k)=>o.author_name!==c.author||!o.html?.includes(chunk[k].id)||epNumber(o.title)!==chunk[k].number||!norm(o.title).includes(norm(title))))return null;}
 return {kind:'tv',id:c.id,titles:[title],raw:c.title,publisher:c.author,source:c.authorUrl,season:1,episodes:eps.map(({number,id})=>({number,id})),discovered:true};
 }catch{return null;}
}
if(process.argv.includes('--discover')){
 const pool=discovery.filter(c=>allow.has(c.author)&&!existingGroups.has(c.id)&&!knownIds.has(c.posterVideo)).sort((a,b)=>(cache['scan:'+a.id]?.at||0)-(cache['scan:'+b.id]?.at||0)).slice(0,Number(flag('--discovery-limit','100')));
 let pos=0;const found=[];
 await Promise.all(Array.from({length:Math.min(6,workers)},async()=>{while(pos<pool.length){const c=pool[pos++];const row=await discover(c);cache['scan:'+c.id]={at:Date.now(),data:{matched:!!row}};if(row)found.push(row);}}));
 jobs.push(...found);console.log('DISCOVERY',JSON.stringify({scanned:pool.length,matchedComplete:found.length,episodes:found.reduce((n,g)=>n+g.episodes.length,0)}));
}
const dmAudit=read('docs/arabic-library-consolidated-2026-11-15.json');
const dmNext=read('docs/arabic-expansion-next-batch-2026-11-15.json');
const dmNames={'xay1vle':'بستان الدم','xaxzwqu':'العذاب امرأة','xaxzsri':'النصابين','x8p3ftk':'مرزوقة','x8p3pkw':'الثلاثة يشتغلونها','x7yiol1':'إبليس في المدينة','x7yec8h':'العبقري خمسة','x72cv3w':'أجراس الخطر','x6y24bj':'دموع في ليلة الزفاف','x6y24bi':'خمسة في الجحيم','x6y1oqo':'نص أرنب','x6w0y01':'الليلة الموعودة','x6w0ujr':'الثأر','x6w0n06':'عذراء وثلاثة رجال','x6w0n5n':'التخشيبة','x6w0mx6':'الأقزام قادمون','x6w0m8r':'اعتداء','x6w0mo9':'أخي وصديقي سأقتلك'};
for(const f of dmAudit.filmCandidatesDetailed)if(dmNames[f.id]&&!knownIds.has(f.id))jobs.push({kind:'movie',provider:'dailymotion',id:f.id,titles:[dmNames[f.id]],raw:f.title,publisher:f.owner,duration:f.duration,source:'https://www.dailymotion.com/video/'+f.id});
for(const g of [...dmAudit.seriesCandidatesDetailed,...dmNext.rows]){
 const eps=g.episodes.map(e=>({number:e.number,id:e.id})).sort((a,b)=>a.number-b.number);
 if(eps.every(e=>!knownIds.has(e.id)))jobs.push({kind:'tv',provider:'dailymotion',id:g.id||g.playlist,titles:[g.title],raw:g.title,publisher:'ImediaSeries',season:1,episodes:eps,source:'https://www.dailymotion.com/playlist/'+(g.id||g.playlist)});
}
const dm=id=>get('dm:'+id,'https://api.dailymotion.com/video/'+id+'?fields=id,title,duration,allow_embed,owner.username,owner.verified,available_formats,advertising_instream_blocked');
async function dmCheck(j,id,number){
 const d=await dm(id);
 if(d.id!==id||!d.allow_embed||!d['owner.verified']||d['owner.username']?.toLowerCase()!==j.publisher.toLowerCase()||!d.available_formats?.some(x=>/^hd/.test(x))||d.duration<900)throw Error('dailymotion-metadata-or-hd');
 if(number&&epNumber(d.title)!==number)throw Error('dailymotion-episode-number');
 if(number&&!j.titles.some(t=>norm(d.title).includes(norm(t))))throw Error('dailymotion-title');
 return d;
}
const pending=jobs.filter(j=>j.titles?.length&&(allow.has(j.publisher)||j.provider==='dailymotion'&&['IMediaMovies','ImediaSeries'].includes(j.publisher))).slice(0,max);
const results=[];let index=0;
async function search(j){
 const matches=new Map();for(const t of j.titles){const d=await tmdb('search/'+j.kind,{query:t});for(const x of d.results||[]){if(x.original_language==='ar'&&[x.title,x.original_title,x.name,x.original_name].some(n=>norm(n)===norm(t)))matches.set(x.id,x);}}
 return [...matches.values()];
}
async function verify(j){
 try{
 if(j.kind==='movie'&&knownIds.has(j.id))throw Error('existing-reference');
 if(j.kind==='tv'&&(!j.episodes?.length||j.episodes.some((e,i)=>e.number!==i+1||knownIds.has(e.id))))throw Error('existing-or-incomplete-season');
 if(j.kind==='movie'&&j.titles.some(t=>knownTitles.has(norm(t))))throw Error('existing-title');
 if(j.kind==='tv'&&j.titles.some(t=>knownSeries.has(norm(t))))throw Error('existing-title');
 const matches=await search(j);if(matches.length!==1)throw Error('canonical-identity:'+matches.length);
 const m=matches[0];if(!m.poster_path)throw Error('no-poster');
 const poster='https://image.tmdb.org/t/p/w342'+m.poster_path;
 if(j.kind==='movie'){
 if(filmKeys.has(m.id))throw Error('existing-canonical-film');
 const detail=await tmdb('movie/'+m.id);if(!detail.runtime||Math.abs(detail.runtime*60-j.duration)>Math.max(480,detail.runtime*60*.15))throw Error('runtime-mismatch');
 if(j.provider==='dailymotion'){const d=await dmCheck(j,j.id);if(Math.abs(d.duration-j.duration)>60)throw Error('dailymotion-runtime');}else{const o=await yt(j.id);if(o.author_name!==j.publisher||!o.html?.includes(j.id))throw Error('publisher-embed-mismatch');}
 return {kind:j.kind,row:{id:j.id,provider:j.provider||'youtube',title:m.original_title||m.title,tmdbId:m.id,year:(m.release_date||'').slice(0,4),poster,publisher:j.publisher,source:j.source,duration:j.duration,runtime:detail.runtime,raw:j.raw,adsPossible:true,evidence:'canonical runtime and publisher embed metadata; playback/ads unverified'}};
 }
 if(seasonKeys.has(m.id+':'+j.season))throw Error('existing-canonical-season');
 const s=await tmdb('tv/'+m.id+'/season/'+j.season);
 if(s.episodes?.length!==j.episodes.length)throw Error('canonical-season-length');
 // Every episode from the already matched publisher audit; re-check first/last before import.
 if(j.provider==='dailymotion'){for(let i=0;i<j.episodes.length;i+=4)await Promise.all(j.episodes.slice(i,i+4).map(e=>dmCheck(j,e.id,e.number)));}else for(const e of [j.episodes[0],j.episodes.at(-1)]){const o=await yt(e.id);if(o.author_name!==j.publisher||!o.html?.includes(e.id))throw Error('publisher-embed-mismatch');}
 if(j.external){for(const e of j.episodes){const o=await yt(e.id);if(o.author_name!==j.publisher||!o.html?.includes(e.id)||epNumber(o.title)!==e.number||!j.titles.some(t=>norm(o.title).includes(norm(t))))throw Error('external-episode-mismatch');}}
 return {kind:j.kind,row:{id:'tmdb:'+m.id+':'+j.season,title:m.original_name||m.name,tmdbId:m.id,year:(s.air_date||m.first_air_date||'').slice(0,4),season:j.season,expected:j.episodes.length,publisher:j.publisher,source:j.source,poster,episodes:j.episodes,provider:j.provider||'youtube',adsPossible:true,evidence:'canonical season count and publisher audit; playback/ads unverified'}};
 }catch(e){return {kind:j.kind,id:j.id,title:j.raw,reason:e.message};}
}
await Promise.all(Array.from({length:workers},async()=>{while(index<pending.length){const j=pending[index++];results.push(await verify(j));if(results.length%25===0)atomic(cachePath,cache);}}));atomic(cachePath,cache);
let films=0,seasons=0,episodes=0;const accepted=[];
for(const x of results.filter(x=>x.row).sort((a,b)=>String(a.row.id).localeCompare(String(b.row.id)))){const r=x.row;
 if(x.kind==='movie'){if(filmKeys.has(r.tmdbId)||knownIds.has(r.id))continue;filmKeys.add(r.tmdbId);knownIds.add(r.id);out.films.push(r);films++;}
 else{const key=r.tmdbId+':'+r.season;if(seasonKeys.has(key)||r.episodes.some(e=>knownIds.has(e.id)))continue;seasonKeys.add(key);r.episodes.forEach(e=>knownIds.add(e.id));out.series.push(r);seasons++;episodes+=r.episodes.length;}
 accepted.push({kind:x.kind,id:r.id,title:r.title});
}
out.films.sort((a,b)=>b.year.localeCompare(a.year));out.series.sort((a,b)=>b.year.localeCompare(a.year));
if(!dry)atomic('src/arabicPublisherExpansion.json',out);
const summary={checked:pending.length,requests,cacheHits:hits,newFilms:films,newSeasons:seasons,newEpisodes:episodes,previewOnly:true,strictApproved:0,elapsedMs:Date.now()-started,dryRun:dry};
atomic('docs/arabic-bulk-engine-report.json',{summary,accepted,held:results.filter(r=>!r.row)});
console.log('BULK ENGINE',JSON.stringify(summary));console.log('ACCEPTED',JSON.stringify(accepted));
