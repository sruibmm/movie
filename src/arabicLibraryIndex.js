import a from './watanIndex1.json';
import b from './watanIndex2.json';
import c from './watanIndex3.json';
import d from './watanIndex4.json';
import e from './watanIndex5.json';
import publishers from './publisherIndex.json';
import {titleKey,youtubeEmbed} from './watanLookup.js';
export const CATEGORIES={all:'الكل',series:'مسلسلات',movies:'أفلام',plays:'مسرحيات',programs:'برامج',kids:'أطفال'};
export const WATAN_INDEX=[...new Map([...a,...b,...c,...d,...e].map(v=>[v.category+'|'+v.slug,v])).values()].map(v=>({...v,key:'watan:'+v.slug,origin:'watan'}));
export const PUBLISHER_INDEX=[...new Map(publishers.map(v=>[v.id,v])).values()].map(v=>({...v,key:'publisher:'+v.id,origin:'publisher'}));
export function mergeLibrary(live=[]){return [...new Map([...PUBLISHER_INDEX,...live.map(v=>({...v,key:'watan:'+v.slug,origin:'watan'})),...WATAN_INDEX].map(v=>[v.key,v])).values()];}
export function filterLibrary(items,category='all',q=''){const query=titleKey(q);return items.filter(v=>(category==='all'||v.category===category)&&(!query||titleKey(v.title+' '+(v.publisher||'')+' '+(v.slug||'').replace(/-/g,' ')).includes(query)));}
export function publisherSourceFor(row,meta){if(!row||!meta?.title||!meta?.author_name||!meta?.html||!meta.html.includes('/embed/'+row.id))return null;
 if(titleKey(meta.title)!==titleKey(row.title)||titleKey(meta.author_name)!==titleKey(row.publisher))return null;
 return {id:row.id,title:meta.title,publisher:meta.author_name,source:'publisher',adsPossible:true,embed:youtubeEmbed(row.id),url:'https://www.youtube.com/watch?v='+row.id};}
