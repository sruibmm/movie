(function(){
if(!window.__CINEMA_TV__&&new URLSearchParams(location.search).get('tv')!=='1')return;
document.documentElement.classList.add('cinema-tv');
document.title='Cinema TV';
// Tizen 7's Chromium 94 predates AbortSignal.timeout; preserve actual cancellation.
if(typeof AbortSignal!=='undefined'&&!AbortSignal.timeout&&typeof AbortController!=='undefined'){AbortSignal.timeout=function(ms){var c=new AbortController();setTimeout(function(){c.abort();},ms);return c.signal;};}
var style=document.createElement('style');style.textContent='.cinema-tv body{font-size:18px}.cinema-tv #root{min-height:100vh}.cinema-tv button,.cinema-tv [role=button],.cinema-tv a,.cinema-tv input,.cinema-tv select,.cinema-tv summary{scroll-margin:28px}.cinema-tv button:focus,.cinema-tv [role=button]:focus,.cinema-tv a:focus,.cinema-tv input:focus,.cinema-tv select:focus,.cinema-tv summary:focus{outline:3px solid #c4b5fd!important;outline-offset:4px;box-shadow:0 0 0 5px #7c3aed55!important}.cinema-tv button{min-height:44px}.cinema-tv h3{font-size:16px!important}.cinema-tv .text-xs{font-size:14px;line-height:1.35}.cinema-tv .text-sm{font-size:16px;line-height:1.4}.cinema-tv [role=dialog]{overscroll-behavior:contain}.cinema-tv video{max-height:100vh}';style.textContent+=' .cinema-tv [class~="h-[100dvh]"]{height:100vh}.cinema-tv [class~="min-h-[100dvh]"]{min-height:100vh}.cinema-tv [class~="max-h-[85dvh]"]{max-height:85vh}.cinema-tv video::cue{font-family:Arial,sans-serif;font-size:1.15em;color:white;background:rgba(0,0,0,.8);text-shadow:1px 1px 2px #000}.cinema-tv [data-cinema-player] button{min-width:44px}.cinema-tv img{color:#aaa}.cinema-tv [role=button]{border-radius:16px}';document.head.appendChild(style);
var selector='button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),summary,[role="button"],[tabindex="0"]';
var root=document.getElementById('root'),scope=null,candidates=null,dirty=true,pending=false,lastHome=null,lastDialog=null,lastMove=0,focusBefore=null,lastScreen='';
function visible(el){return !!el&&el.isConnected&&!el.disabled&&el.getClientRects().length>0&&!el.closest('[hidden],[aria-hidden="true"],[inert]')&&getComputedStyle(el).visibility!=='hidden'&&getComputedStyle(el).display!=='none';}
function activeScope(){var dialogs=root.querySelectorAll('[role="dialog"],[aria-modal="true"]');for(var i=dialogs.length-1;i>=0;i--)if(visible(dialogs[i]))return dialogs[i];return root;}
function items(){var next=activeScope();if(dirty||scope!==next||!candidates){scope=next;candidates=Array.from(scope.querySelectorAll(selector)).filter(function(e){return visible(e)&&e.tagName!=='IFRAME'&&e.getAttribute('tabindex')!=='-1';});dirty=false;}return candidates.filter(visible);}
function focus(el){if(!el||!visible(el))return false;try{el.focus({preventScroll:true});}catch(x){el.focus();}if(document.activeElement!==el)return false;var r=el.getBoundingClientRect();if(r.top<12||r.bottom>innerHeight-12||r.left<12||r.right>innerWidth-12){try{el.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});}catch(x){el.scrollIntoView(false);}}return true;}
function identify(el){return el&&el.getAttribute('data-tv-focus');}
function initial(force){
 var a=document.activeElement,next=activeScope(),home=root.querySelector('.tv-home'),player=root.querySelector('[data-tv-play-surface]'),screen=home?'home':player?'player':'other',changed=scope!==next||lastScreen!==screen;
 if(!force&&!changed&&a&&a!==document.body&&next.contains(a)&&visible(a)&&a.tagName!=='IFRAME'&&items().indexOf(a)>=0)return;
 var list=items(),target=null;lastScreen=screen;
 if(next!==root){
  if(!lastDialog)lastDialog=a&&a!==document.body&&a.tagName!=='IFRAME'?a:focusBefore;
  target=list.find(function(e){return /close|إغلاق/i.test(e.getAttribute('aria-label')||'');})||list[0];
 }else if(lastDialog&&root.contains(lastDialog)&&visible(lastDialog)){target=lastDialog;lastDialog=null;}
 else if(player&&visible(player)){target=player;}
 else if(home&&lastHome){target=list.find(function(e){return identify(e)===lastHome;});}
 if(!target)target=list.find(function(e){return /start watching|resume/i.test((e.textContent||'').trim());})||list[0];
 if(target)focus(target);
}
function invalidate(){dirty=true;if(!pending){pending=true;requestAnimationFrame(function(){pending=false;initial(false);});}}
new MutationObserver(invalidate).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','hidden','aria-hidden','aria-modal','class','tabindex']});
window.addEventListener('resize',invalidate);
document.addEventListener('focusin',function(e){var t=e.target;if(t.tagName!=='IFRAME'){focusBefore=t;if(t.closest('.tv-home')&&!t.closest('[role="dialog"]')&&identify(t))lastHome=identify(t);}});
window.addEventListener('blur',function(){setTimeout(function(){var a=document.activeElement;if(a&&a.tagName==='IFRAME'&&a.getAttribute('data-tv-remote-managed')==='true'){try{a.blur();}catch(x){}initial(true);}},0);});
document.addEventListener('visibilitychange',function(){if(!document.hidden)initial(true);});
initial(false);
function code(e){return e.keyCode||({ArrowLeft:37,ArrowUp:38,ArrowRight:39,ArrowDown:40,Enter:13,Escape:27,Backspace:8}[e.key]||0);}
var lastBack=0;
function back(e){if(Date.now()-lastBack<150){e.preventDefault();e.stopPropagation();return true;}lastBack=Date.now();var list=items(),dialog=scope!==root;
 var target=list.find(function(x){return /close|إغلاق/i.test(x.getAttribute('aria-label')||'');})||list.find(function(x){return /^(←\s*)?(back|رجوع|العودة|إغلاق|close)/i.test((x.textContent||'').trim())||/back|رجوع/i.test(x.getAttribute('aria-label')||'');});
 if(!target&&dialog)target=list.find(function(x){return /^(×|done)$/i.test((x.textContent||'').trim());});
 if(!target)target=list.find(function(x){return identify(x)==='restore-controls';});
 if(target){e.preventDefault();e.stopPropagation();target.click();return true;}
 var routed=new CustomEvent('cinema-tv-back',{cancelable:true});window.dispatchEvent(routed);
 if(routed.defaultPrevented){e.preventDefault();e.stopPropagation();return true;}
 return false;
}
window.__cinemaTVBack=function(){var e=new Event('keydown',{bubbles:true,cancelable:true});Object.defineProperty(e,'keyCode',{value:10009});return !(document.activeElement||document.body).dispatchEvent(e);};
document.addEventListener('keydown',function(e){if(e.defaultPrevented)return;var k=code(e),a=document.activeElement;
 if(k===10009||k===461||k===27){back(e);return;}
 if(k===13&&a&&a.getAttribute('role')==='button'&&a.tagName!=='BUTTON'){e.preventDefault();e.stopPropagation();if(!e.repeat)a.click();return;}
 if(k<37||k>40)return;
 if(!a||a===document.body||!visible(a)||a.tagName==='IFRAME'){e.preventDefault();initial(true);return;}
 if(/TEXTAREA|SELECT/.test(a.tagName)||a.tagName==='VIDEO')return;
 if(a.tagName==='INPUT'&&(k===37||k===39))return;
 if(e.repeat&&Date.now()-lastMove<70){e.preventDefault();return;}lastMove=Date.now();
 var r=a.getBoundingClientRect(),x=(r.left+r.right)/2,y=(r.top+r.bottom)/2,best=null,score=Infinity;
 items().forEach(function(t){if(t===a)return;var q=t.getBoundingClientRect(),dx=(q.left+q.right)/2-x,dy=(q.top+q.bottom)/2-y,along=k===37?-dx:k===39?dx:k===38?-dy:dy,cross=k===37||k===39?Math.abs(dy):Math.abs(dx);if(along>5){var aligned=k===37||k===39?Math.min(r.bottom,q.bottom)>Math.max(r.top,q.top):Math.min(r.right,q.right)>Math.max(r.left,q.left);var v=along+cross*(aligned?0.8:3.5)+(aligned?0:55);if(v<score){score=v;best=t;}}});
 if(best){e.preventDefault();e.stopPropagation();focus(best);}else if(a.tagName!=='INPUT'){e.preventDefault();}
},true);
window.addEventListener('message',function(e){if(e.source!==window.parent||e.data?.type!=='cinema-tv-key')return;var key=Number(e.data.keyCode);if([10009,10252,415,19,412,417,10221].indexOf(key)<0)return;var ev=new Event('keydown',{bubbles:true,cancelable:true});Object.defineProperty(ev,'keyCode',{value:key});(document.activeElement||document.body).dispatchEvent(ev);});
})();
