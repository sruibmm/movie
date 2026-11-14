import {normalizeArabic,embedwaveUrl} from './arabicDiscovery.js';
export const ARABIC_BACKENDS=Object.freeze([10,11,12]);
export const backendName=id=>({10:'cinesrc',11:'videasy',12:'nxsha'})[id];
export function arabicSourceIds(isTV,legacy){return isTV?[...ARABIC_BACKENDS]:[...ARABIC_BACKENDS,...legacy.filter(x=>!ARABIC_BACKENDS.includes(x))];}
export function backendUrl(movie,id){const u=new URL(embedwaveUrl(movie));const name=backendName(id);if(!name)throw Error('Unknown backend');u.searchParams.set('server',name);return u.href;}
export function nextArabicSource(ids,memory,current){return ids.filter(i=>i!==current&&!['ad','blocked'].includes(memory[i]?.status)).sort((a,b)=>Number(memory[b]?.status==='clean')-Number(memory[a]?.status==='clean'))[0]??null;}
export const PUBLISHERS=[
 {id:'UCSVSS5aSyHh7ChJlICx_Gkg',name:'السبكي للإنتاج الفني',url:'https://www.youtube.com/@sobkyproductions'},
 {id:'UCog_OCIsfABgX_e9OPZaeoQ',name:'السبكي للإنتاج السينمائي',url:'https://www.youtube.com/@elsobkyforfilm'},
 {id:'UCrIy5XTmRPwZPOlilXDWacA',name:'ماسبيرو دراما',url:'https://www.youtube.com/@MasperoDrama'},
 {id:'UColf1L4k9OVGwzuwNkzEOLg',name:'ماسبيرو زمان',url:'https://www.youtube.com/@masperozaman'},
 {handle:'ART_Aflam',name:'ART أفلام',url:'https://www.youtube.com/@ART_Aflam'},
 {handle:'ART-Nostalgia',name:'ART نوستالجيا',url:'https://www.youtube.com/@ART-Nostalgia'},
 {handle:'watanflix',name:'وطن فليكس',url:'https://www.youtube.com/@watanflix'},
 {handle:'cedarsartdrama-1525',name:'CedarsArt Drama',url:'https://www.youtube.com/@cedarsartdrama-1525'},
 {id:'UCJjN-DtSpJqu13JuN30e79g',name:'حارة شوف بلس',url:'https://www.youtube.com/@haretshoofplus'},
];
export function isoDuration(v){const m=String(v||'').match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);return m?Number(m[1]||0)*3600+Number(m[2]||0)*60+Number(m[3]||0):0;}
export function matchPublisherVideo(v,query,publishers=PUBLISHERS){
 const s=v?.snippet||{},d=v?.contentDetails||{},status=v?.status||{},publisher=publishers.find(p=>p.id===s.channelId);
 if(!publisher||!status.embeddable||status.privacyStatus!=='public'||!/^[-_A-Za-z0-9]{11}$/.test(v.id||'')||s.liveBroadcastContent==='live'||s.liveBroadcastContent==='upcoming')return null;
 const region=d.regionRestriction;if(region?.blocked?.includes('KW')||(region?.allowed&&!region.allowed.includes('KW')))return null;
 const title=normalizeArabic(s.title),wanted=normalizeArabic(query.title);
 if(!wanted||!(' '+title+' ').includes(' '+wanted+' '))return null;
 const after=(' '+title+' ').split(' '+wanted+' ')[1]||'';
 if(query.type!=='tv'&&/^(?:\d+|الجزء|جزء|في الجاهليه|في الجاهلية)(?: |$)/.test(after))return null;
 if(/(?:^| )(اعلان|برومو|تريلر|كواليس|اغنيه|اغنية|مشهد|ملخص|مقطع|trailer|teaser|clip|reaction)(?: |$)/.test(title))return null;
 if(/(?:^| )(جزء|part)(?: |$)/.test(title)&&query.type!=='tv')return null;
 const duration=isoDuration(d.duration),runtime=Number(query.runtime)||0;
 if(query.type==='tv'){
  const match=title.match(/(?:الحلقه|الحلقة|episode|ep)\s*(\d+)/);
  if(!match||Number(match[1])!==Number(query.episode)||duration<900)return null;
  const season=title.match(/(?:الموسم|season)\s*(\d+)/);
  if(Number(query.season)>1&&(!season||Number(season[1])!==Number(query.season)))return null;
  if(season&&Number(season[1])!==Number(query.season))return null;
 }else if(duration<2400||/(?:^| )(الحلقه|الحلقة|episode)(?: |$)/.test(title))return null;
 if(runtime>0&&(duration<runtime*60*.80||duration>runtime*60*1.18))return null;
 const yr=Number(query.year),years=[...title.matchAll(/(?:^| )(19\d{2}|20\d{2})(?= |$)/g)].map(m=>Number(m[1]));
 if(yr&&years.length&&!years.includes(yr))return null;
 return {id:v.id,title:s.title,publisher:publisher.name,duration,match:runtime?'title and duration':'title and minimum duration',url:'https://www.youtube.com/watch?v='+v.id,embed:'https://www.youtube.com/embed/'+v.id+'?playsinline=1&rel=0',adsPossible:true};
}
