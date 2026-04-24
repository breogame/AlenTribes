import { useRef } from 'react';
import {
  Plus, Library, Save, Upload, Dice6, ZoomIn, ZoomOut, RotateCcw,
  Trash2, Image as ImageIcon, Share2, Music, MonitorPlay,
} from 'lucide-react';

export default function MainMenu({
  isGM, roomName, users, diceType, soundOn, globalScale, status,
  onCreateCard, onOpenLibrary, onSave, onLoadFile, onOpenDiceSettings,
  onScaleUp, onScaleDown, onScaleReset, onClearBoard, onChangeBackground,
  onShareLink, onOpenOverlay, onToggleMusic, musicVisible,
}) {
  const fileInputRef = useRef(null);
  const bgInputRef = useRef(null);

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
    const reader = new FileReader();
    reader.onload = () => onChangeBackground(reader.result);
    reader.readAsDataURL(f);
    e.target.value = '';
  }

  const statusColor = status === 'open' ? '#6ce090' : status === 'connecting' ? '#f0c86c' : '#f07a7a';

  return (
    <div
      className="panel-glass"
      style={{
        position: 'absolute',
        top: 16, left: 16, zIndex: 50,
        width: 260,
        padding: '0.9rem 0.9rem 1rem',
      }}
      data-testid="main-menu"
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-display text-lg" style={{ color: '#f3d58c', lineHeight: 1.1 }}>
            {roomName || 'Sala'}
          </div>
          <div className="label-caps" style={{ marginTop: 4 }}>
            <span style={{ color: statusColor }}>●</span>{' '}
            {users.length} {users.length === 1 ? 'usuario' : 'usuarios'}
            {isGM && <span style={{ color: '#e8cd8c' }}> · GM</span>}
          </div>
        </div>
      </div>

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
            accept="image/*"
            className="hidden"
            onChange={handleBgFile}
            data-testid="input-bg-file"
          />
          <button className="menu-btn" onClick={onShareLink} data-testid="menu-share">
            <Share2 size={16} /> Compartir enlace
          </button>
          <button className="menu-btn" onClick={onOpenOverlay} data-testid="menu-overlay">
            <MonitorPlay size={16} /> Abrir overlay OBS
          </button>
          <button className="menu-btn" onClick={onToggleMusic} data-testid="menu-music">
            <Music size={16} /> {musicVisible ? 'Ocultar música' : 'Mostrar música'}
          </button>
          <button className="menu-btn" onClick={onClearBoard} data-testid="menu-clear" style={{ color: '#f58585' }}>
            <Trash2 size={16} /> Limpiar tablero
          </button>
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
    </div>
  );
}
