// Private, read-only link refresh for explicitly approved Akwam assets.
// Never downloads, proxies, rehosts, or bypasses access protection.
// A public catalog entry must not be inferred from a successful refresh.
const ORIGIN = 'https://akwam.ss';
const entries = new Map();
const TTL_MS = 20_000;
const MAX_HTML = 350_000;
const H = {'Cache-Control':'private, no-store','Content-Type':'application/json; charset=utf-8'};
const error = (code,status) => Response.json({error:code},{status,headers:H});
const clean = s => String(s || '').replace(/&amp;|&#38;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)));
const attr = (tag,name) => {const m=tag.match(new RegExp('(?:^|\\s)'+name+'\\s*=\\s*(?:"([^"]*)"|\x27([^\x27]*)\x27|([^\\s>]+))','i'));return m?clean(m[1]??m[2]??m[3]):'';};

export function validDownloadPage(raw){
 try {
  const u=new URL(raw);
  return u.protocol==='https:' && u.host==='akwam.ss' && !u.username && !u.password && !u.hash && !u.search &&
   /^\/download\/\d{1,12}\/\d{1,12}(?:\/[a-z0-9_\-\u0600-\u06ff.%]+)*\/?$/i.test(u.pathname);
 } catch {return false;}
}

export function validDirectMedia(raw){
 try {
  const u=new URL(raw);
  return u.protocol==='https:' && !u.port && !u.username && !u.password && !u.hash &&
   /^(?:[a-z0-9-]+\.)+downet\.net$/i.test(u.hostname) && /^\/download\//.test(u.pathname) && /\.mp4$/i.test(u.pathname);
 } catch {return false;}
}
export function directFromDownloadHtml(markup,base){
 if(!validDownloadPage(base))throw Error('invalid-download-page');
 const media=new Set();
 for(const hit of String(markup).matchAll(/<a\b([^>]*)>/gi)){
  const raw=attr(hit[1],'href');
  if(!raw)continue;
  let u;try{u=new URL(raw,base);}catch{continue;}
  if(validDirectMedia(u.href))media.add(u.href);
 }
 if(media.size===0)throw Error('no-approved-direct-link');
 if(media.size>1)throw Error('ambiguous-direct-links');
 return [...media][0];
}
function approvedAsset(raw,id,now,region){
 let doc;try{doc=JSON.parse(raw||'');}catch{throw Error('approved-manifest-unconfigured');}
 if(doc?.version!==1||!Array.isArray(doc.assets)||doc.assets.length>10000)throw Error('invalid-approved-manifest');
 const a=doc.assets.find(x=>x?.id===id);
 if(!a)throw Error('asset-not-approved');
 if(!validDownloadPage(a.downloadPage))throw Error('invalid-download-page');
 if(!['720p','1080p','2160p'].includes(a.quality))throw Error('invalid-quality');
 const r=a.rights;
 if(!r?.reference||r?.webPlayback!==true||!Array.isArray(r.territories)||!(r.territories.includes(region)||r.territories.includes('*'))||
  !Number.isFinite(Date.parse(r.expires))||Date.parse(r.expires)<=now)throw Error('playback-permission-unverified');
 return a;
}

export async function refreshAkwam(request,env,fetcher=fetch,now=Date.now()){
 if(request.method!=='GET')return error('method-not-allowed',405);
 const u=new URL(request.url);
 const id=u.searchParams.get('id')||'';
 if(!/^[a-z0-9][a-z0-9:_\-]{1,95}$/i.test(id))return error('invalid-id',400);
 let asset;try{asset=approvedAsset(env.AKWAM_APPROVED_ASSETS_JSON,id,now,env.CINEMA_TERRITORY||'KW');}
 catch(e){return error(e.message,e.message==='asset-not-approved'?404:403);}
 const cached=entries.get(id);
 if(cached&&cached.downloadPage===asset.downloadPage&&cached.expires>now)return Response.json(cached.value,{headers:H});
 let response;
 try {response=await fetcher(asset.downloadPage,{redirect:'manual',headers:{Accept:'text/html'}});}
 catch {return error('source-unreachable',502);}
 if(response.status!==200)return error(response.status===429?'source-rate-limited':'source-http-'+response.status,502);
 const ct=response.headers.get('Content-Type')||'';
 if(ct&&!/text\/html/i.test(ct))return error('invalid-source-content-type',502);
 const len=Number(response.headers.get('Content-Length')||0);
 if(len>MAX_HTML)return error('source-page-too-large',502);
 const html=await response.text();
 if(html.length>MAX_HTML)return error('source-page-too-large',502);
 let url;try{url=directFromDownloadHtml(html,asset.downloadPage);}
 catch(e){return error(e.message,502);}
 const value={id,quality:asset.quality,url,sourcePage:asset.downloadPage,refreshedAt:new Date(now).toISOString(),expiryKnown:false,playbackVerified:false,mediaDelivery:'direct-mp4'};
 entries.set(id,{downloadPage:asset.downloadPage,expires:now+TTL_MS,value});
 if(entries.size>2000)entries.clear();
 return Response.json(value,{headers:H});
}
