// Planetary (Rutherford) nuclear model — classical orbits (Ch.2 §2).

export const SCENE_SCALE = 1 / 42;

export function spawnElectrons(n, baseRadius) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const r = baseRadius * (0.55 + 0.45 * (i + 1) / Math.max(1, n));
    out.push({
      r,
      r0: r,
      angle: Math.random() * Math.PI * 2,
      tilt: Math.random() * 1 - 0.5,
      trail: [],
      dead: false,
    });
  }
  return out;
}

/** Kepler-like angular speed ω ∝ r^{-1.5}. */
export function orbitOmega(r, speed = 1) {
  return speed * 2.4 * (110 / Math.max(20, r)) ** 1.5;
}

export function tickElectrons(electrons, dt, { speed, radiate }) {
  if (dt <= 0) return;
  for (const e of electrons) {
    if (e.dead) continue;
    e.angle += orbitOmega(e.r, speed) * dt;
    if (radiate && e.r > 14) {
      e.r -= 26 * dt * speed;
      if (e.r <= 14) e.dead = true;
    }
  }
}

export function orbitStatus(electrons, radiate) {
  if (!radiate) return 'stable';
  if (electrons.every((e) => e.dead)) return 'collapsed';
  return 'collapsing';
}

export function toSceneRadius(px) {
  return px * SCENE_SCALE;
}

/** Noisy ω samples for AI — true radius sets the period. */
export function measureOrbitPeriod(baseRadius, noiseFrac = 0.04) {
  const r = baseRadius * 0.78;
  const omega = orbitOmega(r, 1);
  const period = (Math.PI * 2) / omega;
  return period * (1 + noiseFrac * (Math.random() + Math.random() - 1));
}

export function radiusFromPeriod(T) {
  const k = 2.4 * 110 ** 1.5;
  const omega = (Math.PI * 2) / Math.max(1e-6, T);
  return (k / omega) ** (2 / 3);
}
