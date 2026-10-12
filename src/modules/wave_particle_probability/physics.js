// Born rule + Polytechnique-style free packet: ψ(x) ↔ φ(p).
// https://www.quantum-physics.polytechnique.fr/freeWavepacket.php
import {
  HBAR,
  psiGaussian,
  probGaussian,
  gaussianDp,
} from '../common/wavePhysics.js';

export { psiGaussian, probGaussian, HBAR };

export const K0 = 5e9; // carrier wave number (1/m) — phase stripes in x
export const VIEW_MODES = ['wave', 'probability', 'detections'];

export function sigmaM(sigmaArb) {
  return sigmaArb * 1e-10;
}

export function psiNormAtOrigin(sm) {
  return psiGaussian(0, sm, K0);
}

export function probNormAtOrigin(sm) {
  return probGaussian(0, sm);
}

/** Box–Muller sample from |ψ|² ∝ exp(−x²/σ²). */
export function sampleHit(sm) {
  const u = Math.random() || 1e-9;
  const v = Math.random();
  return sm * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function deltaX(sm) {
  return sm;
}

export function deltaP(sm) {
  return gaussianDp(sm);
}

export function xpProduct(sm) {
  return deltaX(sm) * deltaP(sm);
}

/** Hue 0–1 from complex phase (−π…π). */
export function phaseHue(re, im) {
  let ph = Math.atan2(im, re);
  if (ph < 0) ph += Math.PI * 2;
  return ph / (Math.PI * 2);
}

export function hslPhase(hue, light) {
  if (light == null) light = 55;
  const h = Math.floor(hue * 360);
  return 'hsl(' + h + ',78%,' + light + '%)';
}

/**
 * Sample complex Gaussian packet ψ(x,t) ≈ A(x) e^{i(k₀x − ωt)}
 * with envelope A = exp(−x²/(2σ²)). Pedagogical ω ∝ k₀².
 */
export function samplePsiComplex(sm, phaseT, n) {
  if (n == null) n = 160;
  if (phaseT == null) phaseT = 0;
  const xMax = Math.max(sm * 5, 1e-10);
  const xs = [];
  const amp = [];
  const dens = [];
  const re = [];
  const im = [];
  const hue = [];
  const omega = (HBAR * K0 * K0) / (2 * 9.109e-31); // free-particle scale (too fast) — use pedagogical
  const wPed = 2.5; // rad/s of sim time for visible phase drift
  for (let i = 0; i < n; i++) {
    const x = -xMax + (2 * xMax) * i / (n - 1);
    const env = Math.exp(-(x * x) / (2 * sm * sm));
    const th = K0 * x - wPed * phaseT;
    const r = env * Math.cos(th);
    const m = env * Math.sin(th);
    xs.push(x);
    amp.push(env);
    dens.push(env * env);
    re.push(r);
    im.push(m);
    hue.push(phaseHue(r, m));
  }
  return {
    xs: xs,
    amp: amp,
    dens: dens,
    re: re,
    im: im,
    hue: hue,
    xMin: -xMax,
    xMax: xMax,
    omegaUnused: omega,
  };
}

/** |φ(p)|² for minimum-uncertainty Gaussian — fixed in p (free evolution). */
export function samplePhiP(sm, n) {
  if (n == null) n = 120;
  const dp = deltaP(sm);
  // Plot axis in units of ħ / Å so numbers stay readable
  const unit = HBAR / 1e-10;
  const dpPlot = dp / unit;
  const p0Plot = (HBAR * K0) / unit; // ⟨p⟩ = ħ k₀
  const pMax = Math.max(p0Plot + dpPlot * 4.5, dpPlot * 5);
  const xs = [];
  const ys = [];
  const hue = [];
  for (let i = 0; i < n; i++) {
    const p = -pMax + (2 * pMax) * i / (n - 1);
    const pSI = p * unit;
    const meanP = HBAR * K0;
    const d = pSI - meanP;
    const y = Math.exp(-(d * d) / (2 * dp * dp));
    xs.push(p);
    ys.push(y);
    // Phase of φ is flat (real envelope) + overall global — use position in packet for colour stripe
    hue.push(0.55);
  }
  return {
    xs: xs,
    ys: ys,
    hue: hue,
    xMin: -pMax,
    xMax: pMax,
    p0: p0Plot,
    dpPlot: dpPlot,
    dp: dp,
  };
}

/** Map metres → plot coordinate spanning [xMin,xMax] → [0,1] fraction. */
export function fracIn(x, xMin, xMax) {
  if (xMax === xMin) return 0.5;
  return (x - xMin) / (xMax - xMin);
}
