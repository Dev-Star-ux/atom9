// Fusion D+T — Coulomb barrier vs temperature (teaching-scale tokamak / star model).
// Real D–T plasmas work near ~10–20 keV (~100–200 MK); this lab stretches the
// slider higher so students clearly see bounce → rare → frequent fusion.
export const BARRIER_KEV = 45; // teaching peak height for the 2D barrier plot
export const Q_VALUE_MEV = 17.6;
/** Characteristic ion energy scale (keV) for teaching probability curve. */
const KE_SCALE = 10;

export function keVFromTempMK(tempMillionK) {
  // ~1 keV ≈ 11.6 million K
  return Math.max(0.1, tempMillionK) / 11.6;
}

export function fusionProbability(tempMillionK, confinement) {
  const T = Math.max(1, tempMillionK);
  const keV = keVFromTempMK(T);
  const conf = Math.max(0.05, Math.min(1, confinement / 100));
  // Gamow-like: rises once KE is a few keV; confinement soft-boosts (not a hard cap)
  const x = keV / KE_SCALE;
  const thermal = 1 - Math.exp(-x * x * 0.55);
  const p = thermal * (0.35 + 0.65 * conf);
  return Math.max(0, Math.min(0.98, p));
}

export function statusFusion(p) {
  if (p < 0.12) return 'repel';
  if (p < 0.45) return 'rare';
  return 'ignition';
}

export function plainFusion(p) {
  if (p < 0.12) return 'Too cold — nuclei bounce apart (Coulomb repulsion wins)';
  if (p < 0.45) return 'Warming up — occasional fusion when nuclei get close enough';
  return 'Hot enough — many D–T pairs fuse and release 17.6 MeV';
}
