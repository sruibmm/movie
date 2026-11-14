// Fixed-host, read-only metadata relay for Samsung's embedded browser.
export async function tvMetadata(request,env){
 const u=new URL(request.url);
 if(request.method!=='GET')return Response.json({error:'Method not allowed'},{status:405});
 const path=u.pathname.slice('/api/tv-metadata/'.length);
 if(!/^(?:(?:search|discover)\/(?:movie|tv)|movie\/\d+(?:\/(?:external_ids|watch\/providers))?|tv\/\d+(?:\/season\/\d+|\/watch\/providers)?)$/.test(path))return Response.json({error:'Invalid metadata route'},{status:400});
 const auth=env.TMDB_READ_TOKEN?'Bearer '+env.TMDB_READ_TOKEN:request.headers.get('Authorization');
 if(!auth||!/^Bearer [A-Za-z0-9._-]{20,2048}$/.test(auth))return Response.json({error:'Missing metadata credential'},{status:401});
 const target=new URL('https://api.themoviedb.org/3/'+path);
 const allowed=new Set(['language','page','include_adult','query','sort_by','with_original_language','vote_count.gte','with_genres','year','first_air_date_year','region','watch_region','append_to_response']);
 for(const [k,v] of u.searchParams){if(allowed.has(k)&&v.length<=200)target.searchParams.set(k,v);}
 target.searchParams.set('include_adult','false');
 try{
  const res=await fetch(target,{headers:{Accept:'application/json',Authorization:auth},redirect:'error',signal:AbortSignal.timeout(12000)});
  if(!res.ok)return Response.json({error:'Metadata service unavailable'},{status:res.status===429?429:502});
  const body=await res.text();
  return new Response(body,{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, max-age=60'}});
 }catch{return Response.json({error:'Metadata connection failed'},{status:502});}
}
