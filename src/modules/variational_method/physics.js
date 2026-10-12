/** HO variational principle: trial ψ(x) = N exp(−αx²), units ℏ = ω = m = 1. */

export const EXACT_ALPHA = 0.5;
export const EXACT_ENERGY = 0.5;

/** ⟨H⟩ = ⟨T⟩ + ⟨V⟩ for normalized Gaussian trial. */
export function expectationEnergy(alpha) {
  if (alpha <= 0) return Infinity;
  return alpha / 2 + 1 / (8 * alpha);
}

export function optimalAlpha() {
  return EXACT_ALPHA;
}

export function energyErrorPct(alpha) {
  return Math.abs(expectationEnergy(alpha) - EXACT_ENERGY) / EXACT_ENERGY * 100;
}

export function scanEnergyCurve(n, alphaMin, alphaMax) {
  n = n || 80;
  alphaMin = alphaMin != null ? alphaMin : 0.05;
  alphaMax = alphaMax != null ? alphaMax : 2;
  const xs = [];
  const ys = [];
  for (let i = 0; i <= n; i++) {
    const a = alphaMin + (alphaMax - alphaMin) * i / n;
    xs.push(a);
    ys.push(expectationEnergy(a));
  }
  return { xs, ys };
}

export function trialPsi(x, alpha) {
  const N = Math.pow(2 * alpha / Math.PI, 0.25);
  return N * Math.exp(-alpha * x * x);
}

export function sampleTrialWaveform(alpha, n, xMax) {
  n = n || 100;
  xMax = xMax != null ? xMax : 4;
  const xs = [];
  const trial = [];
  const exact = [];
  for (let i = 0; i <= n; i++) {
    const x = -xMax + (2 * xMax * i) / n;
    xs.push(x);
    trial.push(trialPsi(x, alpha));
    exact.push(trialPsi(x, EXACT_ALPHA));
  }
  return { xs, trial, exact };
}
