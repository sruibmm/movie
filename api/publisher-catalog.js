import {PUBLISHERS,isoDuration} from '../src/arabicSources.js';
import {titleKey,youtubeEmbed} from '../src/watanLookup.js';
const starter=[
 {id:'M9dM0ZW9AXc',title:'اللمبي',publisher:'السبكي للإنتاج الفني',kind:'movie'},
 {id:'TIH0aQtXymk',title:'الواد سيد الشغال',publisher:'ART TV Network',kind:'play'},
 {id:'iqB5Yhx-QN8',title:'موعد مع الوزير',publisher:'ماسبيرو دراما',kind:'play'},
];
const safeId=v=>/^[A-Za-z0-9_-]{11}$/.test(v||'');
const source=(v)=>({...v,source:'publisher',adsPossible:true,embed:youtubeEmbed(v.id),url:'https://www.youtube.com/watch?v='+v.id});
async function fetchJson(url){const c=new AbortController(),t=setTimeout(()=>c.abort(),6000);try{const r=await fetch(url,{signal:c.signal});if(!r.ok)throw Error('Request failed');return await r.json();}finally{clearTimeout(t);}}
async function yt(path,params,key){return fetchJson('https://www.googleapis.com/youtube/v3/'+path+'?'+new URLSearchParams({...params,key}));}
function acceptable(v,p){const s=v.snippet||{},d=v.contentDetails||{},st=v.status||{},r=d.regionRestriction||{};return safeId(v.id)&&s.channelId===p&&st.embeddable&&st.privacyStatus==='public'&&s.liveBroadcastContent!=='live'&&s.liveBroadcastContent!=='upcoming'&&isoDuration(d.duration)>=2400&&!r.blocked?.includes('KW')&&(!r.allowed||r.allowed.includes('KW'))&&!/(?:^| )(اعلان|برومو|تريلر|كواليس|ملخص|مقطع|مشهد|قفشات|اغاني|trailer|teaser|clip)(?: |$)/.test(titleKey(s.title));}
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'GET only'});
 const key=process.env.YOUTUBE_DATA_API_KEY;
 const q=titleKey(String(req.query.q||'').slice(0,120));const choice=String(req.query.publisher||'');const token=String(req.query.token||'');
 const catalogue=PUBLISHERS.map((p,i)=>({index:String(i),name:p.name}));
 const known=starter.filter(v=>(!q||titleKey(v.title).includes(q))&&(!choice||PUBLISHERS[Number(choice)]?.name===v.publisher));
 res.setHeader('Cache-Control','public, max-age=60, s-maxage=900');
 if(!key){const results=await Promise.allSettled(known.map(async v=>{const m=await fetchJson('https://www.youtube.com/oembed?'+new URLSearchParams({url:'https://www.youtube.com/watch?v='+v.id,format:'json'}));if(!titleKey(m.title).includes(titleKey(v.title)))return null;return source({...v,title:m.title,publisher:m.author_name});}));return res.json({configured:false,items:results.filter(x=>x.status==='fulfilled'&&x.value).map(x=>x.value),publishers:catalogue,next:null});}
 if(!choice)return res.json({configured:true,items:[],publishers:catalogue,next:null});
 const p=PUBLISHERS[Number(choice)];if(!p||!/^\d+$/.test(choice)||token.length>300)return res.status(400).json({error:'Invalid selection'});
 try{const channel=(await yt('channels',{part:'contentDetails',...(p.id?{id:p.id}:{forHandle:p.handle})},key)).items?.[0];const list=channel?.contentDetails?.relatedPlaylists?.uploads;if(!list)return res.json({configured:true,items:[],publishers:catalogue,next:null});
 const page=await yt('playlistItems',{part:'contentDetails',playlistId:list,maxResults:'50',...(token?{pageToken:token}:{})},key);
 const ids=[...new Set((page.items||[]).map(x=>x.contentDetails?.videoId).filter(safeId))];
 const videos=ids.length?(await yt('videos',{part:'snippet,contentDetails,status',id:ids.join(',')},key)).items||[]:[];
 const items=videos.filter(v=>acceptable(v,channel.id)&&(!q||titleKey(v.snippet.title).includes(q))).map(v=>source({id:v.id,title:v.snippet.title,publisher:p.name,duration:isoDuration(v.contentDetails.duration),kind:'video'}));
 return res.json({configured:true,items,publishers:catalogue,next:page.nextPageToken||null,totalUploads:page.pageInfo?.totalResults||null});
 }catch{return res.status(502).json({error:'Publisher catalogue unavailable'});}
}
