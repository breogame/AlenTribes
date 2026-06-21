// Top-center pinned ribbon shown while the GM has streaming enabled.
// Gives an unambiguous, persistent reminder that viewers and the OBS
// overlay can see the board live. Hidden entirely when streaming is OFF.
import { Radio, StopCircle } from 'lucide-react';

export default function StreamingRibbon({ status, userCount, isGM, onStop }) {
  const isLive = status === 'open';
  const isConnecting = status === 'connecting';
  const dotClass = isLive
    ? 'streaming-ribbon__dot streaming-ribbon__dot--live'
    : isConnecting
      ? 'streaming-ribbon__dot streaming-ribbon__dot--connecting'
      : 'streaming-ribbon__dot streaming-ribbon__dot--idle';

  const label = isLive
    ? 'En vivo'
    : isConnecting
      ? 'Conectando…'
      : status === 'error'
        ? 'Error de conexión'
        : 'Sin conexión';

  // Count viewers only (exclude the GM themselves from the audience number).
  const audience = Math.max(0, (userCount || 0) - (isGM ? 1 : 0));
  const audienceLabel = audience === 1
    ? '1 espectador'
    : `${audience} espectadores`;

  return (
    <div
      className="streaming-ribbon"
      role="status"
      aria-live="polite"
      data-testid="streaming-ribbon"
    >
      <Radio size={13} style={{ color: isLive ? '#e74c3c' : '#f3d58c', opacity: 0.95 }} />
      <span className={dotClass} aria-hidden="true" />
      <span data-testid="streaming-ribbon-label">{label}</span>
      <span className="streaming-ribbon__sep" />
      <span data-testid="streaming-ribbon-audience" style={{ color: 'rgba(243, 213, 140, 0.75)' }}>
        {audienceLabel}
      </span>
      {isGM && onStop && (
        <>
          <span className="streaming-ribbon__sep" />
          <button
            type="button"
            className="streaming-ribbon__stop"
            onClick={onStop}
            data-testid="streaming-ribbon-stop"
            title="Detener la retransmisión y volver al modo local"
          >
            <StopCircle size={11} />
            Detener
          </button>
        </>
      )}
    </div>
  );
}
