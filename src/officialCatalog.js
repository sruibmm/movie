import {normalizeArabic} from './arabicDiscovery.js';
export const OFFICIAL_CATALOG=[
 {"id":"hag-metwaly","title":"عائلة الحاج متولي","year":"2001","kind":"مسلسل","channel":"ماسبيرو دراما","playlist":"PL9KkecclNUBTV7wu4vxdM8X0TPVyyFdWt","aliases":"نور الشريف ماجدة زكي سمية الخشاب الحاج متولي"},
 {"id":"kahf-wahm","title":"الكهف والوهم والحب","year":"","kind":"مسلسل","channel":"ماسبيرو زمان","playlist":"PLUOtJ4Uut5UKgGXdAUmTeTRbYmgGeU9gC","aliases":"صلاح قابيل شهيرة محمد ثروت الكهف و الوهم و الحب"},
 {"id":"shahed","title":"شاهد ماشفش حاجة","year":"1976","kind":"مسرحية","channel":"ART أفلام","video":"ls6wDY9z6bo","aliases":"عادل إمام عمر الحريري شاهد ما شافش حاجة شاهد ما شفش حاجة"},
 {"id":"yakhour","title":"الياخور","year":"","kind":"مسرحية","channel":"حسن البلام","video":"vaslern3UYE","aliases":"قروب البلام الكويت مشاري البلام أحمد العونان"},
 {"id":"ainy","title":"عيني في عينك","year":"","kind":"مسرحية","channel":"ماسبيرو زمان","video":"Lgz8oToxQUo","aliases":"سهير البابلي فاروق الفيشاوي صلاح منصور"},
 {"id":"ajmal","title":"أجمل لقاء في العالم","year":"","kind":"مسرحية","channel":"ماسبيرو زمان","video":"9Xu8q-kCthE","aliases":"أمين الهنيدي صفاء أبو السعود"},
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

export function officialPlaylistEmbed(id){if(!/^PL[-_A-Za-z0-9]{10,80}$/.test(id||''))throw Error('Invalid official playlist');return 'https://www.youtube-nocookie.com/embed/videoseries?list='+encodeURIComponent(id)+'&playsinline=1&rel=0';}
export function officialEntryEmbed(entry){return entry.playlist?officialPlaylistEmbed(entry.playlist):officialEmbed(entry.video);}
