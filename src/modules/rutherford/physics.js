// Physics for Rutherford scattering (Ch.1 Sec.2 — discovery of the nucleus).
//
// Alpha particles (charge +2e) are fired at a heavy nucleus (charge +Ze). The
// Coulomb repulsion deflects them by a scattering angle θ that depends on the
// impact parameter b. Rutherford showed the count vs angle follows 1/sin⁴(θ/2)
// — the signature of a tiny, highly-charged nucleus.
//
// We work in a dimensionless unit system: nucleus at the origin, alpha mass = 1,
// central repulsive force  F = κ · r̂ / r²  with κ ∝ Z. The distance-of-closest-
// approach parameter is D = κ / E, and the exact relation is
//     θ = 2 · atan( D / (2b) ).

export const K_SCALE = 0.05;          // κ = K_SCALE · Z  (dimensionless)
export const X0 = 30;                 // start/exit distance along the beam axis
export const Z_GOLD = 79;

export const ELEMENTS = [
  { name: 'Gold (Au)', Z: 79 },
  { name: 'Silver (Ag)', Z: 47 },
  { name: 'Copper (Cu)', Z: 29 },
  { name: 'Aluminium (Al)', Z: 13 },
];

export function kappaOf(Z) { return K_SCALE * Z; }
export function closestApproach(Z, E) { return kappaOf(Z) / E; }   // D (head-on)

// Exact scattering angle (radians) for impact parameter b.
export function scatteringAngle(b, Z, E) {
  if (b <= 0) return Math.PI;
  const D = closestApproach(Z, E);
  return 2 * Math.atan(D / (2 * b));
}

// Numerically integrate one trajectory (velocity Verlet). Returns the path
// points and the final scattering angle — used to validate the analytic form
// and (optionally) to draw trajectories.
export function integrateTrajectory(b, Z, E, dt = 0.02, maxSteps = 20000) {
  const kappa = kappaOf(Z);
  const v0 = Math.sqrt(2 * E);           // E = ½ m v², m = 1
  let x = -X0, y = b, vx = v0, vy = 0;
  const acc = (px, py) => {
    const r2 = px * px + py * py;
    const r = Math.sqrt(r2) || 1e-9;
    const f = kappa / (r2 * r);          // κ/r² along r̂ = κ·r_vec/r³
    return [f * px, f * py];
  };
  let [ax, ay] = acc(x, y);
  const pts = [[x, y]];
  for (let i = 0; i < maxSteps; i++) {
    x += vx * dt + 0.5 * ax * dt * dt;
    y += vy * dt + 0.5 * ay * dt * dt;
    const [nax, nay] = acc(x, y);
    vx += 0.5 * (ax + nax) * dt;
    vy += 0.5 * (ay + nay) * dt;
    ax = nax; ay = nay;
    if (i % 20 === 0) pts.push([x, y]);
    if (x * x + y * y > X0 * X0 && x > 0) break;
  }
  const theta = Math.atan2(Math.abs(vy), vx);   // angle from +x axis
  return { points: pts, theta };
}

// Rutherford differential count at detector angle θ (degrees), for charge Z.
// N(θ) = K · Z² / sin⁴(θ/2)   (E, geometry, flux folded into K).
export function rutherfordCount(Z, thetaDeg, K) {
  const s = Math.sin(thetaDeg * Math.PI / 360);   // sin(θ/2)
  return K * Z * Z / Math.pow(s, 4);
}

// Fraction of alphas scattered beyond angle θ for a beam with impact parameters
// uniform in area up to b_max:  ∝ cot²(θ/2).
export function fractionBeyond(thetaDeg, Z, E, bMax) {
  const D = closestApproach(Z, E);
  const b = (D / 2) / Math.tan(thetaDeg * Math.PI / 360);
  return Math.min(1, (b * b) / (bMax * bMax));
}
