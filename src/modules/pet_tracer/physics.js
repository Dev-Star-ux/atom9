// PET tracer: activity A(t) = A0 exp(-λt), annihilation γ pair at 511 keV.
export const TRACERS = [
  { id: 'f18', name: 'F-18 FDG', halfLifeMin: 110, use: 'glucose metabolism' },
  { id: 'c11', name: 'C-11', halfLifeMin: 20.4, use: 'perfusion' },
  { id: 'o15', name: 'O-15 water', halfLifeMin: 2.0, use: 'blood flow' },
];

export function decayConstantMin(halfLifeMin) {
  return Math.log(2) / halfLifeMin;
}

export function activityAt(tMin, halfLifeMin, a0) {
  return a0 * Math.exp(-decayConstantMin(halfLifeMin) * tMin);
}

export function remainingFraction(tMin, halfLifeMin) {
  return Math.exp(-decayConstantMin(halfLifeMin) * tMin);
}
