// Geiger counter: count rate vs distance (inverse square) + exponential shielding.
export const SOURCES = [
  { id: 'cs137', name: 'Cs-137', activity: 1.0, gamma: true },
  { id: 'am241', name: 'Am-241 α', activity: 0.6, gamma: false },
  { id: 'co60', name: 'Co-60', activity: 1.2, gamma: true },
];

export function countRateBq(sourceActivity, distanceM, shieldMm, material) {
  const d = Math.max(0.05, distanceM);
  const geom = 1 / (4 * Math.PI * d * d);
  const mu = material === 'lead' ? 0.08 : material === 'al' ? 0.02 : 0;
  const atten = Math.exp(-mu * (shieldMm / 10));
  const eff = sourceActivity * 1e6 * geom * atten * 0.35;
  return Math.max(0, eff);
}

export function poissonSample(lambda, dt) {
  const mean = lambda * dt;
  let k = 0;
  let p = Math.exp(-mean);
  let s = p;
  const u = Math.random();
  while (u > s && k < 20) {
    k++;
    p *= mean / k;
    s += p;
  }
  return k;
}
