import React, { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import Hls from 'hls.js'
import {attachPublisherFilm} from './officialCatalog.js'
import PublisherPlayer from './PublisherPlayer.jsx'
import {attachPublisherEpisode} from './publisherSeries.js'
import LicensedLibrary from './LicensedLibrary.jsx'
import ArabicDiscovery,{OfficialAvailability} from './ArabicDiscovery.jsx'
import {embedwaveUrl} from './arabicDiscovery.js'
import {ARABIC_BACKENDS,arabicSourceIds,backendUrl,nextArabicSource} from './arabicSources.js'
import PublisherFallback from './PublisherFallback.jsx'
import {languageCode,originalAudioIndex,arabicSubtitleIndex,orderedSubtitles} from './mediaLanguages.js'
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
      licensedSource:movie.licensedSource,licensedPoster:movie.licensedPoster,publisherSource:movie.publisherSource,
      progress: progress,
      settings: settings,
      lastWatched: Date.now(),
      isArabic: movie.isArabic,
      original_language: movie.original_language,
      media_type: movie.media_type,tmdbId:movie.tmdbId,season:movie.season,episode:movie.episode,seriesTitle:movie.seriesTitle,runtime:movie.runtime,release_date:movie.release_date,original_title:movie.original_title
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
                  src={item.licensedPoster||`https://image.tmdb.org/t/p/w500${item.poster}`} 
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
  const [arabicLibrary,setArabicLibrary]=useState(false);
  const [catalogPage,setCatalogPage]=useState(1);
  const [catalogPages,setCatalogPages]=useState(1);
  const [catalogError,setCatalogError]=useState('');
  const [searchDraft,setSearchDraft]=useState('');
  const switchLibrary=(arabic)=>{setArabicLibrary(arabic);setSearch('');setSearchDraft('');setCatalogPage(1);};
  const submitSearch=(e)=>{e.preventDefault();setCatalogPage(1);setSearch(searchDraft.trim());};
  const [welcomeName, setWelcomeName] = useState('Renad');
  
  const [roomCode, setRoomCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [roomReady, setRoomReady] = useState(false);
  const [partnerCoords, setPartnerCoords] = useState(null);
  const [myCoords, setMyCoords] = useState(null);
  const [syncSettings, setSyncSettings] = useState({ 
    fallbackServer: 10, 
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
    if(role!=='admin'||arabicLibrary)return;
    const controller=new AbortController();
    const lang=arabicLibrary?'ar-SA':'en-US';
    const params=new URLSearchParams({language:lang,page:String(catalogPage),include_adult:'false'});
    if(search)params.set('query',search);
    else{
      params.set('sort_by','popularity.desc');
      if(arabicLibrary)params.set('with_original_language','ar');
      else params.set('vote_count.gte','100');
    }
    const url='https://api.themoviedb.org/3/'+(search?'search/movie':'discover/movie')+'?'+params;
    setLoading(true);setCatalogError('');
    fetch(url,{...fetchOptions,signal:controller.signal})
      .then(res=>{if(!res.ok)throw Error('Catalog unavailable');return res.json();})
      .then(data=>{if(controller.signal.aborted)return;
        setMovies((data.results||[]).filter(m=>m.poster_path&&(!arabicLibrary||m.original_language==='ar')));
        setCatalogPages(Math.max(1,Math.min(500,Number(data.total_pages)||1)));setLoading(false);
      })
      .catch(err=>{if(!controller.signal.aborted){setCatalogError('Could not load movies. Please retry.');setMovies([]);setLoading(false);}});
    return()=>controller.abort();
  },[search,role,arabicLibrary,catalogPage]);

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

  const startArabicEpisode=(input)=>{
    const movie=attachPublisherFilm(attachPublisherEpisode(input));
    if(mode==='couples'&&!conn?.open){alert('Connect Renad first, then start the episode.');return;}
    const settings={...syncSettings,fallbackServer:10,progress:getFromHistory(movie.id)?.progress||0};
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
            licensedSource:item.licensedSource,licensedPoster:item.licensedPoster,publisherSource:item.publisherSource,
            isArabic: item.isArabic,
            original_language: item.original_language,
            media_type:item.media_type,tmdbId:item.tmdbId,season:item.season,episode:item.episode,seriesTitle:item.seriesTitle,runtime:item.runtime,release_date:item.release_date,original_title:item.original_title
          });
          setSyncSettings(prev => ({
            ...prev,
            fallbackServer: item.settings?.fallbackServer ?? 10,
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

  if (roomMovie?.publisherSource) {
    return <PublisherPlayer key={roomMovie.id} movie={roomMovie} mode={mode} onBack={()=>{if(role==='admin'&&conn?.open)conn.send({type:'end_party'});saveToHistory(roomMovie,syncSettings.progress,syncSettings);setRoomMovie(null);setActiveMovie(null);}}/>;
  }
  if (roomMovie) {
    return (
      <Player 
        key={roomMovie.id}
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
    return <MovieDetail movie={activeMovie} onBack={() => setActiveMovie(null)} onStartParty={(input) => {
      const movieFull=attachPublisherFilm(input);
      const settings={...syncSettings,fallbackServer:10,progress:getFromHistory(movieFull.id)?.progress||0};
      setSyncSettings(settings);setRoomMovie(movieFull);
      if (conn?.open) {
        conn.send({ 
          type: 'start_party', 
          movie: movieFull, 
          settings 
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
          
          <div className="flex flex-wrap gap-2">
            <button onClick={()=>switchLibrary(false)} aria-pressed={!arabicLibrary} className={`px-4 py-2 rounded-full text-sm font-bold ${!arabicLibrary?'bg-purple-600':'bg-white/5 text-gray-300'}`}>World Cinema</button>
            <button onClick={()=>switchLibrary(true)} aria-pressed={arabicLibrary} className={`px-4 py-2 rounded-full text-sm font-bold ${arabicLibrary?'bg-purple-600':'bg-white/5 text-gray-300'}`}>السينما العربية</button>
          </div>
          <form onSubmit={submitSearch} className="flex gap-2">
            <input value={searchDraft} onChange={e=>setSearchDraft(e.target.value)} dir={arabicLibrary?'rtl':'auto'} type="search" placeholder={arabicLibrary?'ابحث عن فيلم أو مسلسل عربي...':'Search movies...'} className="min-w-0 flex-1 bg-[#0a0a0a] border border-white/10 rounded-2xl px-4 py-3 focus:ring-2 ring-purple-500/50 outline-none text-base"/>
            <button className="rounded-2xl bg-purple-600 px-4 text-sm font-bold">{arabicLibrary?'بحث':'Search'}</button>
          </form>
        </header>

        {arabicLibrary ? <>
          <LicensedLibrary query={search} onPlay={startArabicEpisode}/>
          <ArabicDiscovery query={search} existing={[]} options={fetchOptions} onMovie={setActiveMovie} onEpisode={startArabicEpisode}/>
        </> : <>
        {catalogError&&<p className="text-red-300 mb-4 text-sm">{catalogError}</p>}
        {!loading&&!movies.length&&!catalogError&&<p className="text-gray-400 mb-4">{arabicLibrary?'لا توجد نتائج في هذه الصفحة. جرّب اسم الفيلم أو الصفحة التالية.':'No matching movies.'}</p>}
        <div className="flex items-center justify-between mb-4 text-sm text-gray-400"><span>{arabicLibrary?'أفلام عربية':'Movies'} · {catalogPage}/{catalogPages}</span><div className="flex gap-2"><button disabled={catalogPage<=1||loading} onClick={()=>setCatalogPage(p=>p-1)} className="bg-white/5 rounded-lg px-3 py-2 disabled:opacity-30">‹</button><button disabled={catalogPage>=catalogPages||loading} onClick={()=>setCatalogPage(p=>p+1)} className="bg-white/5 rounded-lg px-3 py-2 disabled:opacity-30">›</button></div></div>
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
        </>}
      </div>
    );
  }

  if (mode === 'single' && activeMovie) {
    return <MovieDetail movie={activeMovie} onBack={() => setActiveMovie(null)} onStartParty={(input) => {const movieFull=attachPublisherFilm(input);setSyncSettings(prev=>({...prev,fallbackServer:10,progress:getFromHistory(movieFull.id)?.progress||0}));setRoomMovie(movieFull);}} />;
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
          <div className="flex flex-wrap gap-2">
            <button onClick={()=>switchLibrary(false)} aria-pressed={!arabicLibrary} className={`px-4 py-2 rounded-full text-sm font-bold ${!arabicLibrary?'bg-purple-600':'bg-white/5 text-gray-300'}`}>World Cinema</button>
            <button onClick={()=>switchLibrary(true)} aria-pressed={arabicLibrary} className={`px-4 py-2 rounded-full text-sm font-bold ${arabicLibrary?'bg-purple-600':'bg-white/5 text-gray-300'}`}>السينما العربية</button>
          </div>
          <form onSubmit={submitSearch} className="flex gap-2">
            <input value={searchDraft} onChange={e=>setSearchDraft(e.target.value)} dir={arabicLibrary?'rtl':'auto'} type="search" placeholder={arabicLibrary?'ابحث عن فيلم أو مسلسل عربي...':'Search movies...'} className="min-w-0 flex-1 bg-[#0a0a0a] border border-white/10 rounded-2xl px-4 py-3 focus:ring-2 ring-purple-500/50 outline-none text-base"/>
            <button className="rounded-2xl bg-purple-600 px-4 text-sm font-bold">{arabicLibrary?'بحث':'Search'}</button>
          </form>
        </header>

        {arabicLibrary ? <>
          <LicensedLibrary query={search} onPlay={startArabicEpisode}/>
          <ArabicDiscovery query={search} existing={[]} options={fetchOptions} onMovie={setActiveMovie} onEpisode={startArabicEpisode}/>
        </> : <>
        {catalogError&&<p className="text-red-300 mb-4 text-sm">{catalogError}</p>}
        {!loading&&!movies.length&&!catalogError&&<p className="text-gray-400 mb-4">{arabicLibrary?'لا توجد نتائج في هذه الصفحة. جرّب اسم الفيلم أو الصفحة التالية.':'No matching movies.'}</p>}
        <div className="flex items-center justify-between mb-4 text-sm text-gray-400"><span>{arabicLibrary?'أفلام عربية':'Movies'} · {catalogPage}/{catalogPages}</span><div className="flex gap-2"><button disabled={catalogPage<=1||loading} onClick={()=>setCatalogPage(p=>p-1)} className="bg-white/5 rounded-lg px-3 py-2 disabled:opacity-30">‹</button><button disabled={catalogPage>=catalogPages||loading} onClick={()=>setCatalogPage(p=>p+1)} className="bg-white/5 rounded-lg px-3 py-2 disabled:opacity-30">›</button></div></div>
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
        </>}
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
          {(movie.original_language==='ar'||details?.original_language==='ar')&&<OfficialAvailability movie={movie} options={fetchOptions}/>}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button onClick={() => onStartParty({ ...movie, runtime:details?.runtime||movie.runtime,original_title:details?.original_title||movie.original_title, original_language: details?.original_language || movie.original_language, isArabic: (details?.original_language || movie.original_language) === 'ar' })} className="bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-4 rounded-2xl font-black text-white hover:scale-105 transition-all shadow-xl">
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
  const [extractionStatus, setExtractionStatus] = useState(movie.licensedSource?'success':'extracting');
  const [streamData, setStreamData] = useState(null);
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const [togetherTime, setTogetherTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [showServerList, setShowServerList] = useState(false);
  const [frameRevision, setFrameRevision] = useState(0);
  const [showPlaybackHelp, setShowPlaybackHelp] = useState(false);
  const [localServer, setLocalServer] = useState(null);
  const [adMemory, setAdMemory] = useState(()=>readAdMemory(movie.id));
  const [adNotice, setAdNotice] = useState('');
  const [blockedAdCount,setBlockedAdCount]=useState(0);
  useEffect(()=>{
    const onViolation=(event)=>{
      if(event.effectiveDirective!=='frame-src')return;
      try{
        const hostname=new URL(event.blockedURI).hostname.toLowerCase();
        if(hostname==='topcontent.fun'||hostname.endsWith('.topcontent.fun')){
          setBlockedAdCount(n=>n+1);
          setAdNotice('Blocked topcontent.fun by the cinema frame policy.');
        }
      }catch{}
    };
    window.addEventListener('securitypolicyviolation',onViolation);
    return()=>window.removeEventListener('securitypolicyviolation',onViolation);
  },[]);
  const [exhausted, setExhausted] = useState(false);
  const preferredInitialized = useRef(false);
  const [ownedUrl, setOwnedUrl] = useState('');
  const [ownedError, setOwnedError] = useState('');
  const [ownedSource, setOwnedSource] = useState(null);
  const [nativeError, setNativeError] = useState('');
  const [directOnly, setDirectOnly] = useState(false);
  const [playState, setPlayState] = useState('Preparing');
  const [mediaInfo, setMediaInfo] = useState({time:0,duration:0});
  const [quality, setQuality] = useState(-1);
  const [languageStatus,setLanguageStatus]=useState({audio:'',subs:''});
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
  const requestedServer = localServer ?? syncSettings.fallbackServer ?? 10;
  const isTV=movie.media_type==='tv';
  const arabic=movie.isArabic||movie.original_language==='ar';
  const sourceIds=arabic?arabicSourceIds(isTV,ACTIVE_SERVER_IDS):(isTV?[10]:ACTIVE_SERVER_IDS);
  const currentServer=sourceIds.includes(Number(requestedServer))?Number(requestedServer):sourceIds[0];
  const [publisherSource,setPublisherSource]=useState(null);
  useEffect(()=>{
    if(Number(requestedServer)===currentServer)return;
    if(role==='admin'){setLocalServer(null);onServerChange(currentServer);}
    else setLocalServer(currentServer);
  },[requestedServer,currentServer,role]);
  const nativeSource = movie.licensedSource || ownedSource || (extractionStatus === 'success' ? streamData : null);
  const isNative = Boolean(nativeSource);
  // Security invariant: third-party players never receive top-navigation or popup permissions.
  const frameProtected = true;
  const rememberSource = (status) => {
    const next={...adMemory,[currentServer]:{status,at:Date.now()}};
    setAdMemory(next);
    writeAdMemory(movie.id,next);
    return next;
  };
  useEffect(() => { setShowPlaybackHelp(false); }, [movie.id, currentServer]);
  const [videoProgress, setVideoProgress] = useState(syncSettings.progress || 0);
  // VidLink's documented playback events, not iframe onload, establish playback progress.
  useEffect(()=>{
    if(isNative||isTV||currentServer!==0||directOnly||exhausted)return;
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
    { name: "Vidsrc XYZ", health: "Retired", retired: true, url: null },
    { name: "EmbedWave", health: "Cinesrc default · original audio preferred", url: movie.licensedSource?null:embedwaveUrl(movie) },
    { name:'EmbedWave 4K',health:'Arabic backup · Videasy',url:arabic&&!movie.licensedSource?backendUrl(movie,11):null },
    { name:'EmbedWave Multi HD',health:'Arabic backup · audio may vary',url:arabic&&!movie.licensedSource?backendUrl(movie,12):null }
  ];
  // Start with a previously reported clean protected source when one exists.
  // Never interpret iframe onload as video playback or a clean result.
  useEffect(()=>{
    if(extractionStatus!=='failed'||(isTV&&!arabic)||preferredInitialized.current) return;
    preferredInitialized.current=true;
    const known=readAdMemory(movie.id);
    const preferred=arabic?nextArabicSource(sourceIds,known,-1):pickProtectedSource(known,fallbackNodes.length);
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
    if(publisherSource){setPublisherSource(null);setExhausted(false);setFrameRevision(v=>v+1);setShowPlaybackHelp(false);return;}
    const next=rememberSource(status);
    setShowPlaybackHelp(false);
    const preferred=arabic?nextArabicSource(sourceIds,next,currentServer):isTV?null:pickProtectedSource(next,fallbackNodes.length,currentServer);
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
      if(movie.licensedSource){setExtractionStatus('success');return;}
      setExtractionStatus('extracting');
      // Arabic movies use the same TMDB-ID based EmbedWave route as world cinema.
      if(isTV||movie.isArabic||movie.original_language==='ar'){setStreamData(null);setExtractionStatus('failed');return;}

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
            const cleanSubtitles = orderedSubtitles(data.subtitles);

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
  }, [movie.id, movie.isArabic]);

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
    if(movie.licensedSource&&(!Number.isFinite(Date.parse(movie.licensedSource.rights?.expires))||Date.parse(movie.licensedSource.rights.expires)<=Date.now())){setNativeError('Playback authorization expired.');return;}
    const desired=languageCode(movie.original_language);
    let hls, selectedAudio=false,selectedSub=false;
    setLanguageStatus({audio:desired?'Looking for original audio':'Original language unknown',subs:'Looking for Arabic subtitles'});
    const applyNative=()=>{
      const audio=video.audioTracks;const subs=video.textTracks;
      if(!selectedAudio&&audio?.length){const index=originalAudioIndex(audio,desired);if(index>=0){for(let i=0;i<audio.length;i++)audio[i].enabled=i===index;selectedAudio=true;setLanguageStatus(v=>({...v,audio:'Original language selected'}));}}
      if(!selectedSub&&subs?.length){const index=arabicSubtitleIndex(subs);if(index>=0){for(let i=0;i<subs.length;i++)if(subs[i].kind==='subtitles'||subs[i].kind==='captions')subs[i].mode=i===index?'showing':'disabled';selectedSub=true;setLanguageStatus(v=>({...v,subs:'Arabic selected'}));}}
    };
    video.addEventListener('loadedmetadata',applyNative);
    video.textTracks?.addEventListener('addtrack',applyNative);
    video.audioTracks?.addEventListener('addtrack',applyNative);
    const fail=()=> {
      if(ownedSource||movie.licensedSource) setNativeError('This video could not be loaded. Check its URL, permissions and CORS.');
      else setExtractionStatus('failed');
    };
    video.addEventListener('error',fail);
    const isMp4=nativeSource.type==='mp4'||/\.mp4(?:[?#]|$)/i.test(url);
    if(isMp4 || video.canPlayType('application/vnd.apple.mpegurl')) video.src=url;
    else if(Hls.isSupported()) {
      hls=new Hls({maxBufferLength:30,maxMaxBufferLength:60,enableWorker:true});
      hlsRef.current=hls;
      const applyHls=()=>{
        if(!selectedAudio&&hls.audioTracks.length){const i=originalAudioIndex(hls.audioTracks,desired);if(i>=0){hls.audioTrack=i;selectedAudio=true;setLanguageStatus(v=>({...v,audio:'Original language selected'}));}}
        if(!selectedSub&&hls.subtitleTracks.length){const i=arabicSubtitleIndex(hls.subtitleTracks);if(i>=0){hls.subtitleTrack=i;hls.subtitleDisplay=true;selectedSub=true;setLanguageStatus(v=>({...v,subs:'Arabic selected'}));}}
      };
      hls.on(Hls.Events.MANIFEST_PARSED,()=>{setLevels(hls.levels.map((l,i)=>({id:i,height:l.height||0,bitrate:l.bitrate||0})));applyHls();});
      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED,applyHls);
      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED,applyHls);
      hls.loadSource(url);hls.attachMedia(video);
      hls.on(Hls.Events.ERROR,(_event,data)=>{if(data.fatal)fail();});
    } else fail();
    return()=>{video.removeEventListener('error',fail);video.removeEventListener('loadedmetadata',applyNative);video.textTracks?.removeEventListener('addtrack',applyNative);video.audioTracks?.removeEventListener('addtrack',applyNative);hls?.destroy();hlsRef.current=null;video.pause();video.removeAttribute('src');video.load();};
  }, [nativeSource,ownedSource,movie.original_language]);

  const restoreProtection=()=>{
    setExhausted(false);
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
    if(!sourceIds.includes(index))return;
    setPublisherSource(null);
    setExhausted(false);
    setOwnedSource(null);
    if (role === 'admin') { setLocalServer(null); onServerChange(index); }
    else setLocalServer(index);
    setShowServerList(false);
    setFrameRevision(v=>v+1);
  };

  if (!movie.licensedSource&&extractionStatus === 'extracting') {
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
      className="h-[100dvh] bg-black relative flex flex-col overflow-hidden" 
      dir="ltr" 
      data-cinema-player="true"
    >

      
      {floatingEmojis.map(e => (
        <FloatingEmoji key={e.id} emojiChar={e.char} onComplete={() => setFloatingEmojis(p => p.filter(x => x.id !== e.id))} />
      ))}

      {/* Compact cinema chrome; options overlay the player only when opened. */}
      <header className="relative shrink-0 z-[200] bg-[#101014] border-b border-white/10 px-3 md:px-6 text-white">
        <div className="h-14 flex items-center gap-3 max-w-6xl mx-auto">
          <button onClick={onBack} aria-label="Back to library" className="w-10 h-10 shrink-0 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-2xl">‹</button>
          <div className="flex-1 min-w-0">
            <p className="truncate font-semibold text-sm md:text-base leading-tight">{movie.title}</p>
            <p className="text-[10px] text-gray-400 mt-0.5 truncate">{isNative?'Direct player':publisherSource?'Official publisher · ads possible':currentServer===10?'Cinesrc · Protected':(fallbackNodes[currentServer]?.name||'Player')+' · Protected'}</p>
          </div>
          <button onClick={()=>{setShowPlaybackHelp(v=>!v);setShowServerList(false);}} aria-label="Playback options" aria-expanded={showPlaybackHelp} className="w-10 h-10 shrink-0 rounded-full bg-white/5 hover:bg-white/10 text-xl flex items-center justify-center">⋯</button>
        </div>
      </header>

      {showPlaybackHelp&&<div className="absolute inset-0 z-[500] flex items-end md:items-center md:justify-center" onClick={()=>setShowPlaybackHelp(false)}>
        <div className="absolute inset-0 bg-black/65" aria-hidden="true"/>
        <section role="dialog" aria-modal="true" aria-label="Playback settings" onClick={e=>e.stopPropagation()} className="relative w-full md:max-w-md max-h-[85dvh] overflow-y-auto rounded-t-3xl md:rounded-3xl border border-white/10 bg-[#18181d] text-white shadow-2xl p-5" style={{paddingBottom:'max(20px, env(safe-area-inset-bottom))'}}>
          <div className="w-9 h-1 rounded-full bg-white/20 mx-auto mb-4 md:hidden"/>
          <div className="flex items-center justify-between gap-3 mb-5">
            <div><h2 className="text-lg font-bold">Playback</h2><p className="text-xs text-gray-400 mt-1">Choose your viewing preferences</p></div>
            <button onClick={()=>setShowPlaybackHelp(false)} aria-label="Close settings" className="w-9 h-9 rounded-full bg-white/10 text-xl">×</button>
          </div>
          <div className="rounded-2xl bg-white/5 p-4 space-y-3">
            <div className="flex justify-between items-center gap-3"><span className="text-sm text-gray-300">Source</span><span className="text-sm font-semibold text-purple-300">{isNative?'Direct player':publisherSource?publisherSource.publisher:fallbackNodes[currentServer]?.name||'Player'}</span></div>
            {!isNative&&currentServer===10&&<p className="text-xs text-gray-400">Cinesrc is the default. Audio and Arabic subtitles are controlled by the embedded player.</p>}
            <div className="flex justify-between items-center gap-3"><span className="text-sm text-gray-300">Navigation protection</span><span className="text-xs text-green-300">Always on</span></div>
            {isNative&&<p className="text-xs text-gray-400">{playState}{mediaInfo.duration>0?' · '+formatTime(Math.floor(mediaInfo.time))+' / '+formatTime(Math.floor(mediaInfo.duration)):''}<br/>Audio: {languageStatus.audio} · CC: {languageStatus.subs}</p>}
            {isNative&&levels.length>1&&<div className="flex justify-between items-center"><label htmlFor="cinema-quality" className="text-sm text-gray-300">Quality</label><select id="cinema-quality" value={quality} onChange={e=>{const v=Number(e.target.value);setQuality(v);if(hlsRef.current)hlsRef.current.currentLevel=v;}} className="bg-zinc-800 rounded-lg px-2 py-2 text-xs"><option value={-1}>Auto</option>{levels.map(l=><option key={l.id} value={l.id}>{l.height?l.height+'p':Math.round(l.bitrate/1000)+' kbps'}</option>)}</select></div>}
            <button onClick={()=>{setPublisherSource(null);setDirectOnly(v=>!v);}} aria-pressed={directOnly} className="w-full flex items-center justify-between gap-3 text-sm text-left"><span>Direct-only mode</span><span className={`rounded-full w-10 h-6 p-1 transition-colors ${directOnly?'bg-purple-600':'bg-zinc-600'}`}><span className={`block w-4 h-4 rounded-full bg-white transition-transform ${directOnly?'translate-x-4':''}`}/></span></button>
          </div>
          {!isNative&&!directOnly&&<div className="mt-4 space-y-2">
            {<button onClick={()=>setShowServerList(v=>!v)} aria-expanded={showServerList} className="w-full flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 text-sm"><span>Change server</span><span className="text-gray-400">{showServerList?'⌃':'›'}</span></button>}
            {showServerList&&<div className="grid grid-cols-2 gap-2">{sourceIds.map(i=>{const node=fallbackNodes[i];return <button key={i} onClick={()=>{handleServerChange(i);setShowPlaybackHelp(false);}} className={`text-left rounded-xl px-3 py-3 ${i===currentServer?'bg-purple-600':'bg-white/5'}`}><span className="block text-xs font-semibold">{node.name}</span><span className="block text-[10px] opacity-75 mt-1">{adMemory[i]?.status==='ad'?'Ad reported':adMemory[i]?.status==='blocked'?'Blocked':adMemory[i]?.status==='clean'?'Reported clean':node.health}</span></button>;})}</div>}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={()=>{setExhausted(false);setFrameRevision(v=>v+1);setShowPlaybackHelp(false);}} className="rounded-xl bg-white/5 p-3 text-sm">↻ Reload</button>
              <button onClick={()=>{reportPlaybackIssue('blocked');setShowPlaybackHelp(false);}} className="rounded-xl bg-white/5 p-3 text-sm">Not playing?</button>
              <button onClick={()=>{reportPlaybackIssue('ad');setShowPlaybackHelp(false);}} className="rounded-xl bg-white/5 p-3 text-sm text-pink-300">Report ad</button>
              {!exhausted&&<button onClick={()=>{rememberSource('clean');setAdNotice('Clean source remembered for this title on this device.');setShowPlaybackHelp(false);}} className="rounded-xl bg-white/5 p-3 text-sm text-green-300">✓ No ads</button>}
            </div>
          </div>}
          {blockedAdCount>0&&<p className="mt-3 text-xs text-green-300">Topcontent blocked: {blockedAdCount}</p>}
          {adNotice&&<p role="status" className="mt-3 text-xs text-gray-300">{adNotice}</p>}
          <details className="mt-4 text-xs text-gray-400"><summary className="cursor-pointer py-2">Advanced options</summary><p className="mt-2">Direct-only mode prevents external player pages. Use a licensed or owned HTTPS MP4/HLS source.</p>
            <div className="flex gap-2 mt-3"><input type="url" value={ownedUrl} onChange={e=>setOwnedUrl(e.target.value)} placeholder="https://…/video.mp4" className="min-w-0 flex-1 bg-black rounded-lg px-2 py-2 text-white"/><button onClick={openOwned} className="bg-purple-600 px-3 rounded-lg">Play</button></div>
            {ownedError&&<p className="text-red-300 mt-2">{ownedError}</p>}
            {ownedSource&&<button onClick={()=>{setOwnedSource(null);setNativeError('');setShowPlaybackHelp(false);}} className="mt-3 underline">Return to original source</button>}
            <button onClick={()=>{restoreProtection();setShowPlaybackHelp(false);}} className="mt-3 block underline">Reset protected player</button>
            <a href={`https://www.themoviedb.org/${isTV?'tv':'movie'}/${movie.tmdbId||movie.id}/watch`} target="_blank" rel="noopener noreferrer" className="block mt-3 underline">Official streaming options</a>
          </details>
          {arabic&&!movie.licensedSource&&<PublisherFallback movie={movie} onSelect={v=>{setPublisherSource(v);setDirectOnly(false);setExhausted(false);setShowPlaybackHelp(false);setFrameRevision(x=>x+1);}}/>}
          {!movie.licensedSource&&(movie.isArabic||isTV)&&<OfficialAvailability movie={movie} options={fetchOptions}/>}
          <button onClick={()=>setShowPlaybackHelp(false)} className="mt-5 w-full bg-purple-600 rounded-xl py-3 font-semibold text-sm">Done</button>
        </section>
      </div>}

      {/* Video Container */}
      <div className="flex-1 min-h-0 bg-[#050505] relative" style={{ zIndex: 1 }}>
        {isNative ? (
          <video 
            ref={videoRef} 
            controls 
            autoPlay
            playsInline
            crossOrigin="anonymous" 
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
            {orderedSubtitles(nativeSource?.subtitles).map((sub, i, all) => (
              <track key={i} kind="subtitles" src={sub.url} srcLang={sub.lang} label={sub.language} default={i===arabicSubtitleIndex(all)} />
            ))}
          </video>
        ) : directOnly ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-white gap-4 bg-gradient-to-b from-zinc-900 to-black">
            <div className="text-4xl">🍿</div><p className="font-bold text-xl">No direct video available</p>
            <p className="text-sm text-gray-400 max-w-sm">Your library is unchanged. This title currently needs an external player, which may display ads. Direct-only mode will not load it.</p>
            <button onClick={()=>setDirectOnly(false)} className="bg-purple-700 rounded-full px-5 py-3 font-bold text-sm">Continue with existing sources</button>
            <button onClick={onBack} className="text-gray-300 text-sm underline">Back to library</button>
          </div>
        ) : exhausted ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-white gap-3">
            <p className="font-bold">{isTV?'Episode source unavailable':'Protected sources exhausted'}</p>
            <p className="text-sm text-gray-400">We stopped the external player rather than allow unwanted redirects. Retry or choose another protected source.</p>
            <button onClick={()=>{setAdMemory({});writeAdMemory(movie.id,{});restoreProtection();}} className="bg-purple-700 rounded-xl px-4 py-2 text-sm">Retry protected sources</button>
            <button onClick={()=>setShowPlaybackHelp(true)} className="underline text-sm text-gray-300">Playback options</button>
            {!movie.licensedSource&&(movie.isArabic||isTV)&&<OfficialAvailability movie={movie} options={fetchOptions}/>}
          </div>
        ) : (
          <div className="relative w-full h-full bg-black flex items-center justify-center">
            <iframe
              ref={iframeRef}
              key={`${movie.id}-${currentServer}-${publisherSource?.id||''}-${frameRevision}`}
              title="Movie playback"
              src={publisherSource?.embed||fallbackNodes[currentServer]?.url}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-presentation"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              referrerPolicy={!publisherSource&&ARABIC_BACKENDS.includes(currentServer)?'no-referrer':'strict-origin-when-cross-origin'}
              style={{ zIndex: 10, position: 'relative' }}
            />
          </div>
        )}

        {nativeError && <div className="absolute top-3 left-3 right-3 z-[100] bg-red-950/90 text-white p-3 rounded-xl text-sm">{nativeError}<button onClick={()=>setShowPlaybackHelp(true)} className="underline ml-2">Playback options</button></div>}
        {/* Progress Bar Overlay */}
        {isNative && videoProgress > 0 && (
          <div className="absolute bottom-20 left-4 right-4 h-1 bg-gray-700 rounded-full overflow-hidden z-[100]">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
              style={{ width: `${Math.min(videoProgress, 100)}%` }}
            />
          </div>
        )}
      </div>

      {mode==='couples'&&<footer className="shrink-0 bg-[#101014] border-t border-white/10 px-3 py-2 flex items-center gap-2" style={{paddingBottom:'max(8px, env(safe-area-inset-bottom))'}}>
        <span className="text-[10px] text-gray-400 shrink-0">♥ Together{myCoords&&partnerCoords?' · '+calculateDistance(myCoords.lat,myCoords.lon,partnerCoords.lat,partnerCoords.lon)+' km':''}</span>
        <div className="flex gap-1 ml-auto overflow-x-auto">{habibtiEmojis.filter(Boolean).map(emoji=><button key={emoji} onClick={()=>sendEmoji(emoji)} className="shrink-0 text-lg w-8 h-8 rounded-full hover:bg-white/10 active:scale-95" aria-label={'Send '+emoji}>{emoji}</button>)}</div>
      </footer>}


    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
