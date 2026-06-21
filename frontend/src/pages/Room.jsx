import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useGameState } from '@/hooks/useGameState';
import { usePjDicePoll } from '@/hooks/usePjDicePoll';
import MainMenu from '@/components/MainMenu';
import DiceRollerPanel from '@/components/DiceRollerPanel';
import RollHistoryPanel from '@/components/RollHistoryPanel';
import CharacterCard from '@/components/CharacterCard';
import JoinModal from '@/components/JoinModal';
import CreateCardModal from '@/components/CreateCardModal';
import LibraryModal from '@/components/LibraryModal';
import DiceSettingsModal from '@/components/DiceSettingsModal';
import ShareLinkDialog from '@/components/ShareLinkDialog';
import PjDiceDialog from '@/components/PjDiceDialog';
import InfoDialog from '@/components/InfoDialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import MusicPanel from '@/components/MusicPanel';
import StreamingRibbon from '@/components/StreamingRibbon';
import { computeDerived, newCardTemplate, clampCardPatch, strippedTemplateFromCard } from '@/lib/cardUtils';
import { resolveBackendUrl } from '@/lib/backend';
import { performRoll } from '@/lib/diceLogic';
import { playDiceSound } from '@/lib/diceSound';
import { toast } from 'sonner';
import yaml from 'js-yaml';

const DEFAULT_BG = '/bg-overlay.png';
const STREAMING_KEY_PREFIX = 'rsb:streaming:';
const PJ_DICE_KEY_PREFIX = 'rsb:pj-dice:';

