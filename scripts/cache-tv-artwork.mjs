import fs from 'node:fs';
import {PUBLISHER_FILMS} from '../src/officialCatalog.js';
import {PUBLISHER_SERIES} from '../src/publisherSeries.js';
import {normalizeArabic} from '../src/arabicDiscovery.js';
const dest='samsung-local-dist';fs.mkdirSync(dest+'/artwork',{recursive:true});
const map={},snapshots={},arabicArt={};
const token=fs.readFileSync('src/main.jsx','utf8').match(/const TMDB_TOKEN = '([^']+)'/)?.[1];
const urls=new Set();
async function catalogue(kind,arabic){
 if(!token)return;
 const q=new URLSearchParams({language:arabic?'ar-SA':'en-US',page:'1',include_adult:'false',sort_by:'popularity.desc',...(arabic?{with_original_language:'ar'}:{'vote_count.gte':'100'})});
 const key='discover/'+kind+'?'+q.toString();
 try{
  const r=await fetch('https://api.themoviedb.org/3/'+key,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(10000)});
  if(!r.ok){console.log('Catalogue snapshot unavailable',kind,arabic,r.status);return;}
  const data=await r.json();if(!Array.isArray(data.results))return;
  snapshots[key]=data;
  for(const x of data.results.slice(0,12))if(typeof x.poster_path==='string'&&/^\/[A-Za-z0-9._-]+$/.test(x.poster_path))for(const size of ['w500','w342'])urls.add('https://image.tmdb.org/t/p/'+size+x.poster_path);
  console.log('Snapshot',kind,arabic,data.results.length);
 }catch(e){console.log('Snapshot failed',kind,arabic,String(e.message));}
}
await Promise.all([catalogue('movie',false),catalogue('movie',true),catalogue('tv',true)]);
for(const x of PUBLISHER_FILMS.slice(0,20))if(x.video&&/^[-_A-Za-z0-9]{11}$/.test(x.video))urls.add('https://i.ytimg.com/vi/'+x.video+'/hqdefault.jpg');
for(const x of PUBLISHER_SERIES.slice(0,20)){const video=x.seasons?.[0]?.episodes?.[0]?.video;if(video&&/^[-_A-Za-z0-9]{11}$/.test(video))urls.add('https://i.ytimg.com/vi/'+video+'/hqdefault.jpg');if(typeof x.poster==='string'&&/^https:\/\/image\.tmdb\.org\/t\/p\/(?:w\d+|original)\/[A-Za-z0-9._-]+$/.test(x.poster))urls.add(x.poster);}
// Match actual title artwork by normalized name and release year, never substitute an unrelated poster.
const selected=[...PUBLISHER_FILMS.filter(x=>x.video).slice(0,12).map(x=>({item:x,type:'film',kind:'movie'})),...PUBLISHER_SERIES.filter(x=>x.kind==='tv'&&x.seasons?.length).slice(0,12).map(x=>({item:x,type:'series',kind:'tv'}))];
let artIndex=0;
async function arabicPoster(){while(artIndex<selected.length){const {item,type,kind}=selected[artIndex++];if(!token)continue;try{
 const q=new URLSearchParams({query:item.title,language:'ar-SA',include_adult:'false',page:'1'});const r=await fetch('https://api.themoviedb.org/3/search/'+kind+'?'+q,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(6500)});if(!r.ok)continue;
 const data=await r.json();const year=String(item.year||'');const found=(data.results||[]).filter(v=>v.original_language==='ar'&&[v.title,v.name,v.original_title,v.original_name].filter(Boolean).some(n=>normalizeArabic(n)===normalizeArabic(item.title))&&(!year||String(v.release_date||v.first_air_date||'').slice(0,4)===year)&&/^\/[A-Za-z0-9._-]+$/.test(v.poster_path||''));
 if(found.length!==1)continue;const u='https://image.tmdb.org/t/p/w342'+found[0].poster_path;arabicArt[type+':'+item.id]=u;urls.add(u);
 }catch(e){} }}
await Promise.all(Array.from({length:6},arabicPoster));
const list=[...urls];let i=0,success=0;
async function fetchImage(){
 while(i<list.length){const url=list[i++];try{
  const r=await fetch(url,{signal:AbortSignal.timeout(8000),redirect:'error'});if(!r.ok||!/^image\/(?:jpeg|png|webp)(?:;|$)/i.test(r.headers.get('content-type')||''))continue;
  const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length<1000||bytes.length>3000000)continue;
  const ext=r.headers.get('content-type').includes('png')?'png':r.headers.get('content-type').includes('webp')?'webp':'jpg';
  const filename='artwork/'+String(success++).padStart(3,'0')+'.'+ext;fs.writeFileSync(dest+'/'+filename,bytes);map[url]=filename;
 }catch(e){}}
}
await Promise.all(Array.from({length:8},fetchImage));
fs.writeFileSync(dest+'/poster-cache.js','window.__TV_POSTERS__='+JSON.stringify(map)+';window.__TV_META__='+JSON.stringify(snapshots)+';window.__TV_ARABIC_ART__='+JSON.stringify(arabicArt)+';');
console.log('Bundled real artwork:',success,'of',list.length,'metadata snapshots:',Object.keys(snapshots).length,'matched Arabic posters:',Object.keys(arabicArt).length);
