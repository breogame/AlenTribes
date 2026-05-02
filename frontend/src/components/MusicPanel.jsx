import { useEffect, useRef, useState } from 'react';
import {
  Music, X, Play, Pause, Upload, Volume2, VolumeX, ExternalLink,
  SkipBack, SkipForward, Trash2, ListMusic,
} from 'lucide-react';

function extractSpotifyEmbed(url) {
  if (!url) return null;
  const m1 = url.match(/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(track|playlist|album|artist|episode|show)\/([a-zA-Z0-9]+)/);
  if (m1) return `https://open.spotify.com/embed/${m1[1]}/${m1[2]}?utm_source=generator&theme=0`;
  const m2 = url.match(/spotify:(track|playlist|album|artist|episode|show):([a-zA-Z0-9]+)/);
  if (m2) return `https://open.spotify.com/embed/${m2[1]}/${m2[2]}?utm_source=generator&theme=0`;
  return null;
}

function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export default function MusicPanel() {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState('local');
  // Local playlist
  const [tracks, setTracks] = useState([]); // {id, name, url}
  const [activeIndex, setActiveIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.45);
  const [muted, setMuted] = useState(false);
  const [loopMode, setLoopMode] = useState('playlist'); // 'single' | 'playlist'
  // Spotify
  const [spotifyInput, setSpotifyInput] = useState('');
  const [spotifyEmbed, setSpotifyEmbed] = useState(null);

  const audioRef = useRef(null);
  const fileRef = useRef(null);
  const tracksRef = useRef(tracks);
  const activeIndexRef = useRef(activeIndex);

  // Keep refs in sync for use inside audio event handlers.
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  useEffect(() => { activeIndexRef.current = activeIndex; }, [activeIndex]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = muted;
    }
  }, [volume, muted]);

  // When active track changes, auto-play (if user has interacted).
  useEffect(() => {
    if (activeIndex < 0 || !audioRef.current) return;
    const el = audioRef.current;
    const t = tracks[activeIndex];
    if (!t) return;
    // setting src happens via render; after next tick we can play.
    const onCanPlay = () => {
      el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      el.removeEventListener('canplay', onCanPlay);
    };
    el.addEventListener('canplay', onCanPlay);
    return () => el.removeEventListener('canplay', onCanPlay);
  }, [activeIndex, tracks]);

  // Revoke object URLs on unmount.
  useEffect(() => {
    return () => {
      tracksRef.current.forEach((t) => {
        try { URL.revokeObjectURL(t.url); } catch { /* ignore */ }
      });
    };
  }, []);

  function addFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const newTracks = files.map((f) => ({
      id: newId(),
      name: f.name.replace(/\.[^.]+$/, ''),
      url: URL.createObjectURL(f),
    }));
    setTracks((prev) => {
      const combined = [...prev, ...newTracks];
      // If nothing was playing, start first newly added.
      if (activeIndexRef.current < 0) {
        setActiveIndex(prev.length);
      }
      return combined;
    });
  }

  function handleFileInput(e) {
    addFiles(e.target.files);
    e.target.value = '';
  }

  function removeTrack(idx) {
    setTracks((prev) => {
      const t = prev[idx];
      if (t?.url) {
        try { URL.revokeObjectURL(t.url); } catch { /* ignore */ }
      }
      const next = prev.filter((_, i) => i !== idx);
      setActiveIndex((cur) => {
        if (cur === idx) {
          // Removed the playing track.
          if (next.length === 0) {
            setPlaying(false);
            return -1;
          }
          return Math.min(idx, next.length - 1);
        }
        if (cur > idx) return cur - 1;
        return cur;
      });
      return next;
    });
  }

  function clearTracks() {
    tracks.forEach((t) => {
      try { URL.revokeObjectURL(t.url); } catch { /* ignore */ }
    });
    setTracks([]);
    setActiveIndex(-1);
    setPlaying(false);
  }

  function selectTrack(idx) {
    setActiveIndex(idx);
  }

  function nextTrack() {
    if (tracks.length === 0) return;
    setActiveIndex((cur) => (cur + 1) % tracks.length);
  }

  function prevTrack() {
    if (tracks.length === 0) return;
    setActiveIndex((cur) => (cur - 1 + tracks.length) % tracks.length);
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (activeIndex < 0 && tracks.length > 0) {
      setActiveIndex(0);
      return;
    }
    if (audioRef.current.paused) {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      audioRef.current.pause();
      setPlaying(false);
    }
  }

  function onEnded() {
    if (loopMode === 'single') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    } else {
      // Auto-advance: next track in playlist (loop).
      if (tracks.length > 0) {
        setActiveIndex((cur) => (cur + 1) % tracks.length);
      } else {
        setPlaying(false);
      }
    }
  }

  function applySpotify() {
    const embed = extractSpotifyEmbed(spotifyInput.trim());
    setSpotifyEmbed(embed);
    setTab('spotify');
  }

  const activeTrack = activeIndex >= 0 ? tracks[activeIndex] : null;

  return (
    <div
      style={{
        position: 'absolute',
        left: 316, bottom: 16, zIndex: 48,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
      }}
      data-testid="music-panel-root"
    >
      {!expanded ? (
        <button
          className="panel-glass"
          onClick={() => setExpanded(true)}
          data-testid="music-open"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '0.55rem 0.9rem', cursor: 'pointer',
            border: '1px solid rgba(184,134,11,0.25)',
            color: playing ? '#f3d58c' : 'var(--text-secondary)',
            fontFamily: 'var(--font-body)', fontSize: '0.9rem',
          }}
        >
          <Music size={16} /> Música
          {playing && <span style={{ color: '#6ce090' }}>●</span>}
          {activeTrack && (
            <span className="label-caps" style={{ fontSize: '0.58rem', color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              · {activeTrack.name}
            </span>
          )}
        </button>
      ) : (
        <div className="panel-glass" style={{ padding: '0.85rem', width: 340 }}>
          <div className="flex items-center justify-between mb-2">
            <div className="font-display text-lg" style={{ color: '#f3d58c' }}>Música ambiente</div>
            <button className="icon-btn" onClick={() => setExpanded(false)} data-testid="music-close">
              <X size={13} />
            </button>
          </div>

          <div className="flex gap-1 mb-3" style={{ padding: 3, background: 'rgba(0,0,0,0.3)', borderRadius: 6 }}>
            <button
              className="flex-1 text-sm py-1 rounded"
              onClick={() => setTab('local')}
              data-testid="music-tab-local"
              style={{
                background: tab === 'local' ? 'rgba(184,134,11,0.25)' : 'transparent',
                color: tab === 'local' ? '#f3d58c' : 'var(--text-muted)',
                border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              Biblioteca local
            </button>
            <button
              className="flex-1 text-sm py-1 rounded"
              onClick={() => setTab('spotify')}
              data-testid="music-tab-spotify"
              style={{
                background: tab === 'spotify' ? 'rgba(30, 215, 96, 0.18)' : 'transparent',
                color: tab === 'spotify' ? '#7fe0a1' : 'var(--text-muted)',
                border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              Spotify
            </button>
          </div>

          {tab === 'local' ? (
            <div className="flex flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="audio/*"
                multiple
                className="hidden"
                onChange={handleFileInput}
                data-testid="music-file-input"
              />

              <div className="flex gap-2">
                <button
                  className="ghost-btn flex items-center gap-2 justify-center flex-1"
                  onClick={() => fileRef.current?.click()}
                  data-testid="music-upload"
                  style={{ fontSize: '0.85rem' }}
                >
                  <Upload size={14} /> Añadir pistas
                </button>
                {tracks.length > 0 && (
                  <button
                    className="icon-btn danger"
                    onClick={clearTracks}
                    title="Vaciar biblioteca"
                    data-testid="music-clear"
                    style={{ width: 34, height: 34 }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <audio
                ref={audioRef}
                src={activeTrack?.url || undefined}
                onEnded={onEnded}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                data-testid="music-audio"
              />

              {/* Playlist */}
              <div
                className="thin-scroll"
                style={{
                  maxHeight: 160,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  background: 'rgba(0,0,0,0.25)',
                  borderRadius: 6,
                  padding: tracks.length === 0 ? 0 : 4,
                  border: tracks.length === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                }}
                data-testid="music-playlist"
              >
                {tracks.length === 0 ? (
                  <div
                    className="text-xs text-center"
                    style={{ color: 'var(--text-muted)', padding: '0.6rem 0.2rem' }}
                  >
                    <ListMusic size={18} style={{ display: 'inline', opacity: 0.5, marginRight: 6 }} />
                    Aún no has añadido pistas.
                  </div>
                ) : (
                  tracks.map((t, idx) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-2"
                      style={{
                        padding: '0.3rem 0.45rem',
                        borderRadius: 4,
                        background: idx === activeIndex ? 'rgba(184,134,11,0.18)' : 'transparent',
                        cursor: 'pointer',
                      }}
                      onClick={() => selectTrack(idx)}
                      data-testid={`music-track-${idx}`}
                    >
                      <span
                        style={{
                          color: idx === activeIndex
                            ? (playing ? '#6ce090' : '#f3d58c')
                            : 'var(--text-muted)',
                          width: 14, display: 'inline-flex', justifyContent: 'center',
                        }}
                      >
                        {idx === activeIndex ? (playing ? '▶' : '❙❙') : `${idx + 1}`}
                      </span>
                      <span
                        className="text-xs truncate flex-1"
                        style={{ color: idx === activeIndex ? '#f3d58c' : 'var(--text-secondary)' }}
                        title={t.name}
                      >
                        {t.name}
                      </span>
                      <button
                        className="icon-btn danger"
                        onClick={(e) => { e.stopPropagation(); removeTrack(idx); }}
                        title="Quitar pista"
                        data-testid={`music-track-remove-${idx}`}
                        style={{ width: 20, height: 20 }}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Transport controls */}
              <div className="flex items-center gap-2 mt-1">
                <button
                  className="icon-btn"
                  onClick={prevTrack}
                  disabled={tracks.length === 0}
                  data-testid="music-prev"
                  title="Pista anterior"
                  style={{ width: 30, height: 30 }}
                >
                  <SkipBack size={13} />
                </button>
                <button
                  className="icon-btn"
                  onClick={togglePlay}
                  disabled={tracks.length === 0}
                  data-testid="music-playpause"
                  style={{ width: 36, height: 36, color: '#f3d58c' }}
                >
                  {playing ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button
                  className="icon-btn"
                  onClick={nextTrack}
                  disabled={tracks.length === 0}
                  data-testid="music-next"
                  title="Pista siguiente"
                  style={{ width: 30, height: 30 }}
                >
                  <SkipForward size={13} />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => setLoopMode((m) => (m === 'single' ? 'playlist' : 'single'))}
                  title={loopMode === 'single' ? 'Bucle: pista actual' : 'Bucle: biblioteca completa'}
                  data-testid="music-loop"
                  style={{
                    width: 30, height: 30,
                    color: loopMode === 'single' ? '#ffd98a' : '#c8efdc',
                  }}
                >
                  {loopMode === 'single' ? '↻1' : '↻'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="icon-btn"
                  onClick={() => setMuted((m) => !m)}
                  data-testid="music-mute"
                >
                  {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
                <input
                  type="range"
                  min={0} max={1} step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="flex-1"
                  data-testid="music-volume"
                />
              </div>

              <p className="text-xs" style={{ color: 'var(--text-muted)', marginTop: 2 }}>
                La biblioteca se guarda solo durante esta sesión del navegador.
                Captura el audio de la pestaña en OBS para enviarlo al stream.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <input
                className="dark-input"
                placeholder="Pega una URL de Spotify (track / playlist / álbum)"
                value={spotifyInput}
                onChange={(e) => setSpotifyInput(e.target.value)}
                data-testid="music-spotify-input"
              />
              <button
                className="brass-btn"
                style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}
                onClick={applySpotify}
                data-testid="music-spotify-load"
              >
                Cargar
              </button>
              {spotifyEmbed ? (
                <iframe
                  title="Spotify"
                  src={spotifyEmbed}
                  width="100%"
                  height="152"
                  frameBorder="0"
                  allowFullScreen=""
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  style={{ borderRadius: 8 }}
                  data-testid="music-spotify-iframe"
                />
              ) : (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Ej: <code style={{ color: '#7fe0a1' }}>https://open.spotify.com/playlist/37i9dQZF1DWZ...</code>
                  <br />
                  Reproducción controlada por Spotify (requiere cuenta del GM).
                </p>
              )}
              <a
                href="https://open.spotify.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs flex items-center gap-1"
                style={{ color: '#7fe0a1' }}
              >
                Abrir Spotify <ExternalLink size={11} />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
