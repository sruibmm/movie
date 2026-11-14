import assert from 'node:assert/strict';
import {normalizeArabic,queryVariants,mergeArabic,episodeMovie,embedwaveUrl,arabicCatalogJobs,arabicCatalogPage,arabicCatalogPageCount} from '../src/arabicDiscovery.js';
const cases=[
 ['Arabic spelling and Arabic numerals',()=>assert.equal(normalizeArabic('اللِّمبي ٨ جِيغا'),'اللمبي 8 جيغا')],
 ['alternate Arabic spelling',()=>assert.ok(queryVariants('إبن ٨').includes('ابن 8'))],
 ['preserves existing movie results',()=>assert.deepEqual(mergeArabic([[{id:5,original_language:'ar',media_type:'movie'},{id:5,original_language:'ar',media_type:'tv',name:'مسلسل'}]],[{id:5}]).map(x=>x.media_type),['tv'])],
 ['dedup and exclude foreign titles',()=>assert.equal(mergeArabic([[{id:1,original_language:'ar'},{id:1,original_language:'ar'},{id:2,original_language:'en'}]]).length,1)],
 ['movie route unchanged',()=>assert.equal(embedwaveUrl({id:123}),'https://embedwave.cc/embed/movie/123?server=cinesrc')],
 ['separate episode identity and correct route',()=>{const m=episodeMovie({id:123,name:'مسلسل',original_language:'ar'},2,{episode_number:5});assert.equal(m.id,'tv:123:2:5');assert.equal(embedwaveUrl(m),'https://embedwave.cc/embed/tv/123/2/5?server=cinesrc')}],
 ['invalid episode rejected',()=>assert.throws(()=>episodeMovie({id:123},1,{episode_number:0}))]
];for(const [name,fn] of cases){fn();console.log('ARABIC DISCOVERY PASS: '+name);}

assert.equal(arabicCatalogJobs({kind:'tv',genre:'18',sort:'newest',page:2})[0].params.sort_by,'first_air_date.desc');
assert.equal(arabicCatalogJobs({kind:'movie',genre:'35',sort:'top'})[0].params['vote_count.gte'],'20');
assert.equal(arabicCatalogJobs({kind:'movie',query:'اللمبي ٨'}).every(j=>j.type==='movie'&&j.path==='search/movie'),true);
assert.equal(arabicCatalogJobs({kind:'all'}).length,2);
assert.equal(arabicCatalogPageCount([{total_pages:4},{total_pages:999}]),500);
const first={id:12,media_type:'movie',original_language:'ar',title:'فيلم'};
const other={id:12,media_type:'tv',original_language:'ar',name:'مسلسل'};
assert.deepEqual(arabicCatalogPage([first],[first,other]).map(x=>x.media_type),['movie','tv']);
assert.equal(arabicCatalogPage([first],[other],[other]).length,1);
console.log('ARABIC CATALOG PASS: filters, query variants, pages, typed deduplication');
