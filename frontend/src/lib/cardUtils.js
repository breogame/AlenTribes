// Card-related constants and helpers.

export const FACTION_COLORS = [
  { key: 'crimson', name: 'Carmesí', value: '#8B0000' },
  { key: 'forest', name: 'Bosque profundo', value: '#1B4D3E' },
  { key: 'midnight', name: 'Nocturno', value: '#191970' },
  { key: 'brass', name: 'Latón viejo', value: '#B8860B' },
  { key: 'ashen', name: 'Cenizo', value: '#4A5054' },
];

export function factionColor(key) {
  return FACTION_COLORS.find((f) => f.key === key)?.value || FACTION_COLORS[4].value;
}

export function newCardTemplate({ overrides = {} } = {}) {
  return {
    id: cryptoRandomId(),
    // creation props
    name: 'Nuevo personaje',
    imageUrl: '',
    colorKey: 'ashen',
    fortaleza: 1,
    destreza: 1,
    astucia: 1,
    inteligencia: 1,
    meleeSkill: 0,
    rangedSkill: 0,
    meleeMod: 0,
    rangedMod: 0,
    description: '',
    // runtime props
    armadura: 0,
    aguante: 0,
    maxAguante: 0,
    reservaCC: 0,
    reservaAD: 0,
    ataqueCC: 0,
    ataqueAD: 0,
    defensaCC: 0,
    defensaAD: 0,
    foco: 0,
    defenseRaw: 1,
    // layout props
    modo: 'melee',
    position: { x: 120, y: 120 },
    scale: 1,
    rotation: 0,
    ...overrides,
  };
}

export function cryptoRandomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function strippedTemplateFromCard(card) {
  // Used when saving to library: keep only creation-time fields.
  const {
    name, imageUrl, colorKey, fortaleza, destreza, astucia, inteligencia,
    meleeSkill, rangedSkill, meleeMod, rangedMod, description,
  } = card;
  return {
    name, imageUrl, colorKey, fortaleza, destreza, astucia, inteligencia,
    meleeSkill, rangedSkill, meleeMod, rangedMod, description,
  };
}

export function computeDerived(card) {
  const fort = Number(card.fortaleza) || 1;
  const dex = Number(card.destreza) || 1;
  const ast = Number(card.astucia) || 1;
  const meleeSkill = Number(card.meleeSkill) || 0;
  const rangedSkill = Number(card.rangedSkill) || 0;
  const meleeMod = Number(card.meleeMod) || 0;
  const rangedMod = Number(card.rangedMod) || 0;

  const maxAguante = Number(card.maxAguante) || 0;
  const aguante = Number(card.aguante) || 0;
  const armadura = Number(card.armadura) || 0;

  const wounds = Math.max(
    0,
    Math.floor(Math.max(0, maxAguante - aguante) / Math.max(1, fort + 1))
  );

  const maxReservaCC = fort + meleeSkill + meleeMod - wounds;
  const maxReservaAD = dex + rangedSkill + rangedMod - wounds;

  const ataqueCC = Number(card.ataqueCC) || 0;
  const ataqueAD = Number(card.ataqueAD) || 0;
  const defensaCC = Number(card.defensaCC) || 0;
  const defensaAD = Number(card.defensaAD) || 0;

  const aguanteRed = aguante > 3 * (fort + 1);
  const reservaCCRed = (Number(card.reservaCC) || 0) > maxReservaCC;
  const reservaADRed = (Number(card.reservaAD) || 0) > maxReservaAD;
  const atkDefCCRed = (ataqueCC + defensaCC) > (Number(card.reservaCC) || 0);
  const atkDefADRed = (ataqueAD + defensaAD) > (Number(card.reservaAD) || 0);

  const focoRed = (Number(card.foco) || 0) > (dex + ast);

  // Tiered defense display (valdrá 1 default, >=2 => 2, >=5 => 3, >=8 => 4)
  const raw = Number(card.defenseRaw) || 1;
  let defenseLevel;
  if (raw >= 8) defenseLevel = 4;
  else if (raw >= 5) defenseLevel = 3;
  else if (raw >= 2) defenseLevel = 2;
  else defenseLevel = 1;

  const isDead = (armadura + aguante) <= 0 && maxAguante > 0;

  return {
    wounds,
    maxReservaCC,
    maxReservaAD,
    aguanteRed,
    reservaCCRed,
    reservaADRed,
    atkDefCCRed,
    atkDefADRed,
    focoRed,
    defenseLevel,
    isDead,
  };
}

export function clampCardPatch(patch, card) {
  // Apply min constraints to stat fields where applicable.
  const out = { ...patch };
  if ('fortaleza' in out) out.fortaleza = Math.max(1, Number(out.fortaleza) || 1);
  if ('destreza' in out) out.destreza = Math.max(1, Number(out.destreza) || 1);
  if ('astucia' in out) out.astucia = Math.max(1, Number(out.astucia) || 1);
  if ('inteligencia' in out) out.inteligencia = Math.max(1, Number(out.inteligencia) || 1);
  if ('meleeSkill' in out) out.meleeSkill = Math.max(0, Number(out.meleeSkill) || 0);
  if ('rangedSkill' in out) out.rangedSkill = Math.max(0, Number(out.rangedSkill) || 0);
  // meleeMod / rangedMod accept negatives
  if ('armadura' in out) out.armadura = Math.max(0, Number(out.armadura) || 0);
  if ('aguante' in out) out.aguante = Math.max(0, Number(out.aguante) || 0);
  if ('foco' in out) out.foco = Math.max(0, Number(out.foco) || 0);
  if ('reservaCC' in out) out.reservaCC = Math.max(0, Number(out.reservaCC) || 0);
  if ('reservaAD' in out) out.reservaAD = Math.max(0, Number(out.reservaAD) || 0);
  if ('defenseRaw' in out) out.defenseRaw = Math.max(1, Number(out.defenseRaw) || 1);
  if ('scale' in out) out.scale = Math.max(0.5, Math.min(2.2, Number(out.scale) || 1));
  return out;
}
