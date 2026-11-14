import assert from 'node:assert/strict';
import {metadata,indexLinks,episodes,mediaLink,probe,crawl,privateRequest,authorize} from '../worker/private-catalog-sync.js';
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
assert.throws(()=>episodes(page+'<a href="?key=other">Ep#1</a>',work),/ambiguous/);
assert.equal(mediaLink(link(1),episode(1)),mp4.replace('example','1'));
assert.throws(()=>mediaLink(link(1),episode(2)),/missing-or-ambiguous/);
assert.throws(()=>mediaLink(link(1).replace(encodeURIComponent(btoa(mp4.replace('example','1'))),encodeURIComponent(btoa('https://example.com/video.mp4'))),episode(1)));
const idx=indexLinks('<a href="/genre/ramadan-kleeji.html">رمضان</a><a href="/watch/gztyqowfz11u.html?key=ep1"><img data-src="/poster.jpg">عرض</a><a href="https://example.com/watch/abc.html">No</a>',origin+'/');
assert.equal(idx.length,2);assert.equal(indexLinks('<a href="/genre/ramadan-arabi-2026/50.html">2</a>',origin+'/')[0].url,origin+'/genre/ramadan-arabi-2026/50.html');assert.equal(idx[1].url,work);assert.equal(idx[1].poster,origin+'/poster.jpg');
class Storage{
 constructor(){this.data=new Map();}
 async get(k){return this.data.get(k);}
 async put(k,v){this.data.set(k,structuredClone(v));}
 async delete(k){for(const x of Array.isArray(k)?k:[k])this.data.delete(x);}
 async list(o){return new Map([...this.data].sort(([a],[b])=>a.localeCompare(b)).filter(([k])=>k.startsWith(o.prefix||'')&&(!o.startAfter||k>o.startAfter)).slice(0,o.limit||1000));}
 async transaction(fn){return fn(this);}
}
const storage=new Storage();
const fake=async (url,opts)=>{assert.equal(opts.redirect,'manual');url=String(url);if(url===work)return new Response(page);if(url===episode(1))return new Response('<meta property="og:image" content="/still1.jpg">'+link(1));if(url===episode(2))return new Response(link(2));if(url.startsWith('https://vid4.'))return new Response(Uint8Array.from([0,0,0,24,102,116,121,112,105,115,111,109,0,0,0,0]),{status:206});if(url===origin+'/'||url===origin+'/genre/ramadan-arabi-2026.html')return new Response('<a href="'+work+'">مسلسل</a>');return new Response('',{status:404});};
await assert.rejects(()=>probe(mp4,async(_url,opts)=>{assert.equal(opts.redirect,'manual');return new Response(null,{status:302,headers:{Location:'https://example.com/other'}})}),/media-redirect-302/);
await crawl(storage,fake,now);
assert.equal((await storage.get('pc:work:alooytv:gztyqowfz11u')),undefined,'must not publish partial series');
const partial=await crawl(storage,fake,now+60000,1);assert.equal(partial.published,0);assert.equal(partial.availableWorks,1);assert.equal(partial.publishedEpisodes,1);const one=await (await privateRequest(new Request('https://internal/private-work?id=alooytv:gztyqowfz11u'),storage)).json();assert.equal(one.partial,true);assert.equal(one.assets.length,1);
const progress=await crawl(storage,fake,now+120000);assert.equal(progress.published,1);assert.equal(progress.publishedEpisodes,2);assert.equal(progress.revision,'auto-v4');
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
console.log('PRIVATE AUTO PASS: metadata, discovery, exact episode mapping, complete publication, private listing, authentication, TMDB enrichment');
