/** Stealth RCS teaching — shape class + RAM + frequency (diffraction). */

export const CONV_SIGMA_M2 = 5;

/** Teaching-scale frontal RCS (m²) at X-band (~10 GHz). Order-of-magnitude
 *  catalog values used in textbooks (not classified measured data). */
export const SHAPE_TYPES = [
  { id: 'faceted', shaping: 0.86, sigmaM2: 0.003 },
  { id: 'blended', shaping: 0.93, sigmaM2: 0.0001 },
  { id: 'flyingWing', shaping: 0.97, sigmaM2: 0.00005 },
  { id: 'cruise', shaping: 0.72, sigmaM2: 0.05 },
];

export function getShape(id) {
  for (let i = 0; i < SHAPE_TYPES.length; i++) {
    if (SHAPE_TYPES[i].id === id) return SHAPE_TYPES[i];
  }
  return SHAPE_TYPES[0];
}

export function formatSigmaM2(s) {
  const v = Math.max(s, 0);
  if (v >= 1) return v.toFixed(2) + ' m²';
  if (v >= 0.01) return v.toFixed(3) + ' m²';
  if (v >= 0.0001) return v.toFixed(5) + ' m²';
  return v.toExponential(2) + ' m²';
}

/** Wavelength (m) from frequency f (Hz). */
export function wavelength(f) {
  return 2.99792458e8 / Math.max(f, 1e-6);
}

/** Tip-diffraction teaching note strength: rises when λ approaches feature size.
 *  featureSize_m ~ 0.5 m wing-edge teaching scale. */
export function diffractionHint(f, featureSize) {
  const lam = wavelength(f);
  const feat = featureSize != null ? featureSize : 0.5;
  return Math.min(1, lam / Math.max(feat, 1e-6));
}

/** Effective RCS: catalog σ_shape, RAM reduces it, long-λ diffraction
 *  mildly raises it (does not mix in the conventional 5 m² baseline). */
export function stealthSigmaEff(shapeId, absorb, frequency) {
  const sh = getShape(shapeId);
  const base = sh.sigmaM2;
  const ab = Math.max(0, Math.min(1, absorb || 0));
  const withRam = base * (1 - 0.5 * ab);
  const dif = diffractionHint(frequency);
  // X-band (~10 GHz) keeps catalog σ; longer λ raises σ_eff a little.
  const extra = Math.max(0, dif - 0.1);
  return withRam * (1 + 3 * extra);
}

/** Effective RCS: σ_eff = σ0 · shapeFactor · (1 − absorb).
 *  shaping in [0,1] (1 = max deflection), absorb in [0,1]. */
export function sigmaEff(sigma0, shaping, absorb) {
  const shapeFactor = 1 - 0.92 * Math.max(0, Math.min(1, shaping));
  const abs = Math.max(0, Math.min(1, absorb));
  return Math.max(sigma0, 0) * shapeFactor * (1 - abs);
}

/** Conventional (blunt) RCS teaching baseline (m²). */
export function conventionalSigma(sigma0) {
  if (sigma0 != null && sigma0 > 0) return sigma0;
  return CONV_SIGMA_M2;
}

/** Scattered lobe amplitudes for schematic (forward-ish vs side).
 *  Stealth: more energy deflected off-boresight; conventional: strong backscatter. */
export function scatterLobes(shaping, absorb) {
  const sh = Math.max(0, Math.min(1, shaping));
  const ab = Math.max(0, Math.min(1, absorb));
  const back = (1 - 0.85 * sh) * (1 - 0.7 * ab);
  const side = (0.25 + 0.7 * sh) * (1 - 0.5 * ab);
  const forward = (0.15 + 0.4 * sh) * (1 - 0.3 * ab);
  return { back: back, side: side, forward: forward };
}

/** RCS reduction ratio (stealth / conventional). */
export function reductionRatio(sigma0, shaping, absorb, shapeId, frequency) {
  const conv = conventionalSigma(sigma0);
  if (conv < 1e-12) return 0;
  if (shapeId) return stealthSigmaEff(shapeId, absorb, frequency) / conv;
  return sigmaEff(sigma0, shaping, absorb) / conv;
}
