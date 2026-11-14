import {normalizeArabic} from './arabicDiscovery.js';
export const OFFICIAL_CATALOG=[
 {id:'limby2002',title:'اللمبي',year:'2002',kind:'فيلم',channel:'السبكي للإنتاج الفني',video:'M9dM0ZW9AXc',aliases:'محمد سعد el limby el lembi'},
 {id:'zaeem',title:'الزعيم',year:'1993',kind:'مسرحية',channel:'ART نوستالجيا',video:'tLhJ7g4xDDo',aliases:'عادل امام عادل إمام al zaeem'},
 {id:'sayed',title:'الواد سيد الشغال',year:'1985',kind:'مسرحية',channel:'ART نوستالجيا',video:'M86-JJwg14U',aliases:'عادل امام عادل إمام sayed the servant'},
 {id:'limby8',title:'اللمبي 8 جيجا',year:'2010',kind:'فيلم',channel:'STARZPLAY',url:'https://starzplay.com/ar/movies/al-limbi-8-gega/763280423982',aliases:'محمد سعد اللمبي ٨ جيجا اللمبي ثمانية جيجا lembi 8 giga'},
 {id:'school',title:'مدرسة المشاغبين',year:'1973',kind:'مسرحية',channel:'شاهد',url:'https://shahid.mbc.net/ar/movies/Madrasat-Almoshagebin/movie-880870',aliases:'عادل امام عادل إمام سعيد صالح'},
 {id:'jahilia',title:'اللمبي في الجاهلية',year:'2021',kind:'مسرحية',channel:'لم نجد نسخة كاملة موثقة',info:'https://elcinema.com/work/2071802/',aliases:'محمد سعد اللمبي في الجاهليه el lemby'},
];

export function officialEmbed(id){if(!/^[-_A-Za-z0-9]{11}$/.test(id||''))throw Error('Invalid official video');return 'https://www.youtube-nocookie.com/embed/'+id+'?playsinline=1&rel=0';}
export function findOfficialTitles(movie){
 if(movie.media_type==='tv')return [];
 const titles=new Set([movie.title,movie.original_title].filter(Boolean).map(normalizeArabic));
 const year=String(movie.release_date||'').slice(0,4);
 return OFFICIAL_CATALOG.filter(x=>x.video&&x.kind==='فيلم'&&titles.has(normalizeArabic(x.title))&&(!year||year===x.year)).map(x=>({id:x.video,title:x.title,publisher:x.channel,embed:officialEmbed(x.video),adsPossible:true}));
}
