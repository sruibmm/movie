(function(){
if(new URLSearchParams(location.search).get('tv')!=='1')return;
document.documentElement.classList.add('cinema-tv');
document.title='Cinema TV';
var style=document.createElement('style');style.textContent='.cinema-tv body{font-size:18px}.cinema-tv #root{min-height:100vh}.cinema-tv button,.cinema-tv [role=button],.cinema-tv a,.cinema-tv input,.cinema-tv select,.cinema-tv summary{scroll-margin:28px}.cinema-tv button:focus,.cinema-tv [role=button]:focus,.cinema-tv a:focus,.cinema-tv input:focus,.cinema-tv select:focus,.cinema-tv summary:focus{outline:3px solid #c4b5fd!important;outline-offset:4px;box-shadow:0 0 0 5px #7c3aed55!important}.cinema-tv button{min-height:44px}.cinema-tv h3{font-size:16px!important}.cinema-tv .text-xs{font-size:14px;line-height:1.35}.cinema-tv .text-sm{font-size:16px;line-height:1.4}.cinema-tv [role=dialog]{overscroll-behavior:contain}.cinema-tv video{max-height:100vh}';document.head.appendChild(style);
var selector='button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),summary,[role="button"],[tabindex="0"],iframe,video[controls]';
function visible(el){return el.getClientRects().length>0&&!el.closest('[hidden],[aria-hidden="true"]')&&getComputedStyle(el).visibility!=='hidden';}
function items(){var dialogs=Array.from(document.querySelectorAll('[role="dialog"],[aria-modal="true"]')).filter(visible),scope=dialogs.length?dialogs[dialogs.length-1]:document;return Array.from(scope.querySelectorAll(selector)).filter(visible);}
function initial(){var a=document.activeElement;if(!a||a===document.body||!visible(a)){var e=items()[0];if(e)e.focus();}}
var pending=false;new MutationObserver(function(){if(!pending){pending=true;requestAnimationFrame(function(){pending=false;initial();});}}).observe(document.getElementById('root'),{childList:true,subtree:true});initial();
document.addEventListener('keydown',function(e){var k=e.keyCode,a=document.activeElement;
if(k===10009||k===461||k===27){var list=items(),back=list.find(function(x){return /^(←\s*)?(back|رجوع|إغلاق|close)/i.test((x.textContent||'').trim())||/close|back|إغلاق|رجوع/i.test(x.getAttribute('aria-label')||'');});if(back){e.preventDefault();e.stopPropagation();back.click();}return;}
if(k<37||k>40||!a||/INPUT|TEXTAREA|SELECT/.test(a.tagName)||a.tagName==='VIDEO'||a.tagName==='IFRAME')return;
var r=a.getBoundingClientRect(),x=(r.left+r.right)/2,y=(r.top+r.bottom)/2,best=null,score=Infinity;
items().forEach(function(t){if(t===a)return;var q=t.getBoundingClientRect(),dx=(q.left+q.right)/2-x,dy=(q.top+q.bottom)/2-y,along=k===37?-dx:k===39?dx:k===38?-dy:dy,cross=k===37||k===39?Math.abs(dy):Math.abs(dx);if(along>5&&along+cross*3<score){score=along+cross*3;best=t;}});
if(best){e.preventDefault();best.focus();try{best.scrollIntoView({block:'nearest',inline:'nearest'});}catch(x){best.scrollIntoView(false);}}
},true);
})();