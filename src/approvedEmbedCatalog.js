// Only publisher-authorized web embeds belong here. A reachable watch page
// or a working iframe is not evidence of permission to distribute a work.
// Each reviewed entry needs the exact Cinema movie/episode identity, the
// official HTTPS embed URL, permission reference, expiry and approved origin.
export const APPROVED_EMBEDS=Object.freeze([]);
export function approvedEmbed(movie,entries=APPROVED_EMBEDS,now=Date.now()){
 if(!movie||!Array.isArray(entries))return null;
 const id=String(movie.id||''),kind=movie.media_type;
 if(!id||!['movie','tv'].includes(kind))return null;
 const matches=entries.filter(e=>e&&e.movieId===id&&e.kind===kind&&
  (kind==='movie'||(e.season===movie.season&&e.episode===movie.episode)));
 if(matches.length!==1)return null;
 const e=matches[0];
 if(typeof e.publisher!=='string'||!e.publisher.trim()||typeof e.permissionRef!=='string'||!e.permissionRef.trim()||
  !Number.isFinite(Date.parse(e.expires))||Date.parse(e.expires)<=now)return null;
 try{
  const u=new URL(e.embed);
  if(u.protocol!=='https:'||u.username||u.password||u.origin!==e.origin||u.hash)return null;
  return {id:e.movieId,provider:'licensed-embed',publisher:e.publisher,embed:u.href,adsPossible:e.adsPossible!==false};
 }catch{return null;}
}
export function attachApprovedEmbed(movie,entries=APPROVED_EMBEDS,now=Date.now()){
 if(!movie||movie.licensedSource||movie.sourceSync||movie.publisherSource)return movie;
 const source=approvedEmbed(movie,entries,now);
 return source?{...movie,publisherSource:source}:movie;
}
