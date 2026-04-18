import React, { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import Hls from 'hls.js'
import Peer from 'peerjs'

// 🔑 TMDB API Key
const TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJhOWFlNzg3NTBiNWU2MmQ0MWI4NGEyMGQ5MjU0ZDMzMSIsIm5iZiI6MTc3NjQ1ODE2OC4zMzEsInN1YiI6IjY5ZTI5OWI4YWUzYjIzZDMxMTgxOGQ4NSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.G5zxivtx0LQiueaMafbdxYdRdfvLdbDxu192vwo5nwU';

const fetchOptions = {
  method: 'GET',
  headers: { accept: 'application/json', Authorization: `Bearer ${TMDB_TOKEN}` }
};

// 🌐 Global Connection
let peer = null;
let conn = null;

// 🎲 توليد كود غرفة من 6 أرقام
const generateRoomCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// 🧮 Haversine Formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
};

// ☁️ Floating Emoji
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

// 💖 Distance Badge
function DistanceBadge({ myCoords, partnerCoords, mode }) {
  if (mode === 'single') return null;
  
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
        {distance === '...' ? "Syncing... 🛰️" : `${distance}km apart 💍`}
      </p>
    </div>
  );
}

function App() {
  const [role, setRole] = useState(null);
  const [mode, setMode] = useState('couples'); // 'single' | 'couples'
  const [movies, setMovies] = useState([]);
  const [activeMovie, setActiveMovie] = useState(null);
  const [roomMovie, setRoomMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [welcomeName, setWelcomeName] = useState('Renad');
  
  // 🌐 PeerJS + Room States
  const [roomCode, setRoomCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [roomReady, setRoomReady] = useState(false); // Admin must activate
  const [partnerCoords, setPartnerCoords] = useState(null);
  const [myCoords, setMyCoords] = useState(null);
  const [syncSettings, setSyncSettings] = useState({ fallbackServer: 0, subtitles: null });

  const habibtiNames = ['Renad ✨', 'Habibti 🥰', 'Ranood 🌹', 'Reno 💕', 'My Everything 💖'];

  useEffect(() => {
    setWelcomeName(habibtiNames[Math.floor(Math.random() * habibtiNames.length)]);
  }, []);

  // 📡 Initialize PeerJS with 6-digit code
  useEffect(() => {
    if (!role || mode === 'single') return;

    const code = generateRoomCode();
    setRoomCode(code);

    // PeerJS requires string ID, we use prefix to avoid conflicts
    peer = new Peer(`ROOM-${code}`, {
      debug: 2,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });

    peer.on('open', (id) => {
      console.log('Room code:', code);
    });

    peer.on('connection', (c) => {
      conn = c;
      setupConnection();
    });

    peer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        // Code taken, regenerate
        setRoomCode(generateRoomCode());
      }
    });

    return () => {
      if (peer) peer.destroy();
    };
  }, [role, mode]);

  const setupConnection = () => {
    conn.on('open', () => {
      setConnectionStatus('connected');
      // Send initial state from admin
      if (role === 'admin') {
        conn.send({ 
          type: 'room_state', 
          roomReady, 
          movie: roomMovie,
          settings: syncSettings 
        });
      }
      if (myCoords) {
        conn.send({ type: 'location_update', coords: myCoords });
      }
    });

    conn.on('data', (data) => handleIncomingData(data));
    conn.on('close', () => setConnectionStatus('disconnected'));
  };

  const joinRoom = () => {
    if (!inputCode || !peer) return;
    setConnectionStatus('connecting');
    conn = peer.connect(`ROOM-${inputCode}`);
    setupConnection();
  };

  const handleIncomingData = (data) => {
    switch (data.type) {
      case 'room_state':
        setRoomReady(data.roomReady);
        if (data.movie) setRoomMovie(data.movie);
        if (data.settings) setSyncSettings(data.settings);
        break;
      case 'room_ready':
        setRoomReady(data.ready);
        break;
      case 'start_party':
        setRoomMovie(data.movie);
        if (data.settings) setSyncSettings(data.settings);
        break;
      case 'end_party':
        setRoomMovie(null);
        setActiveMovie(null);
        break;
      case 'server_change':
        setSyncSettings(prev => ({ ...prev, fallbackServer: data.fallbackServer }));
        break;
      case 'video_sync':
        window.dispatchEvent(new CustomEvent('peer-video-sync', { detail: data }));
        break;
      case 'emoji':
        window.dispatchEvent(new CustomEvent('peer-emoji', { detail: data }));
        break;
      case 'location_update':
        setPartnerCoords(data.coords);
        break;
    }
  };

  // Get Location (only in couples mode)
  useEffect(() => {
    if (mode === 'single' || !("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      setMyCoords(coords);
      if (conn?.open) conn.send({ type: 'location_update', coords });
    });
  }, [mode, connectionStatus]);

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

  // Sync room ready status
  const toggleRoomReady = () => {
    const newStatus = !roomReady;
    setRoomReady(newStatus);
    if (conn?.open) {
      conn.send({ type: 'room_ready', ready: newStatus });
    }
  };

  // Sync server change
  const syncServerChange = (serverIndex) => {
    setSyncSettings(prev => ({ ...prev, fallbackServer: serverIndex }));
    if (conn?.open) {
      conn.send({ type: 'server_change', fallbackServer: serverIndex });
    }
  };

  // --- RENDER LOGIC ---

  // Mode Selection (First Screen)
  if (!mode) {
    return (
      <div className="h-screen w-full bg-[#050505] flex flex-col items-center justify-center gap-8">
        <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 italic text-center">
          Choose Your Experience
        </h1>
        <div className="flex flex-col gap-4">
          <button onClick={() => setMode('single')} className="bg-gradient-to-r from-gray-600 to-gray-800 px-10 py-5 rounded-2xl font-black text-white hover:scale-105 transition-all">
            👤 Single Mode - Watch Alone
          </button>
          <button onClick={() => setMode('couples')} className="bg-gradient-to-r from-pink-600 to-purple-600 px-10 py-5 rounded-2xl font-black text-white hover:scale-105 transition-all">
            💑 Couples Mode - Watch Together
          </button>
        </div>
      </div>
    );
  }

  // Single Mode - Direct to role selection without sync
  if (mode === 'single' && !role) {
    return (
      <div className="h-screen w-full bg-[#050505] flex flex-col items-center justify-center gap-8">
        <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 italic text-center">
          Single Mode 🎬
        </h1>
        <button onClick={() => setRole('admin')} className="bg-gradient-to-r from-blue-600 to-cyan-600 px-10 py-5 rounded-2xl font-black text-white hover:scale-105 transition-all">
          🍿 Start Watching
        </button>
        <button onClick={() => setMode(null)} className="text-gray-500 hover:text-white transition-colors">
          ← Back to Mode Selection
        </button>
      </div>
    );
  }

  // Couples Mode - Role Selection
  if (mode === 'couples' && !role) {
    return (
      <div className="h-screen w-full bg-[#050505] flex flex-col items-center justify-center gap-8">
        <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 italic text-center">
          Who is entering? 💑
        </h1>
        <div className="flex gap-6">
          <button onClick={() => setRole('admin')} className="bg-gradient-to-r from-blue-600 to-cyan-600 px-8 py-4 rounded-2xl font-black text-white hover:scale-105 transition-all">
            👨‍💻 Omar (Host)
          </button>
          <button onClick={() => setRole('guest')} className="bg-gradient-to-r from-pink-600 to-purple-600 px-8 py-4 rounded-2xl font-black text-white hover:scale-105 transition-all">
            👸 Renad (Guest)
          </button>
        </div>
        <button onClick={() => setMode(null)} className="text-gray-500 hover:text-white transition-colors mt-4">
          ← Back to Mode Selection
        </button>
      </div>
    );
  }

  // Movie Player Room
  if (roomMovie) {
    return (
      <Player 
        movie={roomMovie} 
        role={role}
        mode={mode}
        myCoords={myCoords}
        partnerCoords={partnerCoords}
        syncSettings={syncSettings}
        onServerChange={syncServerChange}
        onBack={() => {
          if (role === 'admin' && conn) conn.send({ type: 'end_party' });
          setRoomMovie(null);
          setActiveMovie(null);
        }} 
      />
    );
  }

  // Guest Connection Screen (Couples Mode Only)
  if (mode === 'couples' && role === 'guest') {
    return (
      <div className="h-screen w-full bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-5xl mb-8 animate-bounce">
          🍿
        </div>
        <h2 className="text-4xl font-black text-white mb-2">Welcome, <span className="text-pink-400">{welcomeName}</span></h2>
        
        {connectionStatus === 'disconnected' && (
          <div className="mt-8 bg-zinc-900 p-6 rounded-2xl border border-white/10 max-w-sm w-full">
            <p className="text-gray-400 mb-3 text-sm">Enter Omar's 6-Digit Room Code:</p>
            <input 
              type="number"
              maxLength={6}
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.slice(0, 6))}
              placeholder="000000" 
              className="w-full bg-black border border-white/20 rounded-xl px-4 py-4 text-white text-center text-3xl font-mono tracking-[0.5em] mb-4 focus:border-pink-500 outline-none"
            />
            <button onClick={joinRoom} className="w-full bg-pink-600 py-3 rounded-xl font-bold text-white hover:bg-pink-700">
              Join Room 📡
            </button>
          </div>
        )}
        
        {connectionStatus === 'connecting' && <p className="text-yellow-400 mt-4 animate-pulse">Connecting...</p>}
        
        {connectionStatus === 'connected' && !roomReady && (
          <div className="mt-8 text-center">
            <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-yellow-400 font-bold">Waiting for Omar to prepare the room... ⏳</p>
            <p className="text-gray-500 text-sm mt-2">He will notify you when ready!</p>
          </div>
        )}
        
        {connectionStatus === 'connected' && roomReady && (
          <div className="mt-8 text-center">
            <p className="text-green-400 text-2xl font-bold mb-2">🎉 Room is Ready!</p>
            <p className="text-gray-400">Waiting for Omar to start the movie...</p>
          </div>
        )}
      </div>
    );
  }

  // Admin Dashboard (Couples Mode)
  if (mode === 'couples' && role === 'admin' && activeMovie) {
    return <MovieDetail movie={activeMovie} onBack={() => setActiveMovie(null)} onStartParty={(movieFull) => {
      setRoomMovie(movieFull);
      if (conn?.open) {
        conn.send({ 
          type: 'start_party', 
          movie: movieFull,
          settings: syncSettings 
        });
      } else {
        alert("Wait for Renad to connect first!");
      }
    }} />;
  }

  // Admin Dashboard - Main (Couples Mode)
  if (mode === 'couples' && role === 'admin') {
    return (
      <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12 font-sans selection:bg-purple-500" dir="ltr">
        <header className="mb-14 flex flex-col md:flex-row justify-between items-center gap-8 border-b border-white/5 pb-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">💍</span>
              <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 italic">
                OMAR & RENAD CINEMA
              </h1>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></span>
              <p className="text-gray-500 text-[10px] font-mono uppercase">
                {connectionStatus === 'connected' 
                  ? (roomReady ? 'Renad is Ready ❤️' : 'Renad Connected - Waiting...') 
                  : 'Waiting for Renad...'}
              </p>
            </div>
          </div>
          
          {/* 🆔 Room Code + Ready Button */}
          <div className="flex flex-col items-end gap-4 w-full md:w-auto">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-pink-600 to-purple-600 p-0.5 rounded-xl">
                <div className="bg-black rounded-[11px] px-5 py-3 flex items-center gap-4">
                  <div className="text-center">
                    <span className="text-[10px] text-gray-500 uppercase block">Room Code</span>
                    <code className="text-2xl font-black text-white tracking-[0.3em]">{roomCode || '...'}</code>
                  </div>
                  <button 
                    onClick={() => navigator.clipboard.writeText(roomCode)}
                    className="bg-white/10 px-4 py-2 rounded-lg text-sm hover:bg-white/20 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
              
              {/* ✅ Room Ready Toggle */}
              <button 
                onClick={toggleRoomReady}
                disabled={connectionStatus !== 'connected'}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${
                  roomReady 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600 disabled:opacity-50'
                }`}
              >
                {roomReady ? '✅ Room Ready' : '🔒 Mark Ready'}
              </button>
            </div>
            
            <input 
              type="text" 
              placeholder="Search movies..." 
              className="bg-[#0a0a0a] border border-white/10 rounded-2xl px-6 py-4 w-full md:max-w-md focus:ring-1 ring-purple-500 outline-none text-sm"
              onKeyDown={e => e.key === 'Enter' && setSearch(e.target.value)}
            />
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center mt-32"><div className="w-12 h-12 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {movies.map(m => (
              <div key={m.id} onClick={() => setActiveMovie(m)} className="group cursor-pointer">
                <div className="relative aspect-[2/3] rounded-[2rem] overflow-hidden border border-white/5 group-hover:border-purple-500 bg-zinc-900">
                  <img src={`https://image.tmdb.org/t/p/w500${m.poster_path}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt={m.title} />
                </div>
                <h3 className="mt-3 text-xs font-bold text-gray-300 text-center truncate">{m.title}</h3>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Single Mode - Admin Dashboard (Simplified)
  if (mode === 'single' && activeMovie) {
    return <MovieDetail movie={activeMovie} onBack={() => setActiveMovie(null)} onStartParty={(movieFull) => {
      setRoomMovie(movieFull);
    }} />;
  }

  // Single Mode - Movie List
  if (mode === 'single' && role === 'admin') {
    return (
      <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12 font-sans selection:bg-purple-500" dir="ltr">
        <header className="mb-14 flex flex-col md:flex-row justify-between items-center gap-8 border-b border-white/5 pb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 italic">
              🎬 Single Mode
            </h1>
            <p className="text-gray-500 text-sm mt-1">Enjoy your movie!</p>
          </div>
          <input 
            type="text" 
            placeholder="Search movies..." 
            className="bg-[#0a0a0a] border border-white/10 rounded-2xl px-6 py-4 w-full md:max-w-md focus:ring-1 ring-purple-500 outline-none text-sm"
            onKeyDown={e => e.key === 'Enter' && setSearch(e.target.value)}
          />
        </header>

        {loading ? (
          <div className="flex justify-center mt-32"><div className="w-12 h-12 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {movies.map(m => (
              <div key={m.id} onClick={() => setActiveMovie(m)} className="group cursor-pointer">
                <div className="relative aspect-[2/3] rounded-[2rem] overflow-hidden border border-white/5 group-hover:border-purple-500 bg-zinc-900">
                  <img src={`https://image.tmdb.org/t/p/w500${m.poster_path}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt={m.title} />
                </div>
                <h3 className="mt-3 text-xs font-bold text-gray-300 text-center truncate">{m.title}</h3>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}

function MovieDetail({ movie, onBack, onStartParty }) {
  const [details, setDetails] = useState(null);
  useEffect(() => {
    fetch(`https://api.themoviedb.org/3/movie/${movie.id}?language=en-US`, fetchOptions)
      .then(res => res.json()).then(data => setDetails(data));
  }, [movie.id]);

  return (
    <div className="min-h-screen w-full bg-black relative flex items-center justify-center p-6 text-left overflow-hidden" dir="ltr">
      <div className="absolute inset-0 z-0">
        <img src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`} className="w-full h-full object-cover opacity-30 blur-2xl" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-[#050505]/90 to-transparent"></div>
      </div>
      <div className="z-10 max-w-6xl w-full grid md:grid-cols-[350px_1fr] gap-12 items-center">
        <div className="relative hidden md:block">
          <div className="absolute -inset-1 bg-gradient-to-br from-purple-600 to-pink-600 rounded-[3rem] blur opacity-25"></div>
          <img src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} className="rounded-[3rem] border border-white/10 relative" />
        </div>
        <div className="space-y-6">
          <h2 className="text-5xl md:text-7xl font-black text-white">{movie.title}</h2>
          <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase">
            {details?.original_language === 'ar' && <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-lg">🟢 ARABIC</span>}
            <span className="bg-purple-500/10 text-purple-400 px-3 py-1 rounded-lg">📅 {movie.release_date?.split('-')[0]}</span>
            <span className="bg-yellow-500/10 text-yellow-400 px-3 py-1 rounded-lg">⭐ {movie.vote_average?.toFixed(1)}</span>
          </div>
          <p className="text-gray-300 text-lg">{movie.overview || "No synopsis."}</p>
          <div className="flex gap-4 pt-4">
            <button onClick={() => onStartParty({ ...movie, isArabic: details?.original_language === 'ar' })} className="bg-gradient-to-r from-purple-600 to-pink-600 px-10 py-4 rounded-2xl font-black text-white">
              🍿 Start Party
            </button>
            <button onClick={onBack} className="bg-white/5 border border-white/10 px-10 py-4 rounded-2xl font-black text-white">Back</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 👑 Player Component with Full Sync
function Player({ movie, role, mode, myCoords, partnerCoords, syncSettings, onServerChange, onBack }) {
  const videoRef = useRef(null);
  const [extractionStatus, setExtractionStatus] = useState('extracting');
  const [streamData, setStreamData] = useState(null);
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const [togetherTime, setTogetherTime] = useState(0);
  
  const habibtiEmojis = ['💕', '🥰', '💖', '🍿', '🌹', '🦋', '⭐', '💍'];
  
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

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setTogetherTime(p => p + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

  // Hijack Blocker
  useEffect(() => {
    const blockRedirect = (e) => { e.preventDefault(); e.returnValue = ''; };
    const handleBlur = () => { setTimeout(() => window.focus(), 50); };
    window.addEventListener('beforeunload', blockRedirect);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('beforeunload', blockRedirect);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Extraction Logic
  useEffect(() => {
    if (movie.isArabic) { setExtractionStatus('failed'); return; }
    fetch(`https://vidlink.pro/api/movie/${movie.id}`)
      .then(res => res.json())
      .then(data => {
        if (data?.stream_url) { setStreamData(data); setExtractionStatus('success'); }
        else setExtractionStatus('failed');
      }).catch(() => setExtractionStatus('failed'));
  }, [movie.id, movie.isArabic]);

  // 🌐 PeerJS Sync Listener
  useEffect(() => {
    if (mode === 'single') return;
    
    const handler = (e) => {
      const d = e.detail;
      if (d.type === 'emoji') setFloatingEmojis(prev => [...prev, { id: Date.now()+Math.random(), char: d.emoji }]);
      if (videoRef.current && d.type === 'video_sync' && d.sender !== role) {
        if (d.action === 'play') videoRef.current.play();
        if (d.action === 'pause') videoRef.current.pause();
        if (d.action === 'seek' && Math.abs(videoRef.current.currentTime - d.time) > 2) {
          videoRef.current.currentTime = d.time;
        }
      }
    };
    window.addEventListener('peer-video-sync', handler);
    window.addEventListener('peer-emoji', handler);
    return () => {
      window.removeEventListener('peer-video-sync', handler);
      window.removeEventListener('peer-emoji', handler);
    };
  }, [role, mode]);

  // Load HLS
  useEffect(() => {
    if (extractionStatus === 'success' && streamData && videoRef.current) {
      const video = videoRef.current;
      if (Hls.isSupported()) {
        const hls = new Hls({ maxMaxBufferLength: 600 });
        hls.loadSource(streamData.stream_url);
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamData.stream_url;
      }
    }
  }, [extractionStatus, streamData]);

  // Actions
  const sendEmoji = (emoji) => {
    setFloatingEmojis(prev => [...prev, { id: Date.now(), char: emoji }]);
    if (mode === 'couples' && conn?.open) conn.send({ type: 'emoji', emoji });
  };

  const sendVideoEvent = (action) => {
    if (!videoRef.current || mode === 'single' || !conn?.open) return;
    conn.send({ type: 'video_sync', action, time: videoRef.current.currentTime, sender: role });
  };

  // Server Change Handler (Admin Only)
  const handleServerChange = (index) => {
    if (role === 'admin') {
      onServerChange(index); // This syncs to partner
    }
  };

  if (extractionStatus === 'extracting') {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-pink-400 font-bold">Preparing Room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black relative flex flex-col overflow-hidden group" dir="ltr">
      <DistanceBadge myCoords={myCoords} partnerCoords={partnerCoords} mode={mode} />
      
      {floatingEmojis.map(e => (
        <FloatingEmoji key={e.id} emojiChar={e.char} onComplete={() => setFloatingEmojis(p => p.filter(x => x.id !== e.id))} />
      ))}

      {/* Controls */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex justify-between items-center">
          <button onClick={onBack} className="bg-red-600/20 text-red-400 px-6 py-2 rounded-xl font-bold hover:bg-red-600/40">← Exit</button>
          <div className="flex items-center gap-3 bg-black/60 px-4 py-2 rounded-xl">
            <span className="text-[10px] text-pink-400 font-mono">⏱️ {formatTime(togetherTime)}</span>
            <span className="text-white text-sm font-bold hidden md:inline">{movie.title}</span>
            {mode === 'couples' && <span className="text-pink-400 text-xs">💑 Synced</span>}
          </div>
        </div>

        {/* Server Selection - Only for iframe fallback, synced in couples mode */}
        {extractionStatus === 'failed' && !movie.isArabic && (
          <div className="mt-3 flex gap-2 bg-black/60 p-2 rounded-xl overflow-x-auto">
            {fallbackNodes.map((s, i) => (
              <button 
                key={i} 
                onClick={() => handleServerChange(i)}
                className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  syncSettings.fallbackServer === i 
                    ? 'bg-pink-600 text-white' 
                    : 'bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Video */}
      <div className="flex-1 bg-[#050505]">
        {extractionStatus === 'success' ? (
          <video ref={videoRef} controls autoPlay crossOrigin="anonymous" className="w-full h-full object-contain"
            onPlay={() => sendVideoEvent('play')} onPause={() => sendVideoEvent('pause')} onSeeked={() => sendVideoEvent('seek')}>
            {streamData?.subtitles?.map((sub, i) => (
              <track key={i} kind="subtitles" src={sub.url} srcLang={sub.lang} label={sub.language} default={sub.lang.includes('ar')} />
            ))}
          </video>
        ) : movie.isArabic ? (
          <iframe src={`https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(movie.title + ' فيلم كامل')}`} className="w-full h-full border-0" allowFullScreen></iframe>
        ) : (
          <iframe 
            key={syncSettings.fallbackServer} 
            src={fallbackNodes[syncSettings.fallbackServer]?.url} 
            className="w-full h-full border-0" 
            allowFullScreen 
            allow="autoplay; encrypted-media"
          ></iframe>
        )}
      </div>

      {/* Emoji Panel - Only in couples mode */}
      {mode === 'couples' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-black/80 backdrop-blur-xl border border-pink-500/20 p-2 rounded-full flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {habibtiEmojis.map(emoji => (
            <button key={emoji} onClick={() => sendEmoji(emoji)} className="text-3xl hover:scale-125 transition-transform p-1">
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
