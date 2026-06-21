// Unified state hook for the Room page.
//
// Design: ONE source of truth (`state`) regardless of streaming mode.
//
// - Streaming OFF (default for the GM):
//     no WebSocket. Actions are applied through the client-side reducer
//     and the resulting state is persisted to localStorage.
//
// - Streaming ON:
//     opens a WebSocket. The server is authoritative: incoming STATE
//     broadcasts overwrite the single store. Outgoing actions are sent
//     over the wire and the server echoes the new state.
//
// On the OFF→ON transition the GM transparently seeds the room with the
// current local state via the `initialState` field of the JOIN message,
// so the server never sends a stale "default state" broadcast that would
// flicker the board.
//
// The same store remains intact when the GM disables streaming again, so
// they can keep playing locally without losing anything.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LOCAL_BACKEND_URL } from '@/lib/backend';
import { applyAction, defaultState } from '@/lib/localReducer';

function localStateKey(token) {
  return `rsb:local-state:${token}`;
}

function loadStored(token) {
  if (!token) return defaultState();
  try {
    const raw = localStorage.getItem(localStateKey(token));
    if (!raw) return defaultState();
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    return defaultState();
  }
}

function saveStored(token, state) {
  if (!token) return;
  try {
    localStorage.setItem(localStateKey(token), JSON.stringify(state));
  } catch { /* quota / serialization issues are non-fatal */ }
}

function buildWsUrl(apiUrl, token) {
  const base = apiUrl || LOCAL_BACKEND_URL || '';
  return `${base.replace(/^http/, 'ws')}/api/ws/${token}`;
}

export function useGameState({
  token,
  name,
  gmSecret,
  apiUrl,
  streamingEnabled,
  isGMFromUrl,
}) {
  // Single store, hydrated from localStorage on mount.
  const [state, setState] = useState(() => loadStored(token));
  const [users, setUsers] = useState([]);
  const [roomName, setRoomName] = useState('');
  const [you, setYou] = useState(null);
  const [status, setStatus] = useState(streamingEnabled ? 'connecting' : 'idle');

  // Always persist the latest state so a refresh keeps the board even
  // mid-session (including after the WS receives a fresh broadcast).
  useEffect(() => {
    if (token) saveStored(token, state);
  }, [token, state]);

  // Keep a ref of the latest state so the WS effect can seed the JOIN
  // payload without re-running on every state change.
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const wsRef = useRef(null);
  const shouldReconnectRef = useRef(false);

  // ---- WebSocket lifecycle ---------------------------------------------
  useEffect(() => {
    if (!streamingEnabled) {
      shouldReconnectRef.current = false;
      if (wsRef.current) {
        try { wsRef.current.close(); } catch { /* ignore */ }
        wsRef.current = null;
      }
      setStatus('idle');
      setUsers([]);
      setRoomName('');
      setYou(null);
      return undefined;
    }
    if (!token || !name) return undefined;

    shouldReconnectRef.current = true;
    let retryTimer;

    function connect() {
      const ws = new WebSocket(buildWsUrl(apiUrl, token));
      wsRef.current = ws;
      setStatus('connecting');

      ws.onopen = () => {
        setStatus('open');
        const joinMsg = {
          type: 'JOIN',
          name,
          gmSecret: gmSecret || null,
        };
        // GM seeds the room with the current local state on connect.
        // The server applies it BEFORE sending the first STATE broadcast,
        // so the connecting client never sees the default state.
        if (gmSecret && stateRef.current) {
          joinMsg.initialState = stateRef.current;
        }
        ws.send(JSON.stringify(joinMsg));
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === 'WELCOME') {
            setYou(msg.you);
          } else if (msg.type === 'STATE') {
            setState(msg.state);
            setUsers(msg.users || []);
            setRoomName(msg.roomName || '');
          }
        } catch { /* ignore */ }
      };

      ws.onerror = () => setStatus('error');

      ws.onclose = () => {
        setStatus('closed');
        if (shouldReconnectRef.current) {
          retryTimer = setTimeout(connect, 1500);
        }
      };
    }

    connect();

    return () => {
      shouldReconnectRef.current = false;
      clearTimeout(retryTimer);
      if (wsRef.current) {
        try { wsRef.current.close(); } catch { /* ignore */ }
        wsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamingEnabled, token, name, gmSecret, apiUrl]);

  // ---- Send action -----------------------------------------------------
  const send = useCallback((action) => {
    if (streamingEnabled) {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(action));
        return;
      }
      // WS not open yet: apply optimistically so the GM never feels stuck.
    }
    setState((s) => applyAction(s, action));
  }, [streamingEnabled]);

  // Synthesise a local "you" while streaming is OFF so Room.jsx still
  // knows whether the current user has GM privileges.
  const localYou = useMemo(() => {
    if (!name) return null;
    return { name, isGM: !!isGMFromUrl };
  }, [name, isGMFromUrl]);

  const localUsers = useMemo(() => (
    name ? [{ name, isGM: !!isGMFromUrl }] : []
  ), [name, isGMFromUrl]);

  return {
    state,
    you: streamingEnabled ? you : localYou,
    users: streamingEnabled ? users : localUsers,
    roomName: streamingEnabled ? roomName : '',
    status,
    send,
  };
}
