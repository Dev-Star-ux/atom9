/** Liquid-drop fission: capture → compound → elongated saddle → scission. */

export const Q_MEV = 200;
export const NU_BAR = 2.43;

export const TARGETS = [
  { id: 'u235', z: 92, a: 235, thermal: true, barrierMeV: 6 },
  { id: 'u238', z: 92, a: 238, thermal: false, barrierMeV: 7 },
  { id: 'pu239', z: 94, a: 239, thermal: true, barrierMeV: 6 },
];

export function getTarget(id) {
  for (let i = 0; i < TARGETS.length; i++) if (TARGETS[i].id === id) return TARGETS[i];
  return TARGETS[0];
}

/** Schematic fission-barrier vs quadrupole deformation β. */
export function barrierV(beta, barrierMeV) {
  const b = Math.max(barrierMeV, 1);
  return b * (4 * beta * beta * (1 - beta) * (1 - beta));
}

export function canFission(target, neutronMeV) {
  // Teaching model: odd-A actinides get ~6.5 MeV pairing energy from thermal capture.
  // Even-even U-238 sits below the barrier unless the neutron is fast (≳1 MeV).
  if (target.thermal) return neutronMeV + 6.5 > target.barrierMeV - 0.5;
  return neutronMeV >= 1;
}

export function stageFromPhase(p) {
  if (p < 0.16) return 'approach';
  if (p < 0.32) return 'capture';
  if (p < 0.52) return 'compound';
  if (p < 0.74) return 'elongate';
  if (p < 0.88) return 'scission';
  return 'fragments';
}

/** Axis ratio of a liquid-drop ellipsoid during the cycle. */
export function dropAxes(phase) {
  const st = stageFromPhase(phase);
  if (st === 'approach' || st === 'capture') return { a: 1, b: 1 };
  if (st === 'compound') {
    const t = (phase - 0.32) / 0.2;
    const wob = 1 + 0.08 * Math.sin(t * Math.PI * 4);
    return { a: wob, b: 2 - wob };
  }
  if (st === 'elongate') {
    const t = (phase - 0.52) / 0.22;
    const ax = 1.05 + 0.85 * t;
    return { a: ax, b: 1 / Math.sqrt(ax) };
  }
  if (st === 'scission') {
    return { a: 2.05, b: 0.62 };
  }
  const t = (phase - 0.88) / 0.12;
  return { a: 2.2 + t * 1.4, b: 0.55 };
}

export function fissionQ(a) {
  return Q_MEV * (0.92 + 0.08 * (a - 235) / 4);
}
