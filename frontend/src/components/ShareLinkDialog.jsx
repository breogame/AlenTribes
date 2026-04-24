import { useMemo, useState } from 'react';
import { X, Copy, Check } from 'lucide-react';

export default function ShareLinkDialog({ token, onClose }) {
  const [copied, setCopied] = useState(false);
  const link = useMemo(() => `${window.location.origin}/room/${token}`, [token]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} data-testid="share-dialog">
      <div className="modal-panel" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl" style={{ color: '#f3d58c', margin: 0 }}>
            Invitar jugadores
          </h2>
          <button className="icon-btn" onClick={onClose} data-testid="share-close"><X size={14} /></button>
        </div>

        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
          Comparte este enlace. Cuando entren, solo tendrán que indicar su nombre.
          No requiere registro ni contraseña.
        </p>

        <div
          className="flex items-center gap-2 p-2 rounded-lg"
          style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(184,134,11,0.3)' }}
        >
          <code
            className="flex-1 text-sm overflow-x-auto thin-scroll"
            style={{ color: '#f3d58c', padding: '0.25rem 0.5rem', fontFamily: 'monospace', whiteSpace: 'nowrap' }}
            data-testid="share-link"
          >
            {link}
          </code>
          <button
            className="brass-btn flex items-center gap-2"
            style={{ padding: '0.5rem 0.9rem', fontSize: '0.9rem' }}
            onClick={copy}
            data-testid="share-copy"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>

        <div className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
          Código de sala: <strong style={{ color: '#e8cd8c' }}>{token}</strong>
        </div>
      </div>
    </div>
  );
}
