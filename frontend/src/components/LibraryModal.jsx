import { X, Plus, Trash2, Save } from 'lucide-react';
import { FACTION_COLORS, factionColor } from '@/lib/cardUtils';

export default function LibraryModal({
  library, onClose, onPlaceOnBoard, onRemove, onSaveCurrentBoardToLibrary, isGM,
}) {
  return (
    <div className="modal-overlay" onClick={onClose} data-testid="library-modal">
      <div className="modal-panel wide" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl" style={{ color: '#f3d58c', margin: 0 }}>
            Biblioteca de cartas
          </h2>
          <div className="flex items-center gap-2">
            {isGM && (
              <button
                className="ghost-btn flex items-center gap-2"
                onClick={onSaveCurrentBoardToLibrary}
                data-testid="library-save-board"
                title="Guardar cartas actuales del tablero en la biblioteca"
              >
                <Save size={14} /> Guardar tablero en biblioteca
              </button>
            )}
            <button className="icon-btn" onClick={onClose} data-testid="library-close"><X size={14} /></button>
          </div>
        </div>

        {library.length === 0 ? (
          <div className="text-sm text-center py-10" style={{ color: 'var(--text-muted)' }}>
            La biblioteca está vacía. Guarda cartas del tablero o importa un archivo YAML/JSON desde el menú
            principal para añadirlas aquí.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {library.map((tpl) => (
              <div
                key={tpl.name}
                className="p-3 rounded-lg"
                style={{
                  background: 'rgba(20,20,26,0.6)',
                  border: `1px solid ${factionColor(tpl.colorKey)}66`,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  {tpl.imageUrl ? (
                    <img
                      src={tpl.imageUrl}
                      alt={tpl.name}
                      style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 48, height: 48, borderRadius: 6,
                        background: `linear-gradient(135deg, ${factionColor(tpl.colorKey)}, #000)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-display)', color: '#fff', fontSize: '1.2rem',
                      }}
                    >
                      {tpl.name?.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-display truncate"
                      style={{ color: '#f3d58c', fontSize: '1rem' }}
                      title={tpl.name}
                    >
                      {tpl.name}
                    </div>
                    <div className="label-caps" style={{ fontSize: '0.58rem' }}>
                      {FACTION_COLORS.find((f) => f.key === tpl.colorKey)?.name || 'Sin bando'}
                    </div>
                  </div>
                </div>
                <div className="text-xs line-clamp-3" style={{ color: 'var(--text-muted)', minHeight: '2.5rem' }}>
                  {tpl.description || '—'}
                </div>
                {isGM && (
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      className="brass-btn flex items-center gap-1 flex-1"
                      style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                      onClick={() => onPlaceOnBoard(tpl)}
                      data-testid={`library-place-${tpl.name}`}
                    >
                      <Plus size={14} /> Al tablero
                    </button>
                    <button
                      className="icon-btn danger"
                      onClick={() => onRemove(tpl.name)}
                      title="Quitar de la biblioteca"
                      data-testid={`library-remove-${tpl.name}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
