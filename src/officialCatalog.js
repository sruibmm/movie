import {normalizeArabic} from './arabicDiscovery.js';
import {IMPORTED_FILMS} from './publisherFilmData.js';
import {matchPublisherSeries,publisherEpisode} from './publisherSeries.js';
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
export function officialPlaylistEmbed(id){if(!/^PL[-_A-Za-z0-9]{10,80}$/.test(id||''))throw Error('Invalid official playlist');return 'https://www.youtube-nocookie.com/embed/videoseries?list='+encodeURIComponent(id)+'&playsinline=1&rel=0';}
export function officialEntryEmbed(entry){return entry.playlist?officialPlaylistEmbed(entry.playlist):officialEmbed(entry.video);}

const FIXED_NAMES={'بركة يقابل بركة كامل':'بركة يقابل بركة','الكنز الجزء الثاني كامل':'الكنز الجزء الثاني'};
const FILM_YEARS={'السلم والثعبان':'2001','اكس لارج':'2011','الساحر':'2001','بركة يقابل بركة':'2016','الكنز الجزء الثاني':'2019','عين شمس':'2008','حد سامع حاجة':'2009','حماتي بتحبني':'2014','كلم ماما':'2003','الحرب العالمية الثالثة':'2014'};
const imported=IMPORTED_FILMS.map(x=>({...x,title:FIXED_NAMES[x.title]||x.title,year:FILM_YEARS[FIXED_NAMES[x.title]||x.title]||x.year}));
const seen=new Set(OFFICIAL_CATALOG.filter(x=>x.video).map(x=>x.video));
export const PUBLISHER_FILMS=[...OFFICIAL_CATALOG.filter(x=>x.video||x.playlist),...imported.filter(x=>{if(seen.has(x.video)||OFFICIAL_CATALOG.some(y=>y.kind===x.kind&&normalizeArabic(y.title)===normalizeArabic(x.title)))return false;seen.add(x.video);return true;})];
export function matchPublisherFilm(movie){
 if(movie.media_type==='tv')return null;
 const names=new Set([movie.title,movie.original_title].filter(Boolean).map(normalizeArabic));
 const year=String(movie.release_date||'').slice(0,4);
 const found=PUBLISHER_FILMS.filter(x=>x.video&&x.kind==='فيلم'&&names.has(normalizeArabic(x.title))&&(!year||x.year===year));
 return found.length===1?found[0]:null;
}
export function findOfficialTitles(movie){
 if(movie.media_type==='tv'){const g=matchPublisherSeries(movie);const source=g&&publisherEpisode(g,movie.season,movie.episode);return source?[source]:[];}
 const x=matchPublisherFilm(movie);return x?[publisherFilmSource(x)]:[];
}
export function publisherFilmSource(x){return {id:x.video||x.playlist,title:x.title,publisher:x.channel,embed:officialEntryEmbed(x),adsPossible:true,playlist:!!x.playlist,source:x.source,duration:x.duration};}
export function importedFilm(x){
 const source=publisherFilmSource(x);
 return {id:'youtube:'+source.id,title:x.title,media_type:'movie',release_date:x.year?x.year+'-01-01':'',isArabic:true,original_language:'ar',licensedPoster:x.video?'https://i.ytimg.com/vi/'+x.video+'/hqdefault.jpg':null,publisherSource:source};
}
export function attachPublisherFilm(movie){if(movie.publisherSource||movie.media_type==='tv')return movie;const x=matchPublisherFilm(movie);return x?{...movie,publisherSource:publisherFilmSource(x)}:movie;}
