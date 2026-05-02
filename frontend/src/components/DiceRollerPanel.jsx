import { useRef, useState, useEffect } from 'react';
import Draggable from 'react-draggable';
import { Swords, Zap, Target, Dices, Minus, GripVertical, ChevronUp } from 'lucide-react';

const POS_KEY = 'rsb:dice-panel-pos';
const MIN_KEY = 'rsb:dice-panel-min';

function loadPos() {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { x: 0, y: 0 };
}

function Block({ title, color, icon, onRoll, dataTestId, maxQty = 20 }) {
  const [qty, setQty] = useState(1);
  const [shaking, setShaking] = useState(false);

  function doRoll() {
    const q = Math.max(1, Math.min(maxQty, Number(qty) || 1));
    setShaking(true);
    setTimeout(() => setShaking(false), 420);
    onRoll(q);
  }

  return (
    <div className="dice-block" data-testid={`dice-block-${dataTestId}`}>
      <div className="flex items-center gap-2">
        <span style={{ color }}>{icon}</span>
        <h4>{title}</h4>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span className="label-caps">Dados</span>
        <input
          type="number"
          min={1}
          max={maxQty}
          className="qty-input"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          data-testid={`dice-qty-${dataTestId}`}
        />
        <button
          className={`roll-btn ${color === '#c8efdc' ? 'forest' : color === '#ffe8b5' ? 'brass' : ''} ${shaking ? 'dice-shake' : ''}`}
          onClick={doRoll}
          data-testid={`dice-roll-${dataTestId}`}
        >
          Tirar
        </button>
      </div>
    </div>
  );
}

export default function DiceRollerPanel({ diceType, onRoll }) {
  const nodeRef = useRef(null);
  const [pos, setPos] = useState(loadPos);
  const [minimized, setMinimized] = useState(() => {
    try { return localStorage.getItem(MIN_KEY) === '1'; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem(MIN_KEY, minimized ? '1' : '0'); } catch { /* ignore */ }
  }, [minimized]);

  function handleStop(_, data) {
    const next = { x: data.x, y: data.y };
    setPos(next);
    try { localStorage.setItem(POS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }

  return (
    <Draggable
      nodeRef={nodeRef}
      position={pos}
      onStop={handleStop}
      handle=".dice-drag-handle"
      bounds="parent"
    >
      <div
        ref={nodeRef}
        style={{
          position: 'absolute',
          left: 16, bottom: 16, zIndex: 50,
          width: minimized ? 'auto' : 290,
        }}
        className="panel-glass no-select"
        data-testid="dice-roller-panel"
      >
        <div
          className="dice-drag-handle flex items-center justify-between px-3"
          style={{
            paddingTop: minimized ? 8 : 12,
            paddingBottom: minimized ? 8 : 4,
            cursor: 'grab',
            borderBottom: minimized ? 'none' : '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div className="flex items-center gap-2">
            <GripVertical size={14} style={{ color: 'rgba(255,220,150,0.5)' }} />
            <div
              className="font-display"
              style={{
                color: '#f3d58c',
                fontSize: minimized ? '0.95rem' : '1.1rem',
                lineHeight: 1,
              }}
            >
              Lanzadores
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="label-caps flex items-center gap-1">
              <Dices size={12} /> D{diceType}
            </div>
            <button
              className="icon-btn"
              onClick={() => setMinimized((m) => !m)}
              data-testid="dice-minimize"
              title={minimized ? 'Expandir' : 'Minimizar'}
              style={{ width: 24, height: 24 }}
            >
              {minimized ? <ChevronUp size={13} /> : <Minus size={13} />}
            </button>
          </div>
        </div>

        {!minimized && (
          <div className="flex flex-col gap-2 p-3 pt-2">
            <Block
              title="Ataque"
              icon={<Swords size={16} />}
              color="#ff9d9d"
              dataTestId="attack"
              onRoll={(q) => onRoll({ type: 'attack', quantity: q })}
            />
            <Block
              title="Iniciativa"
              icon={<Zap size={16} />}
              color="#ffe8b5"
              dataTestId="initiative"
              onRoll={(q) => onRoll({ type: 'initiative', quantity: q })}
            />
            <Block
              title="Acción"
              icon={<Target size={16} />}
              color="#c8efdc"
              dataTestId="action"
              onRoll={(q) => onRoll({ type: 'action', quantity: q })}
            />
          </div>
        )}
      </div>
    </Draggable>
  );
}
