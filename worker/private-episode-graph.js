// Source-independent episode graph. Never infer an episode URL from a filename.
const digits=s=>String(s||'').replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-0x660)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-0x6f0));
const int=v=>{const n=Number(v);return Number.isSafeInteger(n)&&n>=1&&n<=1000?n:null};
export function episodeIdentity(label,defaultSeason=1){
 const text=digits(label).replace(/\s+/g,' ').trim();
 let m=text.match(/^(?:S(?:eason)?\s*0*(\d+)\s*[-·:]?\s*E(?:p(?:isode)?)?\s*#?\s*0*(\d+)|(?:الموسم|الجزء)\s*(\d+)\s*[-·:]?\s*(?:الحلقة|حلقة)\s*(\d+))$/i);
 if(m){const season=int(m[1]||m[3]),episode=int(m[2]||m[4]);return season&&episode?{season,episode,explicit:true}:null;}
 m=text.match(/^(?:Ep(?:isode)?\s*#?\s*|E\s*|الحلقة\s*|حلقة\s*)(\d+)$/i);
 if(!m)return null;const season=int(defaultSeason),episode=int(m[1]);return season&&episode?{season,episode,explicit:false}:null;
}
export function buildEpisodeGraph(anchors,base,defaultSeason=1,declared=null){
 const slots=new Map(),conflicts=new Set();
 for(const a of anchors){
  const u=a.u;if(!u||u.pathname!==base.pathname||!u.searchParams.get('key'))continue;
  const identity=episodeIdentity(a.label,defaultSeason);if(!identity)continue;
  const {season,episode}=identity,k=season+':'+episode;
  const current=slots.get(k);
  if(current&&current.page!==u.href){conflicts.add(k);continue;}
  slots.set(k,{season,episode,page:u.href});
 }
 const safe=[...slots].filter(([k])=>!conflicts.has(k)).map(([,v])=>v).sort((a,b)=>a.season-b.season||a.episode-b.episode);
 const expected=Math.max(int(declared)||0,slots.size);
 const gaps=[];for(const season of new Set(safe.map(v=>v.season))){const numbers=safe.filter(v=>v.season===season).map(v=>v.episode);const set=new Set(numbers);for(let n=1;n<=Math.max(...numbers);n++)if(!set.has(n))gaps.push(season+':'+n);}
 return {slots:safe,expected,conflicts:[...conflicts],gaps,incomplete:conflicts.size>0||gaps.length>0||expected>safe.length};
}
// Every link must explicitly identify its source page and episode key.
export function mediaByEpisode(anchors,base,{source,allowedMedia,decode}){
 const result=new Map();
 for(const a of anchors){
  if(a.u?.pathname!=='/download_video.php')continue;
  const encoded=a.u.searchParams.get('video_url'),ref=source(a.u.searchParams.get('ref'),base);
  if(!encoded||!ref||ref.pathname!==base.pathname)continue;
  try{const url=decode(encoded);if(!allowedMedia(url))continue;const k=ref.searchParams.get('key')||'';const set=result.get(k)||new Set();set.add(url);result.set(k,set);}catch{}
 }
 return result;
}
export function candidatesFor(graph,page){
 const k=page.searchParams.get('key')||'';return [...(graph.get(k)||[])];
}
export function graphSignature(slots){return JSON.stringify(slots.map(({season,episode,page})=>[season,episode,page]));}
