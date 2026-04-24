import { X } from 'lucide-react';

export default function InfoDialog({ title, text, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose} data-testid="info-dialog">
      <div className="modal-panel" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-2xl" style={{ color: '#f3d58c', margin: 0 }}>
            {title || 'Información'}
          </h2>
          <button className="icon-btn" onClick={onClose} data-testid="info-close"><X size={14} /></button>
        </div>
        <div
          className="text-sm"
          style={{
            whiteSpace: 'pre-wrap',
            lineHeight: 1.7,
            color: 'var(--text-secondary)',
            background: 'rgba(0,0,0,0.3)',
            padding: '1rem',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.06)',
            minHeight: '4rem',
          }}
          data-testid="info-text"
        >
          {text?.trim() ? text : <em style={{ color: 'var(--text-muted)' }}>Esta carta no tiene descripción.</em>}
        </div>
      </div>
    </div>
  );
}
