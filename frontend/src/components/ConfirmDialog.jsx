import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ title, message, confirmLabel = 'Eliminar', onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel} data-testid="confirm-dialog">
      <div className="modal-panel" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          <div
            style={{
              width: 40, height: 40, borderRadius: 8,
              background: 'rgba(139, 0, 0, 0.25)',
              border: '1px solid rgba(255, 100, 100, 0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#ff9d9d',
            }}
          >
            <AlertTriangle size={20} />
          </div>
          <h2 className="font-display text-xl" style={{ color: '#f3d58c', margin: 0 }}>
            {title || 'Confirmar'}
          </h2>
        </div>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          {message}
        </p>
        <div className="flex justify-end gap-2">
          <button className="ghost-btn" onClick={onCancel} data-testid="confirm-cancel">Cancelar</button>
          <button
            className="brass-btn"
            style={{ background: 'linear-gradient(180deg, #B22222, #5e0e0e)', color: '#ffecec', borderColor: 'rgba(255, 100, 100, 0.4)' }}
            onClick={onConfirm}
            data-testid="confirm-ok"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
