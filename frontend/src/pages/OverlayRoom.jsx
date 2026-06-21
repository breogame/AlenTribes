import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useRoom } from '@/hooks/useRoom';
import CharacterCard from '@/components/CharacterCard';
import RollHistoryPanel from '@/components/RollHistoryPanel';
import BoardBackground from '@/components/BoardBackground';
import { computeDerived } from '@/lib/cardUtils';
import { resolveBackendUrl } from '@/lib/backend';

const DEFAULT_BG = '/bg-overlay.png';

export default function OverlayRoom() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const transparent = searchParams.get('transparent') === '1';
  const showHistory = searchParams.get('noHistory') !== '1';
  const apiParam = searchParams.get('api');
  const apiUrl = resolveBackendUrl(apiParam);

  const { state, status } = useRoom({
    token,
    name: 'OBS Overlay',
    gmSecret: null,
    joinExtras: { overlay: true },
    apiUrl,
  });

  useEffect(() => {
    document.title = 'Tablero · Overlay';
    // For transparent OBS browser sources, make body transparent.
    if (transparent) {
      document.documentElement.style.background = 'transparent';
      document.body.style.background = 'transparent';
    }
    return () => {
      document.documentElement.style.background = '';
      document.body.style.background = '';
    };
  }, [transparent]);

  const cards = state?.cards || [];
  const history = state?.history || [];
  const globalScale = state?.scale || 1;
  const background = state?.background || DEFAULT_BG;
  const backgroundShade = state?.backgroundShade ?? 55;

  return (
    <div
      className="board-root no-select"
      style={transparent ? { background: 'transparent' } : undefined}
      data-testid="overlay-root"
    >
      {!transparent && <BoardBackground background={background} shade={backgroundShade} />}
      {!transparent && <div className="grain-overlay" />}

      <div className="board-surface">
        {cards.map((card) => (
          <CharacterCard
            key={card.id}
            card={card}
            derived={computeDerived(card)}
            globalScale={globalScale}
            isGM={false}
            isOverlay
            onPatch={() => {}}
            onMove={() => {}}
            onDuplicate={() => {}}
            onEdit={() => {}}
            onRotate={() => {}}
            onDelete={() => {}}
            onInfo={() => {}}
            onAttack={() => {}}
            onInitiative={() => {}}
          />
        ))}
      </div>

      {showHistory && (
        <RollHistoryPanel history={history} isGM={false} onClear={() => {}} />
      )}

      {status !== 'open' && (
        <div
          className="panel-glass"
          style={{
            position: 'absolute', left: 16, top: 16, zIndex: 60,
            padding: '0.5rem 0.9rem', fontSize: '0.85rem', color: '#f0c86c',
          }}
          data-testid="overlay-status"
        >
          {status === 'connecting' ? 'Conectando…' : 'Reconectando…'}
        </div>
      )}
    </div>
  );
}
