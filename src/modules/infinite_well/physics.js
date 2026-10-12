// Infinite square well — Schroeder-style superposition of the lowest N_MAX states.
// https://physics.weber.edu/schroeder/software/SquareWell.html
import {
  HBAR,
  infiniteWellPsi,
  infiniteWellProb,
  infiniteWellEnergyEV,
  infiniteWellEnergyJ,
} from '../common/wavePhysics.js';

export {
  infiniteWellPsi,
  infiniteWellProb,
  infiniteWellEnergyEV,
  infiniteWellEnergyJ,
};

export const DEFAULT_A = 1e-9;
export const N_MAX = 8;

export function energyRatio(n) {
  return n * n;
}

export function levelEnergies(a, maxN) {
  if (maxN == null) maxN = N_MAX;
  const levels = [];
  for (let lvl = 1; lvl <= maxN; lvl++) {
    levels.push({ n: lvl, E: infiniteWellEnergyEV(lvl, a) });
  }
  return levels;
}

export function wellCurves(n, a, nPts) {
  if (nPts == null) nPts = 100;
  const xs = [];
  const psis = [];
  const probs = [];
  for (let i = 0; i < nPts; i++) {
    const x = a * i / (nPts - 1);
    xs.push(x);
    psis.push(infiniteWellPsi(n, x, a));
    probs.push(infiniteWellProb(n, x, a));
  }
  return { xs: xs, psis: psis, probs: probs };
}

function mag2(c) {
  return c.re * c.re + c.im * c.im;
}

/**
 * Shared well state: complex amplitudes for n = 1..N_MAX, time evolution.
 * Frequencies ∝ E_n ∝ n² (pedagogical scale so motion is visible).
 */
export class WellState {
  constructor() {
    this.a = DEFAULT_A;
    this.t = 0;
    this.speed = 1;
    this.viewMode = 'reim'; // 'reim' | 'density'
    this.amps = [];
    for (let i = 0; i < N_MAX; i++) {
      this.amps.push({ re: i === 0 ? 1 : 0, im: 0 });
    }
  }

  setParams(p) {
    if (!p) return;
    if (p.a != null) this.a = p.a;
    if (p.speed != null) this.speed = p.speed;
    if (p.viewMode != null) this.viewMode = p.viewMode;
  }

  /** Select a single energy eigenstate n (1-based). */
  setLevel(n) {
    const idx = Math.max(1, Math.min(N_MAX, Math.round(n))) - 1;
    this.zero();
    this.amps[idx] = { re: 1, im: 0 };
    this.t = 0;
  }

  zero() {
    for (let i = 0; i < N_MAX; i++) {
      this.amps[i] = { re: 0, im: 0 };
    }
  }

  normalize() {
    let s = 0;
    for (let i = 0; i < N_MAX; i++) s += mag2(this.amps[i]);
    if (s < 1e-12) {
      this.amps[0] = { re: 1, im: 0 };
      return;
    }
    const inv = 1 / Math.sqrt(s);
    for (let i = 0; i < N_MAX; i++) {
      this.amps[i] = { re: this.amps[i].re * inv, im: this.amps[i].im * inv };
    }
  }

  /** Click a clock: toggle / set amplitude on that basis (Schroeder-like). */
  bumpLevel(n, amount) {
    const idx = Math.max(1, Math.min(N_MAX, n)) - 1;
    if (amount == null) amount = 0.35;
    const c = this.amps[idx];
    const m = Math.sqrt(mag2(c));
    if (m < 0.05) {
      this.amps[idx] = { re: amount, im: 0 };
    } else {
      const next = Math.min(1, m + amount);
      const scale = next / m;
      this.amps[idx] = { re: c.re * scale, im: c.im * scale };
    }
    this.normalize();
  }

  setAmp(n, re, im) {
    const idx = Math.max(1, Math.min(N_MAX, n)) - 1;
    this.amps[idx] = { re: re, im: im };
  }

  /** Time-evolved amplitude c_n(t) = c_n(0) e^{-i ω_n t}, ω_n ∝ n². */
  ampAt(i) {
    const n = i + 1;
    const omega = n * n * this.speed * 0.55;
    const th = omega * this.t;
    const c0 = this.amps[i];
    const cos = Math.cos(th);
    const sin = Math.sin(th);
    return {
      re: c0.re * cos + c0.im * sin,
      im: c0.im * cos - c0.re * sin,
    };
  }

  tick(dt) {
    if (dt == null) dt = 0.016;
    this.t += dt;
  }

  /**
   * Sample ψ(x,t) = Σ c_n(t) ψ_n(x).
   * Returns xs (nm), re, im, dens, phase (0..1).
   */
  sample(nPts) {
    if (nPts == null) nPts = 160;
    const a = this.a;
    const xs = [];
    const re = [];
    const im = [];
    const dens = [];
    const phase = [];
    const amps = [];
    for (let i = 0; i < N_MAX; i++) amps.push(this.ampAt(i));

    for (let i = 0; i < nPts; i++) {
      const x = a * i / (nPts - 1);
      let r = 0;
      let m = 0;
      for (let k = 0; k < N_MAX; k++) {
        const psi = infiniteWellPsi(k + 1, x, a);
        r += amps[k].re * psi;
        m += amps[k].im * psi;
      }
      xs.push(x * 1e9);
      re.push(r);
      im.push(m);
      dens.push(r * r + m * m);
      let ph = Math.atan2(m, r);
      if (ph < 0) ph += Math.PI * 2;
      phase.push(ph / (Math.PI * 2));
    }
    return { xs: xs, re: re, im: im, dens: dens, phase: phase, aNm: a * 1e9 };
  }

  dominantLevel() {
    let best = 0;
    let bestM = -1;
    for (let i = 0; i < N_MAX; i++) {
      const m = mag2(this.amps[i]);
      if (m > bestM) {
        bestM = m;
        best = i + 1;
      }
    }
    return best;
  }
}

/** Hue for phase 0..1 — Schroeder-like rainbow (red→green→cyan→purple→red). */
export function phaseHue(t) {
  return (t * 360) % 360;
}

export function phaseCss(t, alpha) {
  if (alpha == null) alpha = 1;
  return 'hsla(' + Math.round(phaseHue(t)) + ',85%,60%,' + alpha + ')';
}
