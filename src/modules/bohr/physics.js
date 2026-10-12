// Bohr model of hydrogen (Ch.2 Sec.4). Quantized orbits r_n = n²a₀, E_n = −13.6/n² eV.

export const E_RYDBERG = 13.605693;
export const A0 = 5.29177210903e-11;   // Bohr radius (m)
export const R_H = 1.0973731568160e7;  // Rydberg constant (m⁻¹)
export const H = 6.62607015e-34;
export const C = 2.99792458e8;
export const E_CHARGE = 1.602176634e-19;

export function energyLevelEV(n) {
  return -E_RYDBERG / (n * n);
}

export function bohrRadius(n) {
  return n * n * A0;
}

export function orbitRadiusUnits(n, scale = 1.1) {
  return scale * n * n;
}

export function orbitAngularSpeed(n) {
  return 2.2 / (n ** 2.2);
}

export function transitionEnergyEV(nLower, nUpper) {
  return energyLevelEV(nUpper) - energyLevelEV(nLower);
}

export function rydbergWavelengthNm(n1, n2, R = R_H) {
  const inv = R * (1 / (n1 * n1) - 1 / (n2 * n2));
  if (inv <= 0) return 0;
  return 1e9 / inv;
}

export const H_LINES = [
  { label: 'Hα', n1: 2, n2: 3, nm: 656.3 },
  { label: 'Hβ', n1: 2, n2: 4, nm: 486.1 },
  { label: 'Hγ', n1: 2, n2: 5, nm: 434.0 },
  { label: 'Hδ', n1: 2, n2: 6, nm: 410.2 },
];

export function wavelengthToRgb(nm) {
  if (nm < 380 || nm > 780) return 0xaaaaaa;
  let r = 0, g = 0, b = 0;
  if (nm >= 380 && nm < 440) { r = -(nm - 440) / (440 - 380); b = 1; }
  else if (nm < 490) { g = (nm - 440) / (490 - 440); b = 1; }
  else if (nm < 510) { g = 1; b = -(nm - 510) / (510 - 490); }
  else if (nm < 580) { r = (nm - 510) / (580 - 510); g = 1; }
  else if (nm < 645) { r = 1; g = -(nm - 645) / (645 - 580); }
  else { r = 1; }
  const f = 0.85;
  return (Math.round(255 * r * f) << 16) | (Math.round(255 * g * f) << 8) | Math.round(255 * b * f);
}
