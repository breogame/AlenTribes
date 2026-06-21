// Dice rolling logic + color rules per problem spec.
// Roll types: 'action' | 'attack' | 'initiative'
// Dice global type: 6 | 12 (initiative is always d3, dice-type-independent)

export function rollSingleDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

export function performRoll({ type, quantity, diceType }) {
  const qty = Math.max(1, Math.min(20, Number(quantity) || 1));
  let sides;
  if (type === 'initiative') sides = 3;
  else sides = diceType === 12 ? 12 : 6;

  const dice = Array.from({ length: qty }, () => rollSingleDie(sides));
  const total = dice.reduce((a, b) => a + b, 0);
  return { dice, sides, total, type, quantity: qty };
}

// Returns color token name for a die value based on type + sides.
// Colors: 'success' (green), 'fail' (red), 'crit' (purple), 'neutral'
export function dieColor(value, type, sides) {
  if (type === 'initiative') return 'neutral';

  if (type === 'action') {
    if (sides === 6) {
      if (value === 6) return 'success';
      return 'neutral';
    }
    if (sides === 12) {
      if (value === 1) return 'fail';
      if (value === 12) return 'crit';
      if (value === 10 || value === 11) return 'success';
      return 'neutral';
    }
  }

  if (type === 'attack') {
    if (sides === 6) {
      if (value === 5 || value === 6) return 'success';
      return 'neutral';
    }
    if (sides === 12) {
      if (value === 1) return 'fail';
      if (value === 12) return 'crit';
      if (value === 9 || value === 10 || value === 11) return 'success';
      return 'neutral';
    }
  }
  return 'neutral';
}

export const colorTokens = {
  success: '#2E8B57',
  fail: '#B22222',
  crit: '#6A0DAD',
  neutral: '#e7e1d1',
};

export const rollTypeLabels = {
  action: 'Acción',
  attack: 'Ataque',
  initiative: 'Iniciativa',
  pj: 'PJ',
};

export function formatTime(iso) {
  try {
    const d = typeof iso === 'string' ? new Date(iso) : new Date();
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}
