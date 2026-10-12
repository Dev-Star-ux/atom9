// Quantum theory of light — photoelectric effect (Ch.2 §2).
// E_photon = hν, KE_max = hν − W.

export const H = 6.62607015e-34;
export const E_CHARGE = 1.602176634e-19;
export const C = 2.99792458e8;
export const FMAX = 15;

export const MATERIALS = {
  cesium: 2.10,
  sodium: 2.28,
  calcium: 2.87,
  zinc: 4.30,
  copper: 4.70,
};

export function photonEnergyEV(f14, h = H) {
  return (h * f14 * 1e14) / E_CHARGE;
}

export function thresholdF14(workEV, h = H) {
  return (workEV * E_CHARGE) / h / 1e14;
}

export function keMaxEV(f14, workEV, h = H) {
  return Math.max(0, photonEnergyEV(f14, h) - workEV);
}

export function freqToNm(f14) {
  return (C / (f14 * 1e14)) * 1e9;
}

export function photonColor(f14) {
  const nm = freqToNm(f14);
  if (nm < 380) return '#8866aa';
  if (nm > 750) return '#880808';
  let r = 0, g = 0, b = 0;
  if (nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else { r = 1; }
  const ch = (v) => Math.round(Math.max(0, Math.min(1, v)) ** 0.8 * 255);
  return `rgb(${ch(r)},${ch(g)},${ch(b)})`;
}
