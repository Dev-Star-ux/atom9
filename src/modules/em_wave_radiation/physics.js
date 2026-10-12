/** Hertzian dipole radiation — far-field teaching formulas. */

var C = 2.99792458e8;

/** Angular frequency from frequency f (Hz). */
export function omega(f) {
  return 2 * Math.PI * Math.max(f, 1e-6);
}

/** Wavelength (m) from frequency f (Hz). */
export function wavelength(f) {
  return C / Math.max(f, 1e-6);
}

/** Far-field radiation pattern factor |sin θ| (θ from z-axis of dipole). */
export function patternSinTheta(thetaRad) {
  return Math.abs(Math.sin(thetaRad));
}

/** Normalized Poynting magnitude ~ (I0·k·sinθ / r)² teaching proxy.
 *  amp = dipole strength (arb.), f in Hz, r in m, theta in rad. */
export function poyntingFar(amp, f, r, thetaRad) {
  var k = omega(f) / C;
  var rr = Math.max(r, 1e-6);
  var s = patternSinTheta(thetaRad);
  return (amp * amp) * (k * k) * (s * s) / (rr * rr);
}

/** Sample radiation pattern (polar): array of {theta, r} with r in [0,1]. */
export function patternSamples(n) {
  var N = n || 72;
  var pts = [];
  for (let i = 0; i <= N; i++) {
    var th = (i / N) * Math.PI;
    pts.push({ theta: th, r: patternSinTheta(th) });
  }
  return pts;
}

/** Near-field boundary teaching estimate: r_ff ≈ 2 λ (order-of-magnitude). */
export function farFieldDistance(f) {
  return 2 * wavelength(f);
}

/** Expanding wave-front radii for animation (normalized 0..1 cycle). */
export function waveFrontRadii(phase, nFronts, amp) {
  var N = nFronts || 5;
  var out = [];
  var A = Math.max(0.15, Math.min(1, amp));
  for (let i = 0; i < N; i++) {
    var t = (phase * 0.15 + i / N) % 1;
    out.push({ t: t, radius: 0.08 + t * 0.92, alpha: (1 - t) * A });
  }
  return out;
}
