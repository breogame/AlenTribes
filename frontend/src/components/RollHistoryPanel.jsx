import { useEffect, useMemo, useRef, useState } from 'react';
import { dieColor, colorTokens, rollTypeLabels, formatTime } from '@/lib/diceLogic';
import { Trash2, Minus, ChevronDown, Filter, X, User } from 'lucide-react';

const MIN_KEY = 'rsb:history-panel-min';

// Filter values:
//   'all'       → show everything
//   'mine'      → only the local user's rolls (history.user === currentUser)
//   'pj'        → only externally submitted PJ rolls (type === 'pj')
//   'user:Name' → only rolls from a specific player
const STORED_FILTER_KEY = 'rsb:history-filter';

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

function FilterChip({ active, onClick, children, testid }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testid}
      style={{
        padding: '0.2rem 0.55rem',
        borderRadius: 999,
        fontSize: '0.65rem',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        fontWeight: 600,
        border: active
          ? '1px solid rgba(243, 213, 140, 0.55)'
          : '1px solid rgba(255,255,255,0.1)',
        background: active ? 'rgba(243, 213, 140, 0.14)' : 'rgba(0,0,0,0.25)',
        color: active ? '#f3d58c' : 'var(--text-muted)',
        cursor: 'pointer',
        transition: 'all 140ms ease',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

export default function RollHistoryPanel({ history, currentUser, isGM, onClear }) {
  const list = history || [];
  const [minimized, setMinimized] = useState(() => {
    try { return localStorage.getItem(MIN_KEY) === '1'; } catch { return false; }
  });
  const [filter, setFilter] = useState(() => {
    try { return localStorage.getItem(STORED_FILTER_KEY) || 'all'; } catch { return 'all'; }
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(MIN_KEY, minimized ? '1' : '0'); } catch { /* ignore */ }
  }, [minimized]);

  useEffect(() => {
    try { localStorage.setItem(STORED_FILTER_KEY, filter); } catch { /* ignore */ }
  }, [filter]);

  // Close the player dropdown on outside click.
  useEffect(() => {
    if (!userMenuOpen) return undefined;
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [userMenuOpen]);

  // Distinct player names found in the current history.
  const distinctUsers = useMemo(() => {
    const set = new Set();
    for (const r of list) if (r?.user) set.add(r.user);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [list]);

  // If the active "user:<Name>" filter no longer matches anyone in the
  // history (e.g. the history was cleared), reset to 'all'.
  useEffect(() => {
    if (filter.startsWith('user:')) {
      const target = filter.slice(5);
      if (!distinctUsers.includes(target)) setFilter('all');
    }
  }, [filter, distinctUsers]);

  const filtered = useMemo(() => {
    if (filter === 'all') return list;
    if (filter === 'mine') return list.filter((r) => r.user === currentUser);
    if (filter === 'pj') return list.filter((r) => r.type === 'pj');
    if (filter.startsWith('user:')) {
      const target = filter.slice(5);
      return list.filter((r) => r.user === target);
    }
    return list;
  }, [list, filter, currentUser]);

  const panelStyle = minimized
    ? { position: 'absolute', right: 16, top: 16, width: 220, zIndex: 50 }
    : { position: 'absolute', right: 16, top: 16, bottom: 16, width: 280, zIndex: 50, display: 'flex', flexDirection: 'column' };

  const activeUserName = filter.startsWith('user:') ? filter.slice(5) : null;
  const filterLabel = filter === 'all'
    ? null
    : filter === 'mine'
      ? 'mías'
      : filter === 'pj'
        ? 'PJ'
        : activeUserName;

  return (
    <div style={panelStyle} className="panel-glass" data-testid="roll-history-panel">
      <div className="flex items-center justify-between px-3" style={{ paddingTop: 12, paddingBottom: minimized ? 10 : 12 }}>
        <div className="flex items-center gap-2">
          <div className="font-display" style={{ color: '#f3d58c', fontSize: minimized ? '0.95rem' : '1.1rem' }}>
            Historial
          </div>
          {minimized && filtered.length > 0 && (
            <span className="label-caps" style={{ color: 'var(--text-muted)' }}>
              {filtered.length}
            </span>
          )}
          {!minimized && filterLabel && (
            <span
              className="label-caps"
              data-testid="history-active-filter"
              style={{
                color: '#7ec8e3',
                background: 'rgba(126, 200, 227, 0.1)',
                border: '1px solid rgba(126, 200, 227, 0.25)',
                padding: '2px 6px',
                borderRadius: 6,
                fontSize: '0.62rem',
              }}
              title="Filtro activo"
            >
              {filterLabel}
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
          className="px-3"
          style={{ paddingBottom: 8, display: 'flex', flexDirection: 'column', gap: 6 }}
          data-testid="history-filters"
        >
          <div className="flex items-center gap-1 flex-wrap">
            <Filter size={11} style={{ color: 'var(--text-muted)' }} />
            <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} testid="history-filter-all">
              Todos
            </FilterChip>
            <FilterChip
              active={filter === 'mine'}
              onClick={() => setFilter('mine')}
              testid="history-filter-mine"
            >
              Mías
            </FilterChip>
            <FilterChip active={filter === 'pj'} onClick={() => setFilter('pj')} testid="history-filter-pj">
              PJ
            </FilterChip>
            <div ref={userMenuRef} style={{ position: 'relative' }}>
              <FilterChip
                active={!!activeUserName}
                onClick={() => setUserMenuOpen((o) => !o)}
                testid="history-filter-user-btn"
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <User size={10} />
                  {activeUserName || 'Jugador'}
                  <ChevronDown size={10} />
                </span>
              </FilterChip>
              {userMenuOpen && (
                <div
                  className="panel-glass"
                  data-testid="history-filter-user-menu"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    right: 0,
                    minWidth: 160,
                    maxHeight: 240,
                    overflowY: 'auto',
                    padding: 4,
                    zIndex: 60,
                  }}
                >
                  {distinctUsers.length === 0 ? (
                    <div className="text-xs px-2 py-2" style={{ color: 'var(--text-muted)' }}>
                      Sin jugadores aún
                    </div>
                  ) : (
                    distinctUsers.map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => { setFilter(`user:${u}`); setUserMenuOpen(false); }}
                        data-testid={`history-filter-user-${u}`}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          padding: '0.35rem 0.55rem',
                          borderRadius: 6,
                          fontSize: '0.78rem',
                          color: activeUserName === u ? '#f3d58c' : '#cfd6dc',
                          background: activeUserName === u ? 'rgba(243,213,140,0.1)' : 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {u}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {filter !== 'all' && (
              <button
                type="button"
                onClick={() => setFilter('all')}
                data-testid="history-filter-clear"
                title="Quitar filtro"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                <X size={11} />
              </button>
            )}
          </div>
          {filter !== 'all' && (
            <div className="label-caps" style={{ color: 'var(--text-muted)', fontSize: '0.62rem' }}>
              {filtered.length} de {list.length}
            </div>
          )}
        </div>
      )}

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
          {filtered.length === 0 ? (
            <div
              className="text-sm text-center"
              style={{ color: 'var(--text-muted)', padding: '2rem 0.5rem' }}
            >
              {filter === 'all'
                ? 'Sin tiradas aún. Lanza los dados desde la esquina inferior.'
                : 'Ninguna tirada coincide con el filtro.'}
            </div>
          ) : (
            filtered.map((roll, idx) => (
              <RollEntry key={roll.id} roll={roll} highlight={idx === 0} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
