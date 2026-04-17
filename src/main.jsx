import React, { useState, useEffect, useRef, useCallback } from 'react'
import ReactDOM from 'react-dom/client'
import Hls from 'hls.js'
import Peer from 'peerjs' // 🌐 للمزامنة عبر الإنترنت

// 🔑 Your TMDB API Key
const TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJhOWFlNzg3NTBiNWU2MmQ0MWI4NGEyMGQ5MjU0ZDMzMSIsIm5iZiI6MTc3NjQ1ODE2OC4zMzEsInN1YiI6IjY5ZTI5OWI4YWUzYjIzZDMxMTgxOGQ4NSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.G5zxivtx0LQiueaMafbdxYdRdfvLdbDxu192vwo5nwU';

const fetchOptions = {
  method: 'GET',
  headers: { accept: 'application/json', Authorization: `Bearer ${TMDB_TOKEN}` }
};

// 🌐 Global Peer Connection
let peer = null;
let conn = null;

// 🧮 Haversine Formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
};

// ☁️ Floating Emoji Component
function FloatingEmoji({ emojiChar, onComplete }) {
  const [visible, setVisible] = useState(false);
  const [randomX, setRandomX] = useState(0);

  useEffect(() => {
    setRandomX((Math.random() - 0.5) * 150); 
    setTimeout(() => setVisible(true), 50); 
    const timer = setTimeout(() => { onComplete(); }, 3000); 
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={`absolute bottom-24 z-[300] text-5xl transition-all duration-[3000ms] ease-out pointer-events-none
      ${visible ? 'opacity-0 translate-y-[-400px] scale-150' : 'opacity-100 translate-y-0 scale-100'}`}
      style={{ left: `calc(50% + ${randomX}px)` }}
    >
      {emojiChar}
    </div>
  );
}

// 💖 Distance Counter Badge
function DistanceBadge({ myCoords, partnerCoords }) {
  const distance = (myCoords && partnerCoords) 
    ? calculateDistance(myCoords.lat, myCoords.lon, partnerCoords.lat, partnerCoords.lon) 
    : '...';

  return (
    <div className="absolute top-6 left-6 z-[300] bg-black/40 backdrop-blur-md border border-pink-500/20 px-4 py-2 rounded-2xl shadow-[0_0_20px_rgba(236,72,153,0.15)] flex items-center gap-3">
      <div className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
      </div>
      <p className="text-pink-100 text-[10px] md:text-xs font-mono tracking-wide">
        {distance === '...' ? "Syncing Coordinates... 🛰️" : `Omar is ${distance}km away, but his heart is right here. 💍`}
      </p>
    </div>
  );
}

function App() {
  const [role, setRole] = useState(null);
  const [movies, setMovies] = useState([]);
  const [activeMovie, setActiveMovie] = useState(null);
  const [roomMovie, setRoomMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [welcomeName, setWelcomeName] = useState('Renad');
  
  // 🌐 PeerJS States
  const [myPeerId, setMyPeerId] = useState('');
  const [partnerPeerId, setPartnerPeerId] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [partnerCoords, setPartnerCoords] = useState(null);
  const [myCoords, setMyCoords] = useState(null);

  const habibtiNames = ['Renad ✨', 'Habibti 🥰', 'Ranood 🌹', 'Reno 💕', 'My Everything 💖'];

  useEffect(() => {
    setWelcomeName(habibtiNames[Math.floor(Math.random() * habibtiNames.length)]);
  }, []);

  // 📡 Initialize PeerJS
  useEffect(() => {
    if (!role) return;

    peer = new Peer(null, { debug: 2 });

    peer.on('open', (id) => {
      setMyPeerId(id);
    });

    peer.on('connection', (c) => {
      // Host receives incoming connection
      conn = c;
      setupConnection();
    });

    return () => {
      if (peer) peer.destroy();
    };
  }, [role]);

  const setupConnection = () => {
    conn.on('open', () => {
      setConnectionStatus('connected');
      // Send initial state if host
      if (role === 'admin' && roomMovie) {
        conn.send({ type: 'start_party', movie: roomMovie });
      }
      if (myCoords) {
        conn.send({ type: 'location_update', coords: myCoords });
      }
    });

    conn.on('data', (data) => {
      handleIncomingData(data);
    });

    conn.on('close', () => {
      setConnectionStatus('disconnected');
    });
  };

  const connectToPartner = () => {
    if (!partnerPeerId || !peer) return;
    setConnectionStatus('connecting');
    conn = peer.connect(partnerPeerId);
    setupConnection();
  };

  const handleIncomingData = (data) => {
    if (data.type === 'start_party') {
      setRoomMovie(data.movie);
    } else if (data.type === 'end_party') {
      setRoomMovie(null);
      setActiveMovie(null);
    } else if (data.type === 'video_sync') {
      window.dispatchEvent(new CustomEvent('peer-video-sync', { detail: data }));
    } else if (data.type === 'emoji') {
      window.dispatchEvent(new CustomEvent('peer-emoji', { detail: data }));
    } else if (data.type === 'location_update') {
      setPartnerCoords(data.coords);
    }
  };

  // Get Location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setMyCoords(coords);
        if (conn && conn.open) {
          conn.send({ type: 'location_update', coords });
        }
      });
    }
  }, []);

  // Fetch Movies (Admin Only)
  useEffect(() => {
    if (role !== 'admin') return;
    const url = search 
      ? `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(search)}&language=en-US`
      : `https://api.themoviedb.org/3/discover/movie?language=en-US&sort_by=popularity.desc&vote_count.gte=100&page=1`;

    setLoading(true);
    fetch(url, fetchOptions)
      .then(res => res.json())
      .then(data => {
        setMovies(data.results?.filter(m => m.poster_path && m.backdrop_path) || []);
        setLoading(false);
      });
  }, [search, role]);

  // --- RENDER LOGIC ---

  // Role Selection
  if (!role) {
    return (
      <div className="h-screen w-full bg-[#050505] flex flex-col items-center justify-center gap-8 selection:bg-pink-500">
        <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 italic tracking-tighter drop-shadow-2xl text-center">
          Who is entering?
        </h1>
        <div className="flex gap-6">
          <button onClick={() => setRole('admin')} className="bg-gradient-to-r from-blue-600 to-cyan-600 px-10 py-5 rounded-2xl font-black text-xl text-white hover:scale-105 transition-all shadow-xl">
            👨‍💻 Omar (Host)
          </button>
          <button onClick={() => setRole('guest')} className="bg-gradient-to-r from-pink-600 to-purple-600 px-10 py-5 rounded-2xl font-black text-xl text-white hover:scale-105 transition-all shadow-xl">
            👸 Renad (Guest)
          </button>
        </div>
      </div>
    );
  }

  // Movie Player Room
  if (roomMovie) {
    return (
      <Player 
        movie={roomMovie} 
        role={role} 
        myCoords={myCoords}
        partnerCoords={partnerCoords}
        onBack={() => {
          if (role === 'admin' && conn) conn.send({ type: 'end_party' });
          setRoomMovie(null);
          setActiveMovie(null);
        }} 
      />
    );
  }

  // Guest Connection Screen
  if (role === 'guest') {
    return (
      <div className="h-screen w-full bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-5xl mb-8 animate-bounce shadow-[0_0_50px_rgba(236,72,153,0.4)]">
          🍿
        </div>
        <h2 className="text-4xl font-black text-white mb-2">Welcome, <span className="text-pink-400">{welcomeName}</span></h2>
        
        {connectionStatus === 'disconnected' && (
          <div className="mt-8 bg-zinc-900 p-6 rounded-2xl border border-white/10 max-w-md w-full">
            <p className="text-gray-400 mb-4 text-sm">Paste Omar's Connection Code:</p>
            <input 
              type="text" 
              value={partnerPeerId}
              onChange={(e) => setPartnerPeerId(e.target.value)}
              placeholder="Enter Omar's ID..." 
              className="w-full bg-black border border-white/20 rounded-xl px-4 py-3 text-white mb-4 focus:border-pink-500 outline-none text-center font-mono"
            />
            <button 
              onClick={connectToPartner}
              className="w-full bg-pink-600 py-3 rounded-xl font-bold text-white hover:bg-pink-700 transition-all"
            >
              Connect to Room 📡
            </button>
          </div>
        )}

        {connectionStatus === 'connecting' && <p className="text-yellow-400 mt-4 animate-pulse">Connecting...</p>}
        {connectionStatus === 'connected' && <p className="text-green-400 mt-4">Connected! Waiting for movie...</p>}
      </div>
    );
  }

  // Admin Dashboard
  if (activeMovie) {
    return <MovieDetail movie={activeMovie} onBack={() => setActiveMovie(null)} onStartParty={(movieFull) => {
      setRoomMovie(movieFull);
      if (conn && conn.open) {
        conn.send({ type: 'start_party', movie: movieFull });
      } else {
        alert("Wait for Renad to connect first! Share your ID with her.");
      }
    }} />;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12 font-sans overflow-x-hidden selection:bg-purple-500" dir="ltr">
      <header className="mb-14 flex flex-col md:flex-row justify-between items-center gap-8 border-b border-white/5 pb-8">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">💍</span>
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 italic tracking-tighter drop-shadow-lg">
              OMAR & RENAD CINEMA
            </h1>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></span>
            <p className="text-gray-500 text-[10px] font-mono uppercase tracking-[0.2em]">
              {connectionStatus === 'connected' ? 'Renad is Online ❤️' : 'Waiting for Renad...'}
            </p>
          </div>
        </div>
        
        {/* 🆔 Peer ID Display */}
        <div className="flex flex-col items-end gap-4 w-full md:w-auto">
           <div className="bg-zinc-900 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-3 w-full md:w-auto justify-between">
             <div className="flex flex-col">
               <span className="text-[10px] text-gray-500 uppercase">Your Connection Code</span>
               <code className="text-pink-400 font-mono font-bold select-all text-sm">{myPeerId || 'Generating...'}</code>
             </div>
             <button 
               onClick={() => navigator.clipboard.writeText(myPeerId)}
               className="text-xs bg-white/10 px-3 py-2 rounded hover:bg-white/20 transition-colors"
             >
               Copy
             </button>
           </div>
           <input 
            type="text" 
            placeholder="Search movies..." 
            className="bg-[#0a0a0a] border border-white/10 rounded-2xl px-6 py-4 w-full md:max-w-md focus:ring-1 ring-purple-500 outline-none transition-all shadow-2xl text-sm"
            onKeyDown={e => e.key === 'Enter' && setSearch(e.target.value)}
          />
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center mt-32"><div className="w-12 h-12 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 md:gap-8 relative z-0">
          {movies.map(m => (
            <div key={m.id} onClick={() => setActiveMovie(m)} className="group cursor-pointer">
              <div className="relative aspect-[2/3] rounded-[2rem] overflow-hidden border border-white/5 group-hover:border-purple-500 transition-all duration-500 bg-zinc-900 shadow-2xl">
                <img src={`https://image.tmdb.org/t/p/w500${m.poster_path}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={m.title} />
              </div>
              <h3 className="mt-4 text-xs font-bold text-gray-300 text-center truncate group-hover:text-pink-400 transition-colors">{m.title}</h3>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MovieDetail({ movie, onBack, onStartParty }) {
  const [details, setDetails] = useState(null);

  useEffect(() => {
    fetch(`https://api.themoviedb.org/3/movie/${movie.id}?language=en-US`, fetchOptions)
      .then(res => res.json())
      .then(data => setDetails(data));
  }, [movie.id]);

  return (
    <div className="min-h-screen w-full bg-black relative flex items-center justify-center p-6 text-left overflow-hidden selection:bg-pink-500" dir="ltr">
      <div className="absolute inset-0 z-0">
        <img src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`} className="w-full h-full object-cover opacity-30 blur-2xl" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-[#050505]/90 to-transparent"></div>
      </div>
      
      <div className="z-10 max-w-6xl w-full grid md:grid-cols-[350px_1fr] gap-12 md:gap-16 items-center">
        <div className="relative hidden md:block group">
          <div className="absolute -inset-1 bg-gradient-to-br from-purple-600 to-pink-600 rounded-[3rem] blur opacity-25 group-hover:opacity-100 animate-pulse transition duration-1000"></div>
          <img src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} className="rounded-[3rem] shadow-[0_0_80px_rgba(168,85,247,0.2)] border border-white/10 relative" />
        </div>
        
        <div className="space-y-8">
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-white drop-shadow-2xl leading-tight">{movie.title}</h2>
          
          <div className="flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-widest">
            {details?.original_language === 'ar' && <span className="bg-green-500/10 text-green-400 px-4 py-2 rounded-xl border border-green-500/20">🟢 ARABIC CINEMA</span>}
            <span className="bg-purple-500/10 text-purple-400 px-4 py-2 rounded-xl border border-purple-500/20">📅 {movie.release_date?.split('-')[0]}</span>
            <span className="bg-yellow-500/10 text-yellow-400 px-4 py-2 rounded-xl border border-yellow-500/20">⭐ {movie.vote_average?.toFixed(1)}</span>
            {details && <span className="bg-pink-500/10 text-pink-400 px-4 py-2 rounded-xl border border-pink-500/20">⏱️ {details.runtime} MIN</span>}
          </div>

          <p className="text-gray-300 text-lg md:text-xl leading-relaxed max-w-3xl font-light">
            {movie.overview || "Synopsis unavailable."}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <button onClick={() => onStartParty({ ...movie, isArabic: details?.original_language === 'ar' })} className="bg-gradient-to-r from-purple-600 to-pink-600 px-12 py-5 rounded-2xl font-black text-xl text-white transition-all active:scale-95 shadow-[0_15px_40px_rgba(168,85,247,0.4)] flex items-center justify-center gap-3">
              <span className="text-2xl">🍿</span> Start Watch Party
            </button>
            <button onClick={onBack} className="bg-white/5 border border-white/10 px-12 py-5 rounded-2xl font-black text-xl text-white hover:bg-white/10 backdrop-blur-md">
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 👑 The Synchronized Watch Room
function Player({ movie, role, myCoords, partnerCoords, onBack }) {
  const videoRef = useRef(null);
  const [extractionStatus, setExtractionStatus] = useState('extracting');
  const [streamData, setStreamData] = useState(null);
  const [fallbackServer, setFallbackServer] = useState(0);
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const [togetherTime, setTogetherTime] = useState(0);
  
  const habibtiEmojis = ['💕', '🥰', '💖', '🍿', '🌹', '🦋', '⭐', '💍'];

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setTogetherTime(p => p + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTogetherTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  // Fallback Servers
  const fallbackNodes = [
    { name: "VidLink VIP", url: `https://vidlink.pro/movie/${movie.id}?primaryColor=a855f7&autoplay=false` },
    { name: "Vidsrc PM", url: `https://vidsrc.pm/embed/movie/${movie.id}` },
    { name: "Embed SU", url: `https://embed.su/embed/movie/${movie.id}` },
    { name: "AutoEmbed", url: `https://autoembed.co/movie/tmdb/${movie.id}` },
    { name: "Smashy", url: `https://player.smashy.stream/movie/${movie.id}` },
    { name: "VidBinge", url: `https://vidbinge.com/embed/movie/${movie.id}` },
    { name: "2Embed", url: `https://www.2embed.cc/embed/${movie.id}` },
    { name: "MultiMov", url: `https://multiembed.mov/directstream.php?video_id=${movie.id}&tmdb=1` },
    { name: "MoviesClub", url: `https://moviesapi.club/movie/${movie.id}` },
    { name: "Vidsrc XYZ", url: `https://vidsrc.xyz/embed/movie/${movie.id}` }
  ];

  // Hijack Blocker
  useEffect(() => {
    const blockRedirect = (e) => { e.preventDefault(); e.returnValue = ''; };
    const handleBlur = () => { setTimeout(() => window.focus(), 50); };
    window.addEventListener('beforeunload', blockRedirect);
    window.addEventListener('blur', handleBlur);
    return () => { window.removeEventListener('beforeunload', blockRedirect); window.removeEventListener('blur', handleBlur); };
  }, []);

  // Extraction Logic
  useEffect(() => {
    if (movie.isArabic) { setExtractionStatus('failed'); return; }
    fetch(`https://vidlink.pro/api/movie/${movie.id}`)
      .then(res => res.json())
      .then(data => {
        if (data?.stream_url) {
          setStreamData(data);
          setExtractionStatus('success');
        } else { setExtractionStatus('failed'); }
      }).catch(() => setExtractionStatus('failed'));
  }, [movie.id, movie.isArabic]);

  // 🌐 PeerJS Sync Listener
  useEffect(() => {
    const handlePeerSync = (e) => {
      const data = e.detail;
      if (data.type === 'emoji') {
        setFloatingEmojis(prev => [...prev, { id: Date.now() + Math.random(), char: data.emoji }]);
      }
      if (videoRef.current && data.type === 'video_sync' && data.sender !== role) {
        if (data.action === 'play') videoRef.current.play();
        if (data.action === 'pause') videoRef.current.pause();
        if (data.action === 'seek' && Math.abs(videoRef.current.currentTime - data.time) > 2) {
          videoRef.current.currentTime = data.time;
        }
      }
    };
    window.addEventListener('peer-video-sync', handlePeerSync);
    window.addEventListener('peer-emoji', handlePeerSync);
    return () => {
      window.removeEventListener('peer-video-sync', handlePeerSync);
      window.removeEventListener('peer-emoji', handlePeerSync);
    };
  }, [role]);

  // Load HLS
  useEffect(() => {
    if (extractionStatus === 'success' && streamData && videoRef.current) {
      const video = videoRef.current;
      const url = streamData.stream_url;
      if (Hls.isSupported()) {
        const hls = new Hls({ maxMaxBufferLength: 600 });
        hls.loadSource(url);
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
      }
    }
  }, [extractionStatus, streamData]);

  // Actions - Send via PeerJS
  const handleEmojiClick = (emoji) => {
    setFloatingEmojis(prev => [...prev, { id: Date.now(), char: emoji }]);
    if (conn && conn.open) conn.send({ type: 'emoji', emoji });
  };

  const handleVideoEvent = (action) => {
    if (!videoRef.current || !conn || !conn.open) return;
    conn.send({ 
      type: 'video_sync', 
      action, 
      time: videoRef.current.currentTime, 
      sender: role 
    });
  };

  if (extractionStatus === 'extracting') {
    return (
      <div className="h-screen w-full bg-black flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(236,72,153,0.4)]"></div>
        <div className="text-center">
          <h2 className="text-2xl font-black text-pink-400 tracking-widest mb-2 animate-pulse">PREPARING WATCH ROOM</h2>
          <p className="text-gray-500 text-xs font-mono uppercase">Syncing connection between Omar & Renad...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-black relative flex flex-col overflow-hidden group selection:bg-pink-500" dir="ltr">
      
      {/* 💖 Distance Badge */}
      <DistanceBadge myCoords={myCoords} partnerCoords={partnerCoords} />

      {/* ☁️ Floating Emojis */}
      {floatingEmojis.map(emoji => (
        <FloatingEmoji 
          key={emoji.id} 
          emojiChar={emoji.char} 
          onComplete={() => setFloatingEmojis(prev => prev.filter(e => e.id !== emoji.id))} 
        />
      ))}

      {/* 🎛️ Controls */}
      <div className="absolute top-0 left-0 right-0 z-[200] p-6 bg-gradient-to-b from-black via-black/80 to-transparent flex flex-col gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="flex justify-between items-center w-full">
           {role === 'admin' ? (
             <button onClick={onBack} className="bg-red-600/20 hover:bg-red-600 border border-red-600/30 text-red-500 hover:text-white px-8 py-3 rounded-xl font-bold transition-all backdrop-blur-md">
               ← Close Room
             </button>
           ) : (
             <div className="text-pink-400 font-bold px-4 py-2 bg-pink-500/10 rounded-xl">🎥 Omar's Room</div>
           )}
           
           <div className="flex items-center gap-4 bg-black/60 px-6 py-2 rounded-2xl border border-pink-500/20">
             {extractionStatus === 'success' 
               ? <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-[10px] font-bold">RAW SYNC ACTIVE</span>
               : <span className="bg-yellow-500/10 text-yellow-400 px-3 py-1 rounded-full text-[10px] font-bold">IFRAME FALLBACK</span>
             }
             <div className="text-xs text-pink-400 font-mono tracking-wider bg-white/5 px-3 py-1 rounded-lg">TIME: {formatTogetherTime(togetherTime)} ✨</div>
             <h3 className="text-white font-black text-sm hidden md:block">{movie.title}</h3>
           </div>
        </div>

        {/* Server Selection */}
        {role === 'admin' && extractionStatus === 'failed' && !movie.isArabic && (
          <div className="flex gap-2 bg-black/60 p-2 rounded-2xl border border-white/5 backdrop-blur-xl overflow-x-auto w-full hide-scrollbar snap-x">
            {fallbackNodes.map((s, i) => (
              <button 
                key={i} 
                onClick={() => setFallbackServer(i)} 
                className={`flex flex-col items-center justify-center min-w-[110px] px-3 py-2 rounded-xl transition-all snap-start ${fallbackServer === i ? 'bg-pink-600 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:text-white'}`}
              >
                <span className="text-xs font-black">S{i+1}: {s.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Video Player */}
      <div className="relative w-full h-full bg-[#050505]">
        {extractionStatus === 'success' ? (
          <video 
            ref={videoRef} 
            controls 
            autoPlay 
            crossOrigin="anonymous" 
            className="w-full h-full outline-none" 
            style={{ objectFit: 'contain' }} 
            playsInline
            onPlay={() => handleVideoEvent('play')}
            onPause={() => handleVideoEvent('pause')}
            onSeeked={() => handleVideoEvent('seek')}
          >
            {streamData?.subtitles?.map((sub, index) => (
              <track key={index} kind="subtitles" src={sub.url} srcLang={sub.lang} label={sub.language} default={sub.lang.includes('ar')} />
            ))}
          </video>
        ) : (
          movie.isArabic ? (
            <iframe src={`https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(movie.title + ' فيلم كامل')}`} className="w-full h-full border-none" allowFullScreen></iframe>
          ) : (
            <iframe key={fallbackServer} src={fallbackNodes[fallbackServer].url} className="w-full h-full border-none" allowFullScreen allow="autoplay; encrypted-media"></iframe>
          )
        )}
      </div>

      {/* 💖 Emoji Panel */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[250] bg-black/80 backdrop-blur-xl border border-pink-500/20 p-2 rounded-full flex items-center gap-1 shadow-[0_10px_40px_rgba(236,72,153,0.3)] opacity-0 group-hover:opacity-100 transition-opacity duration-700">
        {habibtiEmojis.map(emoji => (
          <button 
            key={emoji} 
            onClick={() => handleEmojiClick(emoji)}
            className="text-3xl md:text-4xl hover:scale-125 transition-transform active:scale-95 p-2 rounded-full hover:bg-pink-500/10"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);