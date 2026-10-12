/** PET 511 keV coincidence — teaching physics (offline). */

export const ME = 511; // keV

/**
 * True coincidences ∝ activity × solid-angle / geometry factor.
 * Randoms ∝ (singles)² × window; scatter is a teaching fraction of trues.
 */
export function rates(activityMBq, windowNs, geometry) {
  const A = Math.max(0, activityMBq);
  const tw = Math.max(1, windowNs) * 1e-9; // s
  const g = geometry != null ? geometry : 0.012; // coincidence fraction (teaching)

  // Decays/s
  const decays = A * 1e6;
  // Each β⁺ → 2 × 511 keV; true coincidence rate
  const trueRate = decays * g;

  // Singles roughly: each annihilation can hit one detector
  const singles = decays * Math.sqrt(g) * 1.4;
  // Randoms ≈ 2 · S1 · S2 · τ  (two detectors, equal)
  const randomRate = 2 * singles * singles * tw;

  // Scatter coincidences — fraction of trues that scatter (teaching)
  const scatterFrac = 0.18;
  const scatterRate = trueRate * scatterFrac;
  const promptTrue = trueRate * (1 - scatterFrac);

  const totalPrompt = promptTrue + scatterRate + randomRate;
  const trueFrac = totalPrompt > 0 ? promptTrue / totalPrompt : 0;

  return {
    trueRate: promptTrue,
    scatterRate: scatterRate,
    randomRate: randomRate,
    totalRate: totalPrompt,
    trueFrac: trueFrac,
    singles: singles,
    windowNs: windowNs,
  };
}

/** Probability a random pair falls in the coincidence window (schematic). */
export function coincidenceAcceptProb(dtNs, windowNs) {
  return Math.abs(dtNs) <= windowNs * 0.5;
}

export function annihilationFlash(phase) {
  // Periodic flash for schematic animation
  const t = (phase * 0.4) % 1;
  return {
    active: t < 0.35,
    t: t,
    angle: (phase * 0.15) % (Math.PI * 2),
  };
}