export default function Room() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const isGMParam = searchParams.get('gm') === '1';
  const apiParam = searchParams.get('api');
  const apiUrl = resolveBackendUrl(apiParam);

  const [gmSecret, setGmSecret] = useState(null);
  const [myName, setMyName] = useState(null);
  const [localRoomName, setLocalRoomName] = useState('');

  // Streaming toggle (per-room). Default OFF for the GM so no WebSocket is
  // opened until they explicitly enable it. Players (no `?gm=1`) always
  // need streaming ON since they connect via the shared link.
  const [streamingEnabled, setStreamingEnabled] = useState(() => {
    if (!isGMParam) return true; // players are remote viewers
    if (!token) return false;
    try {
      return localStorage.getItem(STREAMING_KEY_PREFIX + token) === '1';
    } catch { return false; }
  });

  useEffect(() => {
    if (!isGMParam || !token) return;
    try {
      localStorage.setItem(STREAMING_KEY_PREFIX + token, streamingEnabled ? '1' : '0');
    } catch { /* ignore */ }
  }, [isGMParam, token, streamingEnabled]);

  // Modal state
  const [showJoin, setShowJoin] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showDiceSettings, setShowDiceSettings] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showPjDice, setShowPjDice] = useState(false);
  const [infoText, setInfoText] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null); // {id, name}
  const [lastRollAt, setLastRollAt] = useState(0);

  // PJ dice session: token persisted per room so polling resumes on refresh.
  const [pjDice, setPjDice] = useState(() => {
    if (!token) return null;
    try {
      const raw = localStorage.getItem(PJ_DICE_KEY_PREFIX + token);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  useEffect(() => {
    if (!token) return;
    try {
      if (pjDice && pjDice.token) {
        localStorage.setItem(PJ_DICE_KEY_PREFIX + token, JSON.stringify(pjDice));
      } else {
        localStorage.removeItem(PJ_DICE_KEY_PREFIX + token);
      }
    } catch { /* ignore */ }
  }, [token, pjDice]);

  // Resolve stored GM credentials / player name on mount
  useEffect(() => {
    if (!token) return;
    if (isGMParam) {
      try {
        const raw = localStorage.getItem(`rsb:gm:${token}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          setGmSecret(parsed.gmSecret);
          setMyName(parsed.name || 'Game Master');
          setLocalRoomName(parsed.roomName || '');
          setShowJoin(false);
          return;
        }
      } catch { /* ignore */ }
    }
    // Player path: check stored name
    try {
      const raw = localStorage.getItem(`rsb:player:${token}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.name) {
          setMyName(parsed.name);
          setShowJoin(false);
          return;
        }
      }
    } catch { /* ignore */ }
    setShowJoin(true);
  }, [token, isGMParam]);

  function handleJoin(name) {
    try {
      localStorage.setItem(`rsb:player:${token}`, JSON.stringify({ name }));
    } catch { /* ignore */ }
    setMyName(name);
    setShowJoin(false);
  }

  const { state, you, users, roomName, status, send } = useGameState({
    token,
    name: myName,
    gmSecret,
    apiUrl,
    streamingEnabled,
    isGMFromUrl: isGMParam,
  });

  const isGM = !!you?.isGM;
  const soundOn = state?.soundEnabled !== false;
  const diceType = state?.diceType || 6;
  const globalScale = state?.scale || 1;
  const background = state?.background || DEFAULT_BG;
  const backgroundShade = state?.backgroundShade ?? 55;

  // Heartbeat used to recompute "PJ activos" so it expires after 5 minutes
  // without any new event. We tick every 30 seconds.
  const [activityTick, setActivityTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setActivityTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Distinct PJ names whose last roll arrived within the last 5 minutes.
  const pjActiveCount = useMemo(() => {
    const list = state?.history || [];
    if (!list.length) return 0;
    const cutoff = Date.now() - 5 * 60 * 1000;
    const names = new Set();
    for (const r of list) {
      if (r?.type !== 'pj') continue;
      const t = new Date(r.at).getTime();
      if (Number.isFinite(t) && t >= cutoff) names.add(r.user || '');
    }
    return names.size;
    // activityTick included so the count expires as time passes even when
    // no new history events arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.history, activityTick]);

  // PJ.html players post rolls to /api/dice/submit. We poll for new rolls
  // and forward them into the unified history through the same DICE_ROLL
  // action used by the in-board dice rollers — so they also propagate over
  // WebSocket when the GM has streaming enabled.
  const handleExternalRoll = useCallback((roll) => {
    if (!roll) return;
    send({ type: 'DICE_ROLL', payload: { roll } });
    setLastRollAt(Date.now());
    if (soundOn) playDiceSound();
    toast.info(`Tirada de ${roll.user || 'PJ'} (${roll.dice?.length || 0}×D${roll.sides || 6})`);
  }, [send, soundOn]);

  usePjDicePoll({
    diceToken: pjDice?.token || '',
    apiUrl,
    enabled: !!(isGM && pjDice?.token),
    onRoll: handleExternalRoll,
  });

  // --- Actions (only available when GM, except dice rolls) ---
  function createCard(cardData) {
    const template = newCardTemplate({ overrides: cardData });
    send({ type: 'CARD_CREATE', payload: { card: template } });
  }

  function updateCard(card) {
    send({ type: 'CARD_UPDATE', payload: { card } });
  }

  function patchCard(id, patch) {
    send({ type: 'CARD_PATCH', payload: { id, patch: clampCardPatch(patch) } });
  }

  function deleteCard(id) {
    send({ type: 'CARD_DELETE', payload: { id } });
  }

  function duplicateCard(id) {
    send({ type: 'CARD_DUPLICATE', payload: { id } });
  }

  function clearBoard() {
    if (!window.confirm('¿Eliminar todas las cartas del tablero?')) return;
    send({ type: 'BOARD_CLEAR', payload: {} });
  }

  function addToLibrary(cards) {
    send({ type: 'LIBRARY_UPSERT', payload: { cards } });
  }

  function removeFromLibrary(name) {
    send({ type: 'LIBRARY_REMOVE', payload: { name } });
  }

  function putOnBoardFromLibrary(template) {
    createCard({ ...template });
  }

  function saveBoard() {
    const cards = (state?.cards || []).map(strippedTemplateFromCard);
    const data = yaml.dump({ cards }, { noRefs: true, indent: 2 });
    const blob = new Blob([data], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cartas_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Cartas exportadas');
  }

  function loadFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      let parsed;
      try {
        parsed = yaml.load(text);
      } catch {
        try {
          parsed = JSON.parse(text);
        } catch {
          toast.error('Archivo no válido (YAML/JSON)');
          return;
        }
      }
      const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.cards) ? parsed.cards : [];
      if (!arr.length) {
        toast.error('El archivo no contiene cartas');
        return;
      }
      addToLibrary(arr);
      toast.success(`${arr.length} cartas añadidas a la biblioteca`);
    };
    reader.readAsText(file);
  }

  function setScale(next) {
    send({ type: 'SCALE_SET', payload: { scale: next } });
  }

  function setDiceType(type) {
    send({ type: 'DICE_TYPE_SET', payload: { diceType: type } });
  }

  function setSound(enabled) {
    send({ type: 'SOUND_SET', payload: { enabled } });
  }

  function setBackground(dataUrl) {
    send({ type: 'BG_SET', payload: { background: dataUrl } });
  }

  function setBackgroundShade(shade) {
    send({ type: 'BG_SHADE_SET', payload: { shade } });
  }

  function clearHistory() {
    send({ type: 'HISTORY_CLEAR', payload: {} });
  }

  function roll({ type, quantity, overrideDiceType }) {
    if (!myName) return;
    const effective = type === 'initiative'
      ? 6  // initiative uses d3 internally (ignored by performRoll)
      : (overrideDiceType || diceType);
    const result = performRoll({ type, quantity, diceType: effective });
    const rollRecord = {
      id: (crypto.randomUUID && crypto.randomUUID()) || String(Date.now() + Math.random()),
      user: myName,
      type,
      dice: result.dice,
      sides: result.sides,
      quantity: result.quantity,
      total: result.total,
      diceType: effective,
      at: new Date().toISOString(),
    };
    send({ type: 'DICE_ROLL', payload: { roll: rollRecord } });
    setLastRollAt(Date.now());
    if (soundOn) playDiceSound();
  }

  function rollAttackFromCard(card) {
    const attackPool = card.modo === 'ranged' ? Number(card.ataqueAD) || 0 : Number(card.ataqueCC) || 0;
    if (attackPool <= 0) {
      toast.warning('La reserva de ataque está vacía');
      return;
    }
    roll({ type: 'attack', quantity: attackPool });
  }

  function rollInitiativeFromCard(card) {
    const foco = Number(card.foco) || 0;
    if (foco <= 0) {
      toast.warning('Esta carta no tiene puntos de foco');
      return;
    }
    roll({ type: 'initiative', quantity: foco });
  }

  // --- Rendering ---

  const cards = state?.cards || [];
  const history = state?.history || [];
  const library = state?.library || [];

  const bgStyle = useMemo(() => ({
    backgroundImage: `url(${background})`,
    '--bg-shade': backgroundShade / 100,
  }), [background, backgroundShade]);

  return (
    <div className="board-root no-select" data-testid="board-root">
      <div className="board-bg" style={bgStyle} />
      <div className="grain-overlay" />

      {streamingEnabled && myName && (
        <StreamingRibbon
          status={status}
          userCount={users.length}
          isGM={isGM}
          pjActiveCount={pjActiveCount}
          onStop={isGM ? () => {
            setStreamingEnabled(false);
            toast.info('Retransmisión detenida · jugando en local');
          } : null}
        />
      )}

      <div className="board-surface">
        {cards.map((card) => (
          <CharacterCard
            key={card.id}
            card={card}
            derived={computeDerived(card)}
            globalScale={globalScale}
            isGM={isGM}
            onPatch={(patch) => patchCard(card.id, patch)}
            onUpdateFull={(c) => updateCard(c)}
            onMove={(pos) => patchCard(card.id, { position: pos })}
            onDuplicate={() => duplicateCard(card.id)}
            onEdit={() => setEditingCard(card)}
            onRotate={() =>
              patchCard(card.id, { rotation: ((card.rotation || 0) + 90) % 360 })
            }
            onDelete={() => setConfirmDel({ id: card.id, name: card.name })}
            onInfo={() => setInfoText({ title: card.name, text: card.description })}
            onAttack={() => rollAttackFromCard(card)}
            onInitiative={() => rollInitiativeFromCard(card)}
          />
        ))}
      </div>

      {/* Top left: Main menu */}
      {myName && (
        <MainMenu
          isGM={isGM}
          roomName={roomName || localRoomName}
          users={users}
          diceType={diceType}
          soundOn={soundOn}
          globalScale={globalScale}
          status={status}
          onCreateCard={() => setShowCreate(true)}
          onOpenLibrary={() => setShowLibrary(true)}
          onSave={saveBoard}
          onLoadFile={loadFile}
          onOpenDiceSettings={() => setShowDiceSettings(true)}
          onScaleUp={() => setScale(Math.min(2.0, globalScale + 0.1))}
          onScaleDown={() => setScale(Math.max(0.5, globalScale - 0.1))}
          onScaleReset={() => setScale(1.0)}
          onClearBoard={clearBoard}
          onChangeBackground={setBackground}
          backgroundShade={backgroundShade}
          onChangeBackgroundShade={setBackgroundShade}
          onShareLink={() => setShowShare(true)}
          onOpenOverlay={() => {
            const q = apiParam ? `?api=${apiParam}` : '';
            window.open(`/room/${token}/overlay${q}`, '_blank', 'noopener,noreferrer');
          }}
          streamingEnabled={streamingEnabled}
          onToggleStreaming={() => {
            setStreamingEnabled((prev) => {
              const next = !prev;
              if (next) {
                toast.success('Retransmisión activada · WebSocket conectándose');
              } else {
                toast.info('Retransmisión detenida · jugando en local');
              }
              return next;
            });
          }}
          onOpenPjDice={() => setShowPjDice(true)}
          pjDicePolling={!!(isGM && pjDice?.token)}
        />
      )}

      {/* Bottom left: dice rollers */}
      {myName && (
        <DiceRollerPanel
          diceType={diceType}
          onRoll={roll}
          triggerKey={lastRollAt}
        />
      )}

      {/* Right: roll history */}
      {myName && (
        <RollHistoryPanel
          history={history}
          currentUser={myName}
          isGM={isGM}
          onClear={clearHistory}
        />
      )}

      {/* Music panel (GM only, persistent so tracks are not lost) */}
      {myName && isGM && <MusicPanel />}

      {/* Modals */}
      {showJoin && (
        <JoinModal onSubmit={handleJoin} defaultName={isGMParam ? 'Game Master' : ''} />
      )}

      {showCreate && (
        <CreateCardModal
          initial={null}
          onCancel={() => setShowCreate(false)}
          onSubmit={(data) => {
            createCard(data);
            setShowCreate(false);
          }}
        />
      )}

      {editingCard && (
        <CreateCardModal
          initial={editingCard}
          onCancel={() => setEditingCard(null)}
          onSubmit={(data) => {
            updateCard({ ...editingCard, ...data });
            setEditingCard(null);
          }}
        />
      )}

      {showLibrary && (
        <LibraryModal
          library={library}
          onClose={() => setShowLibrary(false)}
          onPlaceOnBoard={(tpl) => {
            putOnBoardFromLibrary(tpl);
            toast.success(`"${tpl.name}" añadida al tablero`);
          }}
          onRemove={removeFromLibrary}
          onSaveCurrentBoardToLibrary={() => {
            const tpls = cards.map(strippedTemplateFromCard);
            addToLibrary(tpls);
            toast.success('Cartas actuales guardadas en la biblioteca');
          }}
          isGM={isGM}
        />
      )}

      {showDiceSettings && (
        <DiceSettingsModal
          diceType={diceType}
          soundOn={soundOn}
          onChangeDice={setDiceType}
          onChangeSound={setSound}
          onClose={() => setShowDiceSettings(false)}
        />
      )}

      {showShare && (
        <ShareLinkDialog
          token={token}
          apiParam={apiParam}
          onClose={() => setShowShare(false)}
        />
      )}

      {showPjDice && isGM && (
        <PjDiceDialog
          diceToken={pjDice?.token || ''}
          diceSessionName={pjDice?.name || ''}
          apiUrl={apiUrl}
          polling={!!(pjDice?.token)}
          onCreated={(data) => {
            setPjDice({ token: data.token, name: data.name });
            toast.success('Token de tiradas PJ creado');
          }}
          onRegenerate={async () => {
            try {
              const res = await fetch(`${apiUrl}/api/dice/session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: pjDice?.name || 'Tiradas PJ' }),
              });
              const data = await res.json();
              if (data?.token) {
                setPjDice({ token: data.token, name: data.name });
                toast.success('Nuevo token generado');
              } else {
                toast.error('No se pudo regenerar el token');
              }
            } catch {
              toast.error('No se pudo regenerar el token');
            }
          }}
          onClose={() => setShowPjDice(false)}
        />
      )}

      {infoText && (
        <InfoDialog
          title={infoText.title}
          text={infoText.text}
          onClose={() => setInfoText(null)}
        />
      )}

      {confirmDel && (
        <ConfirmDialog
          title="Eliminar carta"
          message={`¿Seguro que quieres eliminar "${confirmDel.name}"? Esta acción no se puede deshacer.`}
          onCancel={() => setConfirmDel(null)}
          onConfirm={() => {
            deleteCard(confirmDel.id);
            setConfirmDel(null);
          }}
        />
      )}
    </div>
  );
}
