// Shared X-ray physics (Ch.2 §5). Wavelengths in pm, energies in keV unless noted.
export const H = 6.62607015e-34;
export const C = 2.99792458e8;
export const E_CHARGE = 1.602176634e-19;
export const M_E = 9.1093837015e-31;

export const LAMBDA_C_PM = H / (M_E * C) * 1e12;
export const HC_KEV_NM = H * C / E_CHARGE * 1e-3;

export function energyKeVFromLambdaPm(lamPm) {
  if (lamPm <= 0) return 0;
  return HC_KEV_NM / (lamPm * 1e-3);
}

export function lambdaPmFromEnergyKeV(E) {
  if (E <= 0) return 0;
  return (HC_KEV_NM / E) * 1e3;
}

/** Duane–Hunt cutoff wavelength (nm) for tube voltage V (kV). */
export function lambdaMinNm(voltageKV) {
  if (voltageKV <= 0) return 0;
  return HC_KEV_NM / voltageKV;
}

export function comptonShiftPm(thetaRad) {
  return LAMBDA_C_PM * (1 - Math.cos(thetaRad));
}

export function braggOrderNearest(dPm, lamPm, thetaDeg) {
  if (dPm <= 0 || lamPm <= 0) return 0;
  return Math.round((2 * dPm * Math.sin((thetaDeg * Math.PI) / 180)) / lamPm);
}

export function braggConstructive(n, dPm, lamPm, thetaDeg) {
  if (lamPm <= 0) return 0;
  return (2 * dPm * Math.sin((thetaDeg * Math.PI) / 180)) / lamPm;
}

export function braggConstructiveAt(n, dPm, lamPm, thetaDeg) {
  const path = braggConstructive(n, dPm, lamPm, thetaDeg);
  return Math.abs(path - Math.round(path)) < 0.08;
}
