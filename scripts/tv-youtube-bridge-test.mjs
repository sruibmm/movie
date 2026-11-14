import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const script=fs.readFileSync('public/tv-youtube-bridge.js','utf8');
const channel='a'.repeat(32),messages=[],elements={},listeners={};
const parent={postMessage:(m,o)=>messages.push(m)};
let playerConfig,seeked;
const player={getCurrentTime:()=>20,getDuration:()=>100,getPlayerState:()=>1,seekTo:t=>{seeked=t},pauseVideo(){},playVideo(){}};
function element(id){return elements[id]||(elements[id]={hidden:true,textContent:'',appendChild(x){this.child=x}});}
const context={URL,URLSearchParams,Object,Number,location:{search:'?v=abcdefghijk&channel='+channel,origin:'https://movie.o-a-f-a.workers.dev'},parent,document:{getElementById:element,createElement:()=>({}),head:element('head')},setTimeout:()=>1,clearTimeout(){},addEventListener:(name,fn)=>listeners[name]=fn,YT:{Player:function(f,c){playerConfig=c;return player;}}};
context.window=context;vm.runInNewContext(script,context);
const iframe=element('player').child;assert.equal(new URL(iframe.src).searchParams.get('origin'),context.location.origin);assert.equal(iframe.referrerPolicy,'strict-origin-when-cross-origin');assert.equal(new URL(iframe.src).searchParams.get('widget_referrer'),'https://CineTV2026.CinemaTV');
context.onYouTubeIframeAPIReady();playerConfig.events.onReady();assert(messages.some(m=>m.type==='cinema-youtube:ready'));
listeners.message({source:{},data:{type:'cinema-youtube:command',channel,command:'seek',delta:10,requestId:'1'}});assert.equal(seeked,undefined);
listeners.message({source:parent,data:{type:'cinema-youtube:command',channel,command:'seek',delta:10,requestId:'2'}});assert.equal(seeked,30);assert.equal(messages.at(-1).ok,true);
playerConfig.events.onError({data:153});assert.equal(messages.at(-1).code,153);assert.match(element('notice').textContent,/153/);
console.log('HTTPS YouTube bridge tests passed: real site origin, referrer policy, sender validation, seek acknowledgement and error 153.');
