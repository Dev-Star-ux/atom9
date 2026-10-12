/** EM wave refraction — Snell's law + interface teaching. */

/** Index of refraction n = c/v = √(ε_r μ_r) for non-magnetic teaching (μ_r≈1). */
export function indexFromEr(er) {
  return Math.sqrt(Math.max(er, 1e-6));
}

/** Refracted angle θ2 (rad) from Snell: n1 sinθ1 = n2 sinθ2.
 *  Returns null if total internal reflection. */
export function snellTheta2(n1, n2, theta1Rad) {
  var nn1 = Math.max(n1, 1e-6);
  var nn2 = Math.max(n2, 1e-6);
  var s = (nn1 / nn2) * Math.sin(theta1Rad);
  if (s > 1) return null;
  if (s < -1) return null;
  return Math.asin(s);
}

/** Critical angle (rad) for TIR when n1 > n2; otherwise null. */
export function criticalAngle(n1, n2) {
  if (n1 <= n2) return null;
  return Math.asin(Math.min(1, n2 / Math.max(n1, 1e-6)));
}

/** Fresnel amplitude reflection (s-pol teaching): r = (n1 cosθ1 − n2 cosθ2)/(…) */
export function fresnelRs(n1, n2, theta1Rad, theta2Rad) {
  if (theta2Rad == null) return 1;
  var c1 = Math.cos(theta1Rad);
  var c2 = Math.cos(theta2Rad);
  var num = n1 * c1 - n2 * c2;
  var den = n1 * c1 + n2 * c2;
  if (Math.abs(den) < 1e-12) return 1;
  return num / den;
}

/** Power reflectance R ≈ r² (normal-incidence teaching proxy when angles given). */
export function reflectance(n1, n2, theta1Rad) {
  var th2 = snellTheta2(n1, n2, theta1Rad);
  if (th2 == null) return 1;
  var r = fresnelRs(n1, n2, theta1Rad, th2);
  return r * r;
}

/** Live Snell check residual: n1 sinθ1 − n2 sinθ2 (0 when satisfied). */
export function snellResidual(n1, n2, theta1Rad, theta2Rad) {
  if (theta2Rad == null) return NaN;
  return n1 * Math.sin(theta1Rad) - n2 * Math.sin(theta2Rad);
}

/** Curve θ2(θ1) in degrees for plot; null points mark TIR. */
export function theta2VsTheta1(n1, n2, nPts) {
  var N = nPts || 90;
  var pts = [];
  for (let i = 0; i <= N; i++) {
    var th1 = (i / N) * (Math.PI / 2 - 0.001);
    var th2 = snellTheta2(n1, n2, th1);
    pts.push({
      theta1Deg: th1 * 180 / Math.PI,
      theta2Deg: th2 == null ? null : th2 * 180 / Math.PI,
    });
  }
  return pts;
}

export function degToRad(d) { return d * Math.PI / 180; }
export function radToDeg(r) { return r * 180 / Math.PI; }
