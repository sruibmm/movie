// Official public page URLs, not copied streams or playback tokens.
export const DUBAI_PLUS_HOME='https://www.dubaiplus.net/';
export const DUBAI_PLUS_TERMS='https://www.dubaiplus.net/footer/information/terms';
export const DUBAI_PLUS_TITLES=Object.freeze([
 Object.freeze({id:'dubai-jaafar-2023',title:'جعفر العمدة',year:2023,kind:'tv',episodes:30,url:'https://www.dubaiplus.net/ar-AE/s/series/694469160205_'+encodeURIComponent('جعفر-العمدة'),availability:'صفحة المسلسل متاحة مجانًا لدى المصدر',playbackVerified:false})
]);
export function officialDubaiUrl(value){
 try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='www.dubaiplus.net'&&!u.port&&!u.username&&!u.password?u.href:null;}catch{return null;}
}
