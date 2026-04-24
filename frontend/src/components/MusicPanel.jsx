import { useEffect, useRef, useState } from 'react';
import { Music, X, Play, Pause, Upload, Volume2, VolumeX, ExternalLink } from 'lucide-react';

function extractSpotifyEmbed(url) {
  if (!url) return null;
  // Accepts open.spotify.com or spotify:... URIs
  const m1 = url.match(/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(track|playlist|album|artist|episode|show)\/([a-zA-Z0-9]+)/);
  if (m1) return `https://open.spotify.com/embed/${m1[1]}/${m1[2]}?utm_source=generator&theme=0`;
  const m2 = url.match(/spotify:(track|playlist|album|artist|episode|show):([a-zA-Z0-9]+)/);
  if (m2) return `https://open.spotify.com/embed/${m2[1]}/${m2[2]}?utm_source=generator&theme=0`;
  return null;
}

export default function MusicPanel() {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState('local'); // 'local' | 'spotify'
  const [localName, setLocalName] = useState('');
  const [localUrl, setLocalUrl] = useState(null);
  const [spotifyInput, setSpotifyInput] = useState('');
  const [spotifyEmbed, setSpotifyEmbed] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.45);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = muted;
    }
  }, [volume, muted]);

  useEffect(() => () => {
    if (localUrl) URL.revokeObjectURL(localUrl);
  }, [localUrl]);

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (localUrl) URL.revokeObjectURL(localUrl);
    const url = URL.createObjectURL(f);
    setLocalUrl(url);
    setLocalName(f.name);
    setTab('local');
    // Try to autoplay after user gesture.
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
      }
    }, 50);
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      audioRef.current.pause();
      setPlaying(false);
    }
  }

  function applySpotify() {
    const embed = extractSpotifyEmbed(spotifyInput.trim());
    setSpotifyEmbed(embed);
    setTab('spotify');
  }

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
          <Music size={16} /> Música {playing && <span style={{ color: '#6ce090' }}>●</span>}
        </button>
      ) : (
        <div className="panel-glass" style={{ padding: '0.85rem', width: 320 }}>
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
              Archivo local
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
                className="hidden"
                onChange={handleFile}
                data-testid="music-file-input"
              />
              <button
                className="ghost-btn flex items-center gap-2 justify-center"
                onClick={() => fileRef.current?.click()}
                data-testid="music-upload"
                style={{ fontSize: '0.85rem' }}
              >
                <Upload size={14} /> {localName || 'Subir pista de audio'}
              </button>

              <audio
                ref={audioRef}
                src={localUrl || undefined}
                onEnded={() => setPlaying(false)}
                loop
                data-testid="music-audio"
              />

              <div className="flex items-center gap-2 mt-1">
                <button
                  className="icon-btn"
                  onClick={togglePlay}
                  disabled={!localUrl}
                  data-testid="music-playpause"
                  style={{ width: 34, height: 34 }}
                >
                  {playing ? <Pause size={15} /> : <Play size={15} />}
                </button>
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
                Los archivos se reproducen solo en tu navegador. Captura el audio del
                navegador en OBS para enviarlo al stream.
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
