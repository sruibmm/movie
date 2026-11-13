import assert from 'node:assert/strict';
import {normalizeArabic,queryVariants,mergeArabic,episodeMovie,embedwaveUrl} from '../src/arabicDiscovery.js';
const cases=[
 ['Arabic spelling and Arabic numerals',()=>assert.equal(normalizeArabic('اللِّمبي ٨ جِيغا'),'اللمبي 8 جيغا')],
 ['alternate Arabic spelling',()=>assert.ok(queryVariants('إبن ٨').includes('ابن 8'))],
 ['preserves existing movie results',()=>assert.deepEqual(mergeArabic([[{id:5,original_language:'ar',media_type:'movie'},{id:5,original_language:'ar',media_type:'tv',name:'مسلسل'}]],[{id:5}]).map(x=>x.media_type),['tv'])],
 ['dedup and exclude foreign titles',()=>assert.equal(mergeArabic([[{id:1,original_language:'ar'},{id:1,original_language:'ar'},{id:2,original_language:'en'}]]).length,1)],
 ['movie route unchanged',()=>assert.equal(embedwaveUrl({id:123}),'https://embedwave.cc/embed/movie/123?server=cinesrc')],
 ['separate episode identity and correct route',()=>{const m=episodeMovie({id:123,name:'مسلسل',original_language:'ar'},2,{episode_number:5});assert.equal(m.id,'tv:123:2:5');assert.equal(embedwaveUrl(m),'https://embedwave.cc/embed/tv/123/2/5?server=cinesrc')}],
 ['invalid episode rejected',()=>assert.throws(()=>episodeMovie({id:123},1,{episode_number:0}))]
];for(const [name,fn] of cases){fn();console.log('ARABIC DISCOVERY PASS: '+name);}
