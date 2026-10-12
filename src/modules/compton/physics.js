// Compton effect (Ch.2 Sec.5). Δλ = λ_C (1 − cos θ) — photon momentum evidence.

export const H = 6.62607015e-34;
export const C = 2.99792458e8;
export const E_CHARGE = 1.602176634e-19;
export const M_E = 9.1093837015e-31;

export const LAMBDA_C_PM = H / (M_E * C) * 1e12;   // ≈ 2.426 pm
export const HC_KEV_NM = H * C / E_CHARGE * 1e-3;   // keV·nm

export function energyKeVFromLambdaPm(lamPm) {
  if (lamPm <= 0) return 0;
  return HC_KEV_NM / (lamPm * 1e-3);
}

export function comptonShiftPm(thetaRad) {
  return LAMBDA_C_PM * (1 - Math.cos(thetaRad));
}

export function scatteredLambdaPm(lamPm, thetaRad) {
  return lamPm + comptonShiftPm(thetaRad);
}

export function electronKeV(lamPm, thetaRad) {
  const eIn = energyKeVFromLambdaPm(lamPm);
  const eOut = energyKeVFromLambdaPm(scatteredLambdaPm(lamPm, thetaRad));
  return Math.max(0, eIn - eOut);
}

export function shiftCurve(steps = 61) {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const deg = 180 * i / (steps - 1);
    const rad = (deg * Math.PI) / 180;
    pts.push({ deg, shift: comptonShiftPm(rad) });
  }
  return pts;
}
