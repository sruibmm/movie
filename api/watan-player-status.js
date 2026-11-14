export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'GET only'});
 const id=String(req.query.id||'');if(!/^[A-Za-z0-9_-]{11}$/.test(id))return res.status(400).json({error:'Invalid video ID'});
 const host=process.env.VERCEL_URL||req.headers.host;const origin='https://'+host;
 const u='https://www.youtube-nocookie.com/embed/'+id+'?'+new URLSearchParams({playsinline:'1',enablejsapi:'1',origin});
 const c=new AbortController();const t=setTimeout(()=>c.abort(),7000);
 try{const r=await fetch(u,{signal:c.signal,headers:{Referer:origin+'/', 'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'}});
 const html=await r.text();const m=html.match(/"playabilityStatus"\s*:\s*\{\s*"status"\s*:\s*"([^"]+)"/);const reason=html.match(/"playabilityStatus"\s*:\s*\{[\s\S]{0,500}?"reason"\s*:\s*"([^"]+)"/)?.[1];
 return res.json({http:r.status,playerStatus:m?.[1]||'UNKNOWN',reason:reason?.slice(0,250)||null,check:'embed document with site referrer; not actual playback'});
 }catch{return res.status(502).json({error:'Embed check unavailable'});}finally{clearTimeout(t);}
}