import {plainText,titleKey,youtubeEmbed} from './watanLookup.js';
export const ARCHIVE_ORIGIN='https://assyrian4all.net';
export const ARCHIVE_GENRES={drama:'دراما',comedy:'كوميدي',play:'مسرحيات',tvfilm:'سهرات تلفزيونية',action:'أكشن',romance:'رومانسي',thriller:'إثارة',horror:'رعب',war:'تاريخ',musical:'استعراضي'};
const prefix='/A4A/news/';
const safeURL=v=>{try{return new URL(v.replace(/&amp;/g,'&'),ARCHIVE_ORIGIN);}catch{return null;}};
const tagText=v=>plainText(v).replace(/^\s*(?:\d{1,2}:)?\d{1,2}:\d{2}\s*(?:\d{4})?\s*▶?\s*/,'').replace(/^▶\s*/,'').trim();
const shortClip=v=>/(?:^| )(اعلان|برومو|تريلر|ملخص|مشهد|مقطع|كواليس|جزء من|الفصل الاول|الفصل الثاني|الفصل الثالث|قفشات|اغاني|trailer|teaser|clip)(?: |$)/.test(titleKey(v));
export function parseArchiveCatalogue(html,genre){
 const map=new Map();let pages=1;
 for(const m of String(html).matchAll(/<a\b[^>]*?\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
  const u=safeURL(m[1]);if(!u||u.origin!==ARCHIVE_ORIGIN)continue;
  if(u.pathname===prefix+'arabicmovie.php'&&u.searchParams.get('genre')===genre){const p=Number(u.searchParams.get('page'));if(Number.isInteger(p)&&p>0&&p<100)pages=Math.max(pages,p);}
  if(u.pathname!==prefix+'arabicmovie_watch.php')continue;
  const id=u.searchParams.get('id');if(!/^\d{1,8}$/.test(id||''))continue;
  const alt=m[2].match(/<img\b[^>]*?\balt\s*=\s*["']([^"']+)["']/i)?.[1];
  const titleEl=m[2].match(/<(?:div|p|span|h[234])\b[^>]*class\s*=\s*["'][^"']*(?:title|name)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|p|span|h[234])>/i)?.[1];
  const title=tagText(titleEl||alt||m[2]).slice(0,280);
  if(title.length<4||shortClip(title))continue;
  if(!map.has(id))map.set(id,{id,title,genre});
 }
 return {items:[...map.values()],pages};
}
const publishers=/(?:masperozaman|masperodrama|watanflix|rotanacinema|rotanaclassic|sobkyproductions|elsobkyforfilm|cedarsart|haretshoofplus|moviesimedia|imediasharqi|^\/channel\/UC(?:eObuRp8DAS-ubBtXQRt0zg|KckQm50S8caMgcUTgtxjqQ|39t9YJ_RzgKmmAkq19lhYw|rIy5XTmRPwZPOlilXDWacA)$)/i;
export function archiveVideoCandidates(html){
 const ids=new Set();
 for(const m of String(html).matchAll(/(?:https?:)?\/\/(?:www\.)?(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])/g))ids.add(m[1]);
 return [...ids].slice(0,5);
}
export function validateArchiveVideo(id,meta,title){
 if(!/^[A-Za-z0-9_-]{11}$/.test(id)||!meta?.title||shortClip(meta.title))return null;
 const u=safeURL(meta.author_url||'');if(!u||!['youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname)||!publishers.test(u.pathname))return null;
 const expected=titleKey(title),actual=titleKey(meta.title);
 if(!expected||!(expected.includes(actual)||actual.includes(expected)))return null;
 return {id,title:meta.title,publisher:meta.author_name,source:'publisher',url:'https://www.youtube.com/watch?v='+id,embed:youtubeEmbed(id),adsPossible:true};
}
export function makeArchiveMovie(source){return {id:'archive:'+source.id,title:source.title,original_title:source.title,seriesTitle:source.title,original_language:'ar',isArabic:true,media_type:'watan',watanOnly:true,watanType:'movie',season:1,episode:0,publisherSource:source};}
