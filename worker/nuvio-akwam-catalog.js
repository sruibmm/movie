// Arabic-Nuvio Akwam catalog adapter. Metadata only; no stream extraction.
const ROOT='https://raw.githubusercontent.com/SafaaSalam/Arabic-Nuvio/main/addon/catalog';
const ROWS={movies:{type:'movie',row:'src_akwam_movies'},series:{type:'series',row:'src_akwam_series'}};
const VALID=/^akwam_(?:movie|series)__\d+__/;
export function catalogPageUrl(kind,skip=0){
 const row=ROWS[kind];if(!row||!Number.isInteger(skip)||skip<0||skip>20000||skip%100)throw Error('invalid-page');
 const base=ROOT+'/'+row.type+'/'+row.row;
 return skip?base+'/skip='+skip+'.json':base+'.json';
}
export function normalizeNuvioAkwam(item){
 if(!item||!VALID.test(item.id||'')||!['movie','series'].includes(item.type)||typeof item.name!=='string'||!item.name.trim())return null;
 const match=item.id.match(/^akwam_(movie|series)__(\d+)__/);
 if(!match||match[1]!==item.type)return null;
 const sourceUrl='https://akwam.ss/'+(item.type==='movie'?'movie':'series')+'/'+match[2];
 const poster=typeof item.poster==='string'&&/^https:\/\/img\.downet\.net\//.test(item.poster)?item.poster:null;
 return {id:'akwam:'+item.type+':'+match[2],provider:'akwam',providerId:match[2],kind:item.type==='movie'?'movie':'tv',title:item.name.trim(),poster,sourcePage:sourceUrl,sourceCatalogId:item.id,playback:{status:'unverified'},rights:{status:'unverified'}};
}
export async function fetchNuvioAkwamPage(kind,skip=0,fetcher=fetch){
 const url=catalogPageUrl(kind,skip);
 const res=await fetcher(url,{headers:{Accept:'application/json'},redirect:'manual'});
 if(!res.ok||res.status!==200)throw Error('catalog-http-'+res.status);
 const contentType=res.headers.get('content-type')||'';
 if(contentType&&!/json|octet-stream|text\/plain/i.test(contentType))throw Error('unexpected-content-type');
 const data=await res.json();
 if(!Array.isArray(data.metas)||data.metas.length>100)throw Error('invalid-catalog-page');
 return {kind,skip,items:data.metas.map(normalizeNuvioAkwam).filter(Boolean),sourceUrl:url};
}
export async function stageNuvioAkwam({pages=2,fetcher=fetch}={}){
 if(!Number.isInteger(pages)||pages<1||pages>200)throw Error('invalid-pages');
 const seen=new Map(),report=[];
 for(const kind of ['movies','series']){
  for(let i=0;i<pages;i++){
   const page=await fetchNuvioAkwamPage(kind,i*100,fetcher);
   for(const item of page.items)seen.set(item.id,item);
   report.push({kind,skip:i*100,count:page.items.length,sourceUrl:page.sourceUrl});
   if(page.items.length<100)break;
  }
 }
 return {schema:1,source:'SafaaSalam/Arabic-Nuvio',mode:'metadata-only',items:[...seen.values()],pages:report};
}
