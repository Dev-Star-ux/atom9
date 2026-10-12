// Matter-wave packet: Gaussian envelope × carrier, with drift + dispersion.
// Inspired by https://physics-simulations.org/simulation/wave-packet/
export { gaussianDk, gaussianDx } from '../common/wavePhysics.js';

/** Map UI width (10–100) → metres for AI / Δk readout. */
export function sigmaMetres(sigmaPx) {
  return sigmaPx * 1e-10;
}

export function envelopeAmp(x, centerX, sigma) {
  const rel = (x - centerX) / Math.max(sigma, 1e-6);
  return Math.exp(-(rel * rel) / 2);
}

export function carrierY(x, centerX, sigma, wavelength, phase) {
  const amp = envelopeAmp(x, centerX, sigma);
  const k = (2 * Math.PI) / Math.max(4, wavelength);
  return amp * Math.sin(k * (x - centerX) + phase);
}

/**
 * Free Gaussian packet (pedagogical units on a fixed plot axis).
 * width: σ₀ (plot units), momentum: ⟨k⟩ scale 0–1 → carrier k,
 * dispersion: how fast σ grows with time.
 */
export function packetState(width, momentum, dispersion, t) {
  const sigma0 = Math.max(8, width * 0.55);
  // Dispersion: σ(t)² = σ₀² + (α t)²
  const alpha = 4 + dispersion * 36;
  const sigma = Math.sqrt(sigma0 * sigma0 + (alpha * t) * (alpha * t));
  const k0 = 0.08 + momentum * 0.55; // rad per plot unit
  const wavelength = (2 * Math.PI) / k0;
  // Group velocity ∝ k (pedagogical)
  const vg = 18 + momentum * 55;
  const x0 = -90 + vg * t;
  // Wrap softly so the demo loops
  let center = x0;
  while (center > 140) center -= 280;
  while (center < -140) center += 280;
  return {
    sigma0: sigma0,
    sigma: sigma,
    k0: k0,
    wavelength: wavelength,
    vg: vg,
    center: center,
    phase: k0 * vg * t * 0.35,
  };
}

/** Sample Re ψ, Im ψ, |ψ|² on [xMin, xMax]. */
export function samplePacket(width, momentum, dispersion, t, n, xMin, xMax) {
  if (n == null) n = 220;
  if (xMin == null) xMin = -120;
  if (xMax == null) xMax = 120;
  const st = packetState(width, momentum, dispersion, t);
  const xs = [];
  const re = [];
  const im = [];
  const dens = [];
  const amp = [];
  for (let i = 0; i < n; i++) {
    const x = xMin + (xMax - xMin) * i / (n - 1);
    const env = envelopeAmp(x, st.center, st.sigma);
    const th = st.k0 * (x - st.center) - st.phase;
    const r = env * Math.cos(th);
    const m = env * Math.sin(th);
    xs.push(x);
    re.push(r);
    im.push(m);
    amp.push(env);
    dens.push(env * env);
  }
  return {
    xs: xs,
    re: re,
    im: im,
    amp: amp,
    dens: dens,
    xMin: xMin,
    xMax: xMax,
    state: st,
  };
}
