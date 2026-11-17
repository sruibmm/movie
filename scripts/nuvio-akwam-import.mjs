// Offline importer for Arabic-Nuvio's Akwam catalog: metadata & episode-index only.
// No saved stream URLs, media downloads, rights assumptions or automatic publishing.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const args=process.argv.slice(2);
function option(key, fallback) {const i=args.indexOf(key);return i>=0?args[i+1]:fallback;}
const source=path.resolve(option('--source','nuvio-upstream'));
const dest=path.resolve(option('--dest','docs/nuvio-akwam-import/full'));
const includeEpisodes=args.includes('--episodes');
const sourceRef=option('--source-ref','2f1a9b194d60af76df04ca6543e7ff34777c530b');
const clean=x=>typeof x==='string'?x.trim():'';
function poster(raw) {
 try {const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port?u.href:null;}
 catch{return null;}
}
function normalize(meta,kind){
 const prefix=kind==='movie'?'movie':'series';
 const m=clean(meta?.id).match(new RegExp('^akwam_'+prefix+'__(\\d+)__(.+)$'));
 if(!m||!clean(meta?.name))return null;
 const n=Number(meta?.imdbRating);
 return {
  id:'akwam:'+(kind==='movie'?'movie':'tv')+':'+m[1],
  providerId:m[1],nuvioId:meta.id,kind:kind==='movie'?'movie':'tv',
  title:clean(meta.name).slice(0,350),poster:poster(meta.poster),
  rating:Number.isFinite(n)&&n>=0&&n<=10?n:null
 };
}
function readEpisode(v) {
 const season=Number(v?.season),episode=Number(v?.episode),u=clean(v?.episodeUrl);
 if(!Number.isSafeInteger(season)||season<1||season>100||
    !Number.isSafeInteger(episode)||episode<1||episode>3000)return null;
 let url;try{url=new URL(u)}catch{return null;}
 if(url.protocol!=='https:'||url.host!=='akwam.ss'||!/^\/episode\/\d+\//.test(url.pathname)||url.username||url.password||url.hash)return null;
 return {season,episode,sourcePage:url.href,status:'unverified'};
}
function episodeIndex(meta){
 const videos=meta?.videos;
 if(!Array.isArray(videos)||videos.length>10000)return {episodes:[],conflicts:0};
 const by=new Map(),bad=new Set();
 for(const v of videos){
  const e=readEpisode(v);if(!e)continue;
  const key=e.season+':'+e.episode;
  if(by.has(key)&&by.get(key).sourcePage!==e.sourcePage)bad.add(key);
  else by.set(key,e);
 }
 for(const k of bad)by.delete(k);
 return {episodes:[...by.values()].sort((a,b)=>a.season-b.season||a.episode-b.episode),conflicts:bad.size};
}
async function listFiles(dir){
 const files=await fs.readdir(dir);
 return files.filter(x=>/^skip=\d+\.json$/.test(x)).sort((a,b)=>Number(a.match(/\d+/)[0])-Number(b.match(/\d+/)[0])).map(x=>path.join(dir,x));
}
async function maybeEpisodes(item){
 const file=path.join(source,'addon','meta','series',item.nuvioId+'.json');
 try{
  const doc=JSON.parse(await fs.readFile(file,'utf8'));
  const e=episodeIndex(doc.meta||doc);
  return {episodes:e.episodes,conflicts:e.conflicts,found:true};
 }catch(err){return {episodes:[],conflicts:0,found:false};}
}
async function kindImport(kind){
 const label=kind==='movie'?'movies':'series';
 const dir=path.join(source,'addon','catalog',kind==='movie'?'movie':'series');
 const stem=kind==='movie'?'src_akwam_movies':'src_akwam_series';
 const paths=[path.join(dir,stem+'.json'),...(await listFiles(path.join(dir,stem)))];
 const map=new Map(),errors=[],stats={pages:0,raw:0,duplicates:0,invalid:0,seriesMetaFiles:0,episodeCount:0,episodeConflicts:0};
 for(const file of paths){
  let doc;try{doc=JSON.parse(await fs.readFile(file,'utf8'));}catch(e){errors.push({file:path.relative(source,file),error:String(e.code||e.message)});continue}
  if(!Array.isArray(doc?.metas)){errors.push({file:path.relative(source,file),error:'not-a-catalog'});continue}
  stats.pages++;stats.raw+=doc.metas.length;
  for(const entry of doc.metas){
   const x=normalize(entry,kind);if(!x){stats.invalid++;continue;}
   if(map.has(x.id)){stats.duplicates++;continue;}
   map.set(x.id,x);
  }
 }
 let items=[...map.values()];
 if(kind==='series'&&includeEpisodes){
  // Akwam episodic metadata is stored by the Nuvio ID, not by the movie/series URL.
  for(const item of items){
   const e=await maybeEpisodes(item);
   if(e.found)stats.seriesMetaFiles++;
   stats.episodeCount+=e.episodes.length;stats.episodeConflicts+=e.conflicts;
   item.episodes=e.episodes;
   if(e.conflicts)item.episodeConflicts=e.conflicts;
  }
  // Overlay a separately checked complete episode index when Nuvio supplies no episode list.
  // This is metadata only: no MP4 URLs and no implied playback rights.
  try {
   const overlay=JSON.parse(await fs.readFile('docs/akwam-jaafar-episodes-2026-11-17.json','utf8'));
   const target=items.find(x=>x.id===overlay?.series?.id);
   const eps=(overlay.episodes||[]).map(e=>readEpisode({season:e.season,episode:e.episode,episodeUrl:e.sourcePage}));
   const consecutive=eps.length===30&&eps.every((e,i)=>e?.season===1&&e?.episode===i+1);
   if(overlay.completeEpisodeIndex===true&&target&&target.episodes.length===0&&consecutive){
    target.episodes=eps.map((e,i)=>({...e,downloadPageRefs:(overlay.episodes[i].downloadPages||[]).filter(v=>typeof v.url==='string'&&/^https:\/\/akwam\.ss\/download\/\d+\/\d+\//.test(v.url)).map(v=>v.url)}));
    target.episodeSource='docs/akwam-jaafar-episodes-2026-11-17.json';
    stats.episodeCount+=eps.length;stats.episodeOverlays=1;
   }
  } catch(e) {if(e.code!=='ENOENT')throw e;}
 }
 const chunk=kind==='series'?250:1000,parts=[];
 await fs.mkdir(dest,{recursive:true});
 for(let i=0;i<items.length;i+=chunk){
  const file=label+'-'+String(Math.floor(i/chunk)).padStart(3,'0')+'.json';
  const body={schema:1,source:'SafaaSalam/Arabic-Nuvio',sourceRef,provider:'akwam',kind:kind==='movie'?'movie':'tv',metadataOnly:true,playbackVerified:false,episodesOnlySourcePages:true,items:items.slice(i,i+chunk)};
  await fs.writeFile(path.join(dest,file),JSON.stringify(body)+'\n');
  parts.push({file,count:body.items.length});
 }
 return {kind,count:items.length,stats,errors,parts};
}
if(args.includes('--self-test')){
 assert.equal(normalize({id:'akwam_movie__100__film',name:' فيلم ',poster:'https://img.downet.net/a.jpg'},'movie').id,'akwam:movie:100');
 assert.equal(normalize({id:'other_99',name:'X'},'movie'),null);
 assert.equal(episodeIndex({videos:[{season:1,episode:1,episodeUrl:'https://akwam.ss/episode/123/title'},{season:1,episode:2,episodeUrl:'https://akwam.ss/episode/124/title'}]}).episodes.length,2);
 assert.equal(episodeIndex({videos:[{season:1,episode:1,episodeUrl:'https://akwam.ss/episode/123/a'},{season:1,episode:1,episodeUrl:'https://akwam.ss/episode/124/b'}]}).conflicts,1);
 assert.equal(readEpisode({season:1,episode:1,episodeUrl:'https://akwam.ss.evil.com/episode/1/a'}),null);
 console.log('NUVIO AKWAM IMPORTER PASS: IDs, metadata, valid episode URLs and conflict detection');
}else{
 const [movies,series]=await Promise.all([kindImport('movie'),kindImport('series')]);
 if(movies.count<10000||series.count<5000)throw Error('Catalog unexpectedly sparse: movies='+movies.count+', series='+series.count);
 if(movies.errors.length||series.errors.length)throw Error('Unreadable Nuvio pages: '+JSON.stringify([...movies.errors,...series.errors].slice(0,3)));
 const report={schema:1,source:'SafaaSalam/Arabic-Nuvio',sourceRef,metadataOnly:true,videoFilesDownloaded:0,streamLinksImported:0,movies,series};
 await fs.writeFile(path.join(dest,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({movies:movies.count,series:series.count,episodes:series.stats.episodeCount,episodesMetaFiles:series.stats.seriesMetaFiles,moviePages:movies.stats.pages,seriesPages:series.stats.pages,files:movies.parts.length+series.parts.length}));
}
