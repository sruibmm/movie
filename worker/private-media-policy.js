// One deployment-wide allowlist for source extraction, probing and private imports.
// New media hosts can be approved by the operator without a code release.
// Never accept arbitrary hosts from a viewer's request or from scraped HTML.
const defaults=/^vid\d+\.(?:zvde-dsn-01|ujeklsj)\.site$/i;
let extra=new Set();
export function configureMediaHosts(raw){
 if(raw==null||raw===''){extra=new Set();return;}
 let values;try{values=JSON.parse(raw);}catch{throw Error('invalid-media-host-config');}
 if(!Array.isArray(values)||values.length>64)throw Error('invalid-media-host-config');
 const hosts=values.map(x=>typeof x==='string'?x.toLowerCase().trim():'');
 if(hosts.some(h=>! /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(h)||/\.(?:local|internal|localhost|test|invalid|example|onion)$/.test(h)))throw Error('invalid-media-host-config');
 extra=new Set(hosts);
}
export function validMedia(raw){
 try{const u=new URL(raw);return u.protocol==='https:'&&!u.port&&!u.username&&!u.password&&!u.hash&&(defaults.test(u.hostname)||extra.has(u.hostname));}catch{return false;}
}
