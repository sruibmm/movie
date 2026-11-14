// Metadata only; never changes playback sources.
const IMG='https://image.tmdb.org/t/p/';
const normalize=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[\u064b-\u065f\u0670\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const canonical=s=>normalize(String(s||'').replace(/\s*\((?:19|20)\d{2}\)\s*$/,'').replace(/^مسلسل\s+|^فيلم\s+/,''));
const art=(p,size)=>typeof p==='string'&&/^\/[\w.-]+$/.test(p)?IMG+size+p:null;
export function matchMetadata(work,results){
 const name=canonical(work.title),year=String(work.year||'');
 if(!name)return null;
 const matches=(Array.isArray(results)?results:[]).filter(r=>[r.name,r.title,r.original_name,r.original_title].some(v=>canonical(v)===name)&&(!year||String(r.first_air_date||r.release_date||'').slice(0,4)===year));
 return matches.length===1?matches[0]:null;
}
export async function enrichWork(work,options,signal,fetcher=fetch){
 if(!options?.headers||!['tv','movie'].includes(work.kind))return work;
 const type=work.kind;
 const get=async path=>{const r=await fetcher('https://api.themoviedb.org/3/'+path,{...options,signal});if(!r.ok)throw Error('metadata unavailable');return r.json();};
 try{
  const q=new URLSearchParams({query:work.title,language:'ar',include_adult:'false'});if(work.year)q.set(type==='tv'?'first_air_date_year':'year',work.year);
  const search=await get('search/'+type+'?'+q);const found=matchMetadata(work,search.results);if(!found)return work;
  const details=await get(type+'/'+found.id+'?language=ar');
  const out={...work,year:work.year||String(details.first_air_date||details.release_date||'').slice(0,4)||null,poster:work.poster||art(details.poster_path,'w500'),banner:work.banner||art(details.backdrop_path,'w1280'),story:details.overview||work.story,genres:work.genres?.length?work.genres:(details.genres||[]).map(g=>g.name),assets:work.assets};
  if(type==='movie'){out.assets=work.assets.map(a=>({...a,duration:a.duration||((details.runtime||0)*60)||null}));return out;}
  const seasons=[...new Set(work.assets.map(a=>a.season))].slice(0,20),epMap=new Map();
  for(const n of seasons){try{const d=await get('tv/'+found.id+'/season/'+n+'?language=ar');for(const e of d.episodes||[])if(e.season_number===n&&Number.isInteger(e.episode_number))epMap.set(n+':'+e.episode_number,e);}catch{}}
  out.assets=work.assets.map(a=>{const e=epMap.get(a.season+':'+a.episode);if(!e)return a;return {...a,thumbnail:a.thumbnail||art(e.still_path,'w500'),story:e.overview||a.story,duration:a.duration||(e.runtime?e.runtime*60:null)};});
  return out;
 }catch{return work;}
}
