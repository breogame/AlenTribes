import { useEffect, useState } from 'react';
import { dieColor, colorTokens, rollTypeLabels, formatTime } from '@/lib/diceLogic';
import { Trash2, Minus, ChevronDown } from 'lucide-react';

const MIN_KEY = 'rsb:history-panel-min';

function DieSquare({ value, color, size = 44 }) {
  return (
    <div
      className="wood-square"
      style={{
        width: size,
        height: size,
        color: colorTokens[color] || colorTokens.neutral,
        fontSize: size < 50 ? '1.25rem' : '2rem',
      }}
    >
      {value}
    </div>
  );
}

function RollEntry({ roll, highlight }) {
  const sides = roll.sides;
  const type = roll.type;
  const squareSize = highlight ? 62 : 38;
  return (
    <div
      className="roll-entry"
      style={{
        padding: highlight ? '0.9rem 0.9rem' : '0.6rem 0.75rem',
        borderRadius: 8,
        background: highlight
          ? 'rgba(184, 134, 11, 0.08)'
          : 'rgba(20, 20, 24, 0.55)',
        border: `1px solid ${highlight ? 'rgba(184,134,11,0.35)' : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <div>
          <div
            className="font-display"
            style={{
              color: '#f3d58c',
              fontSize: highlight ? '1.1rem' : '0.95rem',
              lineHeight: 1.1,
            }}
          >
            {roll.user}
          </div>
          <div className="label-caps" style={{ marginTop: 3 }}>
            {rollTypeLabels[type] || type} · D{sides}
          </div>
        </div>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {formatTime(roll.at)}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {roll.dice.map((v, i) => (
          <DieSquare
            key={i}
            value={v}
            color={dieColor(v, type, sides)}
            size={squareSize}
          />
        ))}
        {roll.dice.length > 1 && (
          <div
            className="ml-1 label-caps"
            style={{ color: '#e8cd8c', fontSize: highlight ? '0.8rem' : '0.65rem' }}
          >
            Total: <strong style={{ color: '#fff' }}>{roll.total}</strong>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RollHistoryPanel({ history, isGM, onClear }) {
  const list = history || [];
  const [minimized, setMinimized] = useState(() => {
    try { return localStorage.getItem(MIN_KEY) === '1'; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem(MIN_KEY, minimized ? '1' : '0'); } catch { /* ignore */ }
  }, [minimized]);

  const panelStyle = minimized
    ? { position: 'absolute', right: 16, top: 16, width: 220, zIndex: 50 }
    : { position: 'absolute', right: 16, top: 16, bottom: 16, width: 280, zIndex: 50, display: 'flex', flexDirection: 'column' };

  return (
    <div style={panelStyle} className="panel-glass" data-testid="roll-history-panel">
      <div className="flex items-center justify-between px-3" style={{ paddingTop: 12, paddingBottom: minimized ? 10 : 12 }}>
        <div className="flex items-center gap-2">
          <div className="font-display" style={{ color: '#f3d58c', fontSize: minimized ? '0.95rem' : '1.1rem' }}>
            Historial
          </div>
          {minimized && list.length > 0 && (
            <span className="label-caps" style={{ color: 'var(--text-muted)' }}>
              {list.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isGM && list.length > 0 && !minimized && (
            <button
              className="icon-btn danger"
              onClick={onClear}
              title="Limpiar historial"
              data-testid="history-clear"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            className="icon-btn"
            onClick={() => setMinimized((m) => !m)}
            data-testid="history-minimize"
            title={minimized ? 'Expandir historial' : 'Minimizar historial'}
            style={{ width: 24, height: 24 }}
          >
            {minimized ? <ChevronDown size={13} /> : <Minus size={13} />}
          </button>
        </div>
      </div>

      {!minimized && (
        <div
          className="thin-scroll"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0 0.75rem 0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
          data-testid="history-scroll"
        >
          {list.length === 0 ? (
            <div
              className="text-sm text-center"
              style={{ color: 'var(--text-muted)', padding: '2rem 0.5rem' }}
            >
              Sin tiradas aún. Lanza los dados desde la esquina inferior.
            </div>
          ) : (
            list.map((roll, idx) => (
              <RollEntry key={roll.id} roll={roll} highlight={idx === 0} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
