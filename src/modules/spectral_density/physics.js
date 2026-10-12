// Spectral energy density u(λ,T) — blackbody (Ch.2 §1 T1). Ported from bb.py.

export const H = 6.62607015e-34;
export const C = 2.99792458e8;
export const K = 1.380649e-23;
export const WIEN = 2.897771e-3;

export const LAM_MIN = 1e-9;
export const LAM_MAX = 3000e-9;
export const N_LAM = 280;
export const X_TICKS = [0, 500, 1000, 1500, 2000, 2500, 3000];
export const BAND_NM = 80;

export function lamGrid(n = N_LAM) {
  const step = (LAM_MAX - LAM_MIN) / (n - 1);
  return Array.from({ length: n }, (_, i) => LAM_MIN + i * step);
}

export function planckU(lamM, T, h = H) {
  if (lamM <= 0 || T <= 0 || h <= 0) return 0;
  const x = (h * C) / (lamM * K * T);
  if (x > 700 || x < 1e-8) return 0;
  return (8 * Math.PI * h * C) / (lamM ** 5) / (Math.exp(x) - 1);
}

export function wienPeakNm(T) {
  return T > 0 ? (WIEN / T) * 1e9 : 0;
}

export function spectrumNm(T, steps = N_LAM) {
  const lams = lamGrid(steps);
  const us = lams.map((l) => planckU(l, T));
  const peak = Math.max(...us, 1e-30);
  return { lams, us, peak, xs: lams.map((l) => l * 1e9) };
}

export function bandEnergyFraction(T, cursorNm, halfWidth = BAND_NM) {
  const { lams, us } = spectrumNm(T);
  const lo = cursorNm - halfWidth;
  const hi = cursorNm + halfWidth;
  let band = 0;
  let total = 0;
  for (let i = 0; i < lams.length; i++) {
    const nm = lams[i] * 1e9;
    total += us[i];
    if (nm >= lo && nm <= hi) band += us[i];
  }
  return total > 0 ? band / total : 0;
}

export function noisySpectrumSamples(T, noiseFrac = 0.06) {
  const lambdas = [300e-9, 450e-9, 650e-9, 900e-9, 1200e-9, 1800e-9];
  return lambdas.map((lam) => ({
    lam,
    u: planckU(lam, T) * (1 + noiseFrac * (Math.random() + Math.random() + Math.random() - 1.5)),
  }));
}
