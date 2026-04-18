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

// 🔐 Couples Mode Password
const COUPLES_PASSWORD = '24869';

// 🌐 Global Connection
let peer = null;
let conn = null;

// 🚫 AD Keywords for iOS
const AD_KEYWORDS = [
  'ad', 'ads', 'advert', 'pop', 'popup', 'popunder', 'click', 'track',
  'analytics', 'doubleclick', 'googlesyndication', 'redirect', 'clk',
  'taboola', 'outbrain', 'zemanta', 'revcontent', 'scorecardresearch'
];

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
                  src={`https://image.tmdb.org/t/p/w500${item.poster}`} 
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
    sandbox: false,
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
// 📡 Initialize PeerJS
  useEffect(() => {
    if (!role || mode === 'single') return;

    const code = generateRoomCode();
    setRoomCode(code);

    peer = new Peer(`ROOM-${code}`, {
      debug: 2,
      config: {
        iceTransportPolicy: 'relay', // 👈 ضفنا هذا السطر عشان نمنع الاتصال الداخلي
        iceServers: [
          // STUN
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' },
          { urls: 'stun:stun.cloudflare.com:3478' },
          
          // TURN
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
    peer.on('error', (err) => {
      if (err.type === 'unavailable-id') setRoomCode(generateRoomCode());
      console.error('Peer error:', err);
    });

    return () => { if (peer) peer.destroy(); };
  }, [role, mode]);

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

  // 🔧 FIXED: Render Order
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
            isArabic: item.isArabic
          });
          setSyncSettings(prev => ({
            ...prev,
            fallbackServer: item.settings?.fallbackServer || 0,
            sandbox: item.settings?.sandbox || false,
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

// 👑 Player Component - iOS OPTIMIZED AD BLOCKER
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
  const [isAdDetected, setIsAdDetected] = useState(false);
  const [videoProgress, setVideoProgress] = useState(syncSettings.progress || 0);
  
  const habibtiEmojis = ['💕', '', '💖', '🍿', '🌹', '🦋', '⭐', '💍'];
  
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

  useEffect(() => {
    const timer = setInterval(() => setTogetherTime(p => p + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Update progress periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && videoRef.current.duration) {
        const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
        setVideoProgress(progress);
        onProgressUpdate(progress);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

  // Auto-hide controls (iOS optimized)
  useEffect(() => {
    let timeout;
    const resetTimer = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowControls(false), 4000);
    };
    
    // iOS touch events
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

  // 🚫 iOS OPTIMIZED AD BLOCKER
  useEffect(() => {
    // Layer 1: CSS Injection (iOS compatible)
    const injectAntiAdStyles = () => {
      const style = document.createElement('style');
      style.id = 'ios-ad-blocker';
      style.textContent = `
        iframe[src*="ad"], iframe[src*="pop"], iframe[src*="click"],
        iframe[src*="redirect"], iframe[src*="track"] {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
        
        div[style*="position: fixed"][style*="z-index: 9"],
        div[style*="position: fixed"][style*="z-index: 99"],
        div[style*="position: fixed"][style*="z-index: 999"] {
          display: none !important;
        }
        
        .ad, .ads, .advert, .popup, .popunder, .overlay, .modal {
          display: none !important;
        }
        
        /* iOS specific: Block touch hijacking */
        [onclick*="window.open"], [onclick*="location.href"] {
          pointer-events: none !important;
        }
      `;
      if (!document.getElementById('ios-ad-blocker')) {
        document.head.appendChild(style);
      }
    };

    // Layer 2: Touch Event Interceptor (iOS critical)
    const handleTouch = (e) => {
      const target = e.target;
      const style = window.getComputedStyle(target);
      
      // Block invisible elements
      if (style.opacity === '0' || style.visibility === 'hidden') {
        e.preventDefault();
        e.stopPropagation();
        setIsAdDetected(true);
        return false;
      }
      
      // Block iframes except our video
      if (target.tagName === 'IFRAME' && target !== iframeRef.current) {
        e.preventDefault();
        e.stopPropagation();
        setIsAdDetected(true);
        return false;
      }
    };

    // Layer 3: Prevent navigation
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };

    // Layer 4: Block window.open
    const originalWindowOpen = window.open;
    window.open = function(url, target, features) {
      console.log('🚫 iOS: Blocked popup:', url);
      setIsAdDetected(true);
      return null;
    };

    // Initialize
    injectAntiAdStyles();
    document.addEventListener('touchstart', handleTouch, { passive: false, capture: true });
    document.addEventListener('click', handleTouch, { capture: true });
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.open = originalWindowOpen;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('touchstart', handleTouch, true);
      document.removeEventListener('click', handleTouch, true);
      const style = document.getElementById('ios-ad-blocker');
      if (style) style.remove();
    };
  }, []);

  useEffect(() => {
    if (movie.isArabic) { setExtractionStatus('failed'); return; }
    fetch(`https://vidlink.pro/api/movie/${movie.id}`)
      .then(res => res.json())
      .then(data => {
        if (data?.stream_url) { setStreamData(data); setExtractionStatus('success'); }
        else setExtractionStatus('failed');
      }).catch(() => setExtractionStatus('failed'));
  }, [movie.id, movie.isArabic]);

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

  useEffect(() => {
    if (extractionStatus === 'success' && streamData && videoRef.current) {
      const video = videoRef.current;
      if (Hls.isSupported()) {
        const hls = new Hls({ maxMaxBufferLength: 600, enableWorker: true });
        hls.loadSource(streamData.stream_url);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) setExtractionStatus('failed');
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamData.stream_url;
      }
    }
  }, [extractionStatus, streamData]);

  const sendEmoji = (emoji) => {
    setFloatingEmojis(prev => [...prev, { id: Date.now(), char: emoji }]);
    if (mode === 'couples' && conn?.open) conn.send({ type: 'emoji', emoji });
  };

  const sendVideoEvent = (action) => {
    if (!videoRef.current || mode === 'single' || !conn?.open) return;
    conn.send({ type: 'video_sync', action, time: videoRef.current.currentTime, sender: role });
  };

  const handleServerChange = (index) => {
    if (role === 'admin') {
      onServerChange(index);
      setShowServerList(false);
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
    <div 
      ref={containerRef}
      className="h-screen bg-black relative flex flex-col overflow-hidden" 
      dir="ltr" 
      data-cinema-player="true"
    >
      <DistanceBadge myCoords={myCoords} partnerCoords={partnerCoords} mode={mode} />
      
      {floatingEmojis.map(e => (
        <FloatingEmoji key={e.id} emojiChar={e.char} onComplete={() => setFloatingEmojis(p => p.filter(x => x.id !== e.id))} />
      ))}

      {/* Ad Detection Warning */}
      {isAdDetected && (
        <div className="fixed top-4 right-4 z-[9999] bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-bold animate-pulse">
          🚫 Ad Blocked!
        </div>
      )}

      {/* Top Controls */}
      <div className={`absolute top-0 left-0 right-0 z-[200] p-4 bg-gradient-to-b from-black/90 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="flex justify-between items-center flex-wrap gap-2">
          <button onClick={(e) => { e.stopPropagation(); onBack(); }} className="bg-red-600/20 text-red-400 px-6 py-3 rounded-xl font-bold hover:bg-red-600/40 transition-all backdrop-blur-md border border-red-600/30">
            ← Exit
          </button>
          <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
            <span className="text-[10px] text-pink-400 font-mono">⏱️ {formatTime(togetherTime)}</span>
            <span className="text-white text-sm font-bold hidden sm:inline">{movie.title}</span>
            {mode === 'couples' && <span className="text-pink-400 text-xs">💑</span>}
          </div>
          
          {/* 🎮 Sandbox Toggle (Admin Only) */}
          {role === 'admin' && (
            <button 
              onClick={(e) => { e.stopPropagation(); onSandboxToggle(); }}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                syncSettings.sandbox 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              🛡️ Sandbox: {syncSettings.sandbox ? 'ON' : 'OFF'}
            </button>
          )}
        </div>
      </div>

      {/* Video Container */}
      <div className="flex-1 bg-[#050505] relative pb-24" style={{ zIndex: 1 }}>
        {extractionStatus === 'success' ? (
          <video 
            ref={videoRef} 
            controls 
            autoPlay 
            crossOrigin="anonymous" 
            className="w-full h-full object-contain"
            style={{ pointerEvents: 'auto', zIndex: 10, position: 'relative' }}
            onPlay={() => sendVideoEvent('play')} 
            onPause={() => sendVideoEvent('pause')} 
            onSeeked={() => sendVideoEvent('seek')}
            onTimeUpdate={() => {
              if (videoRef.current && videoRef.current.duration) {
                const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
                setVideoProgress(progress);
                onProgressUpdate(progress);
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            {streamData?.subtitles?.map((sub, i) => (
              <track key={i} kind="subtitles" src={sub.url} srcLang={sub.lang} label={sub.language} default={sub.lang.includes('ar')} />
            ))}
          </video>
        ) : movie.isArabic ? (
          <div className="relative w-full h-full" style={{ pointerEvents: 'auto' }}>
            <iframe 
              ref={iframeRef}
              src={`https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(movie.title + ' فيلم كامل')}`} 
              className="w-full h-full border-0" 
              allowFullScreen
              {...(syncSettings.sandbox && {
                sandbox: "allow-same-origin allow-scripts allow-popups allow-forms allow-pointer-lock"
              })}
              style={{ pointerEvents: 'auto', zIndex: 10, position: 'relative' }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            ></iframe>
          </div>
        ) : (
          <div className="relative w-full h-full" style={{ pointerEvents: 'auto' }}>
            <iframe 
              ref={iframeRef}
              key={syncSettings.fallbackServer} 
              src={fallbackNodes[syncSettings.fallbackServer]?.url} 
              className="w-full h-full border-0" 
              allowFullScreen 
              allow="autoplay; encrypted-media"
              {...(syncSettings.sandbox && {
                sandbox: "allow-same-origin allow-scripts allow-popups allow-forms allow-pointer-lock"
              })}
              style={{ pointerEvents: 'auto', zIndex: 10, position: 'relative' }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            ></iframe>
          </div>
        )}
        
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

      {/* Bottom Controls */}
      <div className={`absolute bottom-0 left-0 right-0 z-[250] bg-gradient-to-t from-black/95 via-black/80 to-transparent p-4 transition-all duration-300 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'}`}>
        
        {/* Server Selection */}
        {extractionStatus === 'failed' && !movie.isArabic && role === 'admin' && (
          <div className="mb-4" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowServerList(!showServerList); }}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-lg text-sm font-bold text-white mb-2 transition-all border border-white/20"
            >
              📺 {showServerList ? 'Hide Servers' : `Change Server (${fallbackNodes[syncSettings.fallbackServer]?.name})`}
            </button>
            
            {showServerList && (
              <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                {fallbackNodes.map((s, i) => (
                  <button 
                    key={i} 
                    onClick={(e) => { e.stopPropagation(); handleServerChange(i); }}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      syncSettings.fallbackServer === i 
                        ? 'bg-pink-600 text-white shadow-lg' 
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

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

      {/* Click overlay */}
      <div 
        className="absolute inset-0 z-[50]"
        style={{ pointerEvents: showControls ? 'none' : 'auto' }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            e.stopPropagation();
            e.preventDefault();
            setShowControls(prev => !prev);
          }
        }}
      />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
