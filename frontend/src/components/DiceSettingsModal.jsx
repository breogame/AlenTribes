import { X, Volume2, VolumeX, Dices } from 'lucide-react';

export default function DiceSettingsModal({ diceType, soundOn, onChangeDice, onChangeSound, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose} data-testid="dice-settings-modal">
      <div className="modal-panel" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl" style={{ color: '#f3d58c', margin: 0 }}>
            Configuración de dados
          </h2>
          <button className="icon-btn" onClick={onClose} data-testid="dice-settings-close"><X size={14} /></button>
        </div>

        <div className="mb-4">
          <div className="label-caps mb-2">Tipo de dado</div>
          <div className="flex gap-2">
            {[6, 12].map((n) => (
              <button
                key={n}
                className={`px-4 py-3 rounded-lg flex items-center gap-2 transition-all`}
                onClick={() => onChangeDice(n)}
                data-testid={`dice-type-${n}`}
                style={{
                  flex: 1,
                  background: diceType === n
                    ? 'linear-gradient(180deg, #B8860B, #5a4210)'
                    : 'rgba(20,20,26,0.6)',
                  border: diceType === n
                    ? '1px solid rgba(255,220,150,0.5)'
                    : '1px solid rgba(255,255,255,0.08)',
                  color: diceType === n ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                }}
              >
                <Dices size={18} /> D{n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="label-caps mb-2">Sonido de tirada</div>
          <button
            className="flex items-center gap-2 px-4 py-3 rounded-lg w-full"
            onClick={() => onChangeSound(!soundOn)}
            data-testid="dice-sound-toggle"
            style={{
              background: soundOn
                ? 'linear-gradient(180deg, #1B4D3E, #0A2620)'
                : 'rgba(20,20,26,0.6)',
              border: soundOn ? '1px solid rgba(90,180,140,0.35)' : '1px solid rgba(255,255,255,0.08)',
              color: soundOn ? '#c8efdc' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontSize: '0.95rem',
            }}
          >
            {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
            {soundOn ? 'Activado' : 'Desactivado'}
          </button>
        </div>

        <div className="flex justify-end mt-6">
          <button className="brass-btn" onClick={onClose} data-testid="dice-settings-done">Hecho</button>
        </div>
      </div>
    </div>
  );
}
