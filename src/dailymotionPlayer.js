// Player IDs must come from a publisher-authorized configuration, not a demo or guessed ID.
export const DAILYMOTION_PLAYER_ID = String(import.meta.env?.VITE_DAILYMOTION_PLAYER_ID || '').trim();
const validPlayer = id => /^[A-Za-z0-9]{3,32}$/.test(id || '');
export const dailymotionConfigured = validPlayer(DAILYMOTION_PLAYER_ID);
export function dailymotionEmbedUrl(videoId, playerId=DAILYMOTION_PLAYER_ID){
 if(!/^x[a-z0-9]{5,12}$/.test(videoId || '') || !validPlayer(playerId))return null;
 return 'https://geo.dailymotion.com/player/'+playerId+'.html?video='+videoId;
}
