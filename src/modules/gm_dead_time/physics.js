/** GM tube: energy non-discrimination + dead-time losses (teaching). */

/** Non-paralyzable: observed rate n = m / (1 + m τ). m,n in s⁻¹, τ in s. */
export function observedRate(trueRate, deadTimeUs) {
  const m = Math.max(0, trueRate);
  const tau = Math.max(0, deadTimeUs) * 1e-6;
  return m / (1 + m * tau);
}

export function lostFraction(trueRate, deadTimeUs) {
  const m = Math.max(0, trueRate);
  const n = observedRate(m, deadTimeUs);
  if (m <= 0) return 0;
  return 1 - n / m;
}

export function deadTimeCorrection(observedRateN, deadTimeUs) {
  const n = Math.max(0, observedRateN);
  const tau = Math.max(0, deadTimeUs) * 1e-6;
  const den = 1 - n * tau;
  if (den <= 1e-9) return Infinity;
  return n / den;
}

/** Teaching HV plateau: count rate vs voltage (V). */
export function plateauRate(voltageV, sourceStrength) {
  const V = voltageV;
  const S = sourceStrength != null ? sourceStrength : 1;
  // Regions (teaching): recombination → proportional → limited → Geiger plateau → continuous
  if (V < 400) return 0;
  if (V < 700) {
    // rising proportional-ish
    const t = (V - 400) / 300;
    return S * 40 * t * t;
  }
  if (V < 900) {
    // approach plateau
    const t = (V - 700) / 200;
    return S * (40 + 60 * t);
  }
  if (V < 1200) {
    // Geiger plateau — nearly flat
    return S * (100 + 0.02 * (V - 900));
  }
  // continuous discharge — runaway
  return S * (105 + 8 * Math.pow((V - 1200) / 100, 2));
}

export function regionName(voltageV) {
  const V = voltageV;
  if (V < 400) return 'none';
  if (V < 700) return 'proportional';
  if (V < 900) return 'limited';
  if (V < 1200) return 'geiger';
  return 'continuous';
}

/**
 * Pulse height vs deposited energy — teaching contrast.
 * In Geiger region all avalanches saturate → same height.
 * Proportional: height ∝ E.
 */
export function pulseHeight(energyKeV, mode) {
  const E = Math.max(0, energyKeV);
  if (mode === 'geiger') {
    // Saturated — slight noise only
    return 1.0 + (Math.random() - 0.5) * 0.04;
  }
  // proportional: linear with E (normalize to ~1 at 500 keV)
  return Math.min(1.35, E / 500);
}

export const DEMO_LINES = [
  { id: 'am', name: '59 keV', E: 59.5 },
  { id: 'cs', name: '662 keV', E: 661.7 },
  { id: 'co', name: '1332 keV', E: 1332.5 },
];
