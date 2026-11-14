/* Local Samsung widget runtime. No parent iframe; all navigation is local. */
(function(){
 window.__CINEMA_TV__=true;
 var base='https://movie.o-a-f-a.workers.dev';
 var nativeFetch=window.fetch.bind(window);
 var publicRead=/^\/api\/(?:private-catalog\/(?:list|work|preview|episode|status)|source-sync\/catalog|tv-metadata\/|dailymotion-player)/;
 window.fetch=function(input,init){
  var url=typeof input==='string'?input:input&&input.url||String(input);
  var path=url.charAt(0)==='/'?url:null;
  if(path&&publicRead.test(path)){
   var opt=Object.assign({},init||{});
   if(!opt.method||String(opt.method).toUpperCase()==='GET'){opt.credentials='omit';return nativeFetch(base+path,opt);}
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
