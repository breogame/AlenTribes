// Frontend port of backend `_apply_action` in /app/backend/server.py.
// Used when "Habilitar retransmisión" is OFF so the GM can play locally
// without a WebSocket connection. Action shapes MUST stay in sync with
// the server's reducer so that the same actions can be replayed remotely
// once streaming is enabled.
import { cryptoRandomId } from './cardUtils';

export function defaultState() {
  return {
    cards: [],
    library: [],
    history: [],
    background: null,
    scale: 1.0,
    diceType: 6,
    soundEnabled: true,
    backgroundShade: 55,
  };
}

const HISTORY_LIMIT = 200;

export function applyAction(state, action) {
  const type = action?.type;
  const payload = action?.payload || {};
  const next = { ...state };

  switch (type) {
    case 'CARD_CREATE': {
      const card = payload.card;
      if (!card || !card.id) return state;
      next.cards = [...state.cards, card];
      return next;
    }
    case 'CARD_UPDATE': {
      const card = payload.card;
      if (!card || !card.id) return state;
      next.cards = state.cards.map((c) => (c.id === card.id ? card : c));
      return next;
    }
    case 'CARD_PATCH': {
      const { id, patch } = payload;
      if (!id || !patch) return state;
      next.cards = state.cards.map((c) => (c.id === id ? { ...c, ...patch } : c));
      return next;
    }
    case 'CARD_DELETE': {
      const { id } = payload;
      if (!id) return state;
      next.cards = state.cards.filter((c) => c.id !== id);
      return next;
    }
    case 'CARD_DUPLICATE': {
      const { id } = payload;
      const src = state.cards.find((c) => c.id === id);
      if (!src) return state;
      const pos = src.position || { x: 0, y: 0 };
      const copy = {
        ...src,
        id: cryptoRandomId(),
        position: { x: (pos.x || 0) + 30, y: (pos.y || 0) + 30 },
        name: `${src.name || 'Carta'} (copia)`,
      };
      next.cards = [...state.cards, copy];
      return next;
    }
    case 'BOARD_CLEAR': {
      next.cards = [];
      return next;
    }
    case 'LIBRARY_UPSERT': {
      const newCards = payload.cards || [];
      const existing = new Set(state.library.map((c) => c.name));
      const additions = newCards.filter((c) => c.name && !existing.has(c.name));
      if (!additions.length) return state;
      next.library = [...state.library, ...additions];
      return next;
    }
    case 'LIBRARY_REMOVE': {
      const { name } = payload;
      next.library = state.library.filter((c) => c.name !== name);
      return next;
    }
    case 'LIBRARY_REPLACE': {
      next.library = payload.cards || [];
      return next;
    }
    case 'DICE_ROLL': {
      const roll = payload.roll;
      if (!roll) return state;
      next.history = [roll, ...state.history].slice(0, HISTORY_LIMIT);
      return next;
    }
    case 'SCALE_SET': {
      const v = Number(payload.scale) || 1.0;
      next.scale = Math.max(0.4, Math.min(2.5, v));
      return next;
    }
    case 'BG_SET': {
      next.background = payload.background;
      return next;
    }
    case 'BG_SHADE_SET': {
      const s = Number(payload.shade) || 0;
      next.backgroundShade = Math.max(0, Math.min(100, Math.round(s)));
      return next;
    }
    case 'DICE_TYPE_SET': {
      const dt = Number(payload.diceType) || 6;
      if (dt === 6 || dt === 12) next.diceType = dt;
      return next;
    }
    case 'SOUND_SET': {
      next.soundEnabled = !!payload.enabled;
      return next;
    }
    case 'HISTORY_CLEAR': {
      next.history = [];
      return next;
    }
    default:
      return state;
  }
}
