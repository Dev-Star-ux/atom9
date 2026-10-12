/** Micro-electrokinetic systems — electrophoresis, electroosmosis, dielectrophoresis (offline). */

export const EPS0 = 8.854e-12; // vacuum permittivity, F/m
export const WATER_VISCOSITY_PAS = 1e-3; // Pa·s, water at room temperature

export const MODES = [
  { id: 'electrophoresis', name: 'Electrophoresis' },
  { id: 'electroosmosis', name: 'Electroosmosis' },
  { id: 'dielectrophoresis', name: 'Dielectrophoresis' },
];

export function getMode(id) {
  for (let i = 0; i < MODES.length; i++) if (MODES[i].id === id) return MODES[i];
  return MODES[0];
}

/**
 * Smoluchowski equation: v = ε ζ E / η
 * epsR: relative permittivity of the medium (water ≈ 78)
 * zetaMv: zeta potential in millivolts (particle zeta for electrophoresis,
 *         wall zeta for electroosmosis)
 * fieldVm: applied electric field, V/m
 * viscosityPas: dynamic viscosity, Pa·s (defaults to water)
 * Returns velocity in m/s.
 */
export function smoluchowskiVelocity(epsR, zetaMv, fieldVm, viscosityPas) {
  const eta = viscosityPas != null ? viscosityPas : WATER_VISCOSITY_PAS;
  const eps = EPS0 * epsR;
  const zetaV = zetaMv / 1000;
  return (eps * zetaV * fieldVm) / eta;
}

/**
 * Dielectrophoretic force: F = 2π r^3 ε_m Re[CM] ∇(E^2)
 * radiusUm: particle radius, micrometers
 * epsMediumR: relative permittivity of the medium
 * cmFactor: Clausius-Mossotti factor, dimensionless in [-0.5, 1]
 * gradE2: gradient of E^2, (V/m)^2 per m
 * Returns force in newtons.
 */
export function dielectrophoreticForce(radiusUm, epsMediumR, cmFactor, gradE2) {
  const rM = radiusUm * 1e-6;
  return 2 * Math.PI * EPS0 * epsMediumR * Math.pow(rM, 3) * cmFactor * gradE2;
}

/**
 * Points for the bottom plot.
 * mode === 'electrophoresis' | 'electroosmosis': velocity (m/s) vs field (V/m), 0..fieldMaxVm
 * mode === 'dielectrophoresis': force (N) vs cmFactor, -0.5..1 at a fixed gradE2 scale
 *   derived from particleRadiusUm.
 */
export function curvePoints(mode, params, xMax, n) {
  const N = n || 80;
  const pts = [];
  if (mode === 'dielectrophoresis') {
    const epsMediumR = params.epsR;
    const radiusUm = params.particleRadiusUm;
    const gradE2 = params.gradE2 != null ? params.gradE2 : 1e17;
    const cmMin = -0.5;
    const cmMax = xMax != null ? xMax : 1;
    for (let i = 0; i <= N; i++) {
      const cm = cmMin + (i / N) * (cmMax - cmMin);
      pts.push({ x: cm, y: dielectrophoreticForce(radiusUm, epsMediumR, cm, gradE2) });
    }
  } else {
    const epsR = params.epsR;
    const zetaMv = params.zetaMv;
    const eta = params.viscosityPas != null ? params.viscosityPas : WATER_VISCOSITY_PAS;
    const fMax = xMax != null ? xMax : 1e6;
    for (let i = 0; i <= N; i++) {
      const field = (i / N) * fMax;
      pts.push({ x: field, y: smoluchowskiVelocity(epsR, zetaMv, field, eta) });
    }
  }
  return pts;
}
