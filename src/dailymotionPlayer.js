// Public Dailymotion documentation example: browser-tested on x6rtfip.
// May be replaced with a dedicated publisher-approved player in deployment settings.
export const PUBLIC_DAILYMOTION_PLAYER_ID='x8lr5';
export const DAILYMOTION_PLAYER_ID=String(import.meta.env?.VITE_DAILYMOTION_PLAYER_ID || PUBLIC_DAILYMOTION_PLAYER_ID).trim();
const validPlayer=id=>/^[A-Za-z0-9]{3,32}$/.test(id||'');
export const dailymotionConfigured=validPlayer(DAILYMOTION_PLAYER_ID);
export function dailymotionEmbedUrl(videoId,playerId=DAILYMOTION_PLAYER_ID){
 if(!/^x[a-z0-9]{5,12}$/.test(videoId||'')||!validPlayer(playerId))return null;
 return 'https://geo.dailymotion.com/player/'+playerId+'.html?video='+videoId;
}
export function highestQuality(list){
 const supported=new Set(['240','380','480','720','1080','1440','2160']);
 return (Array.isArray(list)?list:[]).map(String).filter(q=>supported.has(q)).sort((a,b)=>Number(b)-Number(a))[0]||null;
}
