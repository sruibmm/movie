import {WATAN_ORIGIN,plainText,titleKey,slug,parseWatanPage,verifyWatanVideo} from './watanLookup.js';
export const WATAN_CATEGORIES={series:'مسلسلات',movies:'الأفلام',plays:'مسرحيات',programs:'برامج',kids:'أطفال'};
export const validSlug=v=>typeof v==='string'&&v.length>0&&v.length<=160&&/^[\p{L}\p{N}_-]+$/u.test(v);
function anchors(html){return [...String(html||'').matchAll(/<a\b[^>]*?\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(m=>({href:m[1].replace(/&amp;/g,'&'),body:m[2]}));}
function url(href){try{return new URL(href,WATAN_ORIGIN);}catch{return null;}}
export function parseCatalogue(html,category){
 const rows=new Map();let pages=1;
 for(const a of anchors(html)){const u=url(a.href);if(!u||!['watanflix.com','www.watanflix.com'].includes(u.hostname))continue;
 const page=Number(u.searchParams.get('page'));if(u.pathname.includes('/category/')&&Number.isInteger(page)&&page>0&&page<=200)pages=Math.max(pages,page);
 const m=u.pathname.match(/^\/(?:ar\/)?series\/([^/]+)\/?$/);if(!m)continue;
 let id;try{id=decodeURIComponent(m[1]);}catch{continue;}if(!validSlug(id))continue;
 const alt=a.body.match(/<img\b[^>]*?\balt\s*=\s*["']([^"']+)["']/i)?.[1];
 const raw=plainText(alt||a.body);const name=raw&&raw.length<120&&!/^\d+$/.test(raw)?raw:id.replace(/-/g,' ');
 if(!rows.has(id))rows.set(id,{slug:id,title:name,category});
 }
 return {items:[...rows.values()],pages};
}
export function parseWork(html,id,category){
 const h=String(html||'').match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);if(!h||!validSlug(id))return null;
 const title=plainText(h[1]);if(!title||title.length>140)return null;
 const ids=new Set();for(const a of anchors(html)){const u=url(a.href);if(!u||!['youtube.com','www.youtube.com','youtu.be'].includes(u.hostname))continue;const v=u.hostname==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v');if(/^[A-Za-z0-9_-]{11}$/.test(v||''))ids.add(v);}
 const count=ids.size;const isTV=category==='series'||(category!=='movies'&&category!=='plays'&&count>1);
 return {slug:id,title,category,type:isTV?'tv':'movie',episodes:isTV?count:0,hasLinks:count>0};
}
export function makeWatanMovie(work,episode,source){return {id:'watan:'+work.slug+':'+(work.type==='tv'?episode:0),title:work.title+(work.type==='tv'?' · الحلقة '+episode:''),original_title:work.title,seriesTitle:work.title,original_language:'ar',isArabic:true,media_type:'watan',watanOnly:true,watanSlug:work.slug,watanType:work.type,episode:work.type==='tv'?episode:0,season:1,publisherSource:source};}
