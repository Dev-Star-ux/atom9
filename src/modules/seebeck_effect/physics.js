// Seebeck effect: a temperature difference across a junction of two dissimilar
// conductors produces an open-circuit EMF, V = S * (Th - Tc), where S is the
// (relative) Seebeck coefficient of the pair in microvolts per kelvin.
export const MATERIAL_PAIRS = [
  { id: 'cuConstantan', name: 'Copper–Constantan (Type T)', S: 41e-6 },
  { id: 'chromelAlumel', name: 'Chromel–Alumel (Type K)', S: 41e-6 },
  { id: 'ironConstantan', name: 'Iron–Constantan (Type J)', S: 51e-6 },
  { id: 'bismuthAntimony', name: 'Bismuth–Antimony (high-S pair)', S: 100e-6 },
];

export function seebeckEMF(S, Th, Tc) {
  return S * (Th - Tc);
}

export function findPair(id) {
  return MATERIAL_PAIRS.find(function (p) { return p.id === id; }) || MATERIAL_PAIRS[0];
}

// Full-scale reference for the analog meter needle: roughly the largest EMF
// reachable across the material-pair list over the sliders' temperature span
// (100 µV/K * 220 K ≈ 22 mV), rounded up a bit so the needle rarely pegs.
export const METER_FULL_SCALE_MV = 24;

/**
 * Map a live EMF (in mV) to a needle deflection angle in radians, clamped to
 * +/- maxDeg around the meter's center (zero) position. Positive EMF swings
 * the needle right (toward the hot-side wire's polarity), negative swings left.
 */
export function needleAngleRad(emfMv, fullScaleMv = METER_FULL_SCALE_MV, maxDeg = 58) {
  const frac = Math.max(-1, Math.min(1, emfMv / fullScaleMv));
  return (frac * maxDeg) * (Math.PI / 180);
}
