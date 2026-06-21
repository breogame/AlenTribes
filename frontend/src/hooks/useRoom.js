import { useEffect, useRef, useState, useCallback } from 'react';
import { LOCAL_BACKEND_URL } from '@/lib/backend';

// Builds a wss:// URL from a base HTTP URL.
function wsUrl(baseUrl, token) {
  const base = baseUrl || LOCAL_BACKEND_URL || '';
  const wsBase = base.replace(/^http/, 'ws');
  return `${wsBase}/api/ws/${token}`;
}

export function useRoom({
  token,
  name,
  gmSecret,
  joinExtras,
  apiUrl,
  enabled = true,
  // Optional callback invoked once the WS opens AND the JOIN handshake
  // is sent. Receives a `send(msg)` fn so the caller can push seed state
  // (e.g. STATE_REPLACE after a local-only session).
  onOpen,
}) {
  const [state, setState] = useState(null);
  const [you, setYou] = useState(null);
  const [users, setUsers] = useState([]);
  const [roomName, setRoomName] = useState('');
  const [status, setStatus] = useState(enabled ? 'connecting' : 'idle');
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const shouldReconnectRef = useRef(true);
  const onOpenRef = useRef(onOpen);

  // Keep ref to latest onOpen without re-triggering the effect.
  useEffect(() => { onOpenRef.current = onOpen; }, [onOpen]);

  const send = useCallback((msg) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (!enabled) {
      // Tear down any existing connection.
      shouldReconnectRef.current = false;
      if (wsRef.current) {
        try { wsRef.current.close(); } catch { /* ignore */ }
        wsRef.current = null;
      }
      setStatus('idle');
      setUsers([]);
      setYou(null);
      setRoomName('');
      return undefined;
    }
    if (!token || !name) return undefined;
    shouldReconnectRef.current = true;
    let retryTimer;

    function connect() {
      const ws = new WebSocket(wsUrl(apiUrl, token));
      wsRef.current = ws;
      setStatus('connecting');

      ws.onopen = () => {
        setStatus('open');
        ws.send(JSON.stringify({
          type: 'JOIN',
          name,
          gmSecret: gmSecret || null,
          ...(joinExtras || {}),
        }));
        if (typeof onOpenRef.current === 'function') {
          try { onOpenRef.current(send); } catch { /* ignore */ }
        }
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
          } else if (msg.type === 'ERROR') {
            setError(msg.message || 'Error');
          }
        } catch {
          /* ignore */
        }
      };

      ws.onerror = () => {
        setStatus('error');
      };

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
  }, [token, name, gmSecret, apiUrl, enabled]);

  return { state, you, users, roomName, status, error, send };
}
