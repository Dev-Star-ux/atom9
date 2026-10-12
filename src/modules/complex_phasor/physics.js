/** Two complex phasors z_k = e^(iφ_k) and their sum. */

export const DEFAULT_OMEGA = 2;

export function phasor(phi) {
  return { re: Math.cos(phi), im: Math.sin(phi) };
}

export function addPhasors(a, b) {
  return { re: a.re + b.re, im: a.im + b.im };
}

export function magnitude(p) {
  return Math.sqrt(p.re * p.re + p.im * p.im);
}

export function phase(p) {
  return Math.atan2(p.im, p.re);
}

export function resultant(phi1, phi2) {
  return addPhasors(phasor(phi1), phasor(phi2));
}

/** Real wave Re[(z₁ + z₂) e^(iωt)] = |z_sum| cos(ωt + arg z_sum). */
export function waveAtTime(sum, omega, t) {
  const mag = magnitude(sum);
  const ph = phase(sum);
  return mag * Math.cos(omega * t + ph);
}

export function sampleWave(sum, omega, n, tSpan) {
  n = n || 120;
  tSpan = tSpan != null ? tSpan : Math.PI * 2 / omega;
  const xs = [];
  const ys = [];
  for (let i = 0; i <= n; i++) {
    const t = -tSpan / 2 + (tSpan * i) / n;
    xs.push(t);
    ys.push(waveAtTime(sum, omega, t));
  }
  return { xs, ys };
}

export function interferenceAmplitude(phi1, phi2) {
  return magnitude(resultant(phi1, phi2));
}
