// Electron microscope: accelerated electrons have a de Broglie wavelength
// thousands of times shorter than visible light, so the diffraction limit on
// resolution is far smaller (Rayleigh criterion: d = 0.61*lambda/NA).
export const H_PLANCK = 6.62607015e-34;
export const M_ELECTRON = 9.1093837015e-31;
export const Q_CHARGE = 1.602176634e-19;
export const LIGHT_WAVELENGTH_M = 550e-9; // green light, typical optical-microscope illumination

// Non-relativistic de Broglie wavelength of an electron accelerated through V volts.
export function electronWavelength(V) {
  if (V <= 0) return Infinity;
  return H_PLANCK / Math.sqrt(2 * M_ELECTRON * Q_CHARGE * V);
}

export function rayleighResolution(lambda, NA) {
  return (0.61 * lambda) / NA;
}
