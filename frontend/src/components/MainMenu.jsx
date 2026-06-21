import { useRef, useState, useEffect } from 'react';
import {
  Plus, Library, Save, Upload, Dice6, ZoomIn, ZoomOut, RotateCcw,
  Trash2, Image as ImageIcon, Share2, MonitorPlay, Minus, ChevronDown,
  Radio, Users,
} from 'lucide-react';
import { toast } from 'sonner';

const MIN_KEY = 'rsb:main-menu-min';

// Soft and hard limits for the background file. Videos longer than a few
// seconds quickly grow past localStorage's quota (~5 MB) and slow down WS
// broadcasts, so we warn at 8 MB and refuse above 40 MB.
const BG_SIZE_WARN = 8 * 1024 * 1024;
const BG_SIZE_LIMIT = 40 * 1024 * 1024;

export default function MainMenu({
  isGM, roomName, users, diceType, soundOn, globalScale, status,
  onCreateCard, onOpenLibrary, onSave, onLoadFile, onOpenDiceSettings,
  onScaleUp, onScaleDown, onScaleReset, onClearBoard, onChangeBackground,
  backgroundShade, onChangeBackgroundShade,
  onShareLink, onOpenOverlay,
  streamingEnabled, onToggleStreaming,
  onOpenPjDice, pjDicePolling,
}) {
  const fileInputRef = useRef(null);
  const bgInputRef = useRef(null);
  const [minimized, setMinimized] = useState(() => {
    try { return localStorage.getItem(MIN_KEY) === '1'; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem(MIN_KEY, minimized ? '1' : '0'); } catch { /* ignore */ }
  }, [minimized]);

  function handleLoadClick() {
    fileInputRef.current?.click();
  }

  function handleLoadFile(e) {
    const f = e.target.files?.[0];
    if (f) onLoadFile(f);
    e.target.value = '';
  }

  function handleBgClick() {
    bgInputRef.current?.click();
  }

  function handleBgFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = '';

    const isVideo = (f.type || '').startsWith('video/');
    const isImage = (f.type || '').startsWith('image/');
    if (!isVideo && !isImage) {
      toast.error('Formato no soportado. Usa una imagen o un vídeo (mp4, webm, ogg).');
      return;
    }
    if (f.size > BG_SIZE_LIMIT) {
      toast.error(`El archivo es demasiado grande (${(f.size / 1024 / 1024).toFixed(1)} MB). Máx. ${BG_SIZE_LIMIT / 1024 / 1024} MB.`);
      return;
    }
    if (isVideo && f.size > BG_SIZE_WARN) {
      toast.warning(`Vídeo de ${(f.size / 1024 / 1024).toFixed(1)} MB · puede que no se guarde en localStorage. Considera comprimirlo (loops cortos en webm rinden mejor).`);
    }

    const reader = new FileReader();
    reader.onload = () => onChangeBackground(reader.result);
    reader.onerror = () => toast.error('No se pudo leer el archivo.');
    reader.readAsDataURL(f);
  }

  const statusColor = !streamingEnabled
    ? '#8a8a8a'
    : status === 'open'
      ? '#6ce090'
      : status === 'connecting'
        ? '#f0c86c'
        : '#f07a7a';
  const statusLabel = !streamingEnabled
    ? 'local'
    : status === 'open'
      ? 'en vivo'
      : status === 'connecting'
        ? 'conectando'
        : 'sin conexión';

  return (
    <div
      className="panel-glass"
      style={{
        position: 'absolute',
        top: 16, left: 16, zIndex: 50,
        width: minimized ? 220 : 260,
        padding: minimized ? '0.55rem 0.75rem' : '0.9rem 0.9rem 1rem',
      }}
      data-testid="main-menu"
    >
      <div className="flex items-center justify-between gap-2">
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            className="font-display truncate"
            style={{
              color: '#f3d58c',
              fontSize: minimized ? '0.95rem' : '1.1rem',
              lineHeight: 1.1,
            }}
            title={roomName}
          >
            {roomName || 'Sala'}
          </div>
          <div className="label-caps" style={{ marginTop: minimized ? 2 : 4 }}>
            <span style={{ color: statusColor }} title={statusLabel}>●</span>{' '}
            {users.length} {users.length === 1 ? 'usuario' : 'usuarios'}
            {isGM && <span style={{ color: '#e8cd8c' }}> · GM</span>}
          </div>
        </div>
        <button
          className="icon-btn"
          onClick={() => setMinimized((m) => !m)}
          data-testid="main-menu-minimize"
          title={minimized ? 'Expandir menú' : 'Minimizar menú'}
          style={{ width: 24, height: 24, flexShrink: 0 }}
        >
          {minimized ? <ChevronDown size={13} /> : <Minus size={13} />}
        </button>
      </div>

      {!minimized && (
        <>
          <div className="h-px my-2" style={{ background: 'rgba(255,255,255,0.08)' }} />

          {isGM ? (
            <>
              <button className="menu-btn" onClick={onCreateCard} data-testid="menu-create-card">
                <Plus size={16} /> Crear una carta
              </button>
              <button className="menu-btn" onClick={onOpenLibrary} data-testid="menu-library">
                <Library size={16} /> Biblioteca
              </button>
              <button className="menu-btn" onClick={onSave} data-testid="menu-save">
                <Save size={16} /> Guardar cartas
              </button>
              <button className="menu-btn" onClick={handleLoadClick} data-testid="menu-load">
                <Upload size={16} /> Cargar cartas
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".yaml,.yml,.json,application/json,text/yaml"
                className="hidden"
                onChange={handleLoadFile}
                data-testid="input-load-file"
              />

              <div className="h-px my-2" style={{ background: 'rgba(255,255,255,0.08)' }} />

              <button className="menu-btn" onClick={onOpenDiceSettings} data-testid="menu-dice-settings">
                <Dice6 size={16} /> Dado ({`D${diceType}`}{soundOn ? ' · 🔈' : ' · muted'})
              </button>
              <div className="flex items-center gap-2 px-1 mt-1">
                <button className="icon-btn" onClick={onScaleUp} data-testid="menu-scale-up" title="Aumentar escala global">
                  <ZoomIn size={14} />
                </button>
                <button className="icon-btn" onClick={onScaleDown} data-testid="menu-scale-down" title="Disminuir escala global">
                  <ZoomOut size={14} />
                </button>
                <button className="icon-btn" onClick={onScaleReset} data-testid="menu-scale-reset" title="Resetear escala">
                  <RotateCcw size={14} />
                </button>
                <span className="label-caps" style={{ marginLeft: 'auto' }}>
                  {Math.round(globalScale * 100)}%
                </span>
              </div>

              <div className="h-px my-2" style={{ background: 'rgba(255,255,255,0.08)' }} />

              <button className="menu-btn" onClick={handleBgClick} data-testid="menu-change-bg">
                <ImageIcon size={16} /> Cambiar fondo
              </button>
              <input
                ref={bgInputRef}
                type="file"
                accept="image/*,video/mp4,video/webm,video/ogg,video/quicktime"
                className="hidden"
                onChange={handleBgFile}
                data-testid="input-bg-file"
              />
              <div
                className="flex items-center gap-2 px-2 mt-1"
                data-testid="menu-bg-shade-row"
              >
                <span className="label-caps" style={{ minWidth: 48 }}>Sombra</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={backgroundShade ?? 55}
                  onChange={(e) => onChangeBackgroundShade(Number(e.target.value))}
                  className="flex-1"
                  data-testid="menu-bg-shade"
                  title="Oscurecimiento del fondo"
                />
                <span
                  className="label-caps"
                  style={{ minWidth: 32, textAlign: 'right' }}
                  data-testid="menu-bg-shade-value"
                >
                  {Math.round(backgroundShade ?? 55)}%
                </span>
              </div>
              <button className="menu-btn" onClick={onClearBoard} data-testid="menu-clear" style={{ color: '#f58585' }}>
                <Trash2 size={16} /> Limpiar tablero
              </button>

              <div className="h-px my-2" style={{ background: 'rgba(255,255,255,0.08)' }} />

              <button
                className="menu-btn"
                onClick={onOpenPjDice}
                data-testid="menu-pj-dice"
                title="Generar / mostrar el token de tiradas para jugadores que usen PJ.html"
              >
                <Users size={16} />
                Tiradas PJ
                {pjDicePolling && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: '0.62rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: '#6ce090',
                    }}
                    data-testid="menu-pj-dice-status"
                    title="Escuchando tiradas externas cada 3s"
                  >
                    ● Activo
                  </span>
                )}
              </button>

              <button
                className="menu-btn"
                onClick={onToggleStreaming}
                data-testid="menu-toggle-streaming"
                title={
                  streamingEnabled
                    ? 'Detener retransmisión: vuelves al modo local sin WebSocket.'
                    : 'Activar retransmisión: abre la conexión para jugadores y overlay OBS.'
                }
                style={{
                  color: streamingEnabled ? '#6ce090' : '#e8cd8c',
                  borderColor: streamingEnabled ? 'rgba(108,224,144,0.35)' : undefined,
                }}
              >
                <Radio size={16} />
                {streamingEnabled ? 'Retransmisión activa' : 'Habilitar retransmisión'}
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: '0.65rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: streamingEnabled ? '#6ce090' : '#8a8a8a',
                  }}
                  data-testid="menu-streaming-state"
                >
                  {streamingEnabled ? 'ON' : 'OFF'}
                </span>
              </button>

              {streamingEnabled && (
                <>
                  <button className="menu-btn" onClick={onShareLink} data-testid="menu-share">
                    <Share2 size={16} /> Compartir enlace
                  </button>
                  <button className="menu-btn" onClick={onOpenOverlay} data-testid="menu-overlay">
                    <MonitorPlay size={16} /> Abrir overlay OBS
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <div className="text-sm" style={{ color: 'var(--text-secondary)', padding: '0.4rem 0' }}>
                Solo el GM puede modificar el tablero. Puedes lanzar dados desde abajo y consultar la
                información de las cartas tocando el icono <strong>i</strong>.
              </div>
              <button className="menu-btn" onClick={onOpenDiceSettings} data-testid="menu-dice-settings">
                <Dice6 size={16} /> Dado ({`D${diceType}`}{soundOn ? ' · 🔈' : ' · muted'})
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
