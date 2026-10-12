// Wave–particle duality of light (Ch.3 §1).
// lookang / EJS double-slit duality: interference when unobserved;
// which-path measurement destroys fringes.
// https://iwant2study.org/lookangejss/06QuantumPhysics/ejss_model_DoubleSlitWaveParticleDualitywee/index.html

export const H = 6.62607015e-34;
export const E_CHARGE = 1.602176634e-19;
export const C = 2.99792458e8;
export const WORK = 2.28;

// wave = continuous fringes · particle = photon hits (unobserved) · which_path = observed
export const MODES = ['wave', 'particle', 'which_path'];

export function freqToNm(f14) {
  return (C / (f14 * 1e14)) * 1e9;
}

export function photonEnergyEV(f14, h = H) {
  return (h * f14 * 1e14) / E_CHARGE;
}

export function keMaxEV(f14, h = H) {
  return Math.max(0, photonEnergyEV(f14, h) - WORK);
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
  const ch = function (v) { return Math.round(Math.pow(Math.max(0, Math.min(1, v)), 0.8) * 255); };
  return 'rgb(' + ch(r) + ',' + ch(g) + ',' + ch(b) + ')';
}

export function photonRgb(f14) {
  const nm = freqToNm(f14);
  let r = 0, g = 0, b = 0;
  if (nm < 380) { r = 0.53; g = 0.4; b = 0.67; }
  else if (nm > 750) { r = 0.53; g = 0.03; b = 0.03; }
  else if (nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else { r = 1; }
  return [
    Math.max(0, Math.min(1, r)),
    Math.max(0, Math.min(1, g)),
    Math.max(0, Math.min(1, b)),
  ];
}

// Slit separation in metres from UI µm value.
export function slitSepM(slitSepUm) {
  return Math.max(1e-6, (slitSepUm || 80) * 1e-6);
}

// Fringe spatial frequency on a screen of height span (teaching units).
export function fringeK(f14, slitSepUm) {
  const lamNm = freqToNm(f14);
  const d = slitSepM(slitSepUm);
  // Larger d / smaller λ → denser fringes
  return (2 * Math.PI * d * 1e6) / Math.max(40, lamNm * 0.12);
}

// Probability density for a hit at normalised screen coordinate y ∈ [-1, 1].
// which_path: classical sum of two slit intensities (no interference).
// otherwise: Young interference I ∝ cos²(δ/2).
export function hitProbability(y, mode, f14, slitSepUm) {
  const yy = Math.max(-1, Math.min(1, y));
  const half = Math.max(0.12, Math.min(0.55, slitSepUm / 220));
  if (mode === 'which_path') {
    const g1 = Math.exp(-Math.pow((yy + half) / 0.22, 2));
    const g2 = Math.exp(-Math.pow((yy - half) / 0.22, 2));
    return 0.08 + 0.92 * (g1 + g2) * 0.5;
  }
  const k = fringeK(f14, slitSepUm);
  const amp = (Math.cos(k * yy) + 1) * 0.5;
  const envelope = Math.exp(-Math.pow(yy / 0.95, 2));
  return 0.04 + 0.96 * amp * envelope;
}

export function fringeBrightness(y, cy, lamNm, phase, slitSepUm) {
  const dFac = Math.max(0.5, (slitSepUm || 80) / 80);
  const k = (2 * Math.PI) / Math.max(30, lamNm * 0.08) * dFac;
  const pathDiff = (y - cy) * 0.12;
  const amp = (Math.cos(k * pathDiff + phase) + 1) * 0.5;
  const brightness = Math.floor(40 + amp * 180);
  return 'rgb(' + brightness + ',' + brightness + ',' + Math.min(255, brightness + 40) + ')';
}
