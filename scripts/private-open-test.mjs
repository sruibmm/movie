import assert from 'node:assert/strict';
import worker from '../worker/source-sync-app.js';
import {privateRequest} from '../worker/private-catalog-sync.js';
const id='alooytv:publicfixture',hidden='alooytv:privatefixture';
const rows=new Map([
 ['pc:discovered:'+id,{id,title:'Public fixture',kind:'tv',poster:'https://example.com/poster.jpg'}],
 ['pc:work:'+hidden,{id:hidden,title:'Private import',kind:'tv',source:'personal-import',gen:1,count:1}],
 ['pc:preview:'+id,{id,kind:'tv',count:12,slots:[{season:1,episode:1},{season:2,episode:1}],poster:'https://example.com/poster.jpg',banner:'https://example.com/banner.jpg',year:'2026',story:'Story'}]
]);
const store={async get(k){return Array.isArray(k)?new Map(k.filter(x=>rows.has(x)).map(x=>[x,rows.get(x)])):rows.get(k);},async list(o){return new Map([...rows].filter(([k])=>k.startsWith(o.prefix)&&(!o.startAfter||k>o.startAfter)).sort(([a],[b])=>a.localeCompare(b)).slice(0,o.limit||1000));}};
let seen=[];
const env={PRIVATE_CATALOG_KEY:'test-only-key-abcdefghijklmnopqrstuvwxyz',SOURCE_SYNC:{idFromName:x=>x,get:()=>({fetch:async(url,opts)=>{seen.push(url);return privateRequest(new Request(url,opts),store);}})},ASSETS:{fetch:async()=>new Response('asset')}};
const url='https://cinema.test/api/private-catalog/';
const req=(path,opts={})=>worker.fetch(new Request(url+path,opts),env);
let r=await req('list');assert.equal(r.status,200);let x=await r.json();assert.equal(x.titles.length,1);assert.equal(x.titles[0].id,id);assert.equal(x.titles[0].count,12);assert.equal(x.titles[0].seasonCount,2);assert.equal(x.titles[0].banner,'https://example.com/banner.jpg');
assert.match(seen[0],/_public=1/);
r=await req('work?id='+hidden+'&_public=0');assert.equal(r.status,404);
r=await req('preview?id='+hidden);assert.equal(r.status,404);
r=await req('episode?id='+hidden+'&season=1&episode=1');assert.equal(r.status,404);
for(const route of ['sync','share','invite']){r=await req(route,{method:'POST'});assert.equal(r.status,403);}
r=await req('status');assert.equal(r.status,200);assert.equal((await r.json()).public,true);
r=await req('list',{headers:{Authorization:'Bearer '+env.PRIVATE_CATALOG_KEY}});assert.equal(r.status,200);assert.equal((await r.json()).titles.length,2);
r=await req('sync',{method:'POST',headers:{Authorization:'Bearer '+env.PRIVATE_CATALOG_KEY}});assert.equal(r.status,202);
console.log('OPEN LIBRARY PASS: public browse, metadata, private imports and owner-only writes');
