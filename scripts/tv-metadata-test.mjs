import assert from 'node:assert/strict';
import {metadataUrl} from '../src/tvMetadata.js';
import {tvMetadata} from '../worker/tv-metadata.js';
assert.equal(metadataUrl('https://api.themoviedb.org/3/discover/movie?page=1',true),'/api/tv-metadata/discover/movie?page=1');
assert.equal(metadataUrl('https://api.themoviedb.org/3/movie/123',false),'https://api.themoviedb.org/3/movie/123');
assert.equal((await tvMetadata(new Request('https://example.test/api/tv-metadata/account'),{})).status,400);
assert.equal((await tvMetadata(new Request('https://example.test/api/tv-metadata/movie/123'),{})).status,401);
const old=globalThis.fetch;
try{
 globalThis.fetch=async(u,o)=>{assert.equal(u.origin,'https://api.themoviedb.org');assert.equal(u.pathname,'/3/discover/movie');assert.equal(u.searchParams.get('include_adult'),'false');assert.equal(u.searchParams.get('foo'),null);return Response.json({results:[{id:123,title:'Test'}]});};
 const res=await tvMetadata(new Request('https://example.test/api/tv-metadata/discover/movie?include_adult=true&foo=bad'),{TMDB_READ_TOKEN:'abcdefghijklmnopqrstuvwxyz'});
 assert.equal(res.status,200);assert.equal((await res.json()).results[0].id,123);
}finally{globalThis.fetch=old;}
console.log('TV metadata route tests passed');
