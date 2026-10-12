/** Electrostatic precipitator (ESP) — corona charging, drift, Deutsch-Anderson efficiency (teaching model). */

// Dynamic viscosity of air (Pa·s), ~room temperature.
export const MU_AIR = 1.8e-5;

/** Field between wire and plate, E ≈ V/d (V/m). voltageKV in kV, plateSpacingCm in cm. */
export function fieldVm(voltageKV, plateSpacingCm) {
  const dM = Math.max(1e-6, plateSpacingCm / 100);
  return (voltageKV * 1000) / dM;
}

/**
 * Illustrative field-charging estimate: particle charge grows roughly as r^2.
 * Not a rigorous field-charging formula — teaching-scale constant only.
 */
export function particleChargeEstimate(radiusUm) {
  return 3e-17 * Math.pow(Math.max(0, radiusUm), 2);
}

/** Drift (migration) velocity w = qE / (6π·μ·r), from Stokes drag balance. */
export function driftVelocity(voltageKV, plateSpacingCm, radiusUm) {
  const q = particleChargeEstimate(radiusUm);
  const E = fieldVm(voltageKV, plateSpacingCm);
  const rM = Math.max(1e-9, radiusUm * 1e-6);
  return (q * E) / (6 * Math.PI * MU_AIR * rM);
}

/** Volumetric gas flow rate Q = velocity × duct cross-section (m^3/s). */
export function gasFlow(ductVelocityMs, ductCrossSectionM2) {
  return Math.max(0, ductVelocityMs) * Math.max(0, ductCrossSectionM2);
}

/** Deutsch-Anderson collection efficiency η = 1 − e^(−wA/Q), clamped to [0,1]. */
export function collectionEfficiency(w, plateAreaM2, gasFlowM3s) {
  const eta = 1 - Math.exp(-(w * plateAreaM2) / Math.max(gasFlowM3s, 1e-9));
  return Math.min(1, Math.max(0, eta));
}

/** η(r) curve for plotting — pairs of { r (um), eta }. */
export function curvePoints(voltageKV, plateSpacingCm, ductVelocityMs, plateAreaM2, ductCrossSectionM2, rMaxUm, n) {
  const pts = [];
  const N = n || 80;
  const Q = gasFlow(ductVelocityMs, ductCrossSectionM2);
  for (let i = 0; i <= N; i++) {
    const r = Math.max(0.05, (i / N) * rMaxUm);
    const w = driftVelocity(voltageKV, plateSpacingCm, r);
    const eta = collectionEfficiency(w, plateAreaM2, Q);
    pts.push({ r: r, eta: eta });
  }
  return pts;
}
