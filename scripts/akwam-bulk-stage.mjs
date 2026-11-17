// Read-only Akwam title/episode catalog staging. Does not copy video files or publish streams.
// Usage: node scripts/akwam-bulk-stage.mjs --pages 2 --with-episodes --ack-provider-permission
import fs from 'node:fs/promises';
import path from 'node:path';
const ROOT='https://akwam.ss', OUT='docs/akwam-staging.json', UA='CinemaAuthorizedIndexer/0.2';
const args=process.argv.slice(2), option=(k,d)=>{const i=args.indexOf(k);return i<0?d:args[i+1];};
const pages=Math.min(500,Math.max(1,Number(option('--pages','2'))||2)), delay=Math.max(1200,Number(option('--delay-ms','1500'))||1500);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const decode=s=>String(s||'').replace(/&amp;|&#38;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)));
const strip=s=>decode(String(s||'').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
const anchor=html=>[...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi)].map(m=>({href:decode((m[1].match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i)||[])[1]||(m[1].match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i)||[])[2]),text:strip(m[2])})).filter(x=>x.href);
const within=(href,pattern,base=ROOT+'/')=>{try{const u=new URL(href,base);return u.origin===ROOT&&!u.username&&!u.password&&pattern.test(u.pathname)?u:null;}catch{return null;}};
const slug=u=>decodeURIComponent(u.pathname.split('/').filter(Boolean).at(-1)||'').replace(/[-_]/g,' ');
export function titles(html,kind){
 const out=new Map();const re=kind==='tv'?/^\/series\/(\d+)(?:\/|$)/i:/^\/movie\/(\d+)(?:\/|$)/i;
 for(const a of anchor(html)){const u=within(a.href,re);if(!u)continue;const number=u.pathname.match(re)[1],id='akwam:'+kind+':'+number;
 const title=!a.text||/^(?:مشاهدة|قائمتي|تحميل)$/.test(a.text)?slug(u):a.text;
 if(!out.has(id)||title.length>out.get(id).title.length)out.set(id,{id,providerId:number,kind,title,sourcePage:u.href,playback:{status:'unverified'},rights:{status:'unverified'}});
 }return [...out.values()];
}
export function episodeLinks(html){
 const rows=new Map();
 for(const a of anchor(html)){const u=within(a.href,/^\/episode\/(\d+)(?:\/|$)/i);if(!u)continue;
 const m=(a.text+' '+slug(u)).match(/(?:الحلقة|حلقة|episode|ep\.?)[\s:._-]*(\d{1,3})/i);
 if(!m)continue;const episode=Number(m[1]);if(episode<1||episode>999)continue;
 const id=u.pathname.match(/^\/episode\/(\d+)/)[1],key='e:'+episode;
 const item={id:'akwam:episode:'+id,episode,season:1,sourcePage:u.href,quality:'unknown',downloadPages:[],playback:{status:'unverified'}};
 if(rows.has(key)&&rows.get(key).id!==item.id){rows.get(key).conflict=true;item.conflict=true;rows.set('duplicate:'+id,item);}
 else rows.set(key,item);
 }return [...rows.values()].sort((a,b)=>a.episode-b.episode);
}
export function downloadPages(html){
 const out=new Set();
 for(const a of anchor(html)){const u=within(a.href,/^\/download\/\d+\/\d+(?:\/|$)/i);if(u&&!u.search&&!u.hash)out.add(u.href);}
 return [...out].map(url=>({downloadPage:url,quality:'unknown',status:'not-tested'}));
}
const write=async doc=>{await fs.mkdir(path.dirname(OUT),{recursive:true});const tmp=OUT+'.tmp';await fs.writeFile(tmp,JSON.stringify(doc,null,2)+'\n');await fs.rename(tmp,OUT);};
async function get(url,robots){
 if(robots?.disallow?.some(p=>p&&new URL(url).pathname.startsWith(p)))throw Error('robots-disallow');
 await sleep(delay);
 const r=await fetch(url,{headers:{'User-Agent':UA,'Accept':'text/html'},redirect:'manual',signal:AbortSignal.timeout(25000)});
 if(r.status===429)throw Error('rate-limited');
 if(r.status!==200)throw Error('source-http-'+r.status);
 if(!/^text\/html/i.test(r.headers.get('content-type')||''))throw Error('non-html-source');
 const s=await r.text();if(s.length>1_200_000)throw Error('oversize-html');return s;
}
async function robots(){
 const r=await fetch(ROOT+'/robots.txt',{headers:{'User-Agent':UA},signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('robots-not-verifiable');
 const s=await r.text();
 // Conservative: stop on any blanket disallow; do not interpret specialized agent blocks as permission.
 if(/^Disallow:\s*\/\s*$/im.test(s))throw Error('robots-disallow-all');
 return {disallow:s.split(/\r?\n/).map(x=>x.match(/^Disallow:\s*(\/[^\s#]*)/i)?.[1]).filter(Boolean)};
}
async function main(){
 if(args.includes('--self-test')){
  const sample='<a href="/series/55/%D8%AC%D8%B9%D9%81%D8%B1"><h3>جعفر العمدة</h3></a><a href="/episode/98/جعفر/الحلقة-2">حلقة 2</a><a href="/download/140992/76921/title">تحميل</a>';
  if(titles(sample,'tv')[0]?.id!=='akwam:tv:55'||episodeLinks(sample)[0]?.episode!==2||downloadPages(sample).length!==1)throw Error('self-test-failed');
  console.log('AKWAM CATALOG STAGING PASS');return;
 }
 if(!args.includes('--ack-provider-permission'))throw Error('Provide --ack-provider-permission only if you have authorization for automated catalog requests.');
 const rules=await robots();
 let doc;try{doc=JSON.parse(await fs.readFile(OUT,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;doc={schema:1,provider:'akwam',titles:{},completed:{tv:[],movie:[]},episodesCompleted:[],downloadPagesCompleted:[]};}
 if(doc.schema!==1||doc.provider!=='akwam')throw Error('invalid-existing-staging');
 for(const [kind,section] of [['tv','series'],['movie','movies']]){
  for(let p=1;p<=pages;p++){
   if(doc.completed[kind].includes(p))continue;
   const html=await get(ROOT+'/'+section+'?page='+p,rules), found=titles(html,kind);
   if(!found.length)break;
   for(const t of found)doc.titles[t.id]={...t,...doc.titles[t.id],title:t.title};
   doc.completed[kind].push(p);await write(doc);
   console.log(kind,p,found.length,'unique:',Object.keys(doc.titles).length);
  }
 }
 if(args.includes('--with-episodes')){
  for(const t of Object.values(doc.titles).filter(x=>x.kind==='tv'&&!doc.episodesCompleted.includes(x.id))){
   const html=await get(t.sourcePage,rules);t.episodes=episodeLinks(html);
   doc.episodesCompleted.push(t.id);await write(doc);
  }
 }
 if(args.includes('--with-download-pages')){
  for(const t of Object.values(doc.titles)){
   const works=t.kind==='tv'?t.episodes||[]:[t];
   for(const e of works){
    if(doc.downloadPagesCompleted.includes(e.id))continue;
    const html=await get(e.sourcePage,rules);e.downloadPages=downloadPages(html);
    doc.downloadPagesCompleted.push(e.id);await write(doc);
   }
  }
 }
 console.log('STAGED',Object.keys(doc.titles).length,'titles; published 0; video files downloaded 0');
}
await main();
