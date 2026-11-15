import assert from 'node:assert/strict';import {dailymotionEmbedUrl} from '../src/dailymotionPlayer.js';import {ARABIC_SITE_SERIES,ARABIC_SITE_EPISODES,siteEpisodeMovie,findArabicSiteSeries,attachArabicSiteEpisode,allowArabicPlayback,approvedPublisherUrl} from '../src/arabicSiteCatalog.js';assert.equal(ARABIC_SITE_SERIES.length,3);assert.equal(ARABIC_SITE_EPISODES,34);assert.equal(ARABIC_SITE_SERIES[0].episodes.length,30);assert.equal(new Set(ARABIC_SITE_SERIES.flatMap(g=>g.episodes.map(e=>e.id))).size,34);const g=findArabicSiteSeries({title:'مزاج الخير',first_air_date:'2013-01-01'});assert.equal(g.id,'mazag-kheir');assert.equal(approvedPublisherUrl(siteEpisodeMovie(g,g.episodes[0]).publisherSource),'https://geo.dailymotion.com/player/x8lr5.html?video=x83jkug');assert.equal(dailymotionEmbedUrl('x83jkug','example123'),'https://geo.dailymotion.com/player/example123.html?video=x83jkug');assert.equal(dailymotionEmbedUrl('x83jkug',''),null);assert.equal(dailymotionEmbedUrl('x83jkug','../bad'),null);assert.equal(attachArabicSiteEpisode({media_type:'tv',season:1,episode:30,seriesTitle:'مزاج الخير',release_date:'2013-01-01'}).publisherSource.id,'x83knpp');assert.equal(allowArabicPlayback({isArabic:true,id:123}),false);assert.equal(allowArabicPlayback({isArabic:true,publisherSource:{id:'invalid',embed:'https://embedwave.cc'}}),false);assert.equal(allowArabicPlayback({isArabic:true,publisherSource:{id:'3i_taK5yQZo'}}),true);assert.equal(allowArabicPlayback({original_language:'en'}),true);console.log('ARABIC SITE PASS: 3 series, 34 Dailymotion episode references, generic Arabic playback blocked');
import {APPROVED_EMBEDS,approvedEmbed,attachApprovedEmbed} from '../src/approvedEmbedCatalog.js';
const movie={id:'fixture-film',media_type:'movie',isArabic:true};
const grant={movieId:movie.id,kind:'movie',publisher:'Fixture publisher',permissionRef:'test-only',expires:'2099-01-01',origin:'https://example.com',embed:'https://example.com/embed/film'};
assert.equal(approvedEmbed(movie),null);
assert.equal(approvedEmbed(movie,[grant]).embed,grant.embed);
assert.equal(approvedEmbed({...movie,id:'wrong'},[grant]),null);
assert.equal(approvedEmbed(movie,[{...grant,expires:'2000-01-01'}]),null);
assert.equal(approvedEmbed(movie,[{...grant,embed:'https://other.example/film'}]),null);
assert.equal(approvedEmbed(movie,[grant,grant]),null);
assert.equal(approvedEmbed(movie,[{...grant,permissionRef:''}]),null);
assert.equal(attachApprovedEmbed({...movie,licensedSource:{stream_url:'https://example.com/video.mp4'}},[grant]).publisherSource,undefined);
assert.equal(attachApprovedEmbed(movie,[grant]).publisherSource.provider,'licensed-embed');
assert.equal(approvedPublisherUrl({provider:'licensed-embed',id:movie.id,embed:grant.embed},movie),null);
const episode={id:'fixture-episode',media_type:'tv',season:1,episode:2};
assert.equal(approvedEmbed(episode,[{...grant,movieId:episode.id,kind:'tv',season:1,episode:1}]),null);
console.log('APPROVED EMBED PASS: exact title/episode, authorization expiry, origin, native priority and default deny for unknown works');

import {approvedPrivateSlot} from '../src/approvedEmbedCatalog.js';
const work={id:'fixture',title:'Film',kind:'movie',year:2024,poster:'https://example.com/poster.jpg'},slot={id:'fixture:movie'};
const privateGrant={...grant,movieId:'private:'+slot.id};
assert.equal(approvedPrivateSlot(work,slot),null);
const embedded=approvedPrivateSlot(work,slot,[privateGrant]);
assert.equal(embedded.id,'private:'+slot.id);assert.equal(embedded.licensedPoster,work.poster);assert.equal(embedded.publisherSource.embed,privateGrant.embed);
assert.equal(approvedPrivateSlot(work,{id:'other'},[privateGrant]),null);
assert.equal(approvedPrivateSlot({...work,kind:'tv'},{...slot,season:1,episode:2},[{...privateGrant,kind:'tv',season:1,episode:1}]),null);
console.log('PRIVATE SLOT EMBED PASS: preserve movie identity, exact episode, no unapproved source');

for(const item of APPROVED_EMBEDS){const m={id:item.movieId,media_type:'movie',isArabic:true};const s=approvedEmbed(m);assert(s);assert.equal(s.adsPossible,false);assert.equal(approvedPublisherUrl(s,m),item.embed);assert.equal(approvedPublisherUrl(s,{...m,id:'wrong'}),null);assert(isHdVideo(item.observed.width,item.observed.height));assert(item.observed.playedSeconds>0);assert(Math.abs(item.observed.duration-item.duration)<2);}
assert.equal(new Set(APPROVED_EMBEDS.map(x=>x.movieId)).size,APPROVED_EMBEDS.length);
console.log('INDEPENDENT ARABIC PASS: exact publisher-published public films, clean startup, measured playback evidence');

import {isHdVideo} from '../src/mediaQuality.js';
import {independentArabicItems,observedQuality} from '../src/independentArabicModel.js';
assert.equal(independentArabicItems().length,10);assert(independentArabicItems('القاهرة').some(x=>x.item.movieId==='vimeo:981239956'));assert.equal(independentArabicItems('FULL MEMORY').length,1);assert.equal(independentArabicItems('','فيلم روائي قصير').length,5);assert.equal(independentArabicItems('','وثائقي طويل').length,3);assert.equal(observedQuality(independentArabicItems('FULL MEMORY')[0].item),'1080p');console.log('INDEPENDENT FILTERS PASS: ten titles, search, distinct categories and measured quality');

assert.equal(independentArabicItems('','وثائقي قصير').length,2);assert.equal(independentArabicItems('نائلة').length,1);assert.equal(APPROVED_EMBEDS.filter(x=>x.origin==='https://players.brightcove.net').length,3);for(const x of APPROVED_EMBEDS.filter(x=>x.origin==='https://players.brightcove.net')){assert.equal(new URL(x.embed).searchParams.get('videoId'),x.movieId.split(':')[1]);assert(x.permissionRef.includes('justvision.org/films'));}console.log('BRIGHTCOVE PASS: exact official full film player identities and filters');
