// Public catalogue page links; no video manifests, tokens, or playback claims.
export const DUBAI_PLUS_HOME='https://www.dubaiplus.net/';
export const DUBAI_PLUS_TERMS='https://www.dubaiplus.net/footer/information/terms';
const rows=[["694469160205","جعفر العمدة",2023,30],["694467624287","قيد مجهول",2021,8],["694466600449","تحت الوصاية",2023,15],["694468136197","النار بالنار",2023,30],["691982376018","خمسة ونص",2019],["693423144332","مال القبان",2024],["719314984120","ولاد الشمس",2025],["693851176310","ساعته وتاريخه",2024],["699559464203","ليالي روكسي",2025],["694766119985","الكندوش",2021],["749704744341","لعبة وقلبت بجد",2026],["694468648035","سوتس بالعربي",2022,30],["783014952294","فضة",null,30],["749712424174","تطبق الشروط والأحكام",null,10],["694468136079","شعبية الكرتون",null,null,15],["697835048144","الورشة"],["693850152377","المسار",null,30],["746838056361","آخر الشهر",null,30],["698424360044","عاشر صفحة",null,30],["708117543978","الشقيقات",null,17]];
export const DUBAI_PLUS_TITLES=Object.freeze(rows.map(([id,title,year,episodes,seasons])=>Object.freeze({
 id:'dubai-'+id,title,year,episodes,seasons,kind:'tv',
 url:'https://www.dubaiplus.net/ar-AE/s/series/'+id+'_'+encodeURIComponent(title.replace(/ /g,'-')),
 availability:'صفحة المصدر الرسمية',playbackVerified:false
})));
export function officialDubaiUrl(value){
 try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='www.dubaiplus.net'&&!u.port&&!u.username&&!u.password?u.href:null;}catch{return null;}
}

// These are independent publisher editions of titles also listed by Dubai+.
export const DUBAI_PUBLISHER_MATCH_IDS=Object.freeze(["dm-series:الخان","dm-series:باب المقام","dm-series:حارة الاصيل","dm-series:حريم الشاويش","dm-series:شهر زمان","dm-series:صراع المال","dm-series:فتت لعبت"]);
