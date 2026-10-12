// Nuclear fission — general chain reaction (LabXchange / ExploreNuclear style).
// Not a power-reactor control demo: enrichment alone sets how well the chain continues.
// U-235 + n → 2 fragments + ~2–3 n + ~200 MeV.  k = neutrons_next / neutrons_now.

export const ENERGY_MEV = 200;
export const NU_BAR = 2.45;

/** Multiplication factor from U-235 enrichment only (no control rods). */
export function fissionMultiplication(enrichmentPct) {
  const e = Math.max(0, Math.min(100, enrichmentPct)) / 100;
  // Low enrichment → subcritical; ~45% → k≈1; high enrichment → grows
  const k = 0.38 + 1.35 * e;
  return Math.max(0.05, Math.min(2.4, k));
}

export function criticalityLabel(k) {
  if (k < 0.95) return 'subcritical';
  if (k < 1.05) return 'critical';
  return 'supercritical';
}

export function plainStatus(k) {
  if (k < 0.95) return 'Chain dies out — too few U-235 hits to keep going';
  if (k < 1.05) return 'Steady chain — about one new fission per previous fission';
  return 'Chain grows — more fissions each generation';
}

/** Neutrons emitted in one fission event (integer, biased by k). */
export function neutronsFromFission(k) {
  if (k > 1.15) return 3;
  if (k > 0.98) return Math.random() < 0.55 ? 3 : 2;
  if (k > 0.75) return Math.random() < 0.65 ? 2 : 1;
  return 1;
}

/** Teaching enrichment presets (% U-235). */
export const ENRICHMENT_PRESETS = [
  { id: 'low', name: 'Low (15%)', pct: 15 },
  { id: 'critical', name: 'Critical (~45%)', pct: 45 },
  { id: 'high', name: 'High (80%)', pct: 80 },
];
