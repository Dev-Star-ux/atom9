// Blackbody / Planck radiation (Ch.2 Sec.1). Planck law vs Rayleigh–Jeans; UV catastrophe.

export const H = 6.62607015e-34;
export const C = 2.99792458e8;
export const K = 1.380649e-23;
export const SIGMA = 5.670374e-8;
export const WIEN = 2.897771e-3;

export function planckU(lamM, T, h = H) {
  if (lamM <= 0 || T <= 0 || h <= 0) return 0;
  const x = (h * C) / (lamM * K * T);
  if (x > 700 || x < 1e-8) return 0;
  return (8 * Math.PI * h * C) / (lamM ** 5) / (Math.exp(x) - 1);
}

export function rayleighJeansU(lamM, T) {
  if (lamM <= 0 || T <= 0) return 0;
  return (8 * Math.PI * K * T) / (lamM ** 4);
}

export function wienPeakNm(T) {
  return T > 0 ? (WIEN / T) * 1e9 : 0;
}

export function stefanBoltzmann(T) {
  return SIGMA * T ** 4;
}

export function spectrumNm(T, hScale = 1, steps = 120, lamMinNm = 100, lamMaxNm = 3000) {
  const h = H * hScale;
  const pts = [];
  let peak = 0;
  for (let i = 0; i < steps; i++) {
    const nm = lamMinNm + (lamMaxNm - lamMinNm) * i / (steps - 1);
    const lam = nm * 1e-9;
    const p = planckU(lam, T, h);
    const r = rayleighJeansU(lam, T);
    peak = Math.max(peak, p, r);
    pts.push({ nm, planck: p, rj: r });
  }
  return { pts, peak: peak || 1 };
}

export function blackbodyColor(T) {
  const nm = wienPeakNm(T);
  if (nm < 380) return 0xffa040;
  if (nm > 780) return 0xffe8c0;
  const t = (nm - 380) / 400;
  const r = Math.min(1, 0.5 + t);
  const g = Math.min(1, 0.3 + t * 0.8);
  const b = Math.max(0, 0.8 - t);
  return (Math.round(255 * r) << 16) | (Math.round(255 * g) << 8) | Math.round(255 * b);
}
