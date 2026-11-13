import assert from 'node:assert/strict';
import {personQueries,rankPeople,actingWorks,filterWorks} from '../src/smartSearch.js';
const cases=[
['Arabic spelling and exact name priority',()=>{const r=rankPeople([[{id:1,name:'عادل إمام',popularity:2,known_for_department:'Acting'},{id:2,name:'عادل',popularity:99}]],'عادل امام');assert.equal(r[0].id,1);assert.equal(r[0].exact,true)}],
['Bilingual person deduplication',()=>{const r=rankPeople([[{id:1,name:'Tom Cruise',profile_path:'/a.jpg'}],[{id:1,name:'توم كروز'}]],'Tom Cruise');assert.equal(r.length,1);assert.equal(r[0].exact,true);assert.equal(r[0].profile_path,'/a.jpg')}],
['Arabic variants',()=>assert.ok(personQueries('أحمد زكي').includes('احمد زكي'))],
['filmography excludes duplicates and adult',()=>{const r=actingWorks([{id:1,title:'Film',media_type:'movie'},{id:1,title:'Film',media_type:'movie'},{id:1,name:'Series',media_type:'tv'},{id:2,title:'Adult',media_type:'movie',adult:true}]);assert.equal(r.length,2)}],
['sort and filter works',()=>{const r=actingWorks([{id:1,title:'A',media_type:'movie',original_language:'ar',release_date:'1999-01-01'},{id:2,title:'B',media_type:'movie',original_language:'ar',release_date:'2020-01-01'},{id:3,name:'C',media_type:'tv',original_language:'en'}]);assert.deepEqual(filterWorks(r,'movie','ar','new').map(x=>x.id),[2,1]);assert.deepEqual(filterWorks(r,'tv','world','popular').map(x=>x.id),[3])}],
['no false exact actor match',()=>assert.equal(rankPeople([[{id:1,name:'Ahmed Zaki Jr'}]],'Ahmed Zaki')[0].exact,false)]
];for(const [name,fn] of cases){fn();console.log('SMART SEARCH PASS: '+name);}
