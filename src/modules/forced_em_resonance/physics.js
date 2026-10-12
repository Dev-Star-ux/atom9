/** Forced EM resonance — series RLC driven by AC source. */

export function omega0(L, C) {
  const lc = Math.max(L * C, 1e-30);
  return 1 / Math.sqrt(lc);
}

export function f0(L, C) {
  return omega0(L, C) / (2 * Math.PI);
}

export function reactance(omega, L, C) {
  const w = Math.max(omega, 1e-12);
  return w * L - 1 / (w * C);
}

export function impedance(R, omega, L, C) {
  const X = reactance(omega, L, C);
  return Math.sqrt(R * R + X * X);
}

export function currentAmp(V, R, omega, L, C) {
  const Z = impedance(R, omega, L, C);
  return Z > 1e-15 ? V / Z : 0;
}

/** Quality factor Q = ω0 L / R */
export function qualityFactor(L, C, R) {
  const r = Math.max(R, 1e-12);
  return (omega0(L, C) * L) / r;
}

/** Phase of current relative to voltage: φ = atan(X/R), negative = capacitive lead */
export function phaseAngle(R, omega, L, C) {
  return Math.atan2(reactance(omega, L, C), Math.max(R, 1e-12));
}

/** Sample I(f) resonance curve. */
export function resonanceCurve(V, R, L, C, fMin, fMax, n) {
  const N = n || 100;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const f = fMin + (i / N) * (fMax - fMin);
    const w = 2 * Math.PI * f;
    pts.push({ f: f, I: currentAmp(V, R, w, L, C) });
  }
  return pts;
}
