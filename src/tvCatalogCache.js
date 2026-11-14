// Small bounded cache; only public TMDB metadata, never video URLs or credentials.
export const tvEnabled=()=>typeof window!=='undefined'&&(window.__CINEMA_TV__===true||new URLSearchParams(window.location.search).get('tv')==='1');
export function catalogPath(search='',page=1){const q=new URLSearchParams({language:'en-US',page:String(page),include_adult:'false'});if(search)q.set('query',search);else{q.set('sort_by','popularity.desc');q.set('vote_count.gte','100');}return (search?'search/movie':'discover/movie')+'?'+q;}
export const validCatalog=d=>!!d&&Array.isArray(d.results)&&Number.isFinite(Number(d.total_pages));
const KEY='cinema_tv_catalog_v2',TTL=24*60*60*1000,MAX=12;
let memory=null;
function read(){if(memory)return memory;try{memory=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch{memory={};}return memory;}
export function cachedCatalog(path){const row=read()[path];if(row&&Date.now()-row.at<TTL&&validCatalog(row.data))return row.data;const bundled=globalThis.__TV_META__?.[path];return validCatalog(bundled)?bundled:null;}
export function storeCatalog(path,data){if(!validCatalog(data))return;const rows=read();rows[path]={at:Date.now(),data:{results:data.results.slice(0,30),total_pages:data.total_pages}};for(const key of Object.keys(rows).sort((a,b)=>rows[b].at-rows[a].at).slice(MAX))delete rows[key];try{localStorage.setItem(KEY,JSON.stringify(rows));}catch{}}
