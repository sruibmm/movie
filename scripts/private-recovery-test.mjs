import assert from 'node:assert/strict';
import {recoveryRequest} from '../worker/private-recovery.js';
const origin='https://af.alooytv16.com',work=origin+'/watch/recoveryfixture.html',id='alooytv:recoveryfixture';
const video='https://vid4.zvde-dsn-01.site/file/fixture.jpg';
const now=Date.now();let hits=0,media=0;
const fake=async(raw,opts)=>{
 hits++;assert.equal(opts.redirect,'manual');const url=String(raw);
 if(url===origin+'/'||url===origin+'/genre/ramadan-arabi-2026.html')return new Response('<a href="'+work+'"><img alt="مسلسل اختبار" src="/poster.jpg"></a>');
 if(url===work)return new Response('<h1>مسلسل اختبار</h1><script type="application/ld+json">{"@type":"TVSeries","name":"مسلسل اختبار"}</script><a href="?key=e1">Ep#1</a>');
 if(url===work+'?key=e1')return new Response('<a href="/download_video.php?ref='+encodeURIComponent('/watch/recoveryfixture.html?key=e1')+'&amp;video_url='+encodeURIComponent(btoa(video))+'">Download</a>');
 if(url===video){media++;return new Response(Uint8Array.from([0,0,0,24,102,116,121,112,105,115,111,109,0,0,0,0]),{status:206});}
 return new Response('',{status:404});
};
const req=route=>new Request('https://cinema.test'+route);
let r=await recoveryRequest('/private-list',req('/private-list'),fake,now);
assert.equal(r.status,200);const data=await r.json();assert.equal(data.recovery,true);assert.equal(data.partialCatalog,true);assert.equal(data.titles[0].id,id);assert.equal(data.titles[0].poster,origin+'/poster.jpg');
const before=hits;await recoveryRequest('/private-list',req('/private-list?q=اختبار'),fake,now);assert.equal(hits,before);
r=await recoveryRequest('/private-preview',req('/private-preview?id='+id),fake,now);assert.equal(r.status,200);assert.equal((await r.json()).slots[0].episode,1);
r=await recoveryRequest('/private-episode',req('/private-episode?id='+id+'&season=1&episode=1'),fake,now);assert.equal(r.status,200);assert.equal((await r.json()).url,video);assert.equal(media,1);
r=await recoveryRequest('/private-episode',req('/private-episode?id='+id+'&season=1&episode=2'),fake,now);assert.equal(r.status,502);
r=await recoveryRequest('/private-preview',req('/private-preview?id=https://example.com'),fake,now);assert.equal(r.status,400);
console.log('RECOVERY PASS: stateless catalogue, cached search, exact episode and media verification');
