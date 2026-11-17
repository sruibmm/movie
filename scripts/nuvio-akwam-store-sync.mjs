// Update Cinema's metadata-only Akwam staging from Arabic-Nuvio's versioned store.
// Usage: node scripts/nuvio-akwam-store-sync.mjs --ack-provider-metadata
// Never downloads, extracts, proxies, or publishes protected media.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const UPSTREAM='SafaaSalam/Arabic-Nuvio';
const BASE='https://raw.githubusercontent.com/'+UPSTREAM+'/main/data/store/';
const SOURCES=['akwam_latest_movies','akwam_latest_series','akwam_arabic_series'];
const DIR='docs/akwam-nuvio-staging',MAX=8_000_000;
const gitHash=buf=>createHash('sha1').update('blob '+buf.length+'\0').update(buf).digest('hex');
async function download(id){
 const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),30000);
 try{
  const r=await fetch(BASE+id+'.json',{headers:{Accept:'application/json'},signal:ctrl.signal});
  if(!r.ok)throw Error('upstream '+id+': '+r.status);
  const bytes=Buffer.from(await r.arrayBuffer());
  if(bytes.length>MAX)throw Error('oversized '+id);
  const doc=JSON.parse(bytes.toString('utf8'));
  if(doc.id!==id||!Array.isArray(doc.items))throw Error('invalid upstream '+id);
  return {doc,sha:gitHash(bytes)};
 }finally{clearTimeout(timeout);}
}
function row(item,fromArabic){
 const m=/^akwam_(movie|series)__(\d+)__([A-Za-z0-9_.~-]+)$/.exec(item?.id||'');
 if(!m||typeof item.name!=='string'||!item.name.trim())return null;
 let slug=m[3].replace(/~([0-9a-f]{2})/gi,'%$1');
 try{slug=decodeURIComponent(slug);}catch{slug='';}
 const kind=m[1]==='movie'?'movie':'tv',id='akwam:'+kind+':'+m[2],rating=Number(item.imdbRating);
 return {id,kind,title:item.name.slice(0,180),poster:typeof item.poster==='string'&&item.poster.startsWith('https://')?item.poster:null,
 sourcePage:'https://akwam.ss/'+(kind==='movie'?'movie':'series')+'/'+m[2]+'/'+encodeURIComponent(slug),
 nuvioId:item.id,rating:Number.isFinite(rating)&&rating>=0&&rating<=10?rating:null,
 arabicCategory:fromArabic,playbackStatus:'unverified'};
}
async function changed(file,content){
 await fs.mkdir(path.dirname(file),{recursive:true});
 try{if(await fs.readFile(file,'utf8')===content)return false;}catch(e){if(e.code!=='ENOENT')throw e;}
 const temp=file+'.'+process.pid+'.tmp';
 try{await fs.writeFile(temp,content,{flag:'wx'});await fs.rename(temp,file);}
 finally{await fs.rm(temp,{force:true});}return true;
}
if(!process.argv.includes('--ack-provider-metadata'))throw Error('Require --ack-provider-metadata to fetch source metadata');
const sources=await Promise.all(SOURCES.map(download));
const table=new Map(),invalid=[];
sources.forEach((s,index)=>{
 for(const item of s.doc.items){
  const x=row(item,index===2);
  if(!x){invalid.push(item?.id);continue;}
  const old=table.get(x.id);if(old){if(index===2)old.arabicCategory=true;}
  else table.set(x.id,x);
 }
});
if(invalid.length||table.size<15000)throw Error('Incomplete/invalid upstream: '+invalid.length+' bad, '+table.size+' valid');
const rows=[...table.values()].sort((a,b)=>a.kind.localeCompare(b.kind)||Number(a.id.split(':').at(-1))-Number(b.id.split(':').at(-1)));
const chunkSize=1000,chunks=Math.ceil(rows.length/chunkSize),files=[],dry=process.argv.includes('--dry-run');
for(let i=0;i<chunks;i++){
 const contentRows=rows.slice(i*chunkSize,(i+1)*chunkSize),name='akwam-'+String(i+1).padStart(3,'0')+'.json';
 files.push({path:name,rows:contentRows.length});
 if(!dry)await changed(path.join(DIR,name),JSON.stringify({schema:1,source:UPSTREAM,sourceSnapshotDate:sources[0].doc.updatedAt,chunk:i+1,rows:contentRows})+'\n');
}
const counts=sources.map((s,i)=>({path:'data/store/'+SOURCES[i]+'.json',sha:s.sha,rawRows:s.doc.items.length}));
const audit={schema:1,status:'staged-not-published',source:{repository:UPSTREAM,branch:'main',snapshotDate:sources[0].doc.updatedAt,files:counts},
 catalog:{uniqueTitles:rows.length,movies:rows.filter(x=>x.kind==='movie').length,series:rows.filter(x=>x.kind==='tv').length,arabicSeriesCategory:rows.filter(x=>x.arabicCategory).length,
 duplicateSourceReferences:counts.reduce((s,x)=>s+x.rawRows,0)-rows.length,chunkSize,chunks,files},
 playback:{streamUrlsImported:0,contentDownloaded:0,verifiedQualityCount:0,verifiedPlaybackCount:0,publicPublishing:false},
 review:{rights:'Personal-use permission reported; rights not independently verified',sourceUrlQuality:'Upstream slugs are not individually verified',posterHotlinking:'Not tested',
 nuvioIdTruncation:'Upstream may shorten slugs; numeric ID authoritative'},
 licenseNotice:'Upstream code is declared MIT; no inference of movie/media license'};
if(!dry)await changed(path.join(DIR,'manifest.json'),JSON.stringify(audit,null,2)+'\n');
console.log('STAGED',JSON.stringify({titles:rows.length,movies:audit.catalog.movies,series:audit.catalog.series,arabicTagged:audit.catalog.arabicSeriesCategory,files:chunks,dry}));
