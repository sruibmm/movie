import {OPEN_FILMS,matchSeed,seedSource,seedMovie,normalizeTitle,yearOf,safeArchiveId,openLicense,archiveSource,historicArchiveYear} from '../src/openCinema.js';
const ARCHIVE='https://archive.org';
const RIGHTS=['publicdomain/zero/1.0','publicdomain/mark/1.0','licenses/by/2.0','licenses/by/2.5','licenses/by/3.0','licenses/by/4.0','licenses/by-sa/3.0','licenses/by-sa/4.0'];
const licenseQuery='('+RIGHTS.flatMap(p=>['http','https'].flatMap(s=>['','/'].map(end=>'licenseurl:"'+s+'://creativecommons.org/'+p+end+'"'))).join(' OR ')+')';
const esc=v=>String(v).replace(/[\\"]/g,'\\$&');
async function archiveJson(path,params){
 const u=new URL(path,ARCHIVE);if(params)for(const [k,v] of params)u.searchParams.append(k,v);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4500);
 try{const res=await fetch(u,{signal:controller.signal,headers:{accept:'application/json'}});if(!res.ok)throw Error('Archive HTTP '+res.status);return await res.json();}
 finally{clearTimeout(timer);}
}
async function findItems(q='',year='',page=1,limit=24){
 const query=['mediatype:movies','collection:feature_films',licenseQuery];
 if(q)query.push('title:"'+esc(q)+'"');
 // Filter dates after the metadata search; Archive's year field can vary by record.
 const params=[['q',query.join(' AND ')],['output','json'],['rows',String(limit)],['page',String(page)],['sort[]','downloads desc']];
 for(const f of ['identifier','title','year','date','licenseurl','creator'])params.push(['fl[]',f]);
 const data=await archiveJson('/advancedsearch.php',params);if(!data?.response)throw Error('Archive search response missing');const docs=data.response.docs||[];
 return {total:Number(data?.response?.numFound)||0,docs:docs.filter(d=>safeArchiveId(d.identifier)&&openLicense(d.licenseurl)&&historicArchiveYear(d.year||d.date))};
}
const toMovie=d=>({id:'archive:'+d.identifier,archiveId:d.identifier,openCatalog:true,title:String(d.title||d.identifier).slice(0,180),release_date:yearOf(d.year||d.date)+'-01-01',posterUrl:ARCHIVE+'/services/img/'+encodeURIComponent(d.identifier),overview:'Historic archive candidate · licence and MP4 checked on play'});
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'GET only'});
 const q=String(req.query.q||'').trim().slice(0,120),year=String(req.query.year||''),id=String(req.query.id||'');
 res.setHeader('Cache-Control','public, max-age=60, s-maxage=600, stale-while-revalidate=300');
 try{
  if(req.query.action==='resolve'){
   const seed=OPEN_FILMS.find(f=>f.key===id)||matchSeed(q,year);
   if(seed)return res.json({source:seedSource(seed)});
   if(id){if(!safeArchiveId(id))return res.status(400).json({error:'Invalid archive ID'});
    const data=await archiveJson('/metadata/'+encodeURIComponent(id));return res.json({source:archiveSource(data)||null});}
   if(!q||!historicArchiveYear(year))return res.json({source:null});
   const found=await findItems(q,year,1,100);
   const exact=found.docs.filter(d=>normalizeTitle(d.title)===normalizeTitle(q)&&yearOf(d.year||d.date)===year).slice(0,3);
   const sources=await Promise.all(exact.map(async d=>{try{return archiveSource(await archiveJson('/metadata/'+encodeURIComponent(d.identifier)),{title:q,year,minSeconds:Math.max(2400,Math.min(7200,(Number(req.query.runtime)||0)*45))});}catch{return null;}}));
   return res.json({source:sources.find(Boolean)||null});
  }
  const page=Math.max(1,Math.min(100,Math.floor(Number(req.query.page)||1)));
  const seeds=page===1?OPEN_FILMS.filter(f=>!q||normalizeTitle(f.title).includes(normalizeTitle(q))).map(seedMovie):[];
  try{const found=await findItems(q,'',page,100);return res.json({items:[...seeds,...found.docs.map(toMovie)],total:found.total,hasMore:page*100<found.total,archiveAvailable:true});}
  catch(error){console.warn('Archive search:',error?.message);return res.json({items:seeds,total:null,hasMore:false,archiveAvailable:false});}
 }catch{return res.status(502).json({source:null,error:'Open archive temporarily unavailable'});}
}
