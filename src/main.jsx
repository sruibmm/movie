import React, { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import Hls from 'hls.js'
import OpenLibrary from './OpenLibrary.jsx'
import {OPEN_FILMS,matchSeed,seedSource,yearOf} from './openCinema.js'
import Peer from 'peerjs'
import { ACTIVE_SERVER_IDS, normalizeServerId, nextServerId, pickProtectedSource } from './sourceMaintenance.js'

// 🔑 TMDB API Key
const TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJhOWFlNzg3NTBiNWU2MmQ0MWI4NGEyMGQ5MjU0ZDMzMSIsIm5iZiI6MTc3NjQ1ODE2OC4zMzEsInN1YiI6IjY5ZTI5OWI4YWUzYjIzZDMxMTgxOGQ4NSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.G5zxivtx0LQiueaMafbdxYdRdfvLdbDxu192vwo5nwU';

const fetchOptions = {
  method: 'GET',
  headers: { accept: 'application/json', Authorization: `Bearer ${TMDB_TOKEN}` }
};

// 🔐 Couples Mode Password
const COUPLES_PASSWORD = '24869';

// 🌐 Global Connection
let peer = null;
let conn = null;

// 🎲 Generate 6-digit room code
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

// 💾 History Management (localStorage)
const saveToHistory = (movie, progress, settings) => {
  try {
    const history = JSON.parse(localStorage.getItem('cinema_history') || '[]');
    const existingIndex = history.findIndex(h => h.movieId === movie.id);
    const historyItem = {
      movieId: movie.id,
      title: movie.title,
      poster: movie.poster_path,
      posterUrl: movie.posterUrl,
      openCatalog: movie.openCatalog,
      archiveId: movie.archiveId,
      openKey: movie.openKey,
      release_date: movie.release_date,
      progress: progress,
      settings: settings,
      lastWatched: Date.now(),
      isArabic: movie.isArabic
    };
    
    if (existingIndex >= 0) {
      history[existingIndex] = historyItem;
    } else {
      history.unshift(historyItem);
    }
    
    localStorage.setItem('cinema_history', JSON.stringify(history.slice(0, 50)));
  } catch (e) {
    console.error('History save error:', e);
  }
};

const getFromHistory = (movieId) => {
  try {
    const history = JSON.parse(localStorage.getItem('cinema_history') || '[]');
    return history.find(h => h.movieId === movieId);
  } catch (e) {
    return null;
  }
};

const getHistory = () => {
  try {
    return JSON.parse(localStorage.getItem('cinema_history') || '[]');
  } catch (e) {
    return [];
  }
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
      className={`absolute bottom-32 z-[300] text-5xl transition-all duration-[3000ms] ease-out pointer-events-none
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

// 📜 History Panel Component
function HistoryPanel({ onSelectMovie, onClose }) {
  const history = getHistory();

  if (history.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[1000] flex items-center justify-center p-6">
        <div className="bg-gradient-to-br from-zinc-900 to-black border border-purple-500/30 rounded-3xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-white">📜 Watch History</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">×</button>
          </div>
          <div className="text-center text-gray-400 py-12">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-lg">No watch history yet</p>
            <p className="text-sm mt-2">Start watching to build your history!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[1000] flex items-center justify-center p-6">
      <div className="bg-gradient-to-br from-zinc-900 to-black border border-purple-500/30 rounded-3xl p-8 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-white">📜 Watch History</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">×</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {history.map((item, index) => (
            <div 
              key={index}
              onClick={() => {
                onSelectMovie(item);
                onClose();
              }}
              className="group cursor-pointer bg-zinc-800/50 rounded-2xl overflow-hidden border border-white/5 hover:border-purple-500/50 transition-all"
            >
              <div className="relative aspect-[2/3]">
                <img 
                  src={item.posterUrl || `https://image.tmdb.org/t/p/w500${item.poster}`} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                  alt={item.title}
                />
                {item.progress > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                      style={{ width: `${Math.min(item.progress, 100)}%` }}
                    />
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 rounded-lg text-[10px] text-white">
                  {item.progress > 0 ? `${Math.round(item.progress)}%` : 'New'}
                </div>
              </div>
              <div className="p-3">
                <h3 className="text-xs font-bold text-white truncate">{item.title}</h3>
                <p className="text-[10px] text-gray-400 mt-1">
                  {new Date(item.lastWatched).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 🎬 Mode Selection Screen
function ModeSelection({ onSelectMode, onShowHistory }) {
  const history = getHistory();

  return (
    <div className="h-screen w-full bg-gradient-to-br from-[#0a0a0a] via-[#050505] to-[#0a0a0a] flex flex-col items-center justify-center gap-8 p-6">
      <div className="text-center space-y-4">
        <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-purple-400 italic tracking-tight">
          Welcome to Cinema
        </h1>
        <p className="text-gray-400 text-lg">Choose your viewing experience</p>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-6 mt-8">
        <button 
          onClick={() => onSelectMode('single')} 
          className="group relative bg-gradient-to-br from-gray-700 to-gray-900 p-8 rounded-3xl font-black text-white hover:scale-105 transition-all duration-300 shadow-2xl min-w-[280px] border border-white/10"
        >
          <div className="text-6xl mb-4">👤</div>
          <div className="text-2xl mb-2">Solo Mode</div>
          <div className="text-sm text-gray-400 font-normal">Watch alone, your personal cinema</div>
        </button>
        
        <button 
          onClick={() => onSelectMode('couples')} 
          className="group relative bg-gradient-to-br from-pink-600 to-purple-700 p-8 rounded-3xl font-black text-white hover:scale-105 transition-all duration-300 shadow-2xl min-w-[280px] border border-pink-400/30"
        >
          <div className="text-6xl mb-4">💑</div>
          <div className="text-2xl mb-2">Couples Mode</div>
          <div className="text-sm text-pink-200 font-normal">Watch together, share the moment</div>
        </button>
      </div>

      {history.length > 0 && (
        <button 
          onClick={onShowHistory}
          className="mt-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 px-8 py-4 rounded-2xl font-bold text-white hover:from-purple-600/30 hover:to-pink-600/30 transition-all"
        >
          📜 Continue Watching ({history.length})
        </button>
      )}
    </div>
  );
}

// 🔐 Password Modal
function PasswordModal({ onVerify, onClose }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === COUPLES_PASSWORD) {
      onVerify();
    } else {
      setError('❌ Wrong password');
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-6">
      <div className="bg-gradient-to-br from-zinc-900 to-black border border-pink-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">🔐</div>
          <h2 className="text-2xl font-black text-white mb-2">Couples Mode</h2>
          <p className="text-gray-400 text-sm">Enter password to continue</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            placeholder="Enter password..."
            className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white text-center text-xl tracking-[0.3em] focus:border-pink-500 outline-none transition-colors"
            autoFocus
          />
          
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          
          <div className="flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-bold transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white py-3 rounded-xl font-bold transition-all"
            >
              Enter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function App() {
  const [mode, setMode] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [role, setRole] = useState(null);
  const [movies, setMovies] = useState([]);
  const [activeMovie, setActiveMovie] = useState(null);
  const [roomMovie, setRoomMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [welcomeName, setWelcomeName] = useState('Renad');
  
  const [roomCode, setRoomCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [roomReady, setRoomReady] = useState(false);
  const [partnerCoords, setPartnerCoords] = useState(null);
  const [myCoords, setMyCoords] = useState(null);
  const [syncSettings, setSyncSettings] = useState({ 
    fallbackServer: 0, 
    subtitles: null,
    sandbox: true,
    progress: 0
  });

  const habibtiNames = ['Renad ✨', 'Habibti 🥰', 'Ranood 🌹', 'Reno 💕', 'My Everything 💖'];

  useEffect(() => {
    setWelcomeName(habibtiNames[Math.floor(Math.random() * habibtiNames.length)]);
  }, []);

  const handleModeSelect = (selectedMode) => {
    if (selectedMode === 'couples') {
      setShowPasswordModal(true);
    } else {
      setMode('single');
    }
  };

  const handlePasswordVerify = () => {
    setShowPasswordModal(false);
    setMode('couples');
  };

  // 📡 Initialize PeerJS
  useEffect(() => {
    if (!role || mode === 'single') return;

    const code = generateRoomCode();
    setRoomCode(code);

    peer = new Peer(`ROOM-${code}`, {
      debug: 2,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' },
          { urls: 'stun:stun.cloudflare.com:3478' },
          {
            urls: [
              "turn:global.relay.metered.ca:80",
              "turn:global.relay.metered.ca:80?transport=tcp",
              "turn:global.relay.metered.ca:443",
              "turns:global.relay.metered.ca:443?transport=tcp"
            ],
            username: "1a2cda866198f330ea4ae58e",
            credential: "zBb/R4CkvUq12bge"
          }
        ]
      }
    });

    peer.on('open', (id) => console.log('Room code:', code));
    peer.on('connection', (c) => { conn = c; setupConnection(); });
    
    // Auto-reconnect listener for the server connection
    peer.on('disconnected', () => {
      console.log('Peer disconnected from server, attempting reconnect...');
      if (peer && !peer.destroyed) peer.reconnect();
    });

    peer.on('error', (err) => {
      if (err.type === 'unavailable-id') setRoomCode(generateRoomCode());
      console.error('Peer error:', err);
    });

    return () => { if (peer) peer.destroy(); };
  }, [role, mode]);

  // 🔄 Guest Auto-Reconnect Interval
  useEffect(() => {
    let reconnectInterval;
    if (mode === 'couples' && role === 'guest' && connectionStatus === 'disconnected' && inputCode) {
      reconnectInterval = setInterval(() => {
        if (peer && !peer.destroyed) {
          if (peer.disconnected) {
            peer.reconnect();
          } else {
            console.log("Auto-reconnecting to room...");
            setConnectionStatus('connecting');
            conn = peer.connect(`ROOM-${inputCode}`, { reliable: true });
            setupConnection();
          }
        }
      }, 4000);
    }
    
    if (connectionStatus === 'connected') clearInterval(reconnectInterval);
    return () => clearInterval(reconnectInterval);
  }, [connectionStatus, role, mode, inputCode]);

  const setupConnection = () => {
    conn.on('open', () => {
      setConnectionStatus('connected');
      if (role === 'admin') {
        conn.send({ 
          type: 'room_state', 
          roomReady, 
          movie: roomMovie, 
          settings: syncSettings 
        });
      }
      if (myCoords) conn.send({ type: 'location_update', coords: myCoords });
    });
    conn.on('data', (data) => handleIncomingData(data));
    conn.on('close', () => setConnectionStatus('disconnected'));
    conn.on('error', () => setConnectionStatus('disconnected'));
  };

  const joinRoom = () => {
    if (!inputCode || !peer) return;
    setConnectionStatus('connecting');
    conn = peer.connect(`ROOM-${inputCode}`, { reliable: true });
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
      case 'sandbox_toggle':
        setSyncSettings(prev => ({ ...prev, sandbox: data.sandbox }));
        break;
      case 'progress_update':
        setSyncSettings(prev => ({ ...prev, progress: data.progress }));
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

  useEffect(() => {
    if (mode === 'single' || !("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      setMyCoords(coords);
      if (conn?.open) conn.send({ type: 'location_update', coords });
    }, (err) => console.warn('Geolocation error:', err));
  }, [mode, connectionStatus]);

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
      })
      .catch(err => { console.error('Fetch error:', err); setLoading(false); });
  }, [search, role]);

  const toggleRoomReady = () => {
    const newStatus = !roomReady;
    setRoomReady(newStatus);
    if (conn?.open) conn.send({ type: 'room_ready', ready: newStatus });
  };

  const toggleSandbox = () => {
    const newSandbox = !syncSettings.sandbox;
    setSyncSettings(prev => ({ ...prev, sandbox: newSandbox }));
    if (conn?.open) conn.send({ type: 'sandbox_toggle', sandbox: newSandbox });
  };

  const syncServerChange = (serverIndex) => {
    setSyncSettings(prev => ({ ...prev, fallbackServer: serverIndex }));
    if (conn?.open) conn.send({ type: 'server_change', fallbackServer: serverIndex });
  };

  const updateProgress = (progress) => {
    setSyncSettings(prev => ({ ...prev, progress }));
    if (conn?.open) conn.send({ type: 'progress_update', progress });
    if (roomMovie) {
      saveToHistory(roomMovie, progress, syncSettings);
    }
  };

  const startOpenFilm=(movie)=>{
    const settings={...syncSettings,fallbackServer:0,progress:getFromHistory(movie.id)?.progress||0};
    if(mode==='couples'&&!conn?.open){alert('Connect Renad first, then start the open film.');return;}
    setSyncSettings(settings);setRoomMovie(movie);
    if(mode==='couples'&&conn?.open)conn.send({type:'start_party',movie,settings});
  };

  if (showPasswordModal) {
    return <PasswordModal onVerify={handlePasswordVerify} onClose={() => setShowPasswordModal(false)} />;
  }

  if (showHistory) {
    return (
      <HistoryPanel 
        onSelectMovie={(item) => {
          setRoomMovie({
            id: item.movieId,
            title: item.title,
            poster_path: item.poster,
            posterUrl: item.posterUrl,
            openCatalog: item.openCatalog,
            archiveId: item.archiveId,
            openKey: item.openKey,
            release_date: item.release_date,
            isArabic: item.isArabic
          });
          setSyncSettings(prev => ({
            ...prev,
            fallbackServer: item.settings?.fallbackServer || 0,
            sandbox: true,
            progress: item.progress || 0
          }));
        }}
        onClose={() => setShowHistory(false)}
      />
    );
  }

  if (mode === null) {
    return <ModeSelection onSelectMode={handleModeSelect} onShowHistory={() => setShowHistory(true)} />;
  }

  if (mode === 'single' && !role) {
    return (
      <div className="h-screen w-full bg-[#050505] flex flex-col items-center justify-center gap-8 p-6">
        <div className="text-6xl mb-4">🎬</div>
        <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 italic text-center">
          Solo Mode
        </h1>
        <p className="text-gray-400">Your personal cinema experience</p>
        <button onClick={() => setRole('admin')} className="bg-gradient-to-r from-blue-600 to-cyan-600 px-12 py-5 rounded-2xl font-black text-xl text-white hover:scale-105 transition-all shadow-xl mt-4">
          🍿 Start Watching
        </button>
        <button onClick={() => setMode(null)} className="text-gray-500 hover:text-white transition-colors mt-4">
          ← Back to Mode Selection
        </button>
      </div>
    );
  }

  if (mode === 'couples' && !role) {
    return (
      <div className="h-screen w-full bg-[#050505] flex flex-col items-center justify-center gap-8 p-6">
        <div className="text-6xl mb-4">💑</div>
        <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 italic text-center">
          Couples Mode
        </h1>
        <p className="text-gray-400">Watch together with your special someone</p>
        <div className="flex flex-col sm:flex-row gap-6 mt-8">
          <button onClick={() => setRole('admin')} className="bg-gradient-to-r from-blue-600 to-cyan-600 px-10 py-5 rounded-2xl font-black text-xl text-white hover:scale-105 transition-all shadow-xl">
            👨‍ Create Room
          </button>
          <button onClick={() => setRole('guest')} className="bg-gradient-to-r from-pink-600 to-purple-600 px-10 py-5 rounded-2xl font-black text-xl text-white hover:scale-105 transition-all shadow-xl">
            👸 Join Room
          </button>
        </div>
        <button onClick={() => setMode(null)} className="text-gray-500 hover:text-white transition-colors mt-4">
          ← Back to Mode Selection
        </button>
      </div>
    );
  }

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
        onSandboxToggle={toggleSandbox}
        onProgressUpdate={updateProgress}
        onBack={() => {
          if (role === 'admin' && conn) conn.send({ type: 'end_party' });
          if (roomMovie) saveToHistory(roomMovie, syncSettings.progress, syncSettings);
          setRoomMovie(null);
          setActiveMovie(null);
        }} 
      />
    );
  }

  if (mode === 'couples' && role === 'guest') {
    return (
      <div className="h-screen w-full bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-5xl mb-8 animate-bounce shadow-[0_0_50px_rgba(236,72,153,0.4)]">
          🍿
        </div>
        <h2 className="text-4xl font-black text-white mb-2">Welcome, <span className="text-pink-400">{welcomeName}</span></h2>
        
        {connectionStatus === 'disconnected' && (
          <div className="mt-8 bg-zinc-900 p-8 rounded-3xl border border-white/10 max-w-sm w-full shadow-2xl">
            <p className="text-gray-400 mb-4 text-sm">Enter Omar's 6-Digit Room Code:</p>
            <input 
              type="text" 
              inputMode="numeric" 
              pattern="[0-9]*"
              maxLength={6}
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000" 
              className="w-full bg-black border border-white/20 rounded-xl px-4 py-4 text-white text-center text-3xl font-mono tracking-[0.5em] mb-4 focus:border-pink-500 outline-none"
            />
            <button onClick={joinRoom} className="w-full bg-gradient-to-r from-pink-600 to-purple-600 py-4 rounded-xl font-bold text-white hover:from-pink-500 hover:to-purple-500 transition-all shadow-lg">
              Join Room 📡
            </button>
          </div>
        )}
        
        {connectionStatus === 'connecting' && (
          <div className="mt-8 text-center">
            <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-yellow-400 font-bold animate-pulse">Connecting...</p>
          </div>
        )}
        
        {connectionStatus === 'connected' && !roomReady && (
          <div className="mt-8 text-center">
            <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-yellow-400 font-bold">Waiting for Omar... ⏳</p>
            <p className="text-gray-500 text-sm mt-2">He must mark the room as ready</p>
          </div>
        )}
        
        {connectionStatus === 'connected' && roomReady && (
          <div className="mt-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <p className="text-green-400 text-2xl font-bold mb-2">Room is Ready!</p>
            <p className="text-gray-400">Waiting for Omar to start the movie...</p>
          </div>
        )}
      </div>
    );
  }

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

  if (mode === 'couples' && role === 'admin') {
    return (
      <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-sans selection:bg-purple-500" dir="ltr">
        <header className="mb-8 md:mb-14 flex flex-col gap-6 border-b border-white/5 pb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-3xl">💍</span>
                <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 italic">
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
            
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 w-full md:w-auto">
              <div className="bg-gradient-to-r from-pink-600 to-purple-600 p-0.5 rounded-xl flex-1 sm:flex-none">
                <div className="bg-black rounded-[11px] px-5 py-3 flex items-center justify-between gap-3">
                  <div className="text-center flex-1">
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
              
              <button 
                onClick={toggleRoomReady}
                disabled={connectionStatus !== 'connected'}
                className={`px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
                  roomReady 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600 disabled:opacity-50'
                }`}
              >
                {roomReady ? '✅ Ready' : '🔒 Mark Ready'}
              </button>
            </div>
          </div>
          
          <input 
            type="text" 
            placeholder="Search movies..." 
            className="bg-[#0a0a0a] border border-white/10 rounded-2xl px-6 py-4 w-full focus:ring-2 ring-purple-500/50 outline-none transition-all text-base"
            onKeyDown={e => e.key === 'Enter' && setSearch(e.target.value)}
          />
        </header>

        <OpenLibrary onSelect={startOpenFilm}/>
        <h2 className="text-lg font-bold mb-4 text-gray-200">Main movie library</h2>
        {loading ? (
          <div className="flex justify-center mt-32"><div className="w-12 h-12 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
            {movies.map(m => (
              <div key={m.id} onClick={() => setActiveMovie(m)} className="group cursor-pointer">
                <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-white/5 group-hover:border-purple-500/50 transition-all bg-zinc-900 shadow-lg">
                  <img src={`https://image.tmdb.org/t/p/w500${m.poster_path}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={m.title} />
                </div>
                <h3 className="mt-3 text-xs font-bold text-gray-300 text-center truncate group-hover:text-pink-400 transition-colors">{m.title}</h3>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (mode === 'single' && activeMovie) {
    return <MovieDetail movie={activeMovie} onBack={() => setActiveMovie(null)} onStartParty={(movieFull) => setRoomMovie(movieFull)} />;
  }

  if (mode === 'single' && role === 'admin') {
    return (
      <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-sans selection:bg-purple-500" dir="ltr">
        <header className="mb-8 md:mb-14 flex flex-col gap-6 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 italic">
              🎬 Solo Mode
            </h1>
            <p className="text-gray-500 text-sm mt-1">Your personal cinema</p>
          </div>
          <input 
            type="text" 
            placeholder="Search movies..." 
            className="bg-[#0a0a0a] border border-white/10 rounded-2xl px-6 py-4 w-full focus:ring-2 ring-purple-500/50 outline-none transition-all text-base"
            onKeyDown={e => e.key === 'Enter' && setSearch(e.target.value)}
          />
        </header>

        <OpenLibrary onSelect={startOpenFilm}/>
        <h2 className="text-lg font-bold mb-4 text-gray-200">Main movie library</h2>
        {loading ? (
          <div className="flex justify-center mt-32"><div className="w-12 h-12 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
            {movies.map(m => (
              <div key={m.id} onClick={() => setActiveMovie(m)} className="group cursor-pointer">
                <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-white/5 group-hover:border-purple-500/50 transition-all bg-zinc-900 shadow-lg">
                  <img src={`https://image.tmdb.org/t/p/w500${m.poster_path}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={m.title} />
                </div>
                <h3 className="mt-3 text-xs font-bold text-gray-300 text-center truncate group-hover:text-pink-400 transition-colors">{m.title}</h3>
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
  const historyItem = getFromHistory(movie.id);
  
  useEffect(() => {
    fetch(`https://api.themoviedb.org/3/movie/${movie.id}?language=en-US`, fetchOptions)
      .then(res => res.json()).then(data => setDetails(data));
  }, [movie.id]);

  return (
    <div className="min-h-screen w-full bg-black relative flex items-center justify-center p-4 md:p-6 text-left overflow-hidden" dir="ltr">
      <div className="absolute inset-0 z-0">
        <img src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`} className="w-full h-full object-cover opacity-30 blur-2xl" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-[#050505]/90 to-transparent"></div>
      </div>
      <div className="z-10 max-w-6xl w-full grid md:grid-cols-[300px_1fr] gap-8 md:gap-12 items-center">
        <div className="relative hidden md:block">
          <div className="absolute -inset-1 bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl blur opacity-25"></div>
          <img src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} className="rounded-3xl border border-white/10 relative shadow-2xl" />
        </div>
        <div className="space-y-6">
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-tight">{movie.title}</h2>
          <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase">
            {details?.original_language === 'ar' && <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-lg">🟢 ARABIC</span>}
            <span className="bg-purple-500/10 text-purple-400 px-3 py-1 rounded-lg">📅 {movie.release_date?.split('-')[0]}</span>
            <span className="bg-yellow-500/10 text-yellow-400 px-3 py-1 rounded-lg">⭐ {movie.vote_average?.toFixed(1)}</span>
            {details && <span className="bg-pink-500/10 text-pink-400 px-3 py-1 rounded-lg">⏱️ {details.runtime} min</span>}
          </div>
          
          {historyItem && historyItem.progress > 0 && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-purple-400">📍 Continue Watching</span>
                <span className="text-xs text-purple-300">{Math.round(historyItem.progress)}% complete</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                  style={{ width: `${Math.min(historyItem.progress, 100)}%` }}
                />
              </div>
            </div>
          )}
          
          <p className="text-gray-300 text-base md:text-lg leading-relaxed">{movie.overview || "No synopsis available."}</p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button onClick={() => onStartParty({ ...movie, isArabic: details?.original_language === 'ar' })} className="bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-4 rounded-2xl font-black text-white hover:scale-105 transition-all shadow-xl">
              {historyItem?.progress > 0 ? '▶️ Resume' : '🍿 Start Watching'}
            </button>
            <button onClick={onBack} className="bg-white/5 border border-white/10 px-8 py-4 rounded-2xl font-black text-white hover:bg-white/10 transition-all">
              ← Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 👑 Player Component - iOS OPTIMIZED AD BLOCKER + MULTI-EXTRACTOR
// Per-title, per-device observations. A user report is evidence, not an ad-free guarantee.
const AD_MEMORY_KEY = 'cinema_ad_observations_v1';
function readAdMemory(movieId) {
  try { return JSON.parse(localStorage.getItem(AD_MEMORY_KEY)||'{}')[String(movieId)] || {}; }
  catch { return {}; }
}
function writeAdMemory(movieId, observations) {
  try {
    const all=JSON.parse(localStorage.getItem(AD_MEMORY_KEY)||'{}');
    delete all[String(movieId)];
    all[String(movieId)]=observations;
    const keys=Object.keys(all);
    for(const key of keys.slice(0,Math.max(0,keys.length-200))) delete all[key];
    localStorage.setItem(AD_MEMORY_KEY,JSON.stringify(all));
  } catch {}
}


function Player({ movie, role, mode, myCoords, partnerCoords, syncSettings, onServerChange, onSandboxToggle, onProgressUpdate, onBack }) {
  const videoRef = useRef(null);
  const iframeRef = useRef(null);
  const containerRef = useRef(null);
  const [extractionStatus, setExtractionStatus] = useState('extracting');
  const [streamData, setStreamData] = useState(null);
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const [togetherTime, setTogetherTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [showServerList, setShowServerList] = useState(false);
  const [compatibility, setCompatibility] = useState(false);
  const [frameRevision, setFrameRevision] = useState(0);
  const [showPlaybackHelp, setShowPlaybackHelp] = useState(false);
  const [localServer, setLocalServer] = useState(null);
  const [adMemory, setAdMemory] = useState(()=>readAdMemory(movie.id));
  const [adNotice, setAdNotice] = useState('');
  const [exhausted, setExhausted] = useState(false);
  const preferredInitialized = useRef(false);
  const [ownedUrl, setOwnedUrl] = useState('');
  const [ownedError, setOwnedError] = useState('');
  const [ownedSource, setOwnedSource] = useState(null);
  const [nativeError, setNativeError] = useState('');
  const [directOnly, setDirectOnly] = useState(Boolean(movie.openCatalog));
  const [localCaption,setLocalCaption]=useState(null);
  const [captionError,setCaptionError]=useState('');
  useEffect(()=>()=>{if(localCaption)URL.revokeObjectURL(localCaption);},[localCaption]);
  const addLocalCaption=async(file)=>{if(!file)return;try{if(file.size>2*1024*1024)throw Error('Subtitle file too large');let t=(await file.text()).replace(/^\uFEFF/,'');if(!/^WEBVTT(?:\s|$)/.test(t))t='WEBVTT\n\n'+t.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g,'$1.$2');setLocalCaption(URL.createObjectURL(new Blob([t],{type:'text/vtt'})));setCaptionError('');}catch{setCaptionError('Choose a valid SRT or VTT file.');}};
  const [playState, setPlayState] = useState('Preparing');
  const [mediaInfo, setMediaInfo] = useState({time:0,duration:0});
  const [quality, setQuality] = useState(-1);
  const [levels, setLevels] = useState([]);
  const hlsRef = useRef(null);
  const remoteAction = useRef(0);
  const progressReportedAt = useRef(0);
  const publishProgress = (time,duration,force=false)=>{
    if(!Number.isFinite(time)||!Number.isFinite(duration)||duration<=0||time<0)return;
    const percent=Math.max(0,Math.min(100,time/duration*100));
    setMediaInfo({time,duration});setVideoProgress(percent);
    if(force||Date.now()-progressReportedAt.current>4000){
      progressReportedAt.current=Date.now();onProgressUpdate(percent);
    }
  };
  const requestedServer = localServer ?? syncSettings.fallbackServer ?? 0;
  const currentServer = normalizeServerId(requestedServer);
  useEffect(()=>{
    if(Number(requestedServer)===currentServer)return;
    if(role==='admin'){setLocalServer(null);onServerChange(currentServer);}
    else setLocalServer(currentServer);
  },[requestedServer,currentServer,role]);
  const nativeSource = ownedSource || (extractionStatus === 'success' ? streamData : null);
  const isNative = Boolean(nativeSource);
  const frameProtected = !compatibility;
  const rememberSource = (status) => {
    const next={...adMemory,[currentServer]:{status,at:Date.now()}};
    setAdMemory(next);
    writeAdMemory(movie.id,next);
    return next;
  };
  useEffect(() => { setCompatibility(false); setShowPlaybackHelp(false); }, [movie.id, currentServer]);
  const [videoProgress, setVideoProgress] = useState(syncSettings.progress || 0);
  // VidLink's documented playback events, not iframe onload, establish playback progress.
  useEffect(()=>{
    if(isNative||movie.isArabic||currentServer!==0||directOnly||exhausted)return;
    const handle=(e)=>{
      if(e.origin!=='https://vidlink.pro'||e.source!==iframeRef.current?.contentWindow)return;
      const d=e.data?.type==='PLAYER_EVENT'?e.data.data:null;
      if(!d||String(d.mtmdbId)!==String(movie.id)||d.mediaType!=='movie')return;
      if(!['play','pause','seeked','ended','timeupdate'].includes(d.event))return;
      publishProgress(d.currentTime,d.duration,d.event==='ended'||d.event==='pause');
      if(d.event==='play')setPlayState('Playing');
      if(d.event==='pause')setPlayState('Paused');
      if(d.event==='ended')setPlayState('Finished');
      if(d.event==='timeupdate')setPlayState('Playing');
    };
    window.addEventListener('message',handle);return()=>window.removeEventListener('message',handle);
  },[movie.id,movie.isArabic,currentServer,isNative,directOnly,exhausted,frameRevision]);
  useEffect(()=>{setPlayState('Preparing');setMediaInfo({time:0,duration:0});},[movie.id,currentServer,frameRevision,isNative]);
  
  // 🛡️ State للدرع المانع للإعلانات (يمتص أول نقرتين)
  
  const habibtiEmojis = ['💕', '', '💖', '🍿', '🌹', '🦋', '⭐', '💍'];
  
  const fallbackNodes = [
    { name: "VidLink VIP", health: "Docs confirmed", url: `https://vidlink.pro/movie/${movie.id}?primaryColor=a855f7&autoplay=false` },
    { name: "Vidsrc PM", health: "Retired", retired: true, url: null },
    { name: "Embed SU", health: "HTTP 502 at audit", url: `https://embed.su/embed/movie/${movie.id}` },
    { name: "AutoEmbed", health: "Docs confirmed", url: `https://autoembed.co/movie/tmdb/${movie.id}` },
    { name: "Smashy", health: "Unverified", url: `https://player.smashy.stream/movie/${movie.id}` },
    { name: "VidBinge", health: "Unverified", url: `https://vidbinge.com/embed/movie/${movie.id}` },
    { name: "2Embed", health: "Unverified", url: `https://www.2embed.cc/embed/${movie.id}` },
    { name: "MultiMov", health: "Unverified", url: `https://multiembed.mov/directstream.php?video_id=${movie.id}&tmdb=1` },
    { name: "MoviesClub", health: "Domain mismatch in docs", url: `https://moviesapi.club/movie/${movie.id}` },
    { name: "Vidsrc XYZ", health: "Retired", retired: true, url: null }
  ];
  // Start with a previously reported clean protected source when one exists.
  // Never interpret iframe onload as video playback or a clean result.
  useEffect(()=>{
    if(extractionStatus!=='failed'||movie.isArabic||preferredInitialized.current) return;
    preferredInitialized.current=true;
    const known=readAdMemory(movie.id);
    const preferred=pickProtectedSource(known,fallbackNodes.length);
    const currentStatus=known[currentServer]?.status;
    if(preferred!==null && (known[preferred]?.status==='clean'||['ad','blocked'].includes(currentStatus))) {
      if(role==='admin') onServerChange(preferred);
      else setLocalServer(preferred);
    } else if(preferred===null) {
      setExhausted(true);
      setAdNotice('No other protected source remains for this title.');
    }
  },[extractionStatus,movie.id,movie.isArabic]);
  const reportPlaybackIssue = (status) => {
    const next=rememberSource(status);
    setCompatibility(false);
    setShowPlaybackHelp(false);
    const preferred=movie.isArabic?null:pickProtectedSource(next,fallbackNodes.length,currentServer);
    if(preferred===null) {
      setExhausted(true);
      setAdNotice('No other protected source remains. The external player is stopped.');
      return;
    }
    setExhausted(false);
    setAdNotice(status==='ad'?'Ad reported. Trying another protected source.':'Protection rejected. Trying another protected source.');
    handleServerChange(preferred);
  };


  useEffect(() => {
    const timer = setInterval(() => setTogetherTime(p => p + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && Number.isFinite(videoRef.current.duration) && videoRef.current.duration > 0) {
        const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
        setVideoProgress(progress);
        onProgressUpdate(progress);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

  useEffect(() => {
    let timeout;
    const resetTimer = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowControls(false), 4000);
    };
    
    window.addEventListener('mousemove', resetTimer, { passive: true });
    window.addEventListener('touchstart', resetTimer, { passive: true });
    window.addEventListener('click', resetTimer, { passive: true });
    
    return () => { 
      window.removeEventListener('mousemove', resetTimer); 
      window.removeEventListener('touchstart', resetTimer);
      window.removeEventListener('click', resetTimer);
      clearTimeout(timeout);
    };
  }, []);

  // Embedded third-party documents are isolated by the browser sandbox below.
  // This does not remove advertising rendered inside a cross-origin frame.
  // Bound existing requests; never let a slow provider freeze the player.
  useEffect(() => {
    let cancelled=false;
    const controller=new AbortController();
    const timedFetch=async(url,options={},ms=6500)=>{
      const local=new AbortController();
      const stop=()=>local.abort();
      controller.signal.addEventListener('abort',stop,{once:true});
      const timer=setTimeout(stop,ms);
      try {return await fetch(url,{...options,signal:local.signal});}
      finally{clearTimeout(timer);controller.signal.removeEventListener('abort',stop);}
    };
    const fetchRawStream = async () => {
      setExtractionStatus('extracting');
      setStreamData(null);
      // First priority: known creator releases, then rights-labelled Archive metadata.
      const seed=OPEN_FILMS.find(f=>f.key===movie.openKey)||matchSeed(movie.title,yearOf(movie.release_date));
      if(seed){if(!cancelled){setStreamData(seedSource(seed));setExtractionStatus('success');}return;}
      try{
        const year=yearOf(movie.release_date);
        if(movie.archiveId||(movie.title&&year)){
          const params=new URLSearchParams({action:'resolve',q:movie.title||'',year,runtime:String(movie.runtime||'')});
          if(movie.archiveId)params.set('id',movie.archiveId);
          const response=await timedFetch('/api/open-cinema?'+params,{},9500);
          if(response.ok){const result=await response.json();
            if(cancelled)return;
            if(result.source?.open&&result.source.stream_url){setStreamData(result.source);setExtractionStatus('success');return;}
          }
        }
      }catch{}
      if(cancelled)return;
      if(movie.openCatalog){setExtractionStatus('failed');return;}
      let imdbId = null;
      // 1. جلب الـ IMDB ID (نحتاجه إذا أردت استخدام سيرفر أكوام الخاص بك مستقبلاً)
      try {
        const idRes = movie.isArabic ? await timedFetch(`https://api.themoviedb.org/3/movie/${movie.id}/external_ids`, fetchOptions) : null;
        if (idRes?.ok) {
          const idData = await idRes.json();
          imdbId = idData.imdb_id;
        }
      } catch (err) {
        console.warn("Failed to fetch IMDB ID");
      }

      const extractors = [];
      // 🛠️ هذا هو الرابط الذي ستغيره عندما تنتهي من رفع سيرفر أكوام على Render
      const OMAR_AKWAM_API = 'https://omar-akwam.onrender.com';

      if (movie.isArabic) {
        if (imdbId) {
          // الخطة أ للفيلم العربي: استخدام سيرفر أكوام الخاص بك (المبني على Stremio-akwam)
          extractors.push(`${OMAR_AKWAM_API}/stream/movie/${imdbId}.json`);
        }
      } else {
        // الخطة أ للفيلم الأجنبي: أفضل واجهات الاستخراج النظيفة عالمياً
        extractors.push(`https://vidlink.pro/api/movie/${movie.id}`);
        extractors.push(`https://vidsrc.pro/api/movie/${movie.id}`);
      }

      // 2. محرك البحث (يختبر السيرفرات واحداً تلو الآخر)
      for (const url of extractors) {
        try {
          if(cancelled)return;
          const res = await timedFetch(url);
          if (!res.ok) continue; // فشل هذا السيرفر؟ أكمل للتالي
          
          const data = await res.json();
          if(cancelled)return;
          
          // أ) معالجة ردود الـ Stremio Protocols (كسيرفر أكوام الذي سترفعه)
          if (data && data.streams && data.streams.length > 0) {
            const bestStream = data.streams[0];
            if (bestStream && bestStream.url) {
              setStreamData({
                stream_url: bestStream.url,
                subtitles: [] // الروابط العربية غالباً مدمجة
              });
              setExtractionStatus('success');
              return; // وجدنا الرابط! نوقف البحث
            }
          }
          // ب) معالجة ردود الـ APIs النظيفة (Vidlink/Vidsrc)
          else if (data && data.stream_url) {
            const cleanSubtitles = data.subtitles?.filter(sub => 
              sub.lang?.includes('ar') || sub.language?.toLowerCase().includes('arabic') ||
              sub.lang?.includes('en') || sub.language?.toLowerCase().includes('english')
            ) || [];

            setStreamData({
              stream_url: data.stream_url,
              subtitles: cleanSubtitles
            });
            setExtractionStatus('success');
            return; // وجدنا الرابط! نوقف البحث
          }
        } catch (err) {
          console.warn(`Extractor ${url} failed, trying next...`);
        }
      }

      // 3. إذا فشلت كل السيرفرات النظيفة (أو إذا كان الفيلم عربي ولم تجهز سيرفرك بعد)
      console.log("All raw extractors failed. Falling back to iframes.");
      if(!cancelled)setExtractionStatus('failed');
    };

    fetchRawStream();
    return()=>{cancelled=true;controller.abort();};
  }, [movie.id, movie.isArabic, movie.archiveId, movie.openKey, movie.release_date]);

  useEffect(() => {
    if (mode === 'single') return;
    const handler = (e) => {
      const d = e.detail;
      if (d.type === 'emoji') setFloatingEmojis(prev => [...prev, { id: Date.now()+Math.random(), char: d.emoji }]);
      if (videoRef.current && d.type === 'video_sync' && d.sender !== role) {
        if(!['play','pause','seek'].includes(d.action))return;
        remoteAction.current=Date.now()+1000;
        if (d.action === 'play') videoRef.current.play().catch(()=>{});
        if (d.action === 'pause') videoRef.current.pause();
        if (d.action === 'seek' && Number.isFinite(d.time) && d.time>=0 && Math.abs(videoRef.current.currentTime - d.time) > 2) {
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

  useEffect(() => {
    const video=videoRef.current;
    if(!nativeSource || !video) return;
    setNativeError('');setQuality(-1);setLevels([]);setPlayState('Preparing');
    const url=nativeSource.stream_url;
    let hls;
    const fail=()=> {
      if(ownedSource || movie.openCatalog || nativeSource.open) setNativeError('This direct file could not be loaded. The open source is currently unavailable or incompatible.');
      else setExtractionStatus('failed');
    };
    video.addEventListener('error',fail);
    const isMp4=nativeSource.type==='mp4'||/\.mp4(?:[?#]|$)/i.test(url);
    if(isMp4 || video.canPlayType('application/vnd.apple.mpegurl')) video.src=url;
    else if(Hls.isSupported()) {
      hls=new Hls({maxBufferLength:30,maxMaxBufferLength:60,enableWorker:true});
      hlsRef.current=hls;
      hls.on(Hls.Events.MANIFEST_PARSED,()=>setLevels(hls.levels.map((l,i)=>({id:i,height:l.height||0,bitrate:l.bitrate||0}))));
      hls.loadSource(url);hls.attachMedia(video);
      hls.on(Hls.Events.ERROR,(_event,data)=>{if(data.fatal)fail();});
    } else fail();
    return()=>{video.removeEventListener('error',fail);hls?.destroy();hlsRef.current=null;video.pause();video.removeAttribute('src');video.load();};
  }, [nativeSource,ownedSource]);

  const enableCompatibility=()=>{
    setExhausted(false);
    setCompatibility(true);
    setShowPlaybackHelp(false);
    setFrameRevision(v=>v+1);
  };
  const restoreProtection=()=>{
    setExhausted(false);
    setCompatibility(false);
    setFrameRevision(v=>v+1);
    setShowPlaybackHelp(false);
  };
  const openOwned=()=>{
    try {
      const url=new URL(ownedUrl.trim());
      if(url.protocol!=='https:') throw Error('HTTPS required');
      setOwnedSource({stream_url:url.href,subtitles:[],type:/\.mp4(?:[?#]|$)/i.test(url.href)?'mp4':'hls'});
      setOwnedError('');setShowPlaybackHelp(false);
    } catch {setOwnedError('Enter a valid HTTPS MP4 or HLS URL you are authorized to use.');}
  };

  const sendEmoji = (emoji) => {
    setFloatingEmojis(prev => [...prev, { id: Date.now(), char: emoji }]);
    if (mode === 'couples' && conn?.open) conn.send({ type: 'emoji', emoji });
  };

  const sendVideoEvent = (action) => {
    if (!videoRef.current || mode === 'single' || !conn?.open || Date.now()<remoteAction.current) return;
    conn.send({ type: 'video_sync', action, time: videoRef.current.currentTime, sender: role });
  };

  const handleServerChange = (index) => {
    if(!ACTIVE_SERVER_IDS.includes(index))return;
    setCompatibility(false);
    setExhausted(false);
    setOwnedSource(null);
    if (role === 'admin') { setLocalServer(null); onServerChange(index); }
    else setLocalServer(index);
    setShowServerList(false);
    setFrameRevision(v=>v+1);
  };

  if (extractionStatus === 'extracting') {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-pink-400 font-bold">Preparing Room...</p>
          <button onClick={onBack} className="mt-5 px-4 py-2 bg-white/10 rounded-xl text-white">← Back</button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="min-h-[100dvh] h-[100dvh] bg-black relative flex flex-col overflow-hidden" 
      dir="ltr" 
      data-cinema-player="true"
    >
      <DistanceBadge myCoords={myCoords} partnerCoords={partnerCoords} mode={mode} />
      
      {floatingEmojis.map(e => (
        <FloatingEmoji key={e.id} emojiChar={e.char} onComplete={() => setFloatingEmojis(p => p.filter(x => x.id !== e.id))} />
      ))}

      {/* Persistent player controls: outside the cross-origin frame */}
      <header className="relative shrink-0 z-[200] bg-gradient-to-r from-zinc-950 via-purple-950/60 to-zinc-950 border-b border-purple-400/20 px-3 py-3 text-white">
        <div className="flex items-center justify-between gap-2">
          <button onClick={onBack} className="bg-white/10 rounded-lg px-3 py-2 text-sm">← Exit</button>
          <div className="flex-1 min-w-0 text-center"><p className="truncate font-bold text-sm">{movie.title}</p><p className="text-[10px] text-gray-400">{nativeSource?.open?'Open source · '+nativeSource.sourceName:isNative?'Direct player':frameProtected?'Protected embed':'Compatibility • ads possible'}</p></div>
          <button onClick={()=>setShowPlaybackHelp(v=>!v)} className="bg-purple-600 px-3 py-2 rounded-lg text-xs font-bold" aria-expanded={showPlaybackHelp}>⚙ Playback</button>
        </div>
        <div className="flex items-center justify-between gap-2 mt-3">
          <div className="flex items-center gap-2 min-w-0"><span className="w-2 h-2 rounded-full bg-purple-400"/><span className="text-xs text-gray-300 truncate">{playState}{mediaInfo.duration>0?' · '+formatTime(Math.floor(mediaInfo.time))+' / '+formatTime(Math.floor(mediaInfo.duration)):''}</span></div>
          {!movie.openCatalog&&<button onClick={()=>setDirectOnly(v=>!v)} aria-pressed={directOnly} className={`rounded-full px-3 py-1.5 text-xs font-bold border ${directOnly?'bg-purple-600 border-purple-400':'bg-white/5 border-white/15'}`}>{directOnly?'Direct only: ON':'Direct only: OFF'}</button>}
        </div>
        {nativeSource?.open&&<div className="flex flex-wrap gap-2 mt-2 items-center text-[10px] text-purple-200"><a href={nativeSource.sourcePage} target="_blank" rel="noreferrer">Source · {nativeSource.credit}</a><a href={nativeSource.license} target="_blank" rel="noreferrer" className="underline">License</a><label className="ml-auto cursor-pointer bg-white/10 rounded px-2 py-1">CC + Arabic SRT/VTT<input type="file" accept=".srt,.vtt" className="hidden" onChange={e=>addLocalCaption(e.target.files?.[0])}/></label>{captionError&&<span>{captionError}</span>}</div>}
        {isNative&&levels.length>1&&<div className="flex items-center gap-2 mt-2"><label className="text-xs text-gray-300" htmlFor="cinema-quality">Quality</label><select id="cinema-quality" value={quality} onChange={e=>{const v=Number(e.target.value);setQuality(v);if(hlsRef.current)hlsRef.current.currentLevel=v;}} className="bg-zinc-800 text-white rounded-lg px-2 py-1 text-xs"><option value={-1}>Auto</option>{levels.map(l=><option key={l.id} value={l.id}>{l.height?l.height+'p':Math.round(l.bitrate/1000)+' kbps'}</option>)}</select></div>}
        {!isNative && !directOnly && <div className="flex gap-2 mt-2 items-center overflow-x-auto pb-1">
          <button onClick={()=>reportPlaybackIssue('ad')} className="text-xs bg-pink-700 px-3 py-2 rounded-lg font-bold">Ad? Switch</button>
          <button onClick={()=>reportPlaybackIssue('blocked')} className="text-xs bg-white/10 px-3 py-2 rounded-lg">Not playing?</button>
          {!movie.isArabic && <button onClick={()=>{setShowServerList(v=>!v);setShowPlaybackHelp(false);}} className="text-xs bg-white/10 px-3 py-2 rounded-lg">Server: {fallbackNodes[currentServer]?.name||'Choose'}</button>}
          <button onClick={()=>{setExhausted(false);setFrameRevision(v=>v+1);}} className="text-xs bg-white/10 px-3 py-2 rounded-lg">↻ Reload</button>
          {frameProtected&&!exhausted&&<button onClick={()=>{rememberSource('clean');setAdNotice('Clean source remembered for this title on this device.');}} className="text-xs bg-green-900 px-3 py-2 rounded-lg">No ads ✓</button>}
        </div>}
        {adNotice&&<p role="status" className="text-xs text-pink-200 mt-2">{adNotice}</p>}
        {showServerList && !movie.isArabic && <div className="flex gap-2 overflow-x-auto mt-3 pb-1">
          {ACTIVE_SERVER_IDS.map(i=>{const node=fallbackNodes[i];return <button key={i} onClick={()=>handleServerChange(i)} className={`shrink-0 text-left px-3 py-2 rounded-lg ${i===currentServer?'bg-pink-600':'bg-white/10'}`}><span className="block text-xs font-semibold">{node.name}{adMemory[i]?.status==='clean'?' · reported clean':adMemory[i]?.status==='ad'?' · ad':adMemory[i]?.status==='blocked'?' · blocked':''}</span><span className="block text-[10px] opacity-80">{node.health}</span></button>;})}
        </div>}
        {showPlaybackHelp && <div className="mt-3 p-3 rounded-xl border border-white/10 bg-zinc-900 space-y-3">
          <p className="text-sm font-bold">Cinema playback settings</p><p className="text-xs text-purple-200">Direct only never loads external player pages. It cannot guarantee that the video itself has no ads.</p>
          <p className="text-xs text-gray-400">Source audit: 13 Nov 2026. Two retired domains are disabled. Documentation availability does not certify video playback or ad-free playback.</p>
          <p className="text-xs text-gray-300">Ad? Switch and Not playing? skip sources you report as ad-bearing or blocked. Clean reports are saved on this device for this title. Compatibility is unprotected and may show ads or redirects.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={restoreProtection} className="text-xs bg-green-700 px-3 py-2 rounded-lg">Protected mode</button>
            {!isNative && !movie.isArabic && !movie.openCatalog && <button onClick={()=>handleServerChange(nextServerId(currentServer))} className="text-xs bg-purple-700 px-3 py-2 rounded-lg">Try next server</button>}
            {!isNative && !movie.openCatalog && <button onClick={enableCompatibility} className="text-xs bg-amber-900 px-3 py-2 rounded-lg">Use compatibility (ads possible)</button>}
            {ownedSource && <button onClick={()=>{setOwnedSource(null);setNativeError('');}} className="text-xs bg-white/10 px-3 py-2 rounded-lg">Return to original source</button>}
          </div>
          <details className="text-xs text-gray-300">
            <summary className="cursor-pointer">Optional: clean direct video</summary>
            <p className="mt-2">Use a licensed or owned HTTPS MP4/HLS source. No third-party iframe. This source is local to this device.</p>
            <div className="flex gap-2 mt-2"><input type="url" value={ownedUrl} onChange={e=>setOwnedUrl(e.target.value)} placeholder="https://…/video.mp4" className="min-w-0 flex-1 bg-black border border-white/20 rounded-lg px-2 py-2 text-white"/><button onClick={openOwned} className="bg-pink-600 px-3 rounded-lg">Play</button></div>
            {ownedError&&<p className="text-red-300 mt-2">{ownedError}</p>}
          </details>
          <a href={`https://www.themoviedb.org/movie/${movie.id}/watch`} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-300 underline">Find official streaming options</a>
        </div>}
      </header>

      {/* Video Container */}
      <div className="flex-1 min-h-0 bg-[#050505] relative" style={{ zIndex: 1 }}>
        {isNative ? (
          <video 
            ref={videoRef} 
            controls 
            autoPlay
            playsInline
            crossOrigin={nativeSource?.open?undefined:"anonymous"} 
            className="w-full h-full object-contain"
            style={{ pointerEvents: 'auto', zIndex: 10, position: 'relative' }}
            onPlay={() => {setPlayState('Playing');sendVideoEvent('play');}} 
            onPause={() => {setPlayState('Paused');sendVideoEvent('pause');}}
            onWaiting={()=>setPlayState('Buffering')}
            onPlaying={()=>setPlayState('Playing')}
            onEnded={()=>{setPlayState('Finished');publishProgress(videoRef.current?.duration,videoRef.current?.duration,true);}}
            onLoadedMetadata={()=>{const v=videoRef.current;if(v&&Number.isFinite(v.duration)&&v.duration>0){const p=Number(syncSettings.progress||0);if(p>0&&p<95&&v.currentTime<1)v.currentTime=v.duration*p/100;publishProgress(v.currentTime,v.duration);}}} 
            onSeeked={() => sendVideoEvent('seek')}
            onTimeUpdate={() => {
              if (videoRef.current) publishProgress(videoRef.current.currentTime,videoRef.current.duration);
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {localCaption&&<track key={localCaption} kind="subtitles" src={localCaption} srcLang="ar" label="Arabic" default/>}
            {nativeSource?.subtitles?.map((sub, i) => (
              <track key={i} kind="subtitles" src={sub.url} srcLang={sub.lang} label={sub.language} default={sub.lang?.includes('ar')} />
            ))}
          </video>
        ) : directOnly ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-white gap-4 bg-gradient-to-b from-zinc-900 to-black">
            <div className="text-4xl">🍿</div><p className="font-bold text-xl">No direct video available</p>
            <p className="text-sm text-gray-400 max-w-sm">{movie.openCatalog?'The archive has no verified compatible MP4 for this item at the moment. Choose another open title.':'Your library is unchanged. This title currently needs an external player, which may display ads. Direct-only mode will not load it.'}</p>
            {!movie.openCatalog&&<button onClick={()=>setDirectOnly(false)} className="bg-purple-700 rounded-full px-5 py-3 font-bold text-sm">Continue with existing sources</button>}
            <button onClick={onBack} className="text-gray-300 text-sm underline">Back to library</button>
          </div>
        ) : exhausted ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-white gap-3">
            <p className="font-bold">Protected sources exhausted</p>
            <p className="text-sm text-gray-400">We stopped the external player instead of silently disabling protection. You can retry or explicitly choose compatibility.</p>
            <button onClick={()=>{setAdMemory({});writeAdMemory(movie.id,{});restoreProtection();}} className="bg-purple-700 rounded-xl px-4 py-2 text-sm">Retry protected sources</button>
            <button onClick={()=>setShowPlaybackHelp(true)} className="underline text-sm text-gray-300">Playback options</button>
          </div>
        ) : (
          <div className="relative w-full h-full bg-black flex items-center justify-center">
            <iframe
              ref={iframeRef}
              key={`${movie.id}-${currentServer}-${frameProtected}-${frameRevision}`}
              title="Movie playback"
              src={movie.isArabic ? `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(movie.title + ' فيلم كامل')}` : fallbackNodes[currentServer]?.url}
              className="w-full h-full border-0"
              sandbox={frameProtected ? "allow-scripts allow-same-origin allow-presentation" : undefined}
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              style={{ zIndex: 10, position: 'relative' }}
            />
          </div>
        )}

        {nativeError && <div className="absolute top-3 left-3 right-3 z-[100] bg-red-950/90 text-white p-3 rounded-xl text-sm">{nativeError}<button onClick={()=>setShowPlaybackHelp(true)} className="underline ml-2">Playback options</button></div>}
        {/* Progress Bar Overlay */}
        {videoProgress > 0 && (
          <div className="absolute bottom-20 left-4 right-4 h-1 bg-gray-700 rounded-full overflow-hidden z-[100]">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
              style={{ width: `${Math.min(videoProgress, 100)}%` }}
            />
          </div>
        )}
      </div>

      <div className="shrink-0 z-[250] bg-zinc-950 p-2"> 
        {/* Emoji Panel */}
        {mode === 'couples' && (
          <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
            <div className="bg-black/80 backdrop-blur-xl border border-pink-500/20 p-3 rounded-full flex gap-2 shadow-2xl">
              {habibtiEmojis.map(emoji => (
                <button 
                  key={emoji} 
                  onClick={(e) => { e.stopPropagation(); sendEmoji(emoji); }} 
                  className="text-3xl hover:scale-125 active:scale-95 transition-transform p-1 hover:bg-pink-500/10 rounded-full"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>


    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
