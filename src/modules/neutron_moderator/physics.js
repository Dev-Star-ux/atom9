// Neutron moderation: elastic collisions reduce energy; thermal cross-section higher for U-235.
export const MODERATORS = [
  { id: 'graphite', name: 'Graphite', xi: 0.16, collisions: 114 },
  { id: 'water', name: 'Light water', xi: 0.16, collisions: 18 },
  { id: 'heavy', name: 'D₂O', xi: 0.14, collisions: 28 },
];

export function thermalCrossSection(eV) {
  const E = Math.max(0.001, eV);
  if (E < 0.5) return 580 * Math.pow(0.025 / E, 0.5);
  return 8 + 120 / (1 + E);
}

export function fastCrossSection(eV) {
  return 4 + 2 * Math.exp(-E / 800);
}

export function energyAfterCollision(E, xi) {
  const f = Math.random();
  const g = ((1 - xi) / 2) * Math.log((1 + xi) / (1 - xi));
  const cos = 1 - (1 - xi) * f;
  return E * (1 + xi * xi + 2 * xi * cos) / ((1 + xi) * (1 + xi));
}

export function collisionsToThermal(E0, moderator) {
  const target = 0.025;
  let E = E0;
  let n = 0;
  while (E > target && n < 200) {
    E = energyAfterCollision(E, moderator.xi);
    n++;
  }
  return { E: E, n: n };
}
