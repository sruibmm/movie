import {normalizeArabic,queryVariants,episodeMovie} from './arabicDiscovery.js';
export function personQueries(q){return [...new Set([...queryVariants(q),String(q||'').trim()])].filter(Boolean).slice(0,3);}
export function rankPeople(groups,q){
 const norm=normalizeArabic(q);const byId=new Map();
 for(const p of groups.flat()){if(!Number.isInteger(p?.id)||p.adult||!p.name)continue;
 const old=byId.get(p.id);const names=[...new Set([...(old?.names||[]),p.name,p.original_name].filter(Boolean))];
 byId.set(p.id,{...old,...p,names,profile_path:p.profile_path||old?.profile_path});
 }
 return [...byId.values()].map(p=>({...p,exact:p.names.some(n=>normalizeArabic(n)===norm),score:Math.max(...p.names.map(n=>{const a=normalizeArabic(n);return a===norm?100:a.startsWith(norm)?60:a.includes(norm)?35:0;}))+Math.min(15,Number(p.popularity)||0)+(p.known_for_department==='Acting'?8:0)})).sort((a,b)=>b.score-a.score).slice(0,8);
}
export function actingWorks(credits){
 const seen=new Map();
 for(const x of credits||[]){const type=x.media_type;if(!['movie','tv'].includes(type)||!Number.isInteger(x.id)||x.adult||!(x.title||x.name))continue;const key=type+':'+x.id;const old=seen.get(key);if(!old||Number(x.popularity)>Number(old.popularity))seen.set(key,{...x,title:x.title||x.name,release_date:x.release_date||x.first_air_date||'',media_type:type});}
 return [...seen.values()].sort((a,b)=>(Number(b.popularity)||0)-(Number(a.popularity)||0)||String(b.release_date).localeCompare(String(a.release_date)));
}
export function filterWorks(works,type,language,sort){return works.filter(x=>(type==='all'||x.media_type===type)&&(language==='all'||(language==='ar'?x.original_language==='ar':x.original_language!=='ar'))).sort((a,b)=>sort==='new'?String(b.release_date).localeCompare(String(a.release_date)):sort==='old'?String(a.release_date||'9999').localeCompare(String(b.release_date||'9999')):(Number(b.popularity)||0)-(Number(a.popularity)||0));}
export {episodeMovie};
