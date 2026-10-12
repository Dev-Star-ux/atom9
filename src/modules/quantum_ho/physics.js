/** Quantum harmonic oscillator — teaching units ℏ = m = ω = 1. */

export const N_MAX = 6;

export function factorial(n) {
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
}

export function hermite(n, x) {
  if (n === 0) return 1;
  if (n === 1) return 2 * x;
  let h0 = 1;
  let h1 = 2 * x;
  for (let k = 2; k <= n; k++) {
    const h2 = 2 * x * h1 - 2 * (k - 1) * h0;
    h0 = h1;
    h1 = h2;
  }
  return h1;
}

/** ψ_n(x) for ℏ = m = ω = 1. */
export function hoPsi(n, x) {
  const norm = Math.pow(1 / Math.PI, 0.25) / Math.sqrt(Math.pow(2, n) * factorial(n));
  return norm * hermite(n, x) * Math.exp(-0.5 * x * x);
}

export function hoProb(n, x) {
  const psi = hoPsi(n, x);
  return psi * psi;
}

/** E_n = (n + ½) ℏω in teaching units. */
export function hoEnergy(n) {
  return n + 0.5;
}

export function sampleLevel(n, xMin, xMax, nPts) {
  if (nPts == null) nPts = 220;
  const xs = [];
  const psi = [];
  const prob = [];
  for (let i = 0; i < nPts; i++) {
    const x = xMin + (xMax - xMin) * i / (nPts - 1);
    xs.push(x);
    psi.push(hoPsi(n, x));
    prob.push(hoProb(n, x));
  }
  return { xs: xs, psi: psi, prob: prob };
}

export function nodeCount(n) {
  return n;
}
