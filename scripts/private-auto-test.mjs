import assert from 'node:assert/strict';
import {metadata,indexLinks,episodes,mediaLink,probe,crawl,privateRequest,authorize,previewWork,resolveEpisode} from '../worker/private-catalog-sync.js';
import {matchMetadata,enrichWork} from '../src/privateMetadata.js';
const origin='https://af.alooytv16.com',work=origin+'/watch/gztyqowfz11u.html';
const now=Date.now();
const mp4='https://vid4.zvde-dsn-01.site/file/example.jpg';
const episode=n=>work+'?key=ep'+n;
const link=n=>'<a href="/download_video.php?ref='+encodeURIComponent('/watch/gztyqowfz11u.html?key=ep'+n)+'&amp;video_url='+encodeURIComponent(btoa(mp4.replace('example',String(n))))+'">Download</a>';
const page='<h1>جعفر العمدة</h1><meta property="og:description" content="قصة العمل"><meta property="og:image" content="/poster.jpg"><script type="application/ld+json">'+JSON.stringify({'@type':'TVSeries',name:'جعفر العمدة',datePublished:'2023-01-01',genre:['دراما'],backdrop:'/banner.jpg'})+'</script><a href="?key=ep1">Ep#1</a><a href="?key=ep2">Ep#2</a>';
assert.equal(metadata(page,work).story,'قصة العمل');
assert.equal(metadata(page,work).banner,origin+'/banner.jpg');
assert.equal(metadata('<h1>عنوان</h1>',work).poster,null);
assert.equal(metadata('<h1>عنوان ج2</h1>',work).season,2);
assert.deepEqual(episodes(page,work),[[1,episode(1)],[2,episode(2)]]);
assert.throws(()=>episodes(page.replace('Ep#2','Ep#3'),work),/incomplete/);
assert.equal(episodes(page+'<p>مسلسل آخر 30 حلقة</p>',work).length,2);
assert.throws(()=>episodes(page+'<p>عدد الحلقات: 30</p>',work),/declared-count-mismatch/);
assert.equal(episodes(page+'<p>عدد الحلقات: 30</p>',work,{allowPartial:true}).expected,30);
assert.throws(()=>episodes(page+'<a href="?key=other">Ep#1</a>',work),/ambiguous/);
assert.equal(mediaLink(link(1),episode(1)),mp4.replace('example','1'));
assert.throws(()=>mediaLink(link(1),episode(2)),/missing-or-ambiguous/);
assert.throws(()=>mediaLink(link(1).replace(encodeURIComponent(btoa(mp4.replace('example','1'))),encodeURIComponent(btoa('https://example.com/video.mp4'))),episode(1)));
const idx=indexLinks('<a href="/genre/ramadan-kleeji.html">رمضان</a><a href="/watch/gztyqowfz11u.html?key=ep1"><img data-src="/poster.jpg">عرض</a><a href="https://example.com/watch/abc.html">No</a>',origin+'/');
assert.equal(idx.length,2);assert.equal(indexLinks('<a href="/genre/ramadan-arabi-2026/50.html">2</a>',origin+'/')[0].url,origin+'/genre/ramadan-arabi-2026/50.html');assert.equal(idx[1].url,work);assert.equal(idx[1].poster,origin+'/poster.jpg');
class Storage{
 constructor(){this.data=new Map();}
 async get(k){return Array.isArray(k)?new Map(k.filter(x=>this.data.has(x)).map(x=>[x,this.data.get(x)])):this.data.get(k);}
 async put(k,v){if(typeof k==='object'){for(const [key,value] of Object.entries(k))this.data.set(key,structuredClone(value));}else this.data.set(k,structuredClone(v));}
 async delete(k){for(const x of Array.isArray(k)?k:[k])this.data.delete(x);}
 async list(o){return new Map([...this.data].sort(([a],[b])=>a.localeCompare(b)).filter(([k])=>k.startsWith(o.prefix||'')&&(!o.startAfter||k>o.startAfter)).slice(0,o.limit||1000));}
 async transaction(fn){return fn(this);}
}
const storage=new Storage();
const fake=async (url,opts)=>{assert.equal(opts.redirect,'manual');url=String(url);if(url===work)return new Response(page);if(url===episode(1))return new Response('<meta property="og:image" content="/still1.jpg">'+link(1));if(url===episode(2))return new Response(link(2));if(url.startsWith('https://vid4.'))return new Response(Uint8Array.from([0,0,0,24,102,116,121,112,105,115,111,109,0,0,0,0]),{status:206});if(url===origin+'/'||url===origin+'/genre/ramadan-arabi-2026.html')return new Response('<a href="'+work+'">مسلسل</a>');return new Response('',{status:404});};
await assert.rejects(()=>probe(mp4,async(_url,opts)=>{assert.equal(opts.redirect,'manual');return new Response(null,{status:302,headers:{Location:'https://example.com/other'}})}),/media-redirect-302/);
await crawl(storage,fake,now);
assert.equal((await storage.get('pc:work:alooytv:gztyqowfz11u')),undefined,'must not publish partial series');
const discovered=await (await privateRequest(new Request('https://internal/private-list?q=جعفر'),storage)).json();assert.equal(discovered.titles.length,1);assert.equal(discovered.titles[0].discovered,true);
const preview=await previewWork(storage,'alooytv:gztyqowfz11u',fake,now);assert.equal(preview.slots.length,2);assert.equal(preview.slots[0].page,undefined);
const requested=await resolveEpisode(storage,'alooytv:gztyqowfz11u',1,2,fake,now);assert.equal(requested.episode,2);assert.equal(requested.url,mp4.replace('example','2'));
await assert.rejects(()=>resolveEpisode(storage,'alooytv:gztyqowfz11u',1,3,fake,now),/episode-not-listed/);
const extracted=await crawl(storage,fake,now+60000,1);assert.equal(extracted.extracted,1);assert.equal(extracted.publishedEpisodes,0);
const partial=await crawl(storage,fake,now+61000,1);assert.equal(partial.published,0);assert.equal(partial.availableWorks,1);assert.equal(partial.publishedEpisodes,1);const one=await (await privateRequest(new Request('https://internal/private-work?id=alooytv:gztyqowfz11u'),storage)).json();assert.equal(one.partial,true);assert.equal(one.assets.length,1);
const progress=await crawl(storage,fake,now+120000);assert.equal(progress.published,1);assert.equal(progress.publishedEpisodes,2);assert.equal(progress.revision,'auto-v8');
const result=await (await privateRequest(new Request('https://internal/private-work?id=alooytv:gztyqowfz11u'),storage)).json();
assert.equal(result.assets.length,2);assert.equal(result.assets[0].thumbnail,origin+'/still1.jpg');assert.equal(result.assets[1].episode,2);
const listing=await (await privateRequest(new Request('https://internal/private-list?q=جعفر'),storage)).json();assert.equal(listing.titles.length,1);assert.equal(listing.titles[0].assets,undefined);
const secret='test-only-abcdefghijklmnopqrstuvwxyz123456789';
assert.equal(await authorize(new Request('https://example.com',{headers:{Authorization:'Bearer '+secret}}),secret),true);
assert.equal(await authorize(new Request('https://example.com'),secret),false);
assert.equal(matchMetadata({title:'جعفر العمدة',year:2023},[{id:1,name:'جعفر العمدة',first_air_date:'2023-01-01'},{id:2,name:'جعفر العمدة',first_air_date:'2022-01-01'}]).id,1);
assert.equal(matchMetadata({title:'جعفر العمدة'},[{id:1,name:'جعفر العمدة'},{id:2,name:'جعفر العمدة'}]),null);
const richer=await enrichWork({title:'جعفر العمدة',kind:'tv',year:2023,assets:[{season:1,episode:1}]},{headers:{}},undefined,async url=>Response.json(url.includes('search/')?{results:[{id:1,name:'جعفر العمدة',first_air_date:'2023-01-01'}]}:url.includes('/season/')?{episodes:[{season_number:1,episode_number:1,still_path:'/still.jpg',overview:'قصة الحلقة',runtime:40}]}:{overview:'قصة المسلسل',backdrop_path:'/backdrop.jpg',genres:[{name:'دراما'}]}));
assert.equal(richer.assets[0].thumbnail,'https://image.tmdb.org/t/p/w500/still.jpg');assert.equal(richer.assets[0].duration,2400);assert.equal(richer.story,'قصة المسلسل');

