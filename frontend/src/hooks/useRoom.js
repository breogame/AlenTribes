import { useEffect, useRef, useState, useCallback } from 'react';
import { LOCAL_BACKEND_URL } from '@/lib/backend';

// Builds a wss:// URL from a base HTTP URL.
function wsUrl(baseUrl, token) {
  const base = baseUrl || LOCAL_BACKEND_URL || '';
  const wsBase = base.replace(/^http/, 'ws');
  return `${wsBase}/api/ws/${token}`;
}

export function useRoom({ token, name, gmSecret, joinExtras, apiUrl }) {
  const [state, setState] = useState(null);
  const [you, setYou] = useState(null);
  const [users, setUsers] = useState([]);
  const [roomName, setRoomName] = useState('');
  const [status, setStatus] = useState('connecting'); // connecting | open | closed | error
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const shouldReconnectRef = useRef(true);

  const send = useCallback((msg) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  useEffect(() => {
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
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, name, gmSecret, apiUrl]);

  return { state, you, users, roomName, status, error, send };
}
