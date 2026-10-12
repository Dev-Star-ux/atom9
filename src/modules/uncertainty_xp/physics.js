// Heisenberg Δx·Δp ≥ ħ/2 for Gaussian packets (Ch.3 §2).
// Teaching model matches PhysSandbox-style intuition:
//   fix σ_x, σ_p,min = ħ/(2σ_x), optional momentum “excess” ≥ 1 widens |φ(p)|².
import {
  HBAR,
  gaussianDx,
  gaussianDp as minDp,
  probGaussian,
} from '../common/wavePhysics.js';

export { HBAR, gaussianDx, probGaussian };
export const HBAR_HALF = HBAR / 2;

/** Momentum width with optional excess over the minimum-uncertainty floor. */
export function gaussianDp(sigmaX, excess) {
  const e = excess != null && excess >= 1 ? excess : 1;
  return minDp(sigmaX) * e;
}

export function xpProduct(sigmaX, excess) {
  return gaussianDx(sigmaX) * gaussianDp(sigmaX, excess);
}

export function momentumProb(p, dp) {
  if (dp <= 0) return 0;
  return Math.exp(-(p * p) / (2 * dp * dp));
}

/** Sample |ψ(x)|² curve in ångström units for plotting. */
export function samplePsiX(sigmaM, n) {
  if (n == null) n = 120;
  const sigmaA = sigmaM * 1e10;
  const xMax = Math.max(2.5, sigmaA * 4.5);
  const xs = [];
  const ys = [];
  for (let i = 0; i < n; i++) {
    const x = -xMax + (2 * xMax) * i / (n - 1);
    xs.push(x);
    ys.push(probGaussian(x * 1e-10, sigmaM));
  }
  return { xs: xs, ys: ys, xMin: -xMax, xMax: xMax, sigmaA: sigmaA };
}

/** Sample |φ(p)|² using a dimensionless p-axis scaled so σ_p maps to readable units. */
export function samplePhiP(sigmaM, excess, n) {
  if (n == null) n = 120;
  const dp = gaussianDp(sigmaM, excess);
  // Plot in units of ħ/Å so numbers stay human-sized
  const dpPlot = dp / (HBAR / 1e-10); // ≡ 1/(2σ_Å) * excess
  const pMax = Math.max(2.5, dpPlot * 4.5);
  const xs = [];
  const ys = [];
  for (let i = 0; i < n; i++) {
    const p = -pMax + (2 * pMax) * i / (n - 1);
    const pSI = p * (HBAR / 1e-10);
    xs.push(p);
    ys.push(momentumProb(pSI, dp));
  }
  return { xs: xs, ys: ys, xMin: -pMax, xMax: pMax, sigmaP: dpPlot, dp: dp };
}
