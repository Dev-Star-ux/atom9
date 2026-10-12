// Physics for the photoelectric effect (Ch.2 §2).
//
// Light of frequency f striking a metal ejects electrons only if a photon
// carries enough energy to free one: hf ≥ φ (the work function). The fastest
// electrons have kinetic energy KE_max = hf − φ. A reverse "stopping voltage"
// V_s that just halts them satisfies eV_s = hf − φ, so
//     V_s = (h/e)·f − φ/e
// A plot of V_s vs f is a straight line whose SLOPE is h/e — this is how
// Planck's constant is measured.

export const H_TRUE = 6.62607015e-34;      // Planck constant (J·s)
export const E = 1.602176634e-19;          // elementary charge (C)
export const C = 2.99792458e8;             // speed of light (m/s)

export const METALS = [
  { name: 'Sodium (Na)', phi: 2.28 },
  { name: 'Potassium (K)', phi: 2.30 },
  { name: 'Calcium (Ca)', phi: 2.87 },
  { name: 'Zinc (Zn)', phi: 4.33 },
  { name: 'Copper (Cu)', phi: 4.65 },
];

// Threshold frequency below which no electrons are emitted (Hz).
export function thresholdFreq(phiEV, h = H_TRUE) { return phiEV * E / h; }

// Max kinetic energy of ejected electrons (eV); 0 below threshold.
export function keMaxEV(fHz, phiEV, h = H_TRUE) {
  return Math.max(0, (h / E) * fHz - phiEV);
}

// Stopping voltage (V); equals KE_max/e. Negative would mean no emission.
export function stoppingVoltage(fHz, phiEV, h = H_TRUE) {
  return (h / E) * fHz - phiEV;
}

// Relative photocurrent for given frequency, light intensity and applied
// stopping voltage.  Zero below threshold or once the electrons are stopped.
export function photocurrent(fHz, intensity, Vstop, phiEV) {
  if (fHz < thresholdFreq(phiEV)) return 0;
  const ke = keMaxEV(fHz, phiEV);
  if (Vstop >= ke) return 0;
  return intensity;
}

// Approximate visible colour for a light frequency (for the 3D beam).
export function freqToColor(fHz) {
  const lambdaNm = C / fHz * 1e9;
  let r = 0, g = 0, b = 0;
  const w = lambdaNm;
  if (w < 380) { r = 0.4; g = 0; b = 0.6; }          // UV → violet-ish
  else if (w < 440) { r = -(w - 440) / 60; b = 1; }
  else if (w < 490) { g = (w - 440) / 50; b = 1; }
  else if (w < 510) { g = 1; b = -(w - 510) / 20; }
  else if (w < 580) { r = (w - 510) / 70; g = 1; }
  else if (w < 645) { r = 1; g = -(w - 645) / 65; }
  else { r = 1; }
  return [Math.min(1, Math.max(0, r)), Math.min(1, Math.max(0, g)), Math.min(1, Math.max(0, b))];
}
