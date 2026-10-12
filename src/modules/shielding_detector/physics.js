/** Shielding + detector — attenuation teaching (offline). */

export const MATERIALS = [
  { id: 'lead', name: 'Lead', color: '#94a3b8' },
  { id: 'concrete', name: 'Concrete', color: '#a8a29e' },
  { id: 'water', name: 'Water', color: '#38bdf8' },
  { id: 'borated_poly', name: 'Borated poly', color: '#4ade80' },
];

export const RAD_KINDS = [
  { id: 'alpha', name: 'α', label: 'Alpha' },
  { id: 'beta', name: 'β', label: 'Beta' },
  { id: 'gamma', name: 'γ', label: 'Gamma' },
  { id: 'neutron', name: 'n', label: 'Neutron' },
];

export function getMaterial(id) {
  for (let i = 0; i < MATERIALS.length; i++) if (MATERIALS[i].id === id) return MATERIALS[i];
  return MATERIALS[0];
}

export function getRadKind(id) {
  for (let i = 0; i < RAD_KINDS.length; i++) if (RAD_KINDS[i].id === id) return RAD_KINDS[i];
  return RAD_KINDS[2];
}

/**
 * Linear attenuation μ (1/cm) — teaching table, not nuclear data library.
 * α/β: very large in solids (range-limited); γ: photoelectric/Compton/pair;
 * n: scattering/absorption — borated poly & water better than lead.
 */
export function muCm(materialId, radId) {
  const table = {
    alpha: { lead: 80, concrete: 60, water: 50, borated_poly: 45 },
    beta: { lead: 12, concrete: 4, water: 2.5, borated_poly: 2.2 },
    gamma: { lead: 0.55, concrete: 0.12, water: 0.06, borated_poly: 0.05 },
    neutron: { lead: 0.04, concrete: 0.08, water: 0.14, borated_poly: 0.28 },
  };
  const row = table[radId] || table.gamma;
  return row[materialId] != null ? row[materialId] : 0.1;
}

/** Transmission I/I0 = e^(−μx), x in cm. */
export function transmission(materialId, radId, thicknessCm) {
  const mu = muCm(materialId, radId);
  const x = Math.max(0, thicknessCm);
  return Math.exp(-mu * x);
}

export function countRate(I0, materialId, radId, thicknessCm) {
  return I0 * transmission(materialId, radId, thicknessCm);
}

/** Half-value layer (cm). */
export function hvlCm(materialId, radId) {
  const mu = muCm(materialId, radId);
  if (mu <= 1e-9) return Infinity;
  return Math.LN2 / mu;
}

export function curvePoints(materialId, radId, xMaxCm, n) {
  const pts = [];
  const N = n || 80;
  for (let i = 0; i <= N; i++) {
    const x = (i / N) * xMaxCm;
    pts.push({ x: x, T: transmission(materialId, radId, x) });
  }
  return pts;
}
