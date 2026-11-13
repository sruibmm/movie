import assert from 'node:assert/strict';
import {arabicSourceIds,backendUrl,nextArabicSource,matchPublisherVideo,PUBLISHERS,isoDuration} from '../src/arabicSources.js';
const film={id:123,original_language:'ar'};
const episode={id:'tv:123:2:5',tmdbId:123,media_type:'tv',season:2,episode:5};
const video={id:'abcdefghijk',snippet:{channelId:PUBLISHERS[0].id,title:'فيلم اللمبي كامل',liveBroadcastContent:'none'},contentDetails:{duration:'PT1H40M'},status:{embeddable:true,privacyStatus:'public'}};
const q={title:'اللمبي',type:'movie',runtime:100,year:2002};
const cases=[
 ['Arabic backends precede legacy without changing IDs',()=>assert.deepEqual(arabicSourceIds(false,[10,0,2]),[10,11,12,0,2])],
 ['series avoid movie-only routes',()=>assert.deepEqual(arabicSourceIds(true,[10,0,2]),[10,11,12])],
 ['documented backend routes',()=>{assert.equal(backendUrl(film,11),'https://embedwave.cc/embed/movie/123?server=videasy');assert.equal(backendUrl(episode,12),'https://embedwave.cc/embed/tv/123/2/5?server=nxsha')}],
 ['skip failed and prefer clean',()=>{assert.equal(nextArabicSource([10,11,12],{10:{status:'blocked'}},10),11);assert.equal(nextArabicSource([10,11,12],{10:{status:'blocked'},12:{status:'clean'}},10),12)}],
 ['all unavailable',()=>assert.equal(nextArabicSource([10,11,12],{10:{status:'ad'},11:{status:'blocked'},12:{status:'blocked'}},10),null)],
 ['duration parsing',()=>assert.equal(isoDuration('PT1H40M'),6000)],
 ['official full title accepted',()=>assert.equal(matchPublisherVideo(video,q)?.id,video.id)],
 ['reject clips and sequel mismatches',()=>{assert.equal(matchPublisherVideo({...video,snippet:{...video.snippet,title:'اعلان فيلم اللمبي'}},q),null);assert.equal(matchPublisherVideo({...video,snippet:{...video.snippet,title:'فيلم اللمبي 8 جيجا كامل'}},q),null)}],
 ['reject nonofficial and nonembeddable',()=>{assert.equal(matchPublisherVideo({...video,snippet:{...video.snippet,channelId:'unknown'}},q),null);assert.equal(matchPublisherVideo({...video,status:{...video.status,embeddable:false}},q),null)}],
 ['reject region restriction and duration mismatch',()=>{assert.equal(matchPublisherVideo({...video,contentDetails:{...video.contentDetails,regionRestriction:{blocked:['KW']}}},q),null);assert.equal(matchPublisherVideo({...video,contentDetails:{duration:'PT15M'}},q),null)}],
 ['episode must match season and number',()=>{const v={...video,snippet:{...video.snippet,title:'مسلسل الاختيار الموسم 2 الحلقة 5 كاملة'},contentDetails:{duration:'PT45M'}};assert.ok(matchPublisherVideo(v,{title:'الاختيار',type:'tv',season:2,episode:5,runtime:45}));assert.equal(matchPublisherVideo(v,{title:'الاختيار',type:'tv',season:2,episode:6}),null)}]
];for(const [name,fn] of cases){fn();console.log('ARABIC SOURCE PASS: '+name);}
