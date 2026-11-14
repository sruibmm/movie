import {normalizeArabic} from './arabicDiscovery.js';
export const WATAN_ORIGIN='https://watanflix.com';
const idRE=/^[A-Za-z0-9_-]{11}$/;
export const youtubeEmbed=id=>{if(!idRE.test(id))throw Error('Invalid video');return 'https://www.youtube-nocookie.com/embed/'+id+'?playsinline=1&rel=0&enablejsapi=1';};
export function titleKey(v){return normalizeArabic(v).replace(/ة/g,'ه').replace(/\b(?:الجزء|الموسم) الاول\b/g,'').trim();}
export function plainText(html){return String(html||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Math.min(1114111,Number(n)))).replace(/\s+/g,' ').trim();}
export function slug(v){return String(v||'').trim().replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-+|-+$/g,'');}
function anchors(html){const out=[];for(const a of String(html).matchAll(/<a\b[^>]*?\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){out.push({href:a[1].replace(/&amp;/g,'&'),label:plainText(a[2])});}return out;}
function urlOf(href){try{return new URL(href,WATAN_ORIGIN);}catch{return null;}}
export function cataloguePages(html,title){const target=titleKey(title);return [...new Set(anchors(html).map(a=>urlOf(a.href)).filter(u=>u&&['watanflix.com','www.watanflix.com'].includes(u.hostname)&&/^\/(?:ar\/)?series\/[^/]+\/?$/.test(u.pathname)).filter(u=>{try{return titleKey(decodeURIComponent(u.pathname.split('/').filter(Boolean).at(-1)).replace(/-/g,' '))===target;}catch{return false;}}).map(u=>WATAN_ORIGIN+u.pathname))].slice(0,3);}
export function parseWatanPage(html,title,type,episode,season=1){const h=String(html).match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);if(!h||titleKey(plainText(h[1]))!==titleKey(title))return [];
 // A generic series page cannot safely identify a later season.
 if(type==='tv'&&season>1)return [];
 const found=new Map();for(const a of anchors(html)){const u=urlOf(a.href);if(!u||!['www.youtube.com','youtube.com','youtu.be'].includes(u.hostname))continue;const id=u.hostname==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v');if(!idRE.test(id||''))continue;const label=titleKey(a.label);const ep=label.match(/(?:الحلقه|episode|ep)\s*(\d+)/)?.[1];const prev=found.get(id);found.set(id,{id,label:label||prev?.label||'',episode:ep?Number(ep):prev?.episode||0});}
 const rows=[...found.values()];if(type==='tv'){const exact=rows.filter(v=>v.episode===episode);return exact.length?exact.slice(0,3):rows[episode-1]?[rows[episode-1]]:[];}return rows.length===1?rows:rows.filter(v=>v.label.includes(titleKey(title))&&!v.episode).slice(0,3);
}
export function verifyWatanVideo(v,meta,query){const title=titleKey(meta?.title);const wanted=titleKey(query.title);if(!wanted||!(' '+title+' ').includes(' '+wanted+' '))return null;
 if(/(?:^| )(اعلان|برومو|تريلر|ملخص|مشهد|مقطع|trailer|teaser|clip)(?: |$)/.test(title))return null;
 const author=normalizeArabic(meta.author_name);const au=String(meta.author_url||'').toLowerCase();
 // Publisher names/handles must belong to the known rights-holder channels.
 if(!/watanflix|cedars\s*art|cedarsart|وطن فلكس|وطن فليكس|السبكي|ماسبيرو|rotana|روتانا|art نوستالجيا/.test(author)&&!/(?:watanflix|cedarsart|sobkyproductions|masperozaman|masperodrama|rotana)/.test(au))return null;
 if(query.type==='tv'){const ep=title.match(/(?:الحلقه|episode|ep)\s*(\d+)/);if(!ep||Number(ep[1])!==query.episode)return null;const sn=title.match(/(?:الموسم|الجزء|season)\s*(\d+)/);if(query.season>1&&Number(sn?.[1])!==query.season)return null;}
 else{if(/(?:^| )(الحلقه|episode|جزء|part)(?: |$)/.test(title))return null;const after=(' '+title+' ').split(' '+wanted+' ')[1]||'';if(/^(?:\d+|في الجاهليه)(?: |$)/.test(after))return null;}
 return {id:v.id,title:meta.title,publisher:meta.author_name,source:'watanflix',url:'https://www.youtube.com/watch?v='+v.id,embed:youtubeEmbed(v.id),adsPossible:true};
}
export function publisherEmbed(v){return {...v,embed:youtubeEmbed(v.id)};}
export function smartArabicNext(ids,memory,current,usedPublisher){const available=ids.filter(i=>i!==current&&!['ad','blocked'].includes(memory[i]?.status));return available[0]??null;}
