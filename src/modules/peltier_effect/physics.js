// Peltier effect: driving a current through a junction of two dissimilar
// conductors pumps heat from one side to the other. This is the Seebeck
// effect run in reverse (Kelvin relation: Peltier coefficient Pi = S * T).
export function peltierCoefficient(S, T) {
  return S * T;
}

// Simplified thermoelectric-cooler energy balance for the cold side:
// Qc = Pi*I - 0.5*I^2*Rm - K*dT   (Peltier pumping - Joule heating back-leak - thermal conduction back-leak)
export function coldSideHeat(I, S, Tc, Rm, K, dT) {
  const pi = peltierCoefficient(S, Tc);
  return pi * I - 0.5 * I * I * Rm - K * dT;
}

export function hotSideHeat(I, S, Th, Rm, K, dT) {
  const pi = peltierCoefficient(S, Th);
  return pi * I + 0.5 * I * I * Rm + K * dT;
}

// Module-effective constants (representing a many-couple TEC stack, not a single junction)
// tuned so the demo shows a clear, bounded cooling curve across the current slider's range.
export const TEC_DEFAULTS = { S: 0.05, Rm: 1.5, K: 0.7 };

// Shared cold-face ΔT relaxation step, factored out so both the 2D and 3D
// scenes (and module.js info readouts) integrate the exact same dynamics —
// same formula/constants the original single-canvas demo used.
export function stepDeltaT(dT, I, T0, thermalMass, dt) {
  const Tc = T0 - dT;
  const Qc = coldSideHeat(I, TEC_DEFAULTS.S, Tc, TEC_DEFAULTS.Rm, TEC_DEFAULTS.K, dT);
  let next = dT + (Qc / (thermalMass * 8)) * dt * 20;
  next = Math.max(-15, Math.min(60, next));
  return next;
}
