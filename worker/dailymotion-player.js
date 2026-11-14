import catalog from '../src/arabicBulkCatalog.json' with {type:'json'};
import {ARABIC_SITE_SERIES} from '../src/arabicSiteCatalog.js';
import {dailymotionEmbedUrl} from '../src/dailymotionPlayer.js';
const records=new Map();
for(const g of catalog.series)for(const s of g.seasons)for(const e of s.episodes)records.set(e.id,{video:e.id,publisher:e.owner,title:g.title,season:s.season,episode:e.number});
for(const f of catalog.films)records.set(f.id,{video:f.id,publisher:f.owner,title:f.title});
for(const g of ARABIC_SITE_SERIES)for(const e of g.episodes)if(!records.has(e.id))records.set(e.id,{video:e.id,publisher:'alnahareg',title:g.title,season:1,episode:e.number});
export function dailymotionPlayerResponse(request,env){
 const headers={'Cache-Control':'no-store'};
 const reply=(body,status=200)=>Response.json(body,{status,headers});
 if(request.method!=='GET')return reply({error:'GET only'},405);
 const video=new URL(request.url).searchParams.get('video');
 const item=records.get(video);
 if(!item)return reply({error:'Unknown catalog video'},404);
 let map={};
 try{const v=JSON.parse(env.DAILYMOTION_PUBLISHER_PLAYERS||'{}');if(v&&typeof v==='object'&&!Array.isArray(v))map=v;}catch{}
 const player=Object.hasOwn(map,item.publisher)?map[item.publisher]:env.DAILYMOTION_PLAYER_ID;
 const src=typeof player==='string'?dailymotionEmbedUrl(video,player.trim()):null;
 return reply({...item,configured:!!src,embed:src,playback:'unverified'});
}
