// Hall effect: a current-carrying slab in a perpendicular magnetic field
// develops a transverse voltage as the Lorentz force deflects carriers to one
// edge. The sign of the Hall voltage reveals whether the carriers are
// negative (electrons, n-type) or positive (holes, p-type).
export const Q_CHARGE = 1.602176634e-19;

// V_H = I*B / (n*e*t)
export function hallVoltage(I, B, n, t) {
  if (n <= 0 || t <= 0) return 0;
  return (I * B) / (n * Q_CHARGE * t);
}

export function hallCoefficient(n) {
  return 1 / (n * Q_CHARGE);
}

export function driftVelocity(I, n, area) {
  if (n <= 0 || area <= 0) return 0;
  return I / (n * Q_CHARGE * area);
}

export const CARRIER_TYPES = [
  { id: 'n', name: 'n-type (electrons)', sign: -1 },
  { id: 'p', name: 'p-type (holes)', sign: 1 },
];

// Signed Hall voltage. hallVoltage() above returns a magnitude (n, e, t are
// always positive); the carrier sign is what actually flips the measured
// polarity. NOTE on the underlying physics (important for the visuals):
// for a fixed conventional-current direction and fixed B, F = q*v_drift x B
// pushes BOTH electrons and holes toward the *same* physical edge of the
// bar (q and v_drift flip sign together, so q*v_drift — and hence the force
// — does not). What flips between n-type and p-type is the SIGN of the
// charge piling up at that edge (electrons => that edge goes negative;
// holes => that edge goes positive), which is exactly why the sign of V_H
// identifies the carrier type. Scenes should keep carrier pile-up on the
// same visual edge for both types and flip only the +/- edge labels and
// this signed voltage.
export function hallVoltageSigned(I, B, n, t, carrierId) {
  const mag = hallVoltage(I, B, n, t);
  const sign = carrierId === 'p' ? 1 : -1;
  return sign * mag;
}
