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
 try{const u=new URL(raw);return !isWarningMedia(u.href)&&u.protocol==='https:'&&!u.port&&!u.username&&!u.password&&!u.hash&&(defaults.test(u.hostname)||extra.has(u.hostname));}catch{return false;}
}

// The known warning clip must never be treated as a feature or episode,
// even if an operator later authorizes its hosting domain.
export function isWarningMedia(raw){
 try{const u=new URL(raw);return /(?:^|\/)aloo-?ytv-fake-sites-direct-wide-phone(?:\.mp4)?(?:\/|$)/i.test(decodeURIComponent(u.pathname));}catch{return false;}
}
// A 206 Content-Length is only the requested range, not the file size.
export function mediaTotalBytes(response){
 const range=response.headers.get('Content-Range')||'';
 const match=/^bytes\s+\d+-\d+\/(\d+)$/i.exec(range);
 const raw=match?match[1]:response.status===200?response.headers.get('Content-Length'):null;
 const size=raw===null?NaN:Number(raw);
 return Number.isSafeInteger(size)&&size>0?size:null;
}
// Read movie duration when a complete mvhd header is available in the probe.
// Missing metadata is unknown, never evidence of the expected runtime.
export function mp4HeaderDuration(bytes){
 const b=Uint8Array.from(bytes),v=new DataView(b.buffer);
 for(let i=4;i+24<=b.length;i++){
  if(b[i]!==109||b[i+1]!==118||b[i+2]!==104||b[i+3]!==100)continue;
  const start=i-4,size=v.getUint32(start),version=b[i+4];
  if(size<28||start+size>b.length)continue;
  const scaleAt=i+(version===0?16:version===1?24:0);
  if(!scaleAt||scaleAt+(version===1?12:8)>start+size)continue;
  const scale=v.getUint32(scaleAt),duration=version===0?v.getUint32(scaleAt+4):v.getUint32(scaleAt+4)*4294967296+v.getUint32(scaleAt+8);
  if(scale&&duration>0&&Number.isSafeInteger(duration))return duration/scale;
 }
 return null;
}
