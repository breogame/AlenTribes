import { useRef, useState, useEffect } from 'react';
import Draggable from 'react-draggable';
import {
  Copy, Edit3, ZoomIn, ZoomOut, RotateCw, Trash2, Info, Swords, Crosshair, Shield, Plus, Minus,
} from 'lucide-react';
import { factionColor } from '@/lib/cardUtils';

function Stepper({ value, onChange, min, disabled, testId, warning }) {
  return (
    <div className="flex items-center gap-1">
      <button
        className="stepper-btn"
        disabled={disabled}
        onClick={() => onChange(Number(value) - 1)}
        data-testid={testId ? `${testId}-dec` : undefined}
        tabIndex={-1}
      >
        <Minus size={11} />
      </button>
      <span
        className={`stat-value ${warning ? 'is-warning' : ''}`}
        data-testid={testId}
      >
        {value ?? 0}
      </span>
      <button
        className="stepper-btn"
        disabled={disabled}
        onClick={() => onChange(Number(value) + 1)}
        data-testid={testId ? `${testId}-inc` : undefined}
        tabIndex={-1}
      >
        <Plus size={11} />
      </button>
    </div>
  );
}

function StatRow({ label, children }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: '0.15rem 0' }}>
      <span className="stat-label">{label}</span>
      {children}
    </div>
  );
}

