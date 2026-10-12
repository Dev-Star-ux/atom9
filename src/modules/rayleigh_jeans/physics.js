// Rayleigh–Jeans vs Planck — UV catastrophe (Ch.2 §1 T3).

export const H = 6.62607015e-34;
export const C = 2.99792458e8;
export const K = 1.380649e-23;
export const WIEN = 2.897771e-3;

export const LAM_MIN = 1e-9;
export const LAM_MAX = 3000e-9;
export const N_LAM = 280;
export const X_TICKS = [0, 500, 1000, 1500, 2000, 2500, 3000];

export function lamGrid(n = N_LAM) {
  const step = (LAM_MAX - LAM_MIN) / (n - 1);
  return Array.from({ length: n }, (_, i) => LAM_MIN + i * step);
}

export function planckU(lamM, T) {
  if (lamM <= 0 || T <= 0) return 0;
  const x = (H * C) / (lamM * K * T);
  if (x > 700 || x < 1e-8) return 0;
  return (8 * Math.PI * H * C) / (lamM ** 5) / (Math.exp(x) - 1);
}

export function rayleighJeansU(lamM, T) {
  if (lamM <= 0 || T <= 0) return 0;
  return (8 * Math.PI * K * T) / (lamM ** 4);
}

export function wienPeakNm(T) {
  return T > 0 ? (WIEN / T) * 1e9 : 0;
}

export function planckPeakValue(T) {
  return Math.max(...lamGrid().map((l) => planckU(l, T)), 1e-30);
}

export function compareAtNm(nm, T) {
  const lam = nm * 1e-9;
  const rj = rayleighJeansU(lam, T);
  const pl = planckU(lam, T) || 1e-30;
  return { rj, pl, ratio: rj / pl };
}

export function noisySpectrumSamples(T, noiseFrac = 0.07) {
  const lambdas = [250e-9, 400e-9, 600e-9, 900e-9, 1500e-9, 2200e-9];
  return lambdas.map((lam) => ({
    lam,
    u: planckU(lam, T) * (1 + noiseFrac * (Math.random() + Math.random() + Math.random() - 1.5)),
  }));
}
