/** Lightning rod (Franklin rod) — rolling-sphere protection teaching model (offline). */

/**
 * Striking distance r_s (m) vs prospective stroke peak current I (kA).
 * Empirical IEC/IEEE-style formula: r_s = 10 * I^0.65.
 * Larger prospective strikes "reach out" farther before choosing an
 * attachment point; smaller strikes are choosier and attach closer in.
 */
export function strikingDistance(I_kA) {
  const I = Math.max(I_kA, 0.1);
  return 10 * Math.pow(I, 0.65);
}

/**
 * Rolling-sphere horizontal protection radius R_p (m) at ground level for
 * a rod of height h_m, given striking distance rs_m.
 * Geometry: a sphere of radius rs rolled so it stays tangent to the rod
 * tip and to the ground traces the boundary of the protected zone.
 *   h <= rs : R_p = sqrt(rs^2 - (rs - h)^2)
 *   h >= rs : sphere geometry saturates — the rod is at least as tall as
 *             the rolling sphere, so we simplify R_p ≈ rs (the sphere can
 *             no longer roll past the tip without touching it first).
 */
export function protectionRadius(h_m, rs_m) {
  const h = Math.max(0, h_m);
  const rs = Math.max(0.01, rs_m);
  if (h >= rs) return rs;
  return Math.sqrt(rs * rs - (rs - h) * (rs - h));
}

/**
 * Sweep of {I, Rp} pairs for a fixed rod height h_m, showing how the
 * protection radius shrinks as the prospective stroke current (and hence
 * striking distance) decreases.
 */
export function curvePoints(h_m, IMin_kA, IMax_kA, n) {
  const pts = [];
  const N = n || 80;
  const lo = Math.max(0.1, IMin_kA);
  const hi = Math.max(lo + 0.1, IMax_kA);
  for (let i = 0; i <= N; i++) {
    const I = lo + (i / N) * (hi - lo);
    const rs = strikingDistance(I);
    const Rp = protectionRadius(h_m, rs);
    pts.push({ I: I, Rp: Rp });
  }
  return pts;
}
