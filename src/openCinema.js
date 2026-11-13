// Open-media catalogue. A searchable Archive entry is not a playback or rights guarantee.
const media='https://storage.googleapis.com/gtv-videos-bucket/sample/';
const blender='https://studio.blender.org/films/';
export const OPEN_FILMS=[
 {key:'sita',title:'Sita Sings the Blues',year:'2008',credit:'Nina Paley',license:'https://creativecommons.org/publicdomain/zero/1.0/',page:'https://www.sitasingstheblues.com/watch.html',video:'https://archive.org/download/Sita_Sings_the_Blues/Sita_Sings_the_Blues_medium.mp4',poster:'https://archive.org/services/img/Sita_Sings_the_Blues'},
 {key:'bbb',title:'Big Buck Bunny',year:'2008',credit:'Blender Foundation',license:'https://creativecommons.org/licenses/by/3.0/',page:blender,video:media+'BigBuckBunny.mp4',poster:media+'images/BigBuckBunny.jpg'},
 {key:'sintel',title:'Sintel',year:'2010',credit:'Blender Foundation',license:'https://creativecommons.org/licenses/by/3.0/',page:blender,video:media+'Sintel.mp4',poster:media+'images/Sintel.jpg'},
 {key:'elephants',title:'Elephants Dream',year:'2006',credit:'Blender Foundation',license:'https://creativecommons.org/licenses/by/2.5/',page:blender,video:media+'ElephantsDream.mp4',poster:media+'images/ElephantsDream.jpg'},
 {key:'tears',title:'Tears of Steel',year:'2012',credit:'Blender Institute',license:'https://creativecommons.org/licenses/by/3.0/',page:blender,video:media+'TearsOfSteel.mp4',poster:media+'images/TearsOfSteel.jpg'}
];
export function normalizeTitle(v){return String(v||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();}
export function yearOf(v){return String(v||'').match(/^\d{4}/)?.[0]||'';}
// Conservative age gate for third-party uploads; modern releases must be creator-vetted seeds.
export function historicArchiveYear(v){const y=Number(yearOf(v));return y>=1890&&y<=1930;}
export function safeArchiveId(v){return typeof v==='string'&&/^[A-Za-z0-9_.-]{1,180}$/.test(v)&&!v.includes('..')&&v!=='.';}
export function openLicense(v){
 const values=Array.isArray(v)?v:[v];
 for(const value of values){
  try{
   const u=new URL(String(value));if(!['creativecommons.org','www.creativecommons.org'].includes(u.hostname))continue;
   if(!/^\/(publicdomain\/(zero|mark)\/1\.0|licenses\/(by|by-sa)\/(1\.0|2\.0|2\.5|3\.0|4\.0))(\/|$)/.test(u.pathname))continue;
   return 'https://creativecommons.org'+u.pathname;
  }catch{}
 }
 return null;
}
export function seedSource(f){return {stream_url:f.video,type:'mp4',subtitles:[],open:true,sourceName:f.credit==='Nina Paley'?'Creator / Internet Archive':'Blender Open Movies',credit:f.credit,license:f.license,sourcePage:f.page};}
export function seedMovie(f){return {id:'open:'+f.key,openKey:f.key,openCatalog:true,title:f.title,release_date:f.year+'-01-01',posterUrl:f.poster,overview:'Openly licensed film · '+f.credit};}
export function matchSeed(title,year){return OPEN_FILMS.find(f=>normalizeTitle(f.title)===normalizeTitle(title)&&f.year===String(year));}
export function seconds(v){if(typeof v==='number')return v;const a=String(v||'').split(':').map(Number);return a.length<=3&&a.every(Number.isFinite)?a.reduce((n,x)=>n*60+x,0):0;}
export function archiveSource(data,expected={}){
 const m=data?.metadata||{},id=m.identifier;
 const license=openLicense(m.licenseurl);
 if(!safeArchiveId(id)||m.mediatype!=='movies'||!license||!historicArchiveYear(m.year||m.date)||data.is_dark||m.access_restricted_item==='true'||m.access_restricted_item===true)return null;
 if(expected.title&&normalizeTitle(m.title)!==normalizeTitle(expected.title))return null;
 if(expected.year&&yearOf(m.year||m.date)!==String(expected.year))return null;
 const files=(data.files||[]).filter(f=>typeof f.name==='string'&&/\.mp4$/i.test(f.name)&&!f.name.includes('..')&&!f.private&&Number(f.size)>5000000&&!/(trailer|sample|preview|teaser)/i.test(f.name));
 const minSeconds=Number(expected.minSeconds)||0;
 const eligible=files.filter(f=>!minSeconds||seconds(f.length)>=minSeconds).sort((a,b)=>Number(b.size)-Number(a.size));
 const file=eligible[0];if(!file)return null;
 return {stream_url:'https://archive.org/download/'+encodeURIComponent(id)+'/'+file.name.split('/').map(encodeURIComponent).join('/'),type:'mp4',subtitles:[],open:true,sourceName:'Internet Archive',credit:String(m.creator||'Archive contributor').slice(0,150),license,sourcePage:'https://archive.org/details/'+encodeURIComponent(id)};
}