export default function CharacterCard({
  card, derived, globalScale, isGM, isOverlay,
  onPatch, onMove, onDuplicate, onEdit, onRotate, onDelete, onInfo,
  onAttack, onInitiative, onScaleUp, onScaleDown,
}) {
  const nodeRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [localPos, setLocalPos] = useState(card.position || { x: 120, y: 120 });

  // Sync external updates unless we are currently dragging (avoid jitter).
  useEffect(() => {
    if (!dragging) setLocalPos(card.position || { x: 120, y: 120 });
  }, [card.position, dragging]);

  const factionHex = factionColor(card.colorKey);
  const rotation = card.rotation || 0;
  const cardScale = (card.scale || 1) * (globalScale || 1);

  const isMelee = card.modo !== 'ranged';

  function bumpMax(next) {
    // When user raises aguante, raise maxAguante accordingly.
    const cur = Number(card.aguante) || 0;
    const maxAg = Number(card.maxAguante) || 0;
    const patch = { aguante: Math.max(0, next) };
    if (next > maxAg) patch.maxAguante = next;
    return patch;
  }

  return (
    <Draggable
      nodeRef={nodeRef}
      position={localPos}
      disabled={!isGM}
      onStart={() => setDragging(true)}
      onDrag={(_, data) => setLocalPos({ x: data.x, y: data.y })}
      onStop={(_, data) => {
        setDragging(false);
        onMove({ x: data.x, y: data.y });
      }}
      handle=".card-drag-handle"
      bounds="parent"
    >
      <div
        ref={nodeRef}
        className={`card-frame ${derived.isDead ? 'is-dead' : ''} ${dragging ? 'is-dragging' : ''}`}
        style={{
          position: 'absolute',
          width: 280,
          '--faction-color': factionHex,
          transform: `scale(${cardScale}) rotate(${rotation}deg)`,
          transformOrigin: 'top left',
        }}
        data-testid={`card-${card.id}`}
      >
        {/* Header */}
        <div
          className="card-drag-handle flex items-center justify-between"
          style={{
            padding: '0.55rem 0.7rem',
            background: `linear-gradient(180deg, color-mix(in oklab, ${factionHex} 45%, #0a0a0e), rgba(10,10,14,0.9))`,
            borderBottom: `1px solid ${factionHex}`,
            cursor: isGM ? 'grab' : 'default',
          }}
        >
          <div
            className="font-display truncate"
            style={{
              color: '#f3d58c',
              fontSize: '1.05rem',
              fontWeight: 600,
              letterSpacing: '0.01em',
              maxWidth: 160,
            }}
            title={card.name}
          >
            {card.name}
          </div>
          <div className="flex items-center gap-1">
            {isGM && (
              <>
                <button className="icon-btn" onClick={onDuplicate} title="Duplicar" data-testid={`card-dup-${card.id}`}>
                  <Copy size={12} />
                </button>
                <button className="icon-btn" onClick={onScaleUp} title="Ampliar" data-testid={`card-scaleup-${card.id}`}>
                  <ZoomIn size={12} />
                </button>
                <button className="icon-btn" onClick={onScaleDown} title="Reducir" data-testid={`card-scaledown-${card.id}`}>
                  <ZoomOut size={12} />
                </button>
                <button className="icon-btn" onClick={onEdit} title="Editar" data-testid={`card-edit-${card.id}`}>
                  <Edit3 size={12} />
                </button>
                <button className="icon-btn" onClick={onRotate} title="Rotar 90°" data-testid={`card-rotate-${card.id}`}>
                  <RotateCw size={12} />
                </button>
                <button className="icon-btn danger" onClick={onDelete} title="Eliminar" data-testid={`card-del-${card.id}`}>
                  <Trash2 size={12} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Image + wound indicators */}
        <div style={{ position: 'relative', background: '#000' }}>
          {card.imageUrl ? (
            <img
              src={card.imageUrl}
              alt={card.name}
              className="card-image"
              style={{
                display: 'block',
                width: '100%',
                height: 150,
                objectFit: 'cover',
                filter: 'saturate(0.9)',
              }}
              draggable={false}
            />
          ) : (
            <div
              className="card-image"
              style={{
                width: '100%',
                height: 150,
                background: `linear-gradient(135deg, ${factionHex}33, #000)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.3)',
                fontFamily: 'var(--font-display)',
                fontSize: '2rem',
                letterSpacing: '0.08em',
              }}
            >
              {(card.name || '?').slice(0, 1).toUpperCase()}
            </div>
          )}

          {/* Wound indicators - bottom-left of image */}
          {derived.wounds > 0 && (
            <div
              style={{
                position: 'absolute',
                left: 8, bottom: 8,
                display: 'flex', gap: 4, flexWrap: 'wrap',
                maxWidth: 120,
              }}
              data-testid={`card-wounds-${card.id}`}
            >
              {Array.from({ length: Math.min(derived.wounds, 8) }).map((_, i) => (
                <div key={i} className="wound-indicator" title={`Herida ${i + 1}`}>✕</div>
              ))}
            </div>
          )}

          {/* Info button centered */}
          {!isOverlay && (
            <button
              className="icon-btn"
              onClick={onInfo}
              title="Información"
              data-testid={`card-info-${card.id}`}
              style={{
                position: 'absolute',
                right: 8, bottom: 8,
                background: 'rgba(0,0,0,0.7)',
                borderColor: 'rgba(184,134,11,0.4)',
                color: '#f3d58c',
              }}
            >
              <Info size={13} />
            </button>
          )}

          {/* Mode toggle (only GM) */}
          {isGM && (
            <button
              className="icon-btn"
              onClick={() =>
                onPatch({ modo: isMelee ? 'ranged' : 'melee' })
              }
              title={isMelee ? 'Cambiar a distancia' : 'Cambiar a cuerpo a cuerpo'}
              data-testid={`card-mode-${card.id}`}
              style={{
                position: 'absolute',
                left: 8, top: 8,
                background: 'rgba(0,0,0,0.7)',
                borderColor: 'rgba(255,255,255,0.15)',
                color: isMelee ? '#ff9d9d' : '#a5d1ff',
                width: 28, height: 28,
              }}
            >
              {isMelee ? <Swords size={13} /> : <Crosshair size={13} />}
            </button>
          )}
        </div>

        {/* Stats body */}
        <div
          style={{
            padding: '0.55rem 0.75rem 0.75rem',
            background: 'rgba(8, 8, 12, 0.9)',
            color: 'var(--text-primary)',
          }}
        >
          {/* Armadura + Aguante (same row) */}
          <div className="grid grid-cols-2 gap-2">
            <StatRow label="Armadura">
              <Stepper
                value={card.armadura}
                onChange={(v) => onPatch({ armadura: Math.max(0, v) })}
                disabled={!isGM}
                testId={`card-${card.id}-armadura`}
              />
            </StatRow>
            <StatRow label="Aguante">
              <Stepper
                value={card.aguante}
                onChange={(v) => onPatch(bumpMax(v))}
                disabled={!isGM}
                testId={`card-${card.id}-aguante`}
                warning={derived.aguanteRed}
              />
            </StatRow>
          </div>

          <div className="h-px my-1" style={{ background: 'rgba(255,255,255,0.06)' }} />

          {/* Reservas totales */}
          {isMelee ? (
            <StatRow label="Reserva total C/C">
              <Stepper
                value={card.reservaCC}
                onChange={(v) => onPatch({ reservaCC: Math.max(0, v) })}
                disabled={!isGM}
                testId={`card-${card.id}-reservaCC`}
                warning={derived.reservaCCRed}
              />
            </StatRow>
          ) : (
            <StatRow label="Reserva total distancia">
              <Stepper
                value={card.reservaAD}
                onChange={(v) => onPatch({ reservaAD: Math.max(0, v) })}
                disabled={!isGM}
                testId={`card-${card.id}-reservaAD`}
                warning={derived.reservaADRed}
              />
            </StatRow>
          )}

          {/* Ataque + defensa */}
          {isMelee ? (
            <div className="grid grid-cols-2 gap-2">
              <StatRow label="Ataque C/C">
                <Stepper
                  value={card.ataqueCC}
                  onChange={(v) => onPatch({ ataqueCC: v })}
                  disabled={!isGM}
                  testId={`card-${card.id}-ataqueCC`}
                  warning={derived.atkDefCCRed}
                />
              </StatRow>
              <StatRow label="Defensa C/C">
                <Stepper
                  value={card.defensaCC}
                  onChange={(v) => onPatch({ defensaCC: v })}
                  disabled={!isGM}
                  testId={`card-${card.id}-defensaCC`}
                  warning={derived.atkDefCCRed}
                />
              </StatRow>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <StatRow label="Ataque distancia">
                <Stepper
                  value={card.ataqueAD}
                  onChange={(v) => onPatch({ ataqueAD: v })}
                  disabled={!isGM}
                  testId={`card-${card.id}-ataqueAD`}
                  warning={derived.atkDefADRed}
                />
              </StatRow>
              <StatRow label="Defensa distancia">
                <Stepper
                  value={card.defensaAD}
                  onChange={(v) => onPatch({ defensaAD: v })}
                  disabled={!isGM}
                  testId={`card-${card.id}-defensaAD`}
                  warning={derived.atkDefADRed}
                />
              </StatRow>
            </div>
          )}

          <div className="h-px my-2" style={{ background: 'rgba(184,134,11,0.25)' }} />

          {/* Highlighted bottom row: Attack pool / Focus / Defense level */}
          <div className="flex items-center justify-around">
            {/* Attack pool (clickable to trigger attack roll) */}
            <div className="flex flex-col items-center" style={{ minWidth: 60 }}>
              <span className="stat-label" style={{ marginBottom: 2 }}>Ataque</span>
              <div
                className="stat-clickable font-display"
                style={{ fontSize: '1.8rem', color: '#ffcf7a', lineHeight: 1 }}
                onClick={onAttack}
                data-testid={`card-${card.id}-roll-attack`}
                title="Lanzar dados de ataque"
              >
                {isMelee ? (card.ataqueCC || 0) : (card.ataqueAD || 0)}
              </div>
            </div>

            {/* Focus (clickable to trigger initiative) */}
            <div className="flex flex-col items-center" style={{ minWidth: 60 }}>
              <span className="stat-label" style={{ marginBottom: 2 }}>Foco</span>
              <div className="flex items-center gap-1">
                <button
                  className="stepper-btn"
                  onClick={() => isGM && onPatch({ foco: Math.max(0, (card.foco || 0) - 1) })}
                  disabled={!isGM}
                  tabIndex={-1}
                  data-testid={`card-${card.id}-foco-dec`}
                >
                  <Minus size={11} />
                </button>
                <div
                  className="stat-clickable font-display"
                  style={{
                    fontSize: '1.8rem',
                    color: derived.focoRed ? '#f87171' : '#f3d58c',
                    lineHeight: 1, minWidth: '1.4rem', textAlign: 'center',
                  }}
                  onClick={onInitiative}
                  data-testid={`card-${card.id}-roll-initiative`}
                  title="Lanzar iniciativa"
                >
                  {card.foco || 0}
                </div>
                <button
                  className="stepper-btn"
                  onClick={() => isGM && onPatch({ foco: (card.foco || 0) + 1 })}
                  disabled={!isGM}
                  tabIndex={-1}
                  data-testid={`card-${card.id}-foco-inc`}
                >
                  <Plus size={11} />
                </button>
              </div>
            </div>

            {/* Defense level */}
            <div className="flex flex-col items-center" style={{ minWidth: 60 }}>
              <span className="stat-label" style={{ marginBottom: 2 }}>Defensa</span>
              <div className="flex items-center gap-1">
                <button
                  className="stepper-btn"
                  onClick={() => isGM && onPatch({ defenseRaw: Math.max(1, (card.defenseRaw || 1) - 1) })}
                  disabled={!isGM}
                  tabIndex={-1}
                  data-testid={`card-${card.id}-defense-dec`}
                >
                  <Minus size={11} />
                </button>
                <div
                  className="font-display"
                  style={{ fontSize: '1.8rem', color: '#a5d1ff', lineHeight: 1, minWidth: '1.2rem', textAlign: 'center', display: 'flex', alignItems: 'center', gap: 4 }}
                  data-testid={`card-${card.id}-defense`}
                  title={`Raw: ${card.defenseRaw || 1}`}
                >
                  <Shield size={14} style={{ color: '#4b78a6' }} />
                  {derived.defenseLevel}
                </div>
                <button
                  className="stepper-btn"
                  onClick={() => isGM && onPatch({ defenseRaw: (card.defenseRaw || 1) + 1 })}
                  disabled={!isGM}
                  tabIndex={-1}
                  data-testid={`card-${card.id}-defense-inc`}
                >
                  <Plus size={11} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Draggable>
  );
}
