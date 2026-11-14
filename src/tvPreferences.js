// TV-only preferences. Never claim a caption is present unless a matching track exists.
import {trackLanguage,arabicSubtitleIndex} from './mediaLanguages.js';
export const TV_CC_KEY='cinema_tv_cc_v1';
export function readTvCC(storage){try{const v=storage.getItem(TV_CC_KEY);return ['ar','en','off'].includes(v)?v:'ar';}catch{return 'ar';}}
export function captionIndex(tracks,pref){
 if(pref==='off')return -1;
 if(pref==='ar')return arabicSubtitleIndex(tracks);
 const list=Array.from(tracks||[]);
 return list.findIndex(t=>trackLanguage(t)==='en'&&(!t.kind||['subtitles','captions'].includes(t.kind))&&!t.forced&&!/\bforced\b/i.test([t.name,t.label].join(' ')));
}
export function applyTvCC(video,hls,pref){
 const hlsTracks=hls?.subtitleTracks||[],native=Array.from(video?.textTracks||[]),hi=captionIndex(hlsTracks,pref),ni=captionIndex(native,pref);
 // HLS.js owns its manifest tracks; HTML track elements handle sidecar/native tracks.
 if(hlsTracks.length){hls.subtitleTrack=hi;hls.subtitleDisplay=hi>=0;}
 if(hi>=0)return {status:'selected',language:pref,engine:'hls'};
 for(let i=0;i<native.length;i++)if(['subtitles','captions'].includes(native[i].kind))native[i].mode=i===ni?'showing':'disabled';
 return {status:pref==='off'?'off':ni>=0?'selected':'missing',language:pref,engine:'native'};
}
export function seekTarget(time,duration,delta){return Number.isFinite(time)&&Number.isFinite(duration)&&duration>0?Math.max(0,Math.min(duration,time+delta)):null;}
