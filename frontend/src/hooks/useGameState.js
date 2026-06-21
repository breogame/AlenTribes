// Unified game-state hook for the Room page.
// - When `streamingEnabled` is FALSE (default for GM): pure local state
//   persisted to localStorage, no WebSocket.
// - When `streamingEnabled` is TRUE: opens a WebSocket via useRoom. On the
//   first connection after enabling, the GM pushes their local state via
//   STATE_REPLACE so the server inherits the offline progress.
//
// The public API mimics useRoom: { state, you, users, roomName, status, send }
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRoom } from '@/hooks/useRoom';
import { applyAction, defaultState } from '@/lib/localReducer';

function localStateKey(token) {
  return `rsb:local-state:${token}`;
}

function loadLocalState(token) {
  if (!token) return defaultState();
  try {
    const raw = localStorage.getItem(localStateKey(token));
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed };
  } catch {
    return defaultState();
  }
}

function saveLocalState(token, state) {
  if (!token) return;
  try {
    localStorage.setItem(localStateKey(token), JSON.stringify(state));
  } catch { /* quota / serialization issues are non-fatal */ }
}

export function useGameState({
  token,
  name,
  gmSecret,
  apiUrl,
  streamingEnabled,
  isGMFromUrl,
}) {
  // Local state used when streaming is OFF (or before the WS state arrives).
  const [localState, setLocalState] = useState(() => loadLocalState(token));

  // Persist local state on every change so a refresh keeps the board.
  useEffect(() => {
    if (!streamingEnabled) saveLocalState(token, localState);
  }, [token, localState, streamingEnabled]);

  // Push local state to server once after enabling streaming (GM only).
  // Use a ref so we can both consume and reset the seed across renders.
  const seedRef = useRef(null);
  const prevStreamingRef = useRef(streamingEnabled);
  useEffect(() => {
    const wasOff = prevStreamingRef.current === false;
    if (streamingEnabled && wasOff && isGMFromUrl) {
      // Capture snapshot of current local state to seed the server.
      seedRef.current = localState;
    }
    prevStreamingRef.current = streamingEnabled;
    // localState intentionally not in deps: we only want to seed on transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamingEnabled, isGMFromUrl]);

  const onWsOpen = useCallback((send) => {
    const seed = seedRef.current;
    if (seed && gmSecret) {
      send({ type: 'STATE_REPLACE', payload: { state: seed } });
      seedRef.current = null;
    }
  }, [gmSecret]);

  const ws = useRoom({
    token,
    name,
    gmSecret,
    apiUrl,
    enabled: !!streamingEnabled,
    onOpen: onWsOpen,
  });

  // When streaming is OFF, we synthesize a "you" object so the rest of the
  // Room component can decide if the GM has board-write permission.
  const localYou = useMemo(() => {
    if (!name) return null;
    return { name, isGM: !!isGMFromUrl };
  }, [name, isGMFromUrl]);

  // Unified send: either route over WS or apply locally.
  const sendUnified = useCallback((action) => {
    if (streamingEnabled) {
      // Optimistic local apply for GM-only actions is unnecessary because the
      // server immediately echoes the new STATE. For DICE_ROLL we also rely on
      // the server echo.
      const sent = ws.send(action);
      if (sent) return;
      // WS not open yet: fall back to local apply so the UI stays responsive.
    }
    setLocalState((s) => applyAction(s, action));
  }, [streamingEnabled, ws]);

  // Pick the active state. While streaming, the WS state is authoritative.
  const activeState = streamingEnabled ? (ws.state || localState) : localState;
  const activeYou = streamingEnabled ? (ws.you || localYou) : localYou;
  const activeUsers = streamingEnabled ? ws.users : (name ? [{ name, isGM: !!isGMFromUrl }] : []);
  const activeRoomName = streamingEnabled ? ws.roomName : '';
  const activeStatus = streamingEnabled ? ws.status : 'idle';

  return {
    state: activeState,
    you: activeYou,
    users: activeUsers,
    roomName: activeRoomName,
    status: activeStatus,
    send: sendUnified,
  };
}
