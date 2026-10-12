// Wave / QM helpers ported from D:\Atomic\Project\simulations\wavefunction.py & uncertainty.py
export const H = 6.62607015e-34;
export const HBAR = 1.054571817e-34;
export const HBAR_EV_S = HBAR / 1.602176634e-19;
export const M_E = 9.1093837015e-31;
export const E_CHARGE = 1.602176634e-19;
export const C = 2.99792458e8;

export function doubleSlitIntensity(y, d, lam, L) {
  if (lam <= 0 || L <= 0) return 0;
  const beta = Math.PI * d * y / (lam * L);
  return Math.cos(beta) ** 2;
}

export function infiniteWellPsi(n, x, a) {
  if (x < 0 || x > a) return 0;
  return Math.sqrt(2 / a) * Math.sin(n * Math.PI * x / a);
}

export function infiniteWellProb(n, x, a) {
  const psi = infiniteWellPsi(n, x, a);
  return psi * psi;
}

export function infiniteWellEnergyEV(n, a, mass = M_E) {
  if (n < 1 || a <= 0) return 0;
  return (n * n * Math.PI * Math.PI * HBAR * HBAR) / (2 * mass * a * a * E_CHARGE);
}

export function gaussianDx(sigmaX) {
  return sigmaX;
}

export function gaussianDp(sigmaX) {
  return sigmaX > 0 ? HBAR / (2 * sigmaX) : Infinity;
}

export function gaussianDk(sigmaX) {
  return sigmaX > 0 ? 1 / (2 * sigmaX) : Infinity;
}

export function probGaussian(x, sigmaX) {
  if (sigmaX <= 0) return 0;
  return Math.exp(-(x * x) / (sigmaX * sigmaX));
}

export function xpProduct(sigmaX) {
  return sigmaX * gaussianDp(sigmaX);
}

export function energyUncertaintyEV(lifetimeS) {
  return lifetimeS > 0 ? HBAR_EV_S / (2 * lifetimeS) : Infinity;
}

export function freqToNm(freq1e14) {
  return (C / (freq1e14 * 1e14)) * 1e9;
}

export function fringeSpacingM(lamM, dM, L) {
  return dM > 0 ? (lamM * L) / dM : 0;
}

export function decayEnvelope(t, tau) {
  return tau > 0 ? Math.exp(-t / tau) : 0;
}

export function lorentzianEnergy(E, E0, gamma) {
  if (gamma <= 0) return 0;
  const d = E - E0;
  return gamma / (d * d + gamma * gamma);
}

export function psiGaussian(x, sigmaX, k0 = 0) {
  if (sigmaX <= 0) return 0;
  const env = Math.exp(-(x * x) / (2 * sigmaX * sigmaX));
  return env * Math.cos(k0 * x);
}

export function infiniteWellEnergyJ(n, a, mass = M_E) {
  if (n < 1 || a <= 0) return 0;
  return (n * n * Math.PI * Math.PI * HBAR * HBAR) / (2 * mass * a * a);
}

export function psiSuperposition(x, a, n1, n2, t, omegaScale = 1) {
  if (x < 0 || x > a) return 0;
  const psi1 = infiniteWellPsi(n1, x, a);
  const psi2 = infiniteWellPsi(n2, x, a);
  const E1 = infiniteWellEnergyJ(n1, a);
  const E2 = infiniteWellEnergyJ(n2, a);
  const w1 = E1 / HBAR * omegaScale * t;
  const w2 = E2 / HBAR * omegaScale * t;
  return psi1 * Math.cos(w1) + psi2 * Math.cos(w2);
}

export function probSuperposition(x, a, n1, n2, t, omegaScale = 1) {
  if (x < 0 || x > a) return 0;
  const psi1 = infiniteWellPsi(n1, x, a);
  const psi2 = infiniteWellPsi(n2, x, a);
  const E1 = infiniteWellEnergyJ(n1, a);
  const E2 = infiniteWellEnergyJ(n2, a);
  const w1 = E1 / HBAR * omegaScale * t;
  const w2 = E2 / HBAR * omegaScale * t;
  const re = psi1 * Math.cos(w1) + psi2 * Math.cos(w2);
  const im = -psi1 * Math.sin(w1) - psi2 * Math.sin(w2);
  return re * re + im * im;
}

export function sampleFromProb(probFn, xMin, xMax, nBins = 80) {
  const step = (xMax - xMin) / nBins;
  const xs = [];
  const weights = [];
  let total = 0;
  for (let i = 0; i < nBins; i++) {
    const x = xMin + (i + 0.5) * step;
    const w = Math.max(0, probFn(x));
    xs.push(x);
    weights.push(w);
    total += w;
  }
  total = total || 1;
  let r = Math.random() * total;
  for (let i = 0; i < xs.length; i++) {
    r -= weights[i];
    if (r <= 0) return xs[i];
  }
  return xs[xs.length - 1];
}
