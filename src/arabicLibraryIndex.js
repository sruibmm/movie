import {watanData,publisherData} from './arabicIndexData.js';
import {titleKey,youtubeEmbed} from './watanLookup.js';
import {isoDuration} from './arabicSources.js';
export const CATEGORIES={all:'الكل',series:'مسلسلات',movies:'أفلام',plays:'مسرحيات',programs:'برامج',kids:'أطفال'};
export const WATAN_INDEX=[...new Map(watanData.map(v=>[v.category+'|'+v.slug,v])).values()].map(v=>({...v,key:'watan:'+v.slug,origin:'watan'}));
export const PUBLISHER_INDEX=[...new Map(publisherData.map(v=>[v.id,v])).values()].map(v=>({...v,key:'publisher:'+v.id,origin:'publisher'}));
export function mergeLibrary(live=[]){return [...new Map([...PUBLISHER_INDEX,...live.map(v=>({...v,key:'watan:'+v.slug,origin:'watan'})),...WATAN_INDEX].map(v=>[v.key,v])).values()];}
export function filterLibrary(items,category='all',q=''){const query=titleKey(q);return items.filter(v=>(category==='all'||v.category===category)&&(!query||titleKey(v.title+' '+(v.publisher||'')+' '+(v.slug||'').replace(/-/g,' ')).includes(query)));}
export function publisherSourceFor(row,meta){if(!row||!meta?.title||!meta?.author_name||!meta?.html||!meta.html.includes('/embed/'+row.id))return null;
 if(titleKey(meta.title)!==titleKey(row.title)||titleKey(meta.author_name)!==titleKey(row.publisher))return null;
 return {id:row.id,title:meta.title,publisher:meta.author_name,source:'publisher',adsPossible:true,embed:youtubeEmbed(row.id),url:'https://www.youtube.com/watch?v='+row.id};}

export function matchIndexedPublishers(query){
 const wanted=titleKey(query.title);if(!wanted||query.type==='tv')return [];
 const runtime=Number(query.runtime)||0,year=Number(query.year)||0;
 return PUBLISHER_INDEX.filter(v=>{const title=titleKey(v.title);if(!(' '+title+' ').includes(' '+wanted+' '))return false;const after=(' '+title+' ').split(' '+wanted+' ')[1]||'';if(/^(?:\d+|الجزء|جزء|في الجاهليه)(?: |$)/.test(after))return false;const duration=isoDuration(v.duration);if(runtime>0&&duration>0&&(duration<runtime*60*.80||duration>runtime*60*1.18))return false;const years=[...title.matchAll(/(?:^| )(19\d{2}|20\d{2})(?= |$)/g)].map(m=>Number(m[1]));return !(year&&years.length&&!years.includes(year));}).slice(0,4);
}
