// Compact, shared title index. No media requests are needed to browse or search.
export const normalizeTitle=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[\u064b-\u065f\u0670\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const P='pc:';
const chunks=(a,n)=>Array.from({length:Math.ceil(a.length/n)},(_,i)=>a.slice(i*n,(i+1)*n));
const memo=new WeakMap();
export function invalidateIndex(storage){memo.delete(storage);}
export async function allRows(s,prefix){
 const out=[];let after;
 for(;;){const page=await s.list({prefix,limit:500,...(after?{startAfter:after}:{})});if(!page.size)break;out.push(...page.values());after=[...page.keys()].pop();if(page.size<500)break;}
 return out;
}
export function categoryInfo(url,label=''){
 const text=normalizeTitle((url||'')+' '+label),raw=String(url||'').toLowerCase();
 const year=raw.match(/(?:19|20)\d{2}/)?.[0]||null;
 const ramadan=/ramadan|رمضان/.test(text);
 const region=/kleeji|khaleeji|gulf|خليج/.test(text)?'خليجي':/turk|تركي/.test(text)?'تركي':/persian|iran|فارسي|ايراني/.test(text)?'فارسي':/egypt|مصر/.test(text)?'مصري':/syri|شام|سوري/.test(text)?'سوري':/arabi|arabic|عربي/.test(text)?'عربي':null;
 return {year,ramadan,region};
}
export function titleCard(row){
 const {id,title,kind,year,poster,banner,story,genres,sourcePage,count,availableCount,partial,source,discovered,region,ramadan,categories}=row;
 return {id,title,kind:kind||'unknown',year:year||null,poster:poster||null,banner:banner||null,story:story||'',genres:genres||[],sourcePage,count:count??null,availableCount:availableCount??null,partial:!!partial,source,discovered:!!discovered,region:region||null,ramadan:!!ramadan,categories:categories||[]};
}
export function mergeTitleCards(discovered,published){
 const rows=new Map();
 for(const r of discovered){if(r?.id&&r.title)rows.set(r.id,titleCard({...r,discovered:true}));}
 for(const r of published){if(!r?.id||!r.title)continue;const old=rows.get(r.id)||{};rows.set(r.id,titleCard({...old,...r,poster:r.poster||old.poster,banner:r.banner||old.banner,story:r.story||old.story,year:r.year||old.year,region:r.region||old.region,ramadan:r.ramadan||old.ramadan,categories:[...new Set([...(old.categories||[]),...(r.categories||[])])],discovered:false}));}
 return [...rows.values()].sort((a,b)=>Number(a.discovered)-Number(b.discovered)||Number(b.year||0)-Number(a.year||0)||a.title.localeCompare(b.title,'ar')||a.id.localeCompare(b.id));
}
export function searchCards(rows,{q='',kind='all',region='all',year='all',ramadan=false,offset=0,limit=40}={}){
 const terms=normalizeTitle(q).split(' ').filter(Boolean);
 const filtered=rows.filter(t=>(kind==='all'||kind===t.kind)&&(region==='all'||region===t.region)&&(year==='all'||String(t.year)===String(year))&&(!ramadan||t.ramadan)&&(!terms.length||terms.every(word=>normalizeTitle(t.title+' '+(t.region||'')+' '+(t.genres||[]).join(' ')).includes(word))));
 return {titles:filtered.slice(offset,offset+limit),next:offset+limit<filtered.length?String(offset+limit):null,total:filtered.length};
}
export async function getFastIndex(s,now=Date.now()){
 const old=memo.get(s);if(old&&now-old.at<10000)return old.promise;
 const promise=Promise.all([allRows(s,P+'discovered:'),allRows(s,P+'work:')]).then(([d,w])=>mergeTitleCards(d,w));
 memo.set(s,{at:now,promise});try{return await promise;}catch(e){invalidateIndex(s);throw e;}
}
// Cloudflare's multi-key operations save hundreds of sequential storage round trips.
export async function putMany(s,entries){for(const group of chunks(entries,100)){await s.put(Object.fromEntries(group));}}
export async function getMany(s,keys){const out=new Map();for(const group of chunks([...new Set(keys)],100)){const data=await s.get(group);for(const [k,v] of data)out.set(k,v);}return out;}
