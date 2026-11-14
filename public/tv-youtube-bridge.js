(function(){
'use strict';
var q=new URLSearchParams(location.search),id=q.get('v')||'',list=q.get('list')||'',channel=q.get('channel')||'',player=null,ready=false,notice=document.getElementById('notice'),timer;
var idOK=/^[A-Za-z0-9_-]{11}$/.test(id),listOK=/^PL[A-Za-z0-9_-]{10,80}$/.test(list);
function send(type,extra){if(parent===window)return;parent.postMessage(Object.assign({type:'cinema-youtube:'+type,channel:channel},extra||{}),'*');}
function msg(s){notice.textContent=s;notice.hidden=!s;}
function fail(code){ready=false;clearTimeout(timer);msg(code===153?'تعذر تعريف Cinema لدى YouTube (153)':code===101||code===150?'الناشر لا يسمح بالتشغيل المدمج':code===100?'الفيديو غير متاح':'تعذر تشغيل الفيديو من YouTube');send('error',{code:code});}
if(!/^[a-f0-9]{32}$/.test(channel)||(!idOK&&!listOK)){msg('رابط فيديو غير صالح');return;}
var u=new URL('https://www.youtube-nocookie.com/embed/'+(idOK?id:'videoseries'));
if(listOK)u.searchParams.set('list',list);
u.searchParams.set('enablejsapi','1');u.searchParams.set('origin',location.origin);u.searchParams.set('widget_referrer','https://CineTV2026.CinemaTV');u.searchParams.set('autoplay','1');u.searchParams.set('playsinline','1');u.searchParams.set('rel','0');
var frame=document.createElement('iframe');frame.id='yt';frame.title='YouTube';frame.referrerPolicy='strict-origin-when-cross-origin';frame.allow='autoplay; encrypted-media; fullscreen; picture-in-picture';frame.allowFullscreen=true;frame.src=u.href;document.getElementById('player').appendChild(frame);
function report(){if(!ready||!player)return;try{send('state',{time:player.getCurrentTime(),duration:player.getDuration(),state:player.getPlayerState()});}catch(e){}}
window.onYouTubeIframeAPIReady=function(){try{player=new YT.Player(frame,{events:{onReady:function(){ready=true;clearTimeout(timer);msg('');send('ready');report();},onStateChange:report,onError:function(e){fail(Number(e.data));},onAutoplayBlocked:function(){send('autoplay-blocked');}}});}catch(e){fail(5);}};
window.addEventListener('message',function(e){var d=e.data;if(e.source!==parent||!d||d.type!=='cinema-youtube:command'||d.channel!==channel)return;var ok=false;try{if(ready&&player){if(d.command==='seek'&&Number.isFinite(d.delta)&&Math.abs(d.delta)<=60){var t=player.getCurrentTime(),duration=player.getDuration();if(Number.isFinite(t)&&duration>0){player.seekTo(Math.max(0,Math.min(duration,t+d.delta)),true);ok=true;}}else if(d.command==='toggle'){if(player.getPlayerState()===1)player.pauseVideo();else player.playVideo();ok=true;}else if(d.command==='play'){player.playVideo();ok=true;}else if(d.command==='pause'){player.pauseVideo();ok=true;}else if(d.command==='status'){ok=true;}report();}}catch(x){}send('ack',{requestId:d.requestId,ok:ok});});
var script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.onerror=function(){fail(5);};document.head.appendChild(script);timer=setTimeout(function(){if(!ready)fail(5);},15000);
})();