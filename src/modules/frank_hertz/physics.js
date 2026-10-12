// Frank–Hertz experiment (Ch.2 Sec.3). Electrons collide inelastically with gas
// atoms when KE reaches E₀, 2E₀, … producing dips in collector current vs V.

export const GASES = [
  { name: 'Mercury (Hg)', id: 'mercury', E0: 4.89 },
  { name: 'Neon (Ne)', id: 'neon', E0: 16.62 },
];

export const V_MAX = 25;

export function frankHertzCurrent(V, E0, scale = 1) {
  if (V <= 0 || E0 <= 0) return 0;
  let base = scale * Math.sqrt(V) * (1 - 0.08 / V);
  for (let n = 1; n < 6; n++) {
    const Ve = n * E0;
    const width = Math.max(0.12, 0.06 * Ve);
    const dip = 0.55 * Math.exp(-((V - Ve) ** 2) / (2 * width * width));
    base *= 1 - dip;
  }
  return Math.max(0, base);
}

export function nextDipVoltage(V, E0) {
  if (E0 <= 0) return 0;
  const n = Math.max(1, Math.floor(V / E0) + 1);
  return n * E0;
}

export function ivCurve(E0, steps = 80) {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const V = V_MAX * i / (steps - 1);
    pts.push({ V, I: frankHertzCurrent(V, E0) });
  }
  return pts;
}
