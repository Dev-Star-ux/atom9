// ESR / EPR — electron spin resonance spectrum (isotropic teaching model).
// Reference: https://www.eprsimulator.org/

export const MU_B = 9.274e-24; // J/T
export const H_PLANCK = 6.626e-34;
export const G_FREE = 2.0023;

/** Resonance field (mT) at microwave frequency (GHz). B = hν / (g μ_B) */
export function resonanceFieldMT(g, freqGHz) {
  const nu = (freqGHz || 9.5) * 1e9;
  const B = H_PLANCK * nu / ((g || G_FREE) * MU_B);
  return B * 1000;
}

function lorentz(x, x0, lw) {
  const w = Math.max(0.05, lw);
  const d = (x - x0) / w;
  return 1 / (1 + d * d);
}

function gauss(x, x0, lw) {
  const w = Math.max(0.05, lw);
  const d = (x - x0) / w;
  return Math.exp(-0.5 * d * d);
}

/**
 * Isotropic EPR lineshape: hyperfine splitting A (mT) with I=1/2 nucleus.
 * nNuclei: number of equivalent I=1/2 nuclei → 2^n lines.
 * lineShape: 'lorentz' | 'gauss'
 */
export function eprSpectrum(Bmin, Bmax, nPts, g, A_mT, hyperfineN, linewidth, freqGHz, lineShape) {
  const B0 = resonanceFieldMT(g, freqGHz);
  const A = Math.max(0, A_mT || 0);
  const n = Math.max(0, Math.min(3, Math.floor(hyperfineN || 1)));
  const nLines = Math.pow(2, n);
  const xs = [];
  const ys = [];
  const step = (Bmax - Bmin) / Math.max(2, nPts - 1);
  const peakFn = lineShape === 'gauss' ? gauss : lorentz;

  for (let i = 0; i < nPts; i++) {
    const B = Bmin + i * step;
    xs.push(B);
    let y = 0;
    for (let k = 0; k < nLines; k++) {
      const mI = k - (nLines - 1) / 2;
      const pos = B0 + mI * A;
      y += peakFn(B, pos, linewidth);
    }
    ys.push(y);
  }
  let yMax = 1e-9;
  for (let j = 0; j < ys.length; j++) if (ys[j] > yMax) yMax = ys[j];
  for (let j = 0; j < ys.length; j++) ys[j] /= yMax;
  return { xs: xs, ys: ys, B0: B0, nLines: nLines };
}

export function peakPositions(g, A_mT, hyperfineN, freqGHz) {
  const B0 = resonanceFieldMT(g, freqGHz);
  const n = Math.max(0, Math.min(3, Math.floor(hyperfineN || 1)));
  const nLines = Math.pow(2, n);
  const A = Math.max(0, A_mT || 0);
  const out = [];
  for (let k = 0; k < nLines; k++) {
    const mI = k - (nLines - 1) / 2;
    out.push(B0 + mI * A);
  }
  return out;
}
