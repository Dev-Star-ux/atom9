/** Pulse radar teaching — range, delay, and simplified radar equation. */

var C = 2.99792458e8;

/** Two-way range from echo delay τ (s): R = c τ / 2. */
export function rangeFromDelay(tau) {
  return C * Math.max(tau, 0) / 2;
}

/** Echo delay from range R (m): τ = 2 R / c. */
export function delayFromRange(R) {
  return 2 * Math.max(R, 0) / C;
}

/** Unambiguous range for PRF (Hz): R_unamb = c / (2·PRF). */
export function unambiguousRange(prf) {
  return C / (2 * Math.max(prf, 1e-6));
}

/** Pulse length in meters (range resolution ≈ c·τ_p/2). */
export function pulseLengthMeters(pulseWidth) {
  return C * Math.max(pulseWidth, 0) / 2;
}

/** Teaching radar equation: P_r ∝ P_t · σ / R⁴ (omit constants for relative).
 *  Returns relative received power (arb.). */
export function echoPowerRelative(Pt, sigma, R) {
  var rr = Math.max(R, 1);
  return (Pt * Math.max(sigma, 0)) / (rr * rr * rr * rr);
}

/** Sample P_r(R) curve for plot. */
export function echoPowerCurve(Pt, sigma, Rmax, n) {
  var N = n || 80;
  var pts = [];
  var Rhi = Math.max(Rmax, 100);
  for (let i = 1; i <= N; i++) {
    var R = (i / N) * Rhi;
    pts.push({ R: R, Pr: echoPowerRelative(Pt, sigma, R) });
  }
  return pts;
}

/** A-scope echo envelope at time t after pulse (teaching Gaussian blob). */
export function ascopeEcho(t, tau, pulseWidth, amplitude) {
  var half = Math.max(pulseWidth, 1e-9) / 2;
  var u = (t - tau) / half;
  return amplitude * Math.exp(-u * u * 2.5);
}

/** True if target range is within unambiguous PRF window. */
export function withinUnambiguous(R, prf) {
  return R <= unambiguousRange(prf);
}
