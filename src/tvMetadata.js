export function metadataUrl(url,tv=typeof location!=='undefined'&&(globalThis.__CINEMA_TV__===true||new URLSearchParams(location.search).get('tv')==='1')){
 const u=new URL(url);
 return tv&&u.origin==='https://api.themoviedb.org'&&u.pathname.startsWith('/3/')?'/api/tv-metadata/'+u.pathname.slice(3)+u.search:url;
}
export async function metadataFetch(url,options={}){
 const target=metadataUrl(url);
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),18000);
 const abort=()=>c.abort();
 if(options.signal?.aborted)c.abort();else options.signal?.addEventListener('abort',abort,{once:true});
 try{return await fetch(target,{...options,signal:c.signal});}
 finally{clearTimeout(timer);options.signal?.removeEventListener('abort',abort);}
}
