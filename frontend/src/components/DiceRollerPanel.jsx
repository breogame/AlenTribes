import { useState, useEffect } from 'react';
import { Swords, Zap, Target, Dices } from 'lucide-react';

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
  const [pulseKey, setPulseKey] = useState(0);
  useEffect(() => { setPulseKey((k) => k + 1); }, [diceType]);

  return (
    <div
      style={{
        position: 'absolute',
        left: 16, bottom: 16, zIndex: 50,
        display: 'flex', flexDirection: 'column', gap: 10, width: 290,
      }}
      className="panel-glass"
      data-testid="dice-roller-panel"
    >
      <div className="flex items-center justify-between px-3 pt-3">
        <div className="font-display text-lg" style={{ color: '#f3d58c' }}>Lanzadores</div>
        <div className="label-caps flex items-center gap-1">
          <Dices size={12} /> D{diceType}
        </div>
      </div>
      <div className="flex flex-col gap-2 p-3 pt-0">
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
    </div>
  );
}
