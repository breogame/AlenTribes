// Polls /api/dice/{token}/rolls every few seconds and forwards new rolls
// into the GM's roll history via the unified `send` action. Works the same
// whether streaming is ON or OFF.
import { useEffect, useRef } from 'react';

const POLL_INTERVAL_MS = 3000;

export function usePjDicePoll({ diceToken, apiUrl, enabled, onRoll }) {
  // Track the most recent roll timestamp we've forwarded so we don't echo
  // the same rolls on every poll. Reset when the token changes.
  const sinceRef = useRef('');

  useEffect(() => { sinceRef.current = ''; }, [diceToken]);

  useEffect(() => {
    if (!enabled || !diceToken || !apiUrl || typeof onRoll !== 'function') return undefined;

    let cancelled = false;
    let timer;

    async function tick() {
      try {
        const since = sinceRef.current;
        const url = `${apiUrl}/api/dice/${encodeURIComponent(diceToken)}/rolls${since ? `?since=${encodeURIComponent(since)}` : ''}`;
        const res = await fetch(url, { method: 'GET' });
        if (!res.ok) {
          // 404 or transient error: keep polling but don't update sinceRef.
          return;
        }
        const data = await res.json();
        const rolls = Array.isArray(data?.rolls) ? data.rolls : [];
        if (rolls.length) {
          // Server returns newest-first; deliver in chronological order so
          // the UI animation feels natural.
          const ordered = [...rolls].reverse();
          for (const r of ordered) {
            if (cancelled) return;
            onRoll(r);
          }
          const latest = rolls[0]?.at;
          if (latest) sinceRef.current = latest;
        }
      } catch {
        /* network blip: try again next tick */
      } finally {
        if (!cancelled) timer = setTimeout(tick, POLL_INTERVAL_MS);
      }
    }

    tick();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, diceToken, apiUrl, onRoll]);
}
