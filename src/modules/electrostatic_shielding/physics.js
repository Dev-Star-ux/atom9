/** Electrostatic shielding / Faraday cage — teaching physics (offline). */

export const MATERIALS = [
  { id: 'conductor', name: 'Solid conductor', color: '#94a3b8' },
  { id: 'mesh', name: 'Conducting mesh', color: '#4ade80' },
  { id: 'insulator', name: 'Insulator', color: '#f87171' },
];

export function getMaterial(id) {
  for (let i = 0; i < MATERIALS.length; i++) if (MATERIALS[i].id === id) return MATERIALS[i];
  return MATERIALS[0];
}

/**
 * Shielding factor S: interior field = E0 / S.
 * Solid conductor: ideal electrostatic equilibrium -> field inside ~ 0
 * (very large S, teaching approximation, not literally infinite).
 * Insulator: no free charges redistribute -> no shielding, S = 1.
 * Mesh: partial shielding that improves (larger S) as the hole size shrinks
 * relative to the cage, approaching the solid-conductor limit as holeMm -> 0.
 */
export function shieldingFactor(materialId, holeMm) {
  if (materialId === 'conductor') return 1e6;
  if (materialId === 'insulator') return 1;
  const h = Math.max(0, holeMm);
  return 1 + 200 / (1 + h);
}

/** Interior field magnitude given external field E0 (same units as E0). */
export function interiorField(E0, materialId, holeMm, cageOn) {
  if (!cageOn) return E0;
  const S = shieldingFactor(materialId, holeMm);
  return E0 / S;
}

/** Shielding effectiveness in dB: SE = 20 log10(E0 / Ein). */
export function shieldingEffectivenessDB(E0, Ein) {
  return 20 * Math.log10(E0 / Math.max(Ein, 1e-9));
}

/** Interior field vs hole size (mm) for a given material, normalized E0 = 1. */
export function curvePoints(materialId, holeMaxMm, n) {
  const pts = [];
  const N = n || 80;
  for (let i = 0; i <= N; i++) {
    const holeMm = (i / N) * holeMaxMm;
    const Ein = interiorField(1, materialId, holeMm, true);
    pts.push({ holeMm: holeMm, Ein: Ein });
  }
  return pts;
}
