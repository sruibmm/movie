import assert from 'node:assert/strict';
import {configureMediaHosts,validMedia} from '../worker/private-media-policy.js';
import {mediaLink,resolveEpisode,probe} from '../worker/private-catalog-sync.js';
import {recoveryRequest} from '../worker/private-recovery.js';
const work='https://af.alooytv16.com/watch/policyfixture.html',id='alooytv:policyfixture',now=Date.now();
const v1='https://vid4.zvde-dsn-01.site/test/1.jpg',v2='https://vid20.ujeklsj.site/test/2.mp4',v3='https://media.publisher-demo.com/test/3.mp4';
const page=n=>work+'?key=e'+n;
const link=(n,url)=>'<a href="/download_video.php?ref='+encodeURIComponent('/watch/policyfixture.html?key=e'+n)+'&amp;video_url='+encodeURIComponent(btoa(url))+'">Download</a>';
assert.equal(validMedia(v1),true);assert.equal(validMedia(v2),true);
assert.equal(validMedia('https://vid4.ujeklsj.site.evil.com/a'),false);
assert.equal(validMedia('http://vid4.ujeklsj.site/a'),false);
assert.equal(validMedia('https://vid4.ujeklsj.site:444/a'),false);
assert.equal(validMedia('https://user@vid4.ujeklsj.site/a'),false);
assert.equal(validMedia(v3),false);
assert.throws(()=>configureMediaHosts('["*.publisher-demo.com"]'),/invalid-media-host-config/);
assert.throws(()=>configureMediaHosts('["127.0.0.1"]'),/invalid-media-host-config/);
configureMediaHosts('["media.publisher-demo.com"]');
assert.equal(validMedia(v3),true);
assert.equal(mediaLink(link(1,v1)+link(2,v2)+link(3,v3),page(1)),v1);
assert.equal(mediaLink(link(1,v1)+link(2,v2)+link(3,v3),page(2)),v2);
assert.equal(mediaLink(link(1,v1)+link(2,v2)+link(3,v3),page(3)),v3);
assert.throws(()=>mediaLink(link(1,v1),page(2)),/missing-or-ambiguous/);
assert.throws(()=>mediaLink(link(1,v1)+link(1,v2),page(1)),/missing-or-ambiguous/);
let calls=0;await assert.rejects(()=>probe('https://unknown.example.com/a',async()=>{calls++;throw Error('unexpected-fetch');}),/unsupported-media-host/);assert.equal(calls,0);
const asset={id:id+':s1:e2',title:'Episode 2',season:1,episode:2,format:'mp4',url:v2,verifiedAt:now-86400000};
const data=new Map([['pc:work:'+id,{id,gen:123}],['pc:e:'+id+':123:0002',asset]]);
const store={async get(k){return data.get(k);},async list(o){return new Map([...data].filter(([k])=>k.startsWith(o.prefix)));}};
assert.deepEqual(await resolveEpisode(store,id,1,2,async()=>{throw Error('unexpected-fetch')},now),asset);
const fake=async url=>{url=String(url);if(url===work)return new Response('<h1>Policy fixture</h1><script type="application/ld+json">{"@type":"TVSeries","name":"Policy fixture"}</script><a href="?key=e1">Ep#1</a><a href="?key=e2">Ep#2</a><a href="?key=e3">Ep#3</a>');if(url===page(1))return new Response(link(1,v1));if(url===page(2))return new Response(link(2,v2));if(url===page(3))return new Response(link(3,v3));if([v1,v2,v3].includes(url))return new Response(Uint8Array.from([0,0,0,24,102,116,121,112,105,115,111,109,0,0,0,0]),{status:206});throw Error('unexpected-fetch');};
for(const [episode,url] of [[1,v1],[2,v2],[3,v3]]){
 const r=await recoveryRequest('/private-episode',new Request('https://cinema.test/private-episode?id='+id+'&season=1&episode='+episode),fake,now);
 assert.equal(r.status,200);assert.equal((await r.json()).url,url);
}
configureMediaHosts(undefined);assert.equal(validMedia(v3),false);
const freshId='alooytv:unknownfixture',freshWork='https://af.alooytv16.com/watch/unknownfixture.html';
const bad=await recoveryRequest('/private-episode',new Request('https://cinema.test/private-episode?id='+freshId+'&season=1&episode=1'),async url=>{if(String(url)===freshWork)return new Response('<h1>Unknown fixture</h1><script type="application/ld+json">{"@type":"TVSeries","name":"Unknown fixture"}</script><a href="?key=e1">Ep#1</a>');if(String(url)===freshWork+'?key=e1')return new Response('<a href="/download_video.php?ref='+encodeURIComponent('/watch/unknownfixture.html?key=e1')+'&amp;video_url='+encodeURIComponent(btoa(v3))+'">Download</a>');throw Error('unexpected-fetch');},now);
assert.equal(bad.status,502);assert.match((await bad.json()).error,/unsupported-hosts:media\.publisher-demo\.com/);

