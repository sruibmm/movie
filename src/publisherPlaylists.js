import {normalizeArabic} from './arabicDiscovery.js';
export const PLAYLIST_SERIES=[
  {
    "id": "shabab-bomb",
    "title": "شباب البومب",
    "aliases": "شباب البومب شباب البومب 13 شباب البومب 12",
    "year": "2012",
    "country": "السعودية",
    "channel": "روتانا خليجية",
    "seasons": [
      {
        "season": 5,
        "year": "2016",
        "playlist": "PLp8t9oGfE4VCu_DZXbTeYfCQymlgYYILt"
      },
      {
        "season": 6,
        "year": "2017",
        "playlist": "PLp8t9oGfE4VDnFusUocDuCd63n_SOu3IN"
      },
      {
        "season": 7,
        "year": "2018",
        "playlist": "PLp8t9oGfE4VDq1bqUIxjOTckAZs4aRGEt"
      },
      {
        "season": 8,
        "year": "2019",
        "playlist": "PLp8t9oGfE4VBkqcVj_5J6IgmfSvP4Z6wV"
      },
      {
        "season": 9,
        "year": "2020",
        "playlist": "PLp8t9oGfE4VCfK031LvbBysqGdnpiHkRJ"
      },
      {
        "season": 10,
        "year": "2022",
        "playlist": "PLp8t9oGfE4VBm8elN4_uiAt2bIB_SEXIg"
      },
      {
        "season": 11,
        "year": "2023",
        "playlist": "PLp8t9oGfE4VBSES_PoP48LkCe-hxjfHwK"
      },
      {
        "season": 12,
        "year": "2024",
        "playlist": "PLp8t9oGfE4VA3BsJSJQFWbnu5_vmDoxB-"
      },
      {
        "season": 13,
        "year": "2025",
        "playlist": "PLp8t9oGfE4VAxVkR4I1jjsIFTEKlWNSmF"
      }
    ]
  },
  {
    "id": "beit-salayef",
    "title": "بيت السلايف",
    "aliases": "بيت السلايف",
    "year": "2018",
    "country": "مصر",
    "channel": "النهار دراما",
    "seasons": [
      {
        "season": 1,
        "playlist": "PLHbd0AdnzwrifGPnD0F348f_d-dXS20zV"
      }
    ]
  },
  {
    "id": "motalaqat",
    "title": "المطلقات",
    "aliases": "المطلقات",
    "year": "2015",
    "country": "مصر",
    "channel": "النهار دراما",
    "seasons": [
      {
        "season": 1,
        "playlist": "PLHbd0AdnzwrhwfQy_aWCNHLH3cl1FZsSF"
      }
    ]
  }
];
export function findPlaylistSeries(movie){const names=[movie.title,movie.name,movie.original_name,movie.seriesTitle].filter(Boolean).map(normalizeArabic);const found=PLAYLIST_SERIES.filter(g=>names.includes(normalizeArabic(g.title)));return found.length===1?found[0]:null;}
export function playlistMovie(g,s){if(!/^PL[-_A-Za-z0-9]{10,80}$/.test(s.playlist))throw Error('Invalid playlist');return {id:'youtube:'+s.playlist,title:g.title+(g.seasons.length>1?' · الموسم '+s.season:''),seriesTitle:g.title,media_type:'tv',season:s.season,isArabic:true,original_language:'ar',publisherSource:{id:s.playlist,title:g.title,publisher:g.channel,playlist:true,embed:'https://www.youtube-nocookie.com/embed/videoseries?list='+s.playlist+'&playsinline=1&rel=0',adsPossible:true,source:'https://www.youtube.com/playlist?list='+s.playlist}};}
