/** AC power factor — phasors and power triangle for lagging motor loads. */

/** Real power P = V I cosφ */
export function realPower(Vrms, Irms, phiRad) {
  return Vrms * Irms * Math.cos(phiRad);
}

/** Reactive power Q = V I sinφ (positive for lagging inductive). */
export function reactivePower(Vrms, Irms, phiRad) {
  return Vrms * Irms * Math.sin(phiRad);
}

/** Apparent power S = V I */
export function apparentPower(Vrms, Irms) {
  return Vrms * Irms;
}

/** Power factor cosφ = P/S */
export function powerFactor(Vrms, Irms, phiRad) {
  const S = apparentPower(Vrms, Irms);
  if (S < 1e-12) return 1;
  return realPower(Vrms, Irms, phiRad) / S;
}

/** From R and XL (motor model): φ = atan(XL/R), I = V/Z */
export function fromRXL(Vrms, R, XL) {
  const Z = Math.sqrt(R * R + XL * XL);
  const Irms = Z > 1e-12 ? Vrms / Z : 0;
  const phiRad = Math.atan2(XL, Math.max(R, 1e-12));
  return { Irms: Irms, phiRad: phiRad, Z: Z };
}

export function degToRad(d) {
  return (d * Math.PI) / 180;
}

export function radToDeg(r) {
  return (r * 180) / Math.PI;
}