// The new engine must not reject a whole work due to unrelated count or a conflicting slot.
const multi=page.replace('<a href="?key=ep1">Ep#1</a><a href="?key=ep2">Ep#2</a>','<a href="?key=ep1">S1 E1</a><a href="?key=ep2">S2 E1</a>')+'<p>عدد الحلقات: 5</p>'+link(1)+link(2);
const separate=new Storage();let pageHits=0,probes=0;
const multiFetch=async(url,opts)=>{url=String(url);if(url===work){pageHits++;return new Response(multi);}if(url.startsWith('https://vid4.')){probes++;return new Response(Uint8Array.from([0,0,0,24,102,116,121,112,105,115,111,109,0,0,0,0]),{status:206});}if(url===origin+'/'||url===origin+'/genre/ramadan-arabi-2026.html')return new Response('<a href="'+work+'">مسلسل</a>');throw Error('episode page should not be fetched when exact source is in work page');};
await crawl(separate,multiFetch,now);
const mp=await previewWork(separate,'alooytv:gztyqowfz11u',multiFetch,now);
assert.deepEqual(mp.slots,[{season:1,episode:1},{season:2,episode:1}]);assert.equal(mp.count,5);
const m2=await resolveEpisode(separate,'alooytv:gztyqowfz11u',2,1,multiFetch,now);
assert.equal(m2.url,mp4.replace('example','2'));assert.equal(m2.season,2);assert.equal(pageHits,1);assert.equal(probes,1);
await crawl(separate,multiFetch,now+2000);
await crawl(separate,multiFetch,now+4000);
const mw=await (await privateRequest(new Request('https://internal/private-work?id=alooytv:gztyqowfz11u'),separate)).json();
assert.equal(mw.partial,true);assert.equal(mw.count,5);assert.equal(mw.assets.length,2);assert.equal(mw.assets[1].season,2);

console.log('PRIVATE AUTO PASS: metadata, discovery, exact episode mapping, complete publication, private listing, authentication, TMDB enrichment');
