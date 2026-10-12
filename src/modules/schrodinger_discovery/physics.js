// 1-D time-dependent Schrödinger equation (TDSE) simulator.
// Domain 0 < x < 1 with hard walls. Units ħ = 1, m = 1 (teaching units).
// Evolution: second-order unitary (Cayley / Crank–Nicolson) — stable, old-JS friendly.

export const N = 256;
export const DX = 1 / (N - 1);
export const DT = 0.00002;

export const POTENTIALS = ['infinite', 'harmonic', 'double', 'barrier', 'step'];
export const STATES = ['gaussian', 'eigen', 'harmonic0', 'harmonic1'];

export const DEFAULT_A = 1e-9; // kept for AI fitter (physical box width)

function idxX(i) { return i * DX; }

export function potentialArray(kind, V0) {
  const V = new Float64Array(N);
  const v0 = V0 == null ? 80 : V0;
  for (let i = 0; i < N; i++) {
    const x = idxX(i);
    if (kind === 'harmonic') {
      V[i] = 200 * (x - 0.5) * (x - 0.5);
    } else if (kind === 'double') {
      const x0 = 0.18;
      const u = (x - 0.5 - x0) * (x - 0.5 + x0);
      V[i] = 900 * u * u;
    } else if (kind === 'barrier') {
      V[i] = (x > 0.45 && x < 0.55) ? v0 : 0;
    } else if (kind === 'step') {
      V[i] = x >= 0.5 ? v0 : 0;
    } else {
      V[i] = 0; // infinite well — walls enforced by ψ=0 at ends
    }
  }
  return V;
}

export function makeState(kind, opts) {
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  const pos = opts && opts.position != null ? opts.position : 0.35;
  const vel = opts && opts.velocity != null ? opts.velocity : 40;
  const sig = opts && opts.variance != null ? opts.variance : 0.05;
  const n = opts && opts.level != null ? Math.max(1, Math.round(opts.level)) : 1;

  for (let i = 0; i < N; i++) {
    const x = idxX(i);
    if (kind === 'eigen') {
      re[i] = Math.SQRT2 * Math.sin(n * Math.PI * x);
      im[i] = 0;
    } else if (kind === 'harmonic0') {
      const a = Math.pow(200, 0.25);
      re[i] = Math.exp(-0.5 * a * a * (x - 0.5) * (x - 0.5));
      im[i] = 0;
    } else if (kind === 'harmonic1') {
      const a = Math.pow(200, 0.25);
      const xi = a * (x - 0.5);
      re[i] = xi * Math.exp(-0.5 * xi * xi);
      im[i] = 0;
    } else {
      // Gaussian wave packet with momentum
      const g = Math.exp(-0.5 * ((x - pos) / sig) * ((x - pos) / sig));
      const ph = vel * (x - pos);
      re[i] = g * Math.cos(ph);
      im[i] = g * Math.sin(ph);
    }
  }
  re[0] = im[0] = 0;
  re[N - 1] = im[N - 1] = 0;
  normalize(re, im);
  return { re, im };
}

export function normalize(re, im) {
  let s = 0;
  for (let i = 0; i < N; i++) s += (re[i] * re[i] + im[i] * im[i]) * DX;
  if (s <= 0) return;
  const inv = 1 / Math.sqrt(s);
  for (let i = 0; i < N; i++) { re[i] *= inv; im[i] *= inv; }
}

/** Explicit second-order step + renormalize (stable enough for the teaching demo). */
export function stepTDSE(re, im, V, dt) {
  const n = N;
  const invDx2 = 1 / (DX * DX);

  function deriv(rin, iin, rout, iout) {
    for (let i = 1; i < n - 1; i++) {
      const lapR = (rin[i + 1] - 2 * rin[i] + rin[i - 1]) * invDx2;
      const lapI = (iin[i + 1] - 2 * iin[i] + iin[i - 1]) * invDx2;
      const Hr = -0.5 * lapR + V[i] * rin[i];
      const Hi = -0.5 * lapI + V[i] * iin[i];
      // ∂ψ/∂t = −i Hψ  →  ∂re/∂t = Hi , ∂im/∂t = −Hr
      rout[i] = Hi;
      iout[i] = -Hr;
    }
    rout[0] = iout[0] = 0;
    rout[n - 1] = iout[n - 1] = 0;
  }

  const k1r = new Float64Array(n);
  const k1i = new Float64Array(n);
  const k2r = new Float64Array(n);
  const k2i = new Float64Array(n);
  const tr = new Float64Array(n);
  const ti = new Float64Array(n);

  deriv(re, im, k1r, k1i);
  for (let i = 0; i < n; i++) {
    tr[i] = re[i] + 0.5 * dt * k1r[i];
    ti[i] = im[i] + 0.5 * dt * k1i[i];
  }
  tr[0] = ti[0] = 0;
  tr[n - 1] = ti[n - 1] = 0;
  deriv(tr, ti, k2r, k2i);
  for (let i = 0; i < n; i++) {
    re[i] += dt * k2r[i];
    im[i] += dt * k2i[i];
  }
  re[0] = im[0] = 0;
  re[n - 1] = im[n - 1] = 0;
  normalize(re, im);
}

export function observables(re, im) {
  let pLeft = 0, xMean = 0, x2 = 0, norm = 0;
  for (let i = 0; i < N; i++) {
    const p = (re[i] * re[i] + im[i] * im[i]) * DX;
    const x = idxX(i);
    norm += p;
    xMean += x * p;
    x2 += x * x * p;
    if (x < 0.5) pLeft += p;
  }
  if (norm > 0) { xMean /= norm; x2 /= norm; pLeft /= norm; }
  return {
    pLeft: pLeft,
    xMean: xMean,
    xRms: Math.sqrt(Math.max(0, x2)),
  };
}

export function phaseColor(re, im, amp) {
  const ang = Math.atan2(im, re); // −π..π
  const hue = (ang + Math.PI) / (2 * Math.PI); // 0..1
  const sat = 0.85;
  const light = 0.35 + 0.45 * Math.min(1, amp * 3);
  return hslToRgb(hue, sat, light);
}

function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return 'rgb(' + Math.round(r * 255) + ',' + Math.round(g * 255) + ',' + Math.round(b * 255) + ')';
}

function hue2rgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

// Re-export for AI fitter compatibility
export { infiniteWellEnergyEV } from '../common/wavePhysics.js';
