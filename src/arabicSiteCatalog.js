import {normalizeArabic} from './arabicDiscovery.js';
export const ARABIC_SITE_SERIES=[
  {
    "id": "mazag-kheir",
    "title": "مزاج الخير",
    "year": "2013",
    "channel": "النهار المصرية",
    "source": "https://www.dailymotion.com/playlist/x7dnt9",
    "expected": 30,
    "episodes": [
      {
        "number": 1,
        "id": "x83jkug"
      },
      {
        "number": 2,
        "id": "x83knpk"
      },
      {
        "number": 3,
        "id": "x83jkuk"
      },
      {
        "number": 4,
        "id": "x83knpv"
      },
      {
        "number": 5,
        "id": "x83knpr"
      },
      {
        "number": 6,
        "id": "x83l0p6"
      },
      {
        "number": 7,
        "id": "x83l0p3"
      },
      {
        "number": 8,
        "id": "x83jkuo"
      },
      {
        "number": 9,
        "id": "x83jkuh"
      },
      {
        "number": 10,
        "id": "x83l0p9"
      },
      {
        "number": 11,
        "id": "x83knpq"
      },
      {
        "number": 12,
        "id": "x83knpl"
      },
      {
        "number": 13,
        "id": "x83jkum"
      },
      {
        "number": 14,
        "id": "x83l0p2"
      },
      {
        "number": 15,
        "id": "x83knps"
      },
      {
        "number": 16,
        "id": "x83l0p7"
      },
      {
        "number": 17,
        "id": "x83l0p4"
      },
      {
        "number": 18,
        "id": "x83jkup"
      },
      {
        "number": 19,
        "id": "x83jkui"
      },
      {
        "number": 20,
        "id": "x83l0pa"
      },
      {
        "number": 21,
        "id": "x83l0pb"
      },
      {
        "number": 22,
        "id": "x83knpn"
      },
      {
        "number": 23,
        "id": "x83jkun"
      },
      {
        "number": 24,
        "id": "x83knpx"
      },
      {
        "number": 25,
        "id": "x83knpt"
      },
      {
        "number": 26,
        "id": "x83l0p8"
      },
      {
        "number": 27,
        "id": "x83l0p5"
      },
      {
        "number": 28,
        "id": "x83jkuq"
      },
      {
        "number": 29,
        "id": "x83jkuj"
      },
      {
        "number": 30,
        "id": "x83knpp"
      }
    ]
  },
  {
    "id": "azmi-ashgan",
    "title": "عزمي وأشجان",
    "year": "2018",
    "channel": "النهار المصرية",
    "source": "https://www.dailymotion.com/video/x6u1lld",
    "expected": 30,
    "episodes": [
      {
        "number": 1,
        "id": "x6u1lld"
      },
      {
        "number": 18,
        "id": "x6u1mon"
      },
      {
        "number": 30,
        "id": "x6u1ne9"
      }
    ]
  },
  {
    "id": "malika",
    "title": "مليكة",
    "year": "2018",
    "channel": "النهار المصرية",
    "source": "https://www.dailymotion.com/video/x6u1kiu",
    "expected": 30,
    "episodes": [
      {
        "number": 26,
        "id": "x6u1kiu"
      }
    ]
  }
];
const norm=s=>normalizeArabic(s).replace(/\s+/g,'').trim();
export const ARABIC_SITE_EPISODES=ARABIC_SITE_SERIES.reduce((n,g)=>n+g.episodes.length,0);
export function findArabicSiteSeries(movie){const names=[movie.seriesTitle,movie.title,movie.name,movie.original_name].filter(Boolean).map(norm);const year=String(movie.first_air_date||movie.release_date||'').slice(0,4);const found=ARABIC_SITE_SERIES.filter(g=>names.includes(norm(g.title))&&(!year||year===g.year));return found.length===1?found[0]:null;}
export function arabicSiteEpisode(g,number){const e=g?.episodes.find(x=>x.number===Number(number));if(!e||!/^x[a-z0-9]{5,12}$/.test(e.id))return null;return {id:e.id,provider:'dailymotion',title:g.title+' · الحلقة '+e.number,publisher:g.channel,embed:'https://geo.dailymotion.com/player.html?video='+e.id,source:'https://www.dailymotion.com/video/'+e.id,adsPossible:true};}
export function siteEpisodeMovie(g,e){const source=arabicSiteEpisode(g,e.number);if(!source)throw Error('Invalid publisher episode');return {id:'dailymotion:'+e.id,title:source.title,seriesTitle:g.title,media_type:'tv',season:1,episode:e.number,release_date:g.year+'-01-01',isArabic:true,original_language:'ar',publisherSource:source};}
export function attachArabicSiteEpisode(movie){if(movie.publisherSource||movie.media_type!=='tv'||Number(movie.season)!==1)return movie;const source=arabicSiteEpisode(findArabicSiteSeries(movie),movie.episode);return source?{...movie,publisherSource:source}:movie;}
export function isArabicMovie(movie){return !!(movie?.isArabic||movie?.original_language==='ar');}
export function approvedPublisherUrl(s){if(s?.provider==='dailymotion')return /^x[a-z0-9]{5,12}$/.test(s.id||'')?'https://geo.dailymotion.com/player.html?video='+s.id:null;if(s?.playlist&&/^PL[-_A-Za-z0-9]{10,80}$/.test(s.id||''))return 'https://www.youtube-nocookie.com/embed/videoseries?list='+s.id+'&playsinline=1&rel=0&autoplay=1';if(/^[-_A-Za-z0-9]{11}$/.test(s?.id||''))return 'https://www.youtube-nocookie.com/embed/'+s.id+'?playsinline=1&rel=0&autoplay=1';return null;}
export function allowArabicPlayback(movie){return !isArabicMovie(movie)||!!(movie.licensedSource||approvedPublisherUrl(movie.publisherSource));}
