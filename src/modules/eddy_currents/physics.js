/** Eddy currents — teaching model for inductive braking in a conducting plate. */

/** Induced E scale ~ B * v (motion through gap). Teaching units. */
export function inducedE(B, speed) {
  return B * speed;
}

/**
 * Eddy power ~ σ B² v² t² / ρ teaching model.
 * Here thickness plays role of t; rho_geom is a geometric factor (fixed = 1).
 * Returns relative heating power (arb. units).
 */
export function eddyPower(B, speed, thickness, sigma) {
  const t = Math.max(thickness, 1e-6);
  const s = Math.max(sigma, 1e-6);
  return s * B * B * speed * speed * t * t;
}

/** Braking force opposes motion: F_brake ~ P / v (for v > 0). */
export function brakeForce(B, speed, thickness, sigma) {
  const v = Math.max(Math.abs(speed), 1e-6);
  const P = eddyPower(B, speed, thickness, sigma);
  return P / v;
}

/** Sample F_brake vs speed for the plot. */
export function forceVsSpeed(B, thickness, sigma, vMax, n) {
  const N = n || 80;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const v = (i / N) * vMax;
    pts.push({ v: v, F: brakeForce(B, v, thickness, sigma) });
  }
  return pts;
}
