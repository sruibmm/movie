import { FiltersEngine, Request } from '@ghostery/adblocker';

const nativeFetch = globalThis.fetch.bind(globalThis);
const fixtureRules = '||example.test/ads.js^\n||doubleclick.net^\n||googlesyndication.com^\n';
const fixture = FiltersEngine.parse(fixtureRules);
let engine = null;
let loading = null;
let status = 'not loaded';
let checked = 0;
let blocked = 0;

export function matches(engine, url, sourceUrl, type='xmlhttprequest') {
  return engine.match(Request.fromRawDetails({url,sourceUrl,type})).match;
}
export function stats() { return {status,checked,blocked}; }
export function initShield() {
  if(!loading) {
    status='loading rules';
    loading=FiltersEngine.fromPrebuiltAdsAndTracking(nativeFetch)
      .then(value=>{engine=value;status='official rules loaded';return value;})
      .catch(()=>{engine=fixture;status='local fallback rules';return engine;});
  }
  return loading;
}
export async function shieldFetch(input, init) {
  // Only requests explicitly made by our app. Cannot inspect a cross-origin iframe.
  const url=new URL(typeof input==='string'?input:input.url,globalThis.location?.href||'https://example.test/');
  const active=engine||fixture;
  checked++;
  if(matches(active,url.href,globalThis.location?.href||'https://example.test/')) {
    blocked++;
    throw new Error('Blocked by Ghostery (app request)');
  }
  return nativeFetch(input,init);
}
export function runFixture() {
  return [
    {name:'Ad script',passed:matches(fixture,'https://example.test/ads.js','https://example.test/','script')},
    {name:'Known ad domain',passed:matches(fixture,'https://ads.doubleclick.net/pixel','https://example.test/','image')},
    {name:'Movie metadata',passed:!matches(fixture,'https://api.themoviedb.org/3/movie/1','https://example.test/')},
    {name:'Ordinary video',passed:!matches(fixture,'https://example.test/movie.mp4','https://example.test/','media')},
  ];
}
