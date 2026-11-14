import {normalizeArabic} from './arabicDiscovery.js';
const yearOf=v=>/^\d{4}$/.test(String(v||''))?String(v):'';
const filmKind=x=>x.kind==='مسرحية'?'play':x.kind==='مسلسل'?'tv':'movie';
const dmArt=id=>/^x[a-z0-9]{5,12}$/.test(id||'')?'https://www.dailymotion.com/thumbnail/video/'+id:null;
const ytArt=id=>/^[-_A-Za-z0-9]{11}$/.test(id||'')?'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg':null;
export function buildUnifiedCatalog({films=[],series=[],bulk={series:[],films:[]},site=[],playlists=[],dubai=[],auto=[],synced=[],licensed=[],personal=[]}={}){
 const rows=new Map();
 function add(source,item,kind,poster,year=item.year){
  if(!item?.title||!item.id&&!item.work)return;
  const name=normalizeArabic(item.title).replace(/\s+/g,' ').trim(),y=yearOf(year),id=String(item.id||item.work);
  // A shared title alone is not proof of the same release.
  const key=y&&['movie','tv','play'].includes(kind)?kind+':'+name+':'+y:source+':'+id;
  const v={source,item,kind,poster:poster||null,id:source+':'+id};
  let row=rows.get(key);if(!row){row={id:key,title:item.title,kind,year:y,poster:poster||null,variants:[],search:name};rows.set(key,row);}
  if(!row.variants.some(x=>x.id===v.id))row.variants.push(v);
  if(!row.poster&&poster)row.poster=poster;
  row.search+=' '+normalizeArabic([item.aliases||'',...(Array.isArray(item.seasons)?item.seasons:[]).map(s=>s.title||'')].join(' '));
 }
 for(const x of films)add('youtube-film',x,filmKind(x),globalThis.__TV_ARABIC_ART__?.['film:'+x.id]||x.poster||ytArt(x.video));
 for(const x of series)add('youtube-series',x,x.kind==='tv'?'tv':'collection',globalThis.__TV_ARABIC_ART__?.['series:'+x.id]||x.poster||ytArt(x.seasons?.[0]?.episodes?.[0]?.video));
 for(const x of bulk.series)add('dm-series',x,'tv',x.poster||dmArt(x.seasons?.[0]?.episodes?.[0]?.id));
 for(const x of bulk.films)add('dm-film',x,'movie',x.poster||dmArt(x.id));
 for(const x of site)add('dm-site',x,'tv',x.poster||dmArt(x.episodes?.[0]?.id));
 for(const x of playlists)add('playlist',x,'tv',x.poster);
 for(const x of auto)add('auto',x,x.kind||'unknown',x.poster||x.banner);
 for(const x of synced)add('synced',x,x.kind,x.poster);
 for(const x of licensed)add('licensed',x,x.kind,x.poster);
 for(const x of personal)add('personal',x,x.kind,x.poster);
 for(const x of dubai)add('directory',x,x.kind,x.poster);
 const priority={'licensed':0,'personal':1,'synced':2,'auto':3,'youtube-film':4,'youtube-series':4,'dm-series':5,'dm-film':5,'dm-site':5,'playlist':6,'directory':9};
 return [...rows.values()].map(r=>({...r,variants:r.variants.sort((a,b)=>(priority[a.source]??8)-(priority[b.source]??8))}));
}
export function searchUnified(rows,query,kind='all'){const q=normalizeArabic(query).replace(/\s+/g,' ').trim();return rows.filter(r=>(kind==='all'||r.kind===kind)&&(!q||r.search.includes(q)));}
export function mixedUnified(rows){const buckets=new Map();for(const r of rows){const key=r.variants[0].source;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(r);}const groups=[...buckets.values()],out=[];for(let i=0;groups.some(g=>i<g.length);i++)for(const g of groups)if(g[i])out.push(g[i]);return out;}
