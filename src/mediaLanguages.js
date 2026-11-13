// Language preference utilities for media tracks we actually control.
const aliases={arabic:'ar',ara:'ar',ar:'ar','العربية':'ar',english:'en',eng:'en',en:'en',spanish:'es',spa:'es',es:'es',french:'fr',fra:'fr',fre:'fr',fr:'fr',korean:'ko',kor:'ko',ko:'ko',japanese:'ja',jpn:'ja',ja:'ja',german:'de',deu:'de',ger:'de',de:'de',italian:'it',ita:'it',it:'it',turkish:'tr',tur:'tr',tr:'tr',hindi:'hi',hin:'hi',hi:'hi',russian:'ru',rus:'ru',ru:'ru',chinese:'zh',zho:'zh',chi:'zh',zh:'zh',mandarin:'zh',cantonese:'yue',yue:'yue',portuguese:'pt',por:'pt',pt:'pt'};
export function languageCode(v){const a=String(v||'').trim().toLowerCase();if(!a)return '';if(aliases[a])return aliases[a];const first=a.split(/[-_ ]/)[0];if(aliases[first])return aliases[first];if(/^[a-z]{2}$/.test(first))return first;return '';}
export function trackLanguage(t){return languageCode(t?.lang)||languageCode(t?.language)||languageCode(t?.srclang)||languageCode(t?.name)||languageCode(t?.label);}
const words=t=>[t?.name,t?.label,t?.language,t?.characteristics].filter(Boolean).join(' ').toLowerCase();
const commentary=t=>/commentary|description|descriptive|audio description|director|commentaire|وصف صوتي/.test(words(t));
const original=t=>/\boriginal\b|\borig\b|originale|الأصلية/.test(words(t));
const forced=t=>t?.forced===true||/\bforced\b|\bforeign only\b/.test(words(t));
export function originalAudioIndex(tracks,lang){
 const list=Array.from(tracks||[]);const target=languageCode(lang);
 if(!target)return -1;
 const matched=list.map((t,i)=>({t,i})).filter(({t})=>trackLanguage(t)===target&&!commentary(t));
 return matched.find(({t})=>original(t))?.i??matched[0]?.i??-1;
}
export function arabicSubtitleIndex(tracks){
 const list=Array.from(tracks||[]);
 const matched=list.map((t,i)=>({t,i})).filter(({t})=>trackLanguage(t)==='ar'&&!forced(t)&&(!t.kind||['subtitles','captions'].includes(t.kind)));
 return matched[0]?.i??-1;
}
export function orderedSubtitles(tracks){
 const list=Array.isArray(tracks)?tracks:[];return list.filter(t=>typeof t?.url==='string'&&/^https:\/\//i.test(t.url)&&['ar','en'].includes(trackLanguage(t))).sort((a,b)=>Number(trackLanguage(b)==='ar')-Number(trackLanguage(a)==='ar')).map(t=>({...t,lang:trackLanguage(t),language:trackLanguage(t)==='ar'?'العربية':'English'}));
}
