/* Local Samsung widget runtime. No parent iframe; all navigation is local. */
(function(){
 window.__CINEMA_TV__=true;
 var base='https://movie.o-a-f-a.workers.dev';
 var nativeFetch=window.fetch.bind(window);
 var artwork=window.__TV_POSTERS__||{},snapshots=window.__TV_META__||{},reads=new Map();
 function art(el){if(!el||el.tagName!=='IMG')return;el.decoding='async';var src=el.getAttribute('src')||'';if(artwork[src]&&el.getAttribute('data-tv-art-failed')!==src){el.setAttribute('data-tv-art-original',src);el.src=artwork[src];}}
 document.addEventListener('error',function(e){var el=e.target;if(el&&el.tagName==='IMG'&&el.hasAttribute('data-tv-art-original')){var original=el.getAttribute('data-tv-art-original');el.removeAttribute('data-tv-art-original');el.setAttribute('data-tv-art-failed',original);if(original!==el.src){e.stopImmediatePropagation();el.src=original;}}},true);
 document.addEventListener('DOMContentLoaded',function(){var root=document.getElementById('root');if(root)new MutationObserver(function(records){records.forEach(function(record){if(record.type==='attributes')art(record.target);else Array.from(record.addedNodes).forEach(function(node){if(node.nodeType!==1)return;art(node);if(node.querySelectorAll)node.querySelectorAll('img').forEach(art);});});}).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});});
 function remember(key,res){if(res.ok)res.clone().text().then(function(body){if(body.length>1000000)return;reads.set(key,{at:Date.now(),body:body});while(reads.size>24)reads.delete(reads.keys().next().value);}).catch(function(){});return res;}
 function readCached(key){var item=reads.get(key);return item&&Date.now()-item.at<90000?new Response(item.body,{headers:{'Content-Type':'application/json','X-Cinema-Cache':'memory'}}):null;}
 var publicRead=/^\/api\/(?:private-catalog\/(?:list|work|preview|episode|status)|source-sync\/catalog|tv-metadata\/|dailymotion-player)/;
 window.fetch=function(input,init){
  var url=typeof input==='string'?input:input&&input.url||String(input);
  var path=url.charAt(0)==='/'?url:null;
  if(path==='/licensed-arabic.json'&&window.__TV_LICENSED__)return Promise.resolve(new Response(JSON.stringify(window.__TV_LICENSED__),{headers:{'Content-Type':'application/json'}}));
  if(path&&publicRead.test(path)){
   var opt=Object.assign({},init||{});
   if(!opt.method||String(opt.method).toUpperCase()==='GET'){opt.credentials='omit';if(path.indexOf('/api/tv-metadata/')===0){var suffix=path.slice('/api/tv-metadata/'.length),cachedMeta=readCached(path);if(cachedMeta)return Promise.resolve(cachedMeta);return nativeFetch(base+path,opt).then(function(r){if(r.ok)return remember(path,r);throw Error('Metadata relay unavailable');}).catch(function(err){if(opt.signal&&opt.signal.aborted)throw err;return nativeFetch('https://api.themoviedb.org/3/'+suffix,opt).then(function(r){if(r.ok)return remember(path,r);throw Error('Metadata source unavailable');}).catch(function(err2){if(snapshots[suffix])return new Response(JSON.stringify(snapshots[suffix]),{headers:{'Content-Type':'application/json','X-Cinema-Cache':'bundled'}});throw err2;});});}var safeCache=/^\/api\/(?:private-catalog\/list(?:\?|$)|source-sync\/catalog(?:\?|$))/.test(path)&&!new Headers(opt.headers||{}).has('Authorization');if(safeCache){var cached=readCached(path);if(cached)return Promise.resolve(cached);return nativeFetch(base+path,opt).then(function(r){return remember(path,r);});}return nativeFetch(base+path,opt);}
  }
  return nativeFetch(input,init);
 };
 if(typeof URLSearchParams!=='undefined'&&!('size' in URLSearchParams.prototype)){Object.defineProperty(URLSearchParams.prototype,'size',{get:function(){var n=0;this.forEach(function(){n++;});return n;}});}
 if(typeof AbortSignal!=='undefined'&&!AbortSignal.timeout){AbortSignal.timeout=function(ms){var c=new AbortController();setTimeout(function(){c.abort();},ms);return c.signal;};}
 if(!Array.prototype.at){Object.defineProperty(Array.prototype,'at',{value:function(n){n=Math.trunc(n)||0;return this[n<0?this.length+n:n];}});}
 if(!Object.hasOwn)Object.hasOwn=function(o,k){return Object.prototype.hasOwnProperty.call(o,k);};
 function register(){try{var api=tizen.tvinputdevice;['MediaPlayPause','MediaPlay','MediaPause','MediaRewind','MediaFastForward','MediaStop','ColorF0Red','ColorF1Green','ColorF2Yellow','ColorF3Blue'].forEach(function(k){try{api.registerKey(k);}catch(e){}});}catch(e){}}
 register();
 document.addEventListener('tizenhwkey',function(e){if(e.keyName==='back'){var ev=new Event('keydown',{bubbles:true,cancelable:true});Object.defineProperty(ev,'keyCode',{value:10009});if(!(document.activeElement||document.body).dispatchEvent(ev))e.preventDefault();}});
 window.addEventListener('keydown',function(e){if(e.defaultPrevented)return;if(e.keyCode===10009){try{tizen.application.getCurrentApplication().exit();}catch(x){}}});
})();
