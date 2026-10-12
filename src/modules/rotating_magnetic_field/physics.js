/** Three-phase rotating magnetic field — stator RMF teaching model. */

const DEG120 = (120 * Math.PI) / 180;

/**
 * Phase axis unit vectors at 0°, 120°, 240° in the plane.
 * Ba = B0 cos(ωt) along axis a, etc.
 * Resultant magnitude is 1.5 B0 for balanced three-phase.
 */
export function phaseComponents(B0, omega, t) {
  const wt = omega * t;
  const Ba = B0 * Math.cos(wt);
  const Bb = B0 * Math.cos(wt - DEG120);
  const Bc = B0 * Math.cos(wt + DEG120);
  return { Ba: Ba, Bb: Bb, Bc: Bc };
}

/** Vector sum in Cartesian (x,y). Axes at 0°, 120°, 240°. */
export function resultantB(B0, omega, t) {
  const c = phaseComponents(B0, omega, t);
  const axA = 1, ayA = 0;
  const axB = Math.cos(DEG120), ayB = Math.sin(DEG120);
  const axC = Math.cos(-DEG120), ayC = Math.sin(-DEG120);
  const Bx = c.Ba * axA + c.Bb * axB + c.Bc * axC;
  const By = c.Ba * ayA + c.Bb * ayB + c.Bc * ayC;
  return { Bx: Bx, By: By, mag: Math.sqrt(Bx * Bx + By * By) };
}

/** Ideal resultant magnitude for balanced 3-phase = 1.5 B0 */
export function idealMagnitude(B0) {
  return 1.5 * B0;
}

export function omegaFromFreq(fHz) {
  return 2 * Math.PI * fHz;
}
