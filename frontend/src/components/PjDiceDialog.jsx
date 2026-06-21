// Dialog shown when the GM clicks "Token de tiradas PJ" in the main menu.
// - Creates or reuses a dice-session token (stored per room in localStorage).
// - Lets the GM copy the token and a sample JSON payload for PJ.html.
// - Surfaces a "regenerate" action that creates a fresh token.
import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Copy, Check, RefreshCw, Dice6 } from 'lucide-react';
import { toast } from 'sonner';

function copyText(text) {
  try {
    navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function PjDiceDialog({
  diceToken,
  diceSessionName,
  apiUrl,
  polling,
  onCreated,
  onRegenerate,
  onClose,
}) {
  const [creating, setCreating] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const requestedRef = useRef(false);
  const onCreatedRef = useRef(onCreated);
  useEffect(() => { onCreatedRef.current = onCreated; }, [onCreated]);

  // Auto-create a session the first time the dialog is shown without one.
  // The fetch is fired exactly once thanks to `requestedRef`. We deliberately
  // do NOT cancel the in-flight request when the effect cleanup runs (which
  // happens in React StrictMode's double-invocation in dev) — the response
  // is safe to forward to the parent even if this dialog instance unmounts,
  // and the parent state survives across remounts.
  useEffect(() => {
    if (diceToken || requestedRef.current) return undefined;
    requestedRef.current = true;
    setCreating(true);
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${apiUrl}/api/dice/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Tiradas PJ' }),
        });
        const data = await res.json();
        if (data?.token) {
          onCreatedRef.current?.(data);
        } else {
          toast.error('No se pudo crear la sesión de dados');
          requestedRef.current = false;
        }
      } catch {
        toast.error('No se pudo crear la sesión de dados');
        requestedRef.current = false;
      } finally {
        if (mounted) setCreating(false);
      }
    })();
    return () => { mounted = false; };
  }, [diceToken, apiUrl]);

  const submitUrl = useMemo(() => `${apiUrl}/api/dice/submit`, [apiUrl]);
  const samplePayload = useMemo(() => JSON.stringify({
    auth: diceToken || '<token>',
    pj_name: 'Luis',
    dice_type: 'd6',
    dice_result: [1, 4, 2, 6],
  }, null, 2), [diceToken]);

  function handleCopy(key, value) {
    if (copyText(value)) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
      toast.success('Copiado al portapapeles');
    }
  }

  function handleRegenerate() {
    if (!window.confirm('Se generará un nuevo token y los jugadores deberán actualizar el suyo. ¿Continuar?')) return;
    onRegenerate();
  }

  return (
    <div className="modal-overlay" onClick={onClose} data-testid="pj-dice-dialog">
      <div className="modal-panel" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl flex items-center gap-2" style={{ color: '#f3d58c', margin: 0 }}>
            <Dice6 size={22} /> Token de tiradas para PJ
          </h2>
          <button className="icon-btn" onClick={onClose} data-testid="pj-dice-close">
            <X size={14} />
          </button>
        </div>

        <p className="text-sm mb-3" style={{ color: 'var(--text-muted)', lineHeight: 1.55 }}>
          Comparte este token con los jugadores que usen <strong style={{ color: '#e8cd8c' }}>PJ.html</strong>. Cuando tiren los dados allí,
          sus resultados llegarán automáticamente a tu historial de tiradas — incluso si la retransmisión está desactivada.
        </p>

        {/* Token */}
        <div className="label-caps" style={{ marginBottom: 6 }}>Token</div>
        <div
          className="flex items-center gap-2 p-2 rounded-lg"
          style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(184,134,11,0.3)' }}
        >
          <code
            className="flex-1 text-sm overflow-x-auto thin-scroll"
            style={{ color: '#f3d58c', padding: '0.25rem 0.5rem', fontFamily: 'monospace', whiteSpace: 'nowrap' }}
            data-testid="pj-dice-token"
          >
            {diceToken || (creating ? 'Generando…' : 'Sin token')}
          </code>
          <button
            className="brass-btn flex items-center gap-2"
            style={{ padding: '0.4rem 0.7rem', fontSize: '0.85rem' }}
            disabled={!diceToken}
            onClick={() => diceToken && handleCopy('token', diceToken)}
            data-testid="pj-dice-copy-token"
          >
            {copiedKey === 'token' ? <Check size={14} /> : <Copy size={14} />}
            {copiedKey === 'token' ? 'Copiado' : 'Copiar'}
          </button>
        </div>

        {/* Endpoint */}
        <div className="label-caps" style={{ marginTop: 14, marginBottom: 6 }}>Endpoint (POST)</div>
        <div
          className="flex items-center gap-2 p-2 rounded-lg"
          style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <code
            className="flex-1 text-xs overflow-x-auto thin-scroll"
            style={{ color: '#cfd6dc', padding: '0.25rem 0.5rem', fontFamily: 'monospace', whiteSpace: 'nowrap' }}
            data-testid="pj-dice-endpoint"
          >
            {submitUrl}
          </code>
          <button
            className="brass-btn flex items-center gap-2"
            style={{ padding: '0.4rem 0.7rem', fontSize: '0.85rem' }}
            onClick={() => handleCopy('endpoint', submitUrl)}
            data-testid="pj-dice-copy-endpoint"
          >
            {copiedKey === 'endpoint' ? <Check size={14} /> : <Copy size={14} />}
            {copiedKey === 'endpoint' ? 'Copiado' : 'Copiar'}
          </button>
        </div>

        {/* Sample payload */}
        <div className="label-caps" style={{ marginTop: 14, marginBottom: 6 }}>Payload de ejemplo</div>
        <div
          style={{
            position: 'relative',
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 8,
          }}
        >
          <pre
            className="text-xs thin-scroll"
            style={{
              margin: 0,
              padding: '0.75rem 0.9rem',
              color: '#cfd6dc',
              fontFamily: 'monospace',
              maxHeight: 160,
              overflow: 'auto',
              whiteSpace: 'pre',
            }}
            data-testid="pj-dice-sample"
          >
            {samplePayload}
          </pre>
          <button
            className="icon-btn"
            onClick={() => handleCopy('sample', samplePayload)}
            data-testid="pj-dice-copy-sample"
            style={{ position: 'absolute', top: 6, right: 6 }}
            title="Copiar payload"
          >
            {copiedKey === 'sample' ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>

        <div
          className="flex items-center justify-between mt-4 text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          <span data-testid="pj-dice-poll-status">
            {polling ? (
              <span style={{ color: '#6ce090' }}>● Escuchando tiradas cada 3s…</span>
            ) : (
              <span>○ Polling inactivo</span>
            )}
            {diceSessionName ? <span style={{ marginLeft: 8 }}>· {diceSessionName}</span> : null}
          </span>
          <button
            className="menu-btn"
            style={{ width: 'auto', padding: '0.35rem 0.7rem', color: '#f3a59c', borderColor: 'rgba(231,76,60,0.3)' }}
            onClick={handleRegenerate}
            disabled={!diceToken}
            data-testid="pj-dice-regenerate"
          >
            <RefreshCw size={13} /> Regenerar token
          </button>
        </div>
      </div>
    </div>
  );
}
