// X-ray photon energy (Ch.2 §5). E = hc/λ photoelectric ejection.
export { HC_KEV_NM, lambdaPmFromEnergyKeV, energyKeVFromLambdaPm } from '../xray/physics.js';

export const SHELLS = [
  { id: 'k_shell', labelKey: 'k_shell', bindingKeV: 1.0 },
  { id: 'l_shell', labelKey: 'l_shell', bindingKeV: 0.15 },
  { id: 'outer', labelKey: 'outer', bindingKeV: 0.01 },
];

export function photoelectronKeV(energyKeV, bindingKeV) {
  return Math.max(0, energyKeV - bindingKeV);
}

export function canEject(energyKeV, bindingKeV) {
  return energyKeV > bindingKeV;
}
