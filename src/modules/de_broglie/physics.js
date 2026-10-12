// de Broglie matter waves — λ = h / p = h / (m v).
// Inspired by MatterWaveX plotter: https://matterwavex.com/de-broglie-wavelength-plotter/

export const H = 6.62607015e-34;
export const E_CHARGE = 1.602176634e-19;
export const C = 299792458;

/** Teaching set — masses from MatterWaveX / CODATA-style values. */
export const PARTICLES = {
  electron: { mass: 9.1093837015e-31, label: 'e⁻', name: 'Electron', color: '#38bdf8' },
  positron: { mass: 9.1093837015e-31, label: 'e⁺', name: 'Positron', color: '#f472b6' },
  muon: { mass: 1.883531627e-28, label: 'μ', name: 'Muon', color: '#a78bfa' },
  proton: { mass: 1.67262192369e-27, label: 'p⁺', name: 'Proton', color: '#f87171' },
  neutron: { mass: 1.67492749804e-27, label: 'n', name: 'Neutron', color: '#94a3b8' },
  hydrogen: { mass: 1.6735328e-27, label: 'H', name: 'Hydrogen', color: '#34d399' },
  alpha: { mass: 6.6446573357e-27, label: 'α', name: 'Alpha', color: '#fbbf24' },
  fullerene: { mass: 1.1954e-24, label: 'C₆₀', name: 'Fullerene C₆₀', color: '#2dd4bf' },
};

export function particleList() {
  return Object.keys(PARTICLES);
}

export function momentum(mass, velocity) {
  return mass * Math.abs(velocity);
}

/** Non-relativistic KE (J) from velocity. */
export function keFromVelocity(mass, velocity) {
  return 0.5 * mass * velocity * velocity;
}

export function keEVFromVelocity(mass, velocity) {
  return keFromVelocity(mass, velocity) / E_CHARGE;
}

/** Non-relativistic velocity from KE in eV. */
export function velocityFromKeEV(mass, keEV) {
  if (mass <= 0 || keEV <= 0) return 0;
  return Math.sqrt((2 * keEV * E_CHARGE) / mass);
}

export function deBroglieWavelength(mass, velocity) {
  const p = momentum(mass, velocity);
  return p > 0 ? H / p : 0;
}

export function deBrogliePm(mass, velocity) {
  return deBroglieWavelength(mass, velocity) * 1e12;
}

export function deBroglieNm(mass, velocity) {
  return deBroglieWavelength(mass, velocity) * 1e9;
}

/** Relativistic momentum and λ (MatterWaveX “relativistic” mode). */
export function relativisticMomentum(mass, velocity) {
  const v = Math.min(Math.abs(velocity), C * 0.999999);
  const beta = v / C;
  const gamma = 1 / Math.sqrt(1 - beta * beta);
  return gamma * mass * v;
}

export function deBroglieWavelengthRel(mass, velocity) {
  const p = relativisticMomentum(mass, velocity);
  return p > 0 ? H / p : 0;
}

export function deBrogliePmRel(mass, velocity) {
  return deBroglieWavelengthRel(mass, velocity) * 1e12;
}

export function wavelengthAt(mass, velocity, relativistic) {
  return relativistic
    ? deBroglieWavelengthRel(mass, velocity)
    : deBroglieWavelength(mass, velocity);
}

export function wavelengthPmAt(mass, velocity, relativistic) {
  return wavelengthAt(mass, velocity, relativistic) * 1e12;
}

/** Visual period in scene units (shorter λ → more ripples). */
export function wavePeriodUnits(lamPm) {
  return Math.min(4.2, Math.max(0.28, 140 / Math.max(lamPm, 0.01)));
}

export function wavelengthRegime(lamPm) {
  if (lamPm < 1) return 'subatomic';
  if (lamPm < 1000) return 'atomic';
  return 'macro';
}

export function formatWavelength(lamPm) {
  if (lamPm >= 1e6) return (lamPm / 1e6).toFixed(2) + ' μm';
  if (lamPm >= 1000) return (lamPm / 1000).toFixed(2) + ' nm';
  if (lamPm >= 1) return lamPm.toFixed(2) + ' pm';
  if (lamPm >= 1e-3) return (lamPm * 1e3).toFixed(2) + ' fm';
  return lamPm.toExponential(2) + ' pm';
}

/**
 * Curve for MatterWaveX-style plotter.
 * @param {'velocity'|'energy'} axis
 * @returns {{ x: number, lamPm: number }[]}
 */
export function lambdaCurve(mass, axis, relativistic, n) {
  const steps = n || 64;
  const pts = [];
  if (axis === 'energy') {
    // Typical teaching range: 0.1 eV … 1 keV (log-ish sampling)
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const keEV = Math.exp(Math.log(0.1) + t * (Math.log(1000) - Math.log(0.1)));
      const v = velocityFromKeEV(mass, keEV);
      pts.push({ x: keEV, lamPm: wavelengthPmAt(mass, v, relativistic), v: v });
    }
  } else {
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const v = (0.05 + t * 9.95) * 1e6;
      pts.push({ x: v / 1e6, lamPm: wavelengthPmAt(mass, v, relativistic), v: v });
    }
  }
  return pts;
}

export function electronWavelengthFromVoltage(V) {
  if (V <= 0) return 0;
  const M_E = PARTICLES.electron.mass;
  const p = Math.sqrt(2 * M_E * E_CHARGE * V);
  return H / p;
}
