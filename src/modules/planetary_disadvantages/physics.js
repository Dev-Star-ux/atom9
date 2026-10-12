// Planetary model disadvantages — classical failures (Ch.2 §4 T1).

export const PROBLEMS = ['radiation', 'spectrum', 'stability'];

export const HYDROGEN_LINES = [
  [656.3, 1.0, 'Hα'],
  [486.1, 0.55, 'Hβ'],
  [434.0, 0.35, 'Hγ'],
  [410.2, 0.22, 'Hδ'],
  [397.0, 0.15, 'Hε'],
];

export function wavelengthToRgb(nm) {
  if (nm < 380 || nm > 780) {
    const t = Math.max(0, Math.min(1, (nm - 300) / 80));
    const g = Math.round(80 + 60 * t);
    return `rgb(${g},${g},${g})`;
  }
  let r, g, b;
  if (nm < 440) { r = -(nm - 440) / 60; g = 0; b = 1; }
  else if (nm < 490) { r = 0; g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { r = 0; g = 1; b = -(nm - 510) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; b = 0; }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65; b = 0; }
  else { r = 1; g = 0; b = 0; }
  let factor = 1;
  if (nm < 420) factor = 0.3 + 0.7 * (nm - 380) / 40;
  else if (nm > 700) factor = 0.3 + 0.7 * (780 - nm) / 80;
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * factor * 255)));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}

export function tickRadiation(state, dt) {
  if (dt <= 0 || state.collapsed) return;
  state.angle += 2.8 * dt;
  state.radius -= 32 * dt;
  state.energy = Math.max(0, state.energy - 28 * dt);
  if (state.radius <= 16) state.collapsed = true;
}

export function tickStability(state, dt) {
  if (dt > 0) state.angle += 1.6 * dt;
}

/** Noisy energy-decay samples for AI (radiation problem). */
export function sampleEnergyDecay(trueRate = 28, noise = 0.06) {
  const t = 0.5 + Math.random() * 2.5;
  const e = Math.max(0, 100 - trueRate * t);
  return { t, e: e * (1 + noise * (Math.random() - 0.5)) };
}

export function rateFromSamples(samples) {
  if (samples.length < 2) return 28;
  let sum = 0;
  let n = 0;
  for (const s of samples) {
    if (s.e > 5 && s.t > 0.1) {
      sum += (100 - s.e) / s.t;
      n++;
    }
  }
  return n ? sum / n : 28;
}
