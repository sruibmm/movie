// Only publisher-authorized web embeds belong here. A reachable watch page
// or a working iframe is not evidence of permission to distribute a work.
// Each reviewed entry needs the exact Cinema movie/episode identity, the
// official HTTPS embed URL, permission reference, expiry and approved origin.
// Publisher-enabled public Vimeo embeds, verified in an independent iframe.
// expires is a conservative internal re-review deadline, not a claimed rights expiry.
export const APPROVED_EMBEDS=Object.freeze([
  {
    "movieId": "vimeo:66820206",
    "kind": "movie",
    "title": "الانتفاضة",
    "originalTitle": "The Uprising",
    "year": 2013,
    "category": "وثائقي طويل",
    "duration": 4746,
    "language": "العربية والإنجليزية · ترجمة إنجليزية",
    "publisher": "Things to Come · Peter Snowdon",
    "permissionRef": "https://redrice.net/The-Uprising · https://vimeo.com/66820206 · https://help.vimeo.com/hc/en-us/articles/12426275096337-Embedding-features-by-plan-type",
    "expires": "2027-02-15T00:00:00Z",
    "origin": "https://player.vimeo.com",
    "embed": "https://player.vimeo.com/video/66820206?app_id=122963",
    "adsPossible": false,
    "poster": "https://i.vimeocdn.com/video/438469034-1d9196ff519e416857b87b066b1f732360db11999bbf4626ce79e46b0df8559b-d_295x166?region=us",
    "overview": "وثائقي يجمع تسجيلات مواطنين من ست دول عربية خلال أحداث الربيع العربي.",
    "observed": {
      "checked": "2026-11-15",
      "width": 1280,
      "height": 720,
      "duration": 4745.578666666666,
      "playedSeconds": 3.690074
    }
  },
  {
    "movieId": "vimeo:86000833",
    "kind": "movie",
    "title": "لعبة العبور",
    "originalTitle": "Transit Game",
    "year": 2014,
    "category": "فيلم روائي قصير",
    "duration": 1085,
    "language": "العربية · ترجمة إنجليزية",
    "publisher": "Anna Fahr · Sepasi Films",
    "permissionRef": "https://vimeo.com/86000833 · https://help.vimeo.com/hc/en-us/articles/12426275096337-Embedding-features-by-plan-type",
    "expires": "2027-02-15T00:00:00Z",
    "origin": "https://player.vimeo.com",
    "embed": "https://player.vimeo.com/video/86000833?app_id=122963",
    "adsPossible": false,
    "poster": "https://i.vimeocdn.com/video/868053624-51473bdb13f13f92154994246651d9b2c29d9926c6a9e18003767238c0175544-d_295x166?region=us",
    "overview": "في جبال لبنان، يلتقي رجل سوري يبحث عن عائلته بطفلين فلسطينيين يواجهان بدورهما تجربة النزوح.",
    "observed": {
      "checked": "2026-11-15",
      "width": 1920,
      "height": 1080,
      "duration": 1085.375,
      "playedSeconds": 3.404412,
      "scope": "production browser"
    }
  },
  {
    "movieId": "vimeo:592766111",
    "kind": "movie",
    "title": "ذاكرة ممتلئة",
    "originalTitle": "FULL MEMORY",
    "year": 2021,
    "category": "فيلم روائي قصير",
    "duration": 761,
    "language": "العربية · ترجمة إنجليزية",
    "publisher": "Filmreakter · Adolf El Assal",
    "permissionRef": "https://vimeo.com/592766111 · https://help.vimeo.com/hc/en-us/articles/12426275096337-Embedding-features-by-plan-type",
    "expires": "2027-02-15T00:00:00Z",
    "origin": "https://player.vimeo.com",
    "embed": "https://player.vimeo.com/video/592766111?app_id=122963",
    "adsPossible": false,
    "poster": "https://i.vimeocdn.com/video/1286118875-5450a8eeafc1f452ca96ba2154d7632ea0947c8842bab825b_295x166?region=us",
    "overview": "زياد، شاب سوري يعيش في أوروبا، يستقبل شقيقه بعد سنوات من الفراق ويواجه ذكريات الماضي.",
    "observed": {
      "checked": "2026-11-15",
      "width": 1920,
      "height": 1080,
      "duration": 761.68,
      "playedSeconds": 1.385412
    }
  },
  {
    "movieId": "vimeo:981239956",
    "kind": "movie",
    "title": "القاهرة - برلين",
    "originalTitle": "CAI - BER",
    "year": 2021,
    "category": "فيلم روائي قصير",
    "duration": 1030,
    "language": "العربية · ترجمة إنجليزية",
    "publisher": "Ahmed Abdelsalam",
    "permissionRef": "https://vimeo.com/981239956 · https://help.vimeo.com/hc/en-us/articles/12426275096337-Embedding-features-by-plan-type",
    "expires": "2027-02-15T00:00:00Z",
    "origin": "https://player.vimeo.com",
    "embed": "https://player.vimeo.com/video/981239956?app_id=122963",
    "adsPossible": false,
    "poster": "https://i.vimeocdn.com/video/1896630764-9b4a1453ddfa9459891caea59cffcd7d94e9cf3f800c3a148445990df3a4aa2c-d_295x166?region=us",
    "overview": "نور، شابة مصرية، تحاول مغادرة القاهرة سراً وتواجه تحديات الساعات الأخيرة قبل سفرها.",
    "observed": {
      "checked": "2026-11-15",
      "width": 1920,
      "height": 1080,
      "duration": 1030.5417179999977,
      "playedSeconds": 10.906406
    }
  }
].map(Object.freeze));
export function approvedEmbed(movie,entries=APPROVED_EMBEDS,now=Date.now()){
 if(!movie||!Array.isArray(entries))return null;
 const id=String(movie.id||''),kind=movie.media_type;
 if(!id||!['movie','tv'].includes(kind))return null;
 const matches=entries.filter(e=>e&&e.movieId===id&&e.kind===kind&&
  (kind==='movie'||(e.season===movie.season&&e.episode===movie.episode)));
 if(matches.length!==1)return null;
 const e=matches[0];
 if(typeof e.publisher!=='string'||!e.publisher.trim()||typeof e.permissionRef!=='string'||!e.permissionRef.trim()||
  !Number.isFinite(Date.parse(e.expires))||Date.parse(e.expires)<=now)return null;
 try{
  const u=new URL(e.embed);
  if(u.protocol!=='https:'||u.username||u.password||u.origin!==e.origin||u.hash)return null;
  return {id:e.movieId,provider:'licensed-embed',publisher:e.publisher,embed:u.href,adsPossible:e.adsPossible!==false};
 }catch{return null;}
}
export function attachApprovedEmbed(movie,entries=APPROVED_EMBEDS,now=Date.now()){
 if(!movie||movie.licensedSource||movie.sourceSync||movie.publisherSource)return movie;
 const source=approvedEmbed(movie,entries,now);
 return source?{...movie,publisherSource:source}:movie;
}

// Resolve a catalog slot before attempting an unsupported direct media URL.
// Keep the original asset identity so history remains attached to the work.
export function approvedPrivateSlot(work,slot,entries=APPROVED_EMBEDS,now=Date.now()){
 if(!work?.id||!slot?.id||!['movie','tv'].includes(work.kind))return null;
 if(work.kind==='tv'&&(!Number.isSafeInteger(slot.season)||!Number.isSafeInteger(slot.episode)||slot.season<1||slot.episode<1))return null;
 const movie={id:'private:'+slot.id,title:work.kind==='tv'?work.title+' · الحلقة '+slot.episode:work.title,seriesTitle:work.title,media_type:work.kind,season:slot.season,episode:slot.episode,isArabic:true,original_language:'ar',licensedPoster:slot.thumbnail||work.poster,banner:work.banner,overview:slot.story||work.story,release_date:work.year?work.year+'-01-01':''};
 const source=approvedEmbed(movie,entries,now);
 return source?{...movie,publisherSource:source}:null;
}
