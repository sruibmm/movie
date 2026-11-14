// Personal-use catalog adapter. Reads ordinary publicly exposed episode links only.
// Run locally with permission from the relevant rights holders; output is NOT a public asset.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {validatePrivateCatalog,mergePrivateCatalog} from '../src/privateCatalog.js';
const origin='https://ae.alooytv16.com';
const decode=s=>s.replace(/&amp;|&#38;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/&nbsp;/gi,' ');
const clean=s=>decode(s.replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
function anchors(html,base){
 const list=[];
 for(const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi)){
  const a=m[1].match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
  if(!a)continue;
  try{list.push({url:new URL(decode(a[1]??a[2]??a[3]),base),label:clean(m[2])});}catch{}
 }
 return list;
}
function pageUrl(raw){
 const u=new URL(raw);
 if(u.origin!==origin||!/^\/watch\/[a-z0-9]+\.html$/i.test(u.pathname)||u.username||u.password||u.hash)throw Error('Unsupported or unapproved series page');
 return u;
}
function episodeIndex(html,base){
 const series=pageUrl(base),result=new Map();
 for(const a of anchors(html,series)){
  const m=a.label.match(/^Ep\s*#?\s*(\d+)$/i);
  if(!m||a.url.origin!==origin||a.url.pathname!==series.pathname||!a.url.searchParams.get('key'))continue;
  const n=Number(m[1]);if(!Number.isSafeInteger(n)||n<1||n>1000)throw Error('Invalid episode number');
  const prev=result.get(n);if(prev&&prev!==a.url.href)throw Error('Multiple season/episode identities: manual crosswalk required');
  result.set(n,a.url.href);
 }
 const episodes=[...result].sort((a,b)=>a[0]-b[0]);
 if(!episodes.length||episodes.some(([n],i)=>n!==i+1))throw Error('Incomplete episode sequence');
 const title=clean(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'');
 if(!title)throw Error('Missing title');
 const declared=clean(html).match(/(\d+)\s*حلقة/);
 if(declared&&Number(declared[1])!==episodes.length)throw Error('Declared episode count differs from discovered count');
 return {title,episodes,id:series.pathname.split('/').pop().replace(/\.html$/,'')};
}
function mediaLink(html,page){
 const ep=pageUrl(page);
 const matches=anchors(html,ep).filter(a=>a.url.origin===origin&&a.url.pathname==='/download_video.php'&&a.url.searchParams.has('video_url'));
 if(matches.length!==1)throw Error('Missing or ambiguous public media link');
 const link=matches[0].url,ref=new URL(link.searchParams.get('ref')||'/',origin);
 if(ref.pathname!==ep.pathname||ref.searchParams.get('key')!==ep.searchParams.get('key'))throw Error('Source episode identity mismatch');
 const media=new URL(Buffer.from(link.searchParams.get('video_url'),'base64').toString('utf8'));
 if(media.protocol!=='https:'||!/^vid\d+\.zvde-dsn-01\.site$/i.test(media.hostname)||media.port||media.username||media.password||media.hash)throw Error('Unapproved direct media host');
 return media.href;
}
async function getPage(url){
 const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(20000),headers:{accept:'text/html'}});
 if(!r.ok)throw Error('Public page unavailable: '+r.status);
 const h=await r.text();if(h.length>4*1024*1024)throw Error('Page too large');return h;
}
async function probe(url){
 const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(20000),headers:{Range:'bytes=0-4095'}});
 if(!r.ok||!r.body)throw Error('Media unavailable: '+r.status);
 const reader=r.body.getReader();let first=Buffer.alloc(0);
 try{while(first.length<32){const {done,value}=await reader.read();if(done)break;first=Buffer.concat([first,Buffer.from(value).subarray(0,4096)]);}}finally{await reader.cancel().catch(()=>{});}
 if(first.length<12||first.subarray(4,8).toString()!=='ftyp')throw Error('Media is not verified MP4');
 return true;
}
async function discover(raw){
 const base=pageUrl(raw);base.search='';const html=await getPage(base.href),index=episodeIndex(html,base.href),assets=[];
 for(const [episode,page] of index.episodes){
  const url=mediaLink(await getPage(page),page);await probe(url);
  assets.push({id:'alooytv:'+index.id+':s1:e'+episode,title:'الحلقة '+episode,season:1,episode,format:'mp4',url,sourcePage:page});
 }
 return {id:'alooytv:'+index.id,title:index.title,kind:'tv',assets};
}
if(process.argv[2]==='--self-test'){
 const a=origin+'/watch/test.html?key=abc';
 const html='<h1>Test</h1><a href="/watch/test.html?key=abc">Ep#1</a><a href="/watch/test.html?key=def">Ep#2</a>';
 assert.equal(episodeIndex(html,a).episodes.length,2);
 assert.throws(()=>episodeIndex(html.replace('Ep#2','Ep#3'),a),/Incomplete/);
 const media='https://vid2.zvde-dsn-01.site/file/test.jpg';
 const link='<a href="/download_video.php?ref='+encodeURIComponent('/watch/test.html?key=abc')+'&amp;video_url='+encodeURIComponent(Buffer.from(media).toString('base64'))+'">Download</a>';
 assert.equal(mediaLink(link,a),media);
 assert.throws(()=>mediaLink(link,a.replace('abc','def')),/identity mismatch/);
 assert.throws(()=>mediaLink(link.replace(Buffer.from(media).toString('base64'),Buffer.from('https://example.com/test.jpg').toString('base64')),a));
 console.log('PASS: episode indexing, completeness, exact mapping, and media host validation');
}else{
 const out=process.argv[2],pages=process.argv.slice(3);
 if(!out||!pages.length)throw Error('Usage: node scripts/discover-personal-catalog.mjs /private/path/catalog.json SERIES_PAGE [SERIES_PAGE ...]');
 const dest=path.resolve(out),publicRoot=path.resolve('public'),repoRoot=path.resolve('.');
 if(dest===repoRoot||dest.startsWith(repoRoot+path.sep)||dest.startsWith(publicRoot+path.sep))throw Error('Keep private catalog outside the repository');
 const titles=[];for(const page of pages)titles.push(await discover(page));
 const fresh={version:1,titles};validatePrivateCatalog(fresh);
 let old={version:1,titles:[]};try{old=JSON.parse(await fs.readFile(dest,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 const merged=mergePrivateCatalog(old,fresh);
 const temp=dest+'.'+process.pid+'.tmp';try{await fs.writeFile(temp,JSON.stringify(merged,null,2),{flag:'wx',mode:0o600});await fs.rename(temp,dest);}finally{await fs.rm(temp,{force:true});}
 console.log('Saved personal catalog: '+merged.titles.length+' works, '+merged.titles.reduce((n,t)=>n+t.assets.length,0)+' assets. MP4 signature checked; browser playback still needs verification.');
}
