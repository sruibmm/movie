import React from 'react';

// Web-only presentation. The TV layout and all playback/source logic stay untouched.
const tmdbImage = (path, size = 'w780') => typeof path === 'string' && path.startsWith('/')
  ? 'https://image.tmdb.org/t/p/' + size + path
  : '';
const artworkForHistory = (item, size = 'w780') => item?.licensedPoster || tmdbImage(item?.poster, size);
const yearOf = (movie) => (movie?.release_date || movie?.first_air_date || '').slice(0, 4);

export function WebCinemaHeader({ arabicLibrary, searchDraft, onSearchChange, onSubmit, onSwitchLibrary, onHistory, onTogether }) {
  return <header className="cw-header" dir="rtl">
    <div className="cw-header-inner">
      <div className="cw-header-top">
        <button type="button" className="cw-brand" onClick={() => onSwitchLibrary(false)} aria-label="Cinema - الصفحة الرئيسية">
          <span className="cw-brand-mark" aria-hidden="true">C</span><span>CINEMA<span className="cw-brand-dot">.</span></span>
        </button>
        <nav className="cw-nav" aria-label="أقسام السينما">
          <button type="button" className={!arabicLibrary ? 'cw-nav-active' : ''} aria-current={!arabicLibrary ? 'page' : undefined} onClick={() => onSwitchLibrary(false)}>عالمي</button>
          <button type="button" className={arabicLibrary ? 'cw-nav-active' : ''} aria-current={arabicLibrary ? 'page' : undefined} onClick={() => onSwitchLibrary(true)}>السينما العربية</button>
        </nav>
        <div className="cw-header-actions">
          <button type="button" className="cw-header-action" onClick={onHistory} aria-label="سجل المشاهدة"><span aria-hidden="true">◷</span><span className="cw-action-label">مشاهداتي</span></button>
          <button type="button" className="cw-header-action cw-together" onClick={onTogether} aria-label="المشاهدة المشتركة"><span aria-hidden="true">♧</span><span className="cw-action-label">مشاهدة مشتركة</span></button>
        </div>
      </div>
      <form className="cw-search" onSubmit={onSubmit} role="search">
        <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>
        <input type="search" value={searchDraft} onChange={e => onSearchChange(e.target.value)} dir="auto" autoComplete="off" enterKeyHint="search" aria-label="ابحث عن فيلم أو مسلسل" placeholder="ابحث عن فيلم، مسلسل، أو عنوان عربي وعالمي..." />
        {searchDraft && <button type="button" className="cw-search-clear" aria-label="مسح البحث" onClick={() => onSearchChange('')}>×</button>}
        <button type="submit" className="cw-search-submit">بحث</button>
      </form>
    </div>
  </header>;
}

export function WebCinemaHero({ movie, historyItem, arabicLibrary, onOpenMovie, onResume, onExplore, onSwitchLibrary }) {
  const featured = !arabicLibrary && movie?.poster_path ? movie : null;
  const recent = !featured && historyItem?.movieId ? historyItem : null;
  const title = featured?.title || recent?.title || (arabicLibrary ? 'حكايات تستاهل وقتك.' : 'ليلتك تبدأ بفيلم.');
  const description = featured?.overview || (recent
    ? 'كمّل من المكان اللي وقفت عنده. كل لحظة تستاهل تعيشها.'
    : arabicLibrary
      ? 'اكتشف الأفلام والمسلسلات والمسرحيات العربية من مكتبتك، في مكان واحد.'
      : 'اكتشف أفلامًا عالمية، اختَر قصتك القادمة، واستمتع بتجربة سينمائية من بيتك.');
  const image = featured ? (tmdbImage(featured.backdrop_path, 'w1280') || tmdbImage(featured.poster_path, 'w780')) : artworkForHistory(recent, 'w780');
  return <section className={'cw-hero' + (!image ? ' cw-hero-empty' : '')} aria-label="اكتشف سينما اليوم" dir="rtl">
    {image && <img className="cw-hero-art" src={image} alt="" fetchPriority="high" decoding="async" />}
    <div className="cw-hero-shade" />
    <div className="cw-hero-inner">
      <span className="cw-eyebrow"><span className="cw-eyebrow-line" /> CINEMA PICKS <span className="cw-eyebrow-star">✦</span></span>
      <p className="cw-hero-label">{featured ? 'اختيار مميز من الأفلام العالمية' : recent ? 'من مشاهداتك الأخيرة' : arabicLibrary ? 'مكتبتك العربية' : 'قصص من كل العالم'}</p>
      <h1>{title}</h1>
      <div className="cw-hero-meta">
        {featured && <>{yearOf(featured) && <span>{yearOf(featured)}</span>}{Number(featured.vote_average) > 0 && <span>★ {Number(featured.vote_average).toFixed(1)}</span>}<span>فيلم</span></>}
        {recent && <><span>متابعة المشاهدة</span>{Number(recent.progress) > 0 && <span>{Math.round(recent.progress)}% مكتمل</span>}</>}
        {!featured && !recent && <><span>أفلام</span><span>مسلسلات</span><span>اكتشافات جديدة</span></>}
      </div>
      <p className="cw-hero-description">{description}</p>
      <div className="cw-hero-actions">
        <button className="cw-primary" onClick={featured ? () => onOpenMovie(featured) : recent ? () => onResume(recent) : onExplore}>
          <span aria-hidden="true">▶</span> {featured ? 'اكتشف العمل' : recent ? 'أكمل المشاهدة' : 'استكشف المكتبة'}
        </button>
        <button className="cw-secondary" onClick={() => onSwitchLibrary(!arabicLibrary)}>{arabicLibrary ? 'السينما العالمية' : 'السينما العربية'} <span aria-hidden="true">↗</span></button>
      </div>
    </div>
    <span className="cw-hero-decor" aria-hidden="true">CINEMA</span>
  </section>;
}

export function WebContinueWatching({ items, onResume, onHistory }) {
  const watchable = (items || []).filter(item => item?.movieId && item?.title).slice(0, 10);
  if (!watchable.length) return null;
  return <section className="cw-continue" aria-labelledby="cw-continue-title" dir="rtl">
    <div className="cw-section-heading">
      <div><span className="cw-section-kicker">PICK UP WHERE YOU LEFT OFF</span><h2 id="cw-continue-title">أكمل المشاهدة <span className="cw-section-accent">‹</span></h2></div>
      <button onClick={onHistory} className="cw-see-all">كل مشاهداتي <span aria-hidden="true">←</span></button>
    </div>
    <div className="cw-continue-row">
      {watchable.map((item, index) => <button key={String(item.movieId) + '-' + index} className="cw-watch-card" onClick={() => onResume(item)} title={'استكمال ' + item.title}>
        <div className="cw-watch-art">
          {artworkForHistory(item) ? <img loading="lazy" decoding="async" src={artworkForHistory(item)} alt="" /> : <span className="cw-watch-empty">C</span>}
          <span className="cw-watch-play" aria-hidden="true">▶</span>
          <div className="cw-watch-progress"><span style={{ width: Math.min(100, Math.max(0, Number(item.progress) || 0)) + '%' }} /></div>
        </div>
        <strong title={item.title}>{item.title}</strong><small>{Number(item.progress) > 0 ? Math.round(item.progress) + '% تمت مشاهدته' : 'ابدأ المشاهدة'}</small>
      </button>)}
    </div>
  </section>;
}
