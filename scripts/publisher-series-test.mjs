import assert from 'node:assert/strict';
import {WATAN_SERIES} from '../src/watanSeries.js';
import {PUBLISHER_SERIES,PUBLISHER_EPISODES,matchPublisherSeries,publisherEpisode,importedEpisode,attachPublisherEpisode} from '../src/publisherSeries.js';
assert.equal(WATAN_SERIES.length,130);assert.equal(PUBLISHER_EPISODES,3606);assert.ok(PUBLISHER_SERIES.length>100);
for(const s of WATAN_SERIES){assert.ok(s.episodes.every((e,i)=>e.number===i+1&&/^[-_A-Za-z0-9]{11}$/.test(e.video)));assert.equal(new Set(s.episodes.map(e=>e.video)).size,s.episodes.length);}
const g=matchPublisherSeries({title:'سعادة المجنون',first_air_date:'2026-01-01'});assert.equal(publisherEpisode(g,1,1).id,'3i_taK5yQZo');assert.equal(publisherEpisode(g,1,29).id,'ZWfVT4HZZ-U');assert.equal(publisherEpisode(g,1,30),null);assert.equal(matchPublisherSeries({title:'سعادة المجنون',first_air_date:'2000-01-01'}),null);
const bab=matchPublisherSeries({title:'باب الحارة',first_air_date:'2006-01-01'});assert.equal(publisherEpisode(bab,13,1).id,'AiUye-YPVCs');assert.equal(attachPublisherEpisode({media_type:'tv',seriesTitle:'سعادة المجنون',season:1,episode:1,release_date:'2026-01-01'}).publisherSource.id,'3i_taK5yQZo');assert.equal(importedEpisode(g,g.seasons[0],g.seasons[0].episodes[0]).id,'youtube:3i_taK5yQZo');
console.log('PUBLISHER SERIES PASS: 130 season pages, 3606 video links, exact episode matching, local source launch');
