// Blackbody features — Wien, Stefan–Boltzmann, Kirchhoff (Ch.2 §1 T2).

export const H = 6.62607015e-34;
export const C = 2.99792458e8;
export const K = 1.380649e-23;
export const SIGMA = 5.670374e-8;
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

export function wienPeakNm(T) {
  return T > 0 ? (WIEN / T) * 1e9 : 0;
}

export function stefanBoltzmann(T) {
  return SIGMA * T ** 4;
}

export function planckPeakValue(T) {
  return Math.max(...lamGrid().map((l) => planckU(l, T)), 1e-30);
}

export function normalizedSpectrum(T) {
  const lams = lamGrid();
  const scale = planckPeakValue(T);
  return {
    lams,
    xs: lams.map((l) => l * 1e9),
    ys: lams.map((l) => planckU(l, T) / scale),
    peakNm: wienPeakNm(T),
  };
}

export function blackbodyRgb(T) {
  const t = Math.min(400, Math.max(10, T / 100));
  let r, g, b;
  if (t <= 66) r = 255;
  else r = 329.7 * (t - 60) ** -0.133;
  if (t <= 66) g = 99.47 * Math.log(t) - 161.12;
  else g = 288.12 * (t - 60) ** -0.076;
  if (t >= 66) b = 255;
  else if (t <= 19) b = 0;
  else b = 138.52 * Math.log(t - 10) - 305.04;
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return `rgb(${clamp(r)},${clamp(g)},${clamp(b)})`;
}

export function noisyPeakNm(T, noiseNm = 25) {
  return wienPeakNm(T) + noiseNm * (Math.random() + Math.random() - 1);
}
