// Public catalogue page links; no video manifests, tokens, or playback claims.
export const DUBAI_PLUS_HOME='https://www.dubaiplus.net/';
export const DUBAI_PLUS_TERMS='https://www.dubaiplus.net/footer/information/terms';
const rows=[["694469160205","جعفر العمدة",2023,30],["694467624287","قيد مجهول",2021,8],["694466600449","تحت الوصاية",2023,15],["694468136197","النار بالنار",2023,30],["691982376018","خمسة ونص",2019],["693423144332","مال القبان",2024],["719314984120","ولاد الشمس",2025],["693851176310","ساعته وتاريخه",2024],["699559464203","ليالي روكسي",2025],["694766119985","الكندوش",2021],["749704744341","لعبة وقلبت بجد",2026],["694468648035","سوتس بالعربي",2022,30],["783014952294","فضة",null,30],["749712424174","تطبق الشروط والأحكام",null,10],["694468136079","شعبية الكرتون",null,null,15],["697835048144","الورشة"]];
export const DUBAI_PLUS_TITLES=Object.freeze(rows.map(([id,title,year,episodes,seasons])=>Object.freeze({
 id:'dubai-'+id,title,year,episodes,seasons,kind:'tv',
 url:'https://www.dubaiplus.net/ar-AE/s/series/'+id+'_'+encodeURIComponent(title.replace(/ /g,'-')),
 availability:'صفحة المصدر الرسمية',playbackVerified:false
})));
export function officialDubaiUrl(value){
 try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='www.dubaiplus.net'&&!u.port&&!u.username&&!u.password?u.href:null;}catch{return null;}
}
