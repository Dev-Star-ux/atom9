// Davisson–Germer (Ch.3 §1). Electron diffraction: nλ = d sin θ.
import { electronWavelengthFromVoltage } from '../de_broglie/physics.js';

export const NI_SPACING_PM = 218;

export function electronWavelengthPm(V) {
  return electronWavelengthFromVoltage(V) * 1e12;
}

export function davissonPeakAngleDeg(V, dPm = NI_SPACING_PM, n = 1) {
  const lam = electronWavelengthPm(V);
  if (lam <= 0 || dPm <= 0) return null;
  const s = (n * lam) / dPm;
  if (Math.abs(s) > 1) return null;
  return (Math.asin(s) * 180) / Math.PI;
}

export function davissonIntensity(thetaDeg, V, dPm = NI_SPACING_PM) {
  let total = 0.08;
  for (let n = 1; n < 4; n++) {
    const peak = davissonPeakAngleDeg(V, dPm, n);
    if (peak != null) {
      const width = 4;
      total += Math.exp(-((thetaDeg - peak) ** 2) / (2 * width * width));
    }
  }
  return total;
}

export function intensityCurve(V, dPm = NI_SPACING_PM, thetaMin = 20, thetaMax = 80, steps = 61) {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const theta = thetaMin + (thetaMax - thetaMin) * i / (steps - 1);
    pts.push({ theta, I: davissonIntensity(theta, V, dPm) });
  }
  return pts;
}
