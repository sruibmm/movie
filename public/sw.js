// public/sw.js
const AD_DOMAINS = [
  'popads.net', 'popunder.net', 'doubleclick.net', 'googlesyndication.com',
  'adservice.google.com', 'googleadservices.com', 'pagead2.googlesyndication.com',
  'tpc.googlesyndication.com', 'adsystem.', 'adserver.', 'ads.', 'ad.',
  'track.', 'tracker.', 'tracking.', 'analytics.', 'stat.', 'counter.',
  'popunder.', 'popup.', 'pop.', 'redirect.', 'clk.', 'click.',
  'adclick.', 'adtrack.', 'advertising.', 'adnetwork.', 'adexchange.',
  'rtb.', 'bid.', 'dsp.', 'adsrvr.', 'adnxs.', 'casalemedia.com',
  'rubiconproject.com', 'openx.', 'criteo.', 'outbrain.', 'taboola.',
  'zemanta.', 'revcontent.', 'adsafeprotected.', 'doubleverify.',
  'integral-ad.', 'moat.', 'scorecardresearch.com', 'quantserve.com',
  'atdmt.', 'adbrite.', 'buysellads.', 'carbonads.', 'adroll.',
  'perfectaudience.', 'retargeter.', 'connexity.', 'nanigans.'
];

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Block ad domains
  if (AD_DOMAINS.some(domain => url.hostname.includes(domain))) {
    event.respondWith(new Response(null, { 
      status: 200,
      statusText: 'Blocked by Ad Blocker'
    }));
    console.log('🚫 Blocked ad:', url.hostname);
    return;
  }
  
  // Block popups and redirects
  if (url.pathname.match(/(popup|popunder|redirect|click|track)/i)) {
    event.respondWith(new Response(null, { 
      status: 200,
      statusText: 'Blocked popup/redirect'
    }));
    console.log('🚫 Blocked popup/redirect:', url.pathname);
    return;
  }
  
  // Normal fetch
  event.respondWith(fetch(event.request).catch(() => {
    return new Response(null, { status: 200 });
  }));
});

// Block new windows/tabs
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'BLOCK_POPUP') {
    // Prevent popup windows
    event.stopImmediatePropagation();
  }
});
