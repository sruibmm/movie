import {eligibleAsset,approvedDelivery} from './licensedCatalog.js';

// Staging-only validation. An explicit provider grant and playback observations
// are inputs from an authorized review, not something inferred from a public link.
const fail=reason=>({ok:false,reason});
const key=(t,a)=>t.id+':'+(t.kind==='tv'?a.season+':'+a.episode:'film');
const identity=t=>JSON.stringify([t.kind,t.title,t.year??null]);
export function reviewSourceSnapshot(previous,candidate,policy,observations={},now=Date.now()){
 try{
  if(!policy?.approved||!policy.grantReference||!policy.provider||!Array.isArray(policy.hosts)||!policy.hosts.length)return fail('provider-not-approved');
  if(!candidate||candidate.version!==1||candidate.provider!==policy.provider||!Number.isSafeInteger(candidate.revision)||candidate.revision<1||!Array.isArray(candidate.titles)||!candidate.titles.length)return fail('invalid-or-empty-snapshot');
  if(previous&&candidate.revision<=previous.revision)return fail('stale-revision');
  if(candidate.titles.length>(policy.maxTitles??10000))return fail('snapshot-too-large');
  const ids=new Set(),assets=new Map(),titles=new Map(),globalAssetIds=new Set();
  for(const t of candidate.titles){
   if(!t||typeof t.id!=='string'||!t.id||typeof t.title!=='string'||!t.title.trim()||!['tv','movie','play'].includes(t.kind)||ids.has(t.id)||!Array.isArray(t.assets)||!t.assets.length)return fail('invalid-or-duplicate-title');
   ids.add(t.id);titles.set(t.id,t);
   const expected=t.expectedEpisodes;
   if(t.kind==='tv'&&(!expected||typeof expected!=='object'||Array.isArray(expected)||!Object.keys(expected).length||Object.entries(expected).some(([s,n])=>!/^[1-9][0-9]*$/.test(s)||!Number.isSafeInteger(n)||n<1||n>2000)))return fail('missing-completeness-metadata');
   if(t.kind!=='tv'&&t.assets.length!==1)return fail('film-must-have-one-asset');
   for(const a of t.assets){
    if(!eligibleAsset(a,now,policy.region??'KW')||a.rights.provider!==policy.provider||a.rights.reference!==policy.grantReference)return fail('invalid-rights-or-media');
    const u=new URL(a.url);
    if(!policy.hosts.includes(u.hostname)||u.port||u.username||u.password||u.hash||u.search)return fail('unapproved-or-session-url');
    if(t.kind==='tv'&&(!Number.isSafeInteger(a.season)||!Number.isSafeInteger(a.episode)||a.episode<1||!Object.hasOwn(expected,a.season)||a.episode>expected[a.season]))return fail('invalid-episode-number');
    const k=key(t,a);
    if(assets.has(k)||globalAssetIds.has(a.id))return fail('duplicate-episode-or-asset');
    assets.set(k,a);globalAssetIds.add(a.id);
    const o=Object.hasOwn(observations,a.id)?observations[a.id]:null;
    if(!approvedDelivery(a,policy,o)||!o||o.url!==a.url||o.played!==true||!Number.isFinite(o.height)||o.height<720||!Number.isFinite(o.duration)||o.duration<60||!Number.isFinite(o.checkedAt)||o.checkedAt>now||now-o.checkedAt>(policy.maxAgeMs??86400000))return fail('playback-not-verified');
   }
   if(t.kind==='tv'&&t.assets.length!==Object.values(expected).reduce((n,x)=>n+x,0))return fail('incomplete-series');
  }
  let added=0;
  if(previous){
   const oldTitles=new Map(previous.titles.map(t=>[t.id,t]));
   for(const old of previous.titles){
    const current=titles.get(old.id);
    if(!current||identity(old)!==identity(current))return fail('title-deleted-or-remapped');
    for(const a of old.assets){const next=assets.get(key(old,a));if(!next||next.id!==a.id)return fail('episode-deleted-or-remapped');}
   }
   added=candidate.titles.filter(t=>!oldTitles.has(t.id)).length;
  }else added=candidate.titles.length;
  if(added>0&&added<(policy.minimumNewTitles??50))return fail('new-title-batch-too-small');
  return {ok:true,added,titles:candidate.titles.length,assets:assets.size,snapshot:structuredClone(candidate)};
 }catch{return fail('malformed-snapshot');}
}
export function retainLastGood(previous,candidate,policy,observations,now){
 const review=reviewSourceSnapshot(previous,candidate,policy,observations,now);
 return {active:review.ok?review.snapshot:previous,review};
}
