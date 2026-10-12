// Energy–time uncertainty: ΔE·Δt ≥ ħ/2 (Ch.3 §2).
import {
  HBAR_EV_S, decayEnvelope, lorentzianEnergy, energyUncertaintyEV,
} from '../common/wavePhysics.js';

export { HBAR_EV_S, decayEnvelope, lorentzianEnergy };

export const E0_EV = 2.0;

export function tauFromFs(tauFs) {
  return tauFs * 1e-15;
}

export function deltaEnergyEV(tauFs) {
  return energyUncertaintyEV(tauFromFs(tauFs));
}

export function deltaTProductEVs(tauFs) {
  const tau = tauFromFs(tauFs);
  return deltaEnergyEV(tauFs) * tau;
}

export function linewidthEV(tauFs) {
  return 2 * deltaEnergyEV(tauFs);
}

export function spectrumPoints(tauFs, n = 100) {
  const dE = deltaEnergyEV(tauFs);
  const gamma = 2 * dE;
  const Es = [];
  const spec = [];
  for (let i = 0; i < n; i++) {
    const E = E0_EV - 4 * gamma + 8 * gamma * i / (n - 1);
    Es.push(E);
    spec.push(lorentzianEnergy(E, E0_EV, gamma));
  }
  return { Es, spec, dE, gamma };
}

export function decayCurve(tauFs, n = 100) {
  const tau = tauFromFs(tauFs);
  const tMax = 5 * tau;
  const ts = [];
  const decay = [];
  for (let i = 0; i < n; i++) {
    const t = tMax * i / (n - 1);
    ts.push(t);
    decay.push(decayEnvelope(t, tau));
  }
  return { ts, decay, tMax };
}