// Verify approved 302 chains, including a relative hop, and reject unknown targets.
const initial='https://vid4.ujeklsj.site/test/initial.mp4',middle='https://vid5.ujeklsj.site/test/step.mp4',final='https://vid5.ujeklsj.site/test/final.mp4';
let redirects=[];
const bytes=()=>new Response(Uint8Array.from([0,0,0,24,102,116,121,112,105,115,111,109,0,0,0,0]),{status:206});
assert.equal(await probe(initial,async(url,opts)=>{
 redirects.push(url);assert.equal(opts.redirect,'manual');assert.equal(opts.headers.Range,'bytes=0-4095');
 if(url===initial)return new Response(null,{status:302,headers:{Location:middle}});
 if(url===middle)return new Response(null,{status:307,headers:{Location:'final.mp4'}});
 if(url===final)return bytes();throw Error('unexpected-fetch');
}),final);
assert.deepEqual(redirects,[initial,middle,final]);
let unsafeHits=0;await assert.rejects(()=>probe(initial,async()=>{unsafeHits++;return new Response(null,{status:302,headers:{Location:'https://example.com/video.mp4'}});}),/unapproved-host example\.com/);assert.equal(unsafeHits,1);
await assert.rejects(()=>probe(initial,async()=>new Response(null,{status:302,headers:{Location:initial}})),/media-redirect-loop/);
await assert.rejects(()=>probe(initial,async()=>new Response(null,{status:302})),/missing-location/);
await assert.rejects(()=>probe(initial,async()=>new Response('<html>Not a video</html>')),/not-mp4/);
let hops=0;await assert.rejects(()=>probe(initial,async()=>new Response(null,{status:302,headers:{Location:'https://vid4.ujeklsj.site/test/hop'+(++hops)}})),/media-redirect-limit/);assert.equal(hops,5);
const redirectId='alooytv:redirectfixture',redirectWork='https://af.alooytv16.com/watch/redirectfixture.html';
const response=await recoveryRequest('/private-episode',new Request('https://cinema.test/private-episode?id='+redirectId+'&season=1&episode=1'),async raw=>{
 const url=String(raw);
 if(url===redirectWork)return new Response('<h1>Redirect fixture</h1><script type="application/ld+json">{"@type":"TVSeries","name":"Redirect fixture"}</script><a href="?key=e1">Ep#1</a>');
 if(url===redirectWork+'?key=e1')return new Response('<a href="/download_video.php?ref='+encodeURIComponent('/watch/redirectfixture.html?key=e1')+'&amp;video_url='+encodeURIComponent(btoa(initial))+'">Download</a>');
 if(url===initial)return new Response(null,{status:302,headers:{Location:final}});
 if(url===final)return bytes();throw Error('unexpected-fetch');
},now);
assert.equal(response.status,200);assert.equal((await response.json()).url,final);

console.log('GLOBAL MEDIA POLICY PASS: exact identities, known and operator-approved hosts, saved assets, stateless playback and diagnostic rejection');

// Regression: a feature URL may redirect to a valid but unrelated warning MP4.
const warning='https://archive.org/download/aloo-ytv-fake-sites-direct-wide-phone/AlooYTV-fake-sites-direct-wide-phone.mp4';
configureMediaHosts('["archive.org"]');
assert.equal(validMedia(warning),false);
let warningHits=0;
await assert.rejects(()=>probe(initial,async()=>{warningHits++;return new Response(null,{status:302,headers:{Location:warning}});}),/media-warning-clip/);
assert.equal(warningHits,1);
configureMediaHosts(undefined);
const header=Uint8Array.from([0,0,0,24,102,116,121,112,105,115,111,109,0,0,0,0]);
await assert.rejects(()=>probe(initial,async()=>new Response(header,{status:206,headers:{'Content-Range':'bytes 0-15/1202253'}})),/media-too-small/);
assert.equal(await probe(initial,async()=>new Response(header,{status:206,headers:{'Content-Range':'bytes 0-15/600000000','Content-Length':'16'}})),initial);
const clip=new Uint8Array(132);clip.set(header);const dv=new DataView(clip.buffer);dv.setUint32(24,108);clip.set([109,118,104,100],28);dv.setUint32(44,1000);dv.setUint32(48,22210);
await assert.rejects(()=>probe(initial,async()=>new Response(clip,{status:206,headers:{'Content-Range':'bytes 0-131/600000000'}})),/media-too-short: 22.21/);
dv.setUint32(48,6120000);
assert.equal(await probe(initial,async()=>new Response(clip,{status:206,headers:{'Content-Range':'bytes 0-131/600000000'}})),initial);
console.log('WARNING MEDIA PASS: known redirect blocked, 1.2MB and 22.21s rejected, 102-minute synthetic file accepted');

// Exact player markup takes priority over a download that redirects to a warning.
const playerId='alooytv:playerpriorityfixture',playerPage='https://af.alooytv16.com/watch/playerpriorityfixture.html';
const playerMedia='https://vid5.ujeklsj.site/test/player-priority.mp4';
let playerProbes=[];
const playerResult=await recoveryRequest('/private-episode',new Request('https://cinema.test/private-episode?id='+playerId+'&season=1&episode=1'),async raw=>{
 const url=String(raw);
 if(url===playerPage)return new Response('<h1>Player priority fixture</h1><script type="application/ld+json">{"@type":"Movie","name":"Player priority fixture"}</script><link rel="canonical" href="'+playerPage+'"><video src="'+playerMedia+'"></video><a href="/download_video.php?ref='+encodeURIComponent('/watch/playerpriorityfixture.html')+'&amp;video_url='+encodeURIComponent(btoa(initial))+'">Download</a>');
 playerProbes.push(url);
 if(url===initial)return new Response(null,{status:302,headers:{Location:warning}});
 if(url===playerMedia)return new Response(clip,{status:206,headers:{'Content-Range':'bytes 0-131/600000000'}});
 throw Error('unexpected-fetch');
},now);
assert.equal(playerResult.status,200);assert.equal((await playerResult.json()).url,playerMedia);
assert.deepEqual(playerProbes,[playerMedia]);
console.log('PLAYER PRIORITY PASS: exact declared player before misleading download');
