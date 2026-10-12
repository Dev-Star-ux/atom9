/** Electrospray / electrospinning — Taylor cone jet teaching model (offline). */

export const EPS0 = 8.854e-12; // F/m, vacuum permittivity

export const VISCOSITY_MODES = [
  { id: 'low', name: 'Low viscosity', hint: 'paints / coatings — jet breaks into droplets (electrospray)' },
  { id: 'high', name: 'High viscosity', hint: 'polymer solution — jet whips into a fiber (electrospinning)' },
];

export function getViscosityMode(id) {
  for (let i = 0; i < VISCOSITY_MODES.length; i++) if (VISCOSITY_MODES[i].id === id) return VISCOSITY_MODES[i];
  return VISCOSITY_MODES[0];
}

/**
 * Rayleigh limit charge (Coulombs) a spherical droplet of radius R (m) can
 * hold before Coulomb repulsion overcomes surface tension γ (N/m) and the
 * droplet fissions: q_R = 8π·sqrt(ε0·γ·R^3).
 */
export function rayleighCharge(radiusM, surfaceTensionNPerM) {
  const R = Math.max(0, radiusM);
  const gamma = Math.max(0, surfaceTensionNPerM);
  return 8 * Math.PI * Math.sqrt(EPS0 * gamma * Math.pow(R, 3));
}

/**
 * Onset (Taylor-cone) voltage estimate, in kV — a simplified teaching
 * formula (NOT a precise Taylor-cone / Taylor(1964) derivation). It rises
 * with surface tension and nozzle radius, and rises (slowly, log) with
 * nozzle-to-collector distance, matching the qualitative trend that a
 * longer gap needs a somewhat higher voltage to reach the same field
 * condition at the tip.
 *
 * surfaceTensionMNm: surface tension in mN/m (millinewtons per meter)
 * nozzleRadiusMm: nozzle outer radius in mm
 * distanceMm: nozzle-to-collector distance in mm
 */
export function onsetVoltageKV(surfaceTensionMNm, nozzleRadiusMm, distanceMm) {
  const gamma = Math.max(0.1, surfaceTensionMNm);
  const r = Math.max(0.01, nozzleRadiusMm);
  const d = Math.max(r * 1.01, distanceMm);
  return 1.3 * Math.sqrt(gamma) * Math.sqrt(r) * Math.log(1 + d / r);
}

/**
 * Operating regime given applied voltage vs onset and the liquid's
 * viscosity mode: below onset the meniscus just drips; above onset a
 * low-viscosity liquid sprays fine charged droplets, a high-viscosity
 * liquid instead whips/stretches into a continuous fiber.
 */
export function regime(voltageKV, onsetKV, viscosityMode) {
  if (voltageKV < onsetKV) return 'dripping';
  return viscosityMode === 'high' ? 'spinning' : 'spray';
}

/**
 * Simple teaching helper: rough droplet radius (µm) implied by a flow rate
 * (mL/h) split into drops at a given break-up frequency (Hz). Not used for
 * rigorous sizing — only to pace the animation / cross-check the radius
 * slider against a plausible flow rate.
 */
export function dropletRadiusFromRate(flowRateMlH, freqHz) {
  const f = Math.max(0.1, freqHz);
  const mlPerS = Math.max(0, flowRateMlH) / 3600;
  const volPerDropMl = mlPerS / f; // mL per droplet
  const volPerDropM3 = volPerDropMl * 1e-6; // m^3
  const R = Math.pow((3 * volPerDropM3) / (4 * Math.PI), 1 / 3); // m
  return R * 1e6; // µm
}

/** Current charge estimate on a droplet of the given radius, capped teaching-style. */
export function currentChargeEstimate(radiusUm, surfaceTensionMNm) {
  const radiusM = Math.max(0, radiusUm) * 1e-6;
  const gamma = Math.max(0.1, surfaceTensionMNm) * 1e-3; // mN/m -> N/m
  return rayleighCharge(radiusM, gamma);
}
