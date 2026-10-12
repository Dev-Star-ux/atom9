/** Schematic supercritical-assembly teaching model (historical, public concepts). */

export const TYPES = [
  { id: 'gun', k0: 0.72, kMax: 1.22 },
  { id: 'implosion', k0: 0.70, kMax: 1.38 },
  { id: 'boosted', k0: 0.70, kMax: 1.55 },
];

export function getType(id) {
  for (let i = 0; i < TYPES.length; i++) if (TYPES[i].id === id) return TYPES[i];
  return TYPES[0];
}

export function kEff(typeId, u, compress, boost) {
  const t = getType(typeId);
  const uu = Math.max(0, Math.min(1, u));
  let k = t.k0;
  if (typeId === 'gun') {
    k = t.k0 + (t.kMax - t.k0) * Math.pow(uu, 1.35);
  } else {
    const dens = 1 + 0.9 * Math.max(0, Math.min(1, compress)) * Math.pow(uu, 1.6);
    k = t.k0 * dens * dens;
    if (k > t.kMax) k = t.kMax * 0.9 + 0.1 * k;
  }
  if (typeId === 'boosted' && uu > 0.68) {
    k += 0.24 * Math.max(0, Math.min(1, boost)) * ((uu - 0.68) / 0.32);
  }
  return k;
}

export function assemblyStatus(k) {
  if (k < 0.95) return 'subcritical';
  if (k < 1.05) return 'near';
  return 'supercritical';
}

export function statusPlain(k) {
  if (k < 0.95) return 'chain dies — too many neutrons leak away';
  if (k < 1.05) return 'just critical — each neutron makes about one more';
  return 'chain grows — each neutron makes more than one';
}

export function yieldProxy(k, boost, typeId) {
  const above = Math.max(0, k - 1);
  let y = 12 * above * above;
  if (typeId === 'boosted') y *= 1 + 1.6 * (boost || 0);
  if (typeId === 'gun') y *= 0.55;
  return y;
}

export function predetonationHint(speed, typeId) {
  if (typeId !== 'gun') return 0;
  return Math.max(0, 1 - speed);
}

export function fissionChance(k) {
  return Math.max(0.06, Math.min(0.9, 0.18 + 0.55 * Math.max(0, k - 0.65)));
}
