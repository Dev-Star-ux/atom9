/** Photomultiplier tube (PMT) — photoelectric cathode + secondary-emission cascade teaching model. */

/**
 * Secondary emission yield δ per dynode stage as a function of inter-dynode
 * voltage (V). Monotonically increasing, saturating teaching formula tuned so
 * the 20–300 V slider range gives δ roughly in the 1–6 range typical of real
 * PMT dynodes.
 */
export function secondaryYield(voltagePerStage) {
  return Math.min(8, 0.2 * Math.sqrt(Math.max(voltagePerStage, 0)));
}

/** Total electron multiplication gain after n dynode stages: G = δ^n. */
export function gain(delta, nStages) {
  return Math.pow(delta, nStages);
}

/** Photocathode current from incident light intensity and quantum efficiency (teaching scale, Amps). */
export function photocurrentFromIntensity(intensityRel, quantumEfficiency) {
  return Math.max(0, intensityRel) * Math.max(0, quantumEfficiency) * 1e-9;
}

/** Anode output current after cascade amplification. */
export function outputCurrent(photocurrentA, delta, nStages) {
  return photocurrentA * gain(delta, nStages);
}

/** Gain vs number of dynode stages, for plotting (log-scale growth). */
export function curvePoints(delta, nMax) {
  const pts = [];
  const N = nMax || 14;
  for (let n = 0; n <= N; n++) {
    pts.push({ n: n, G: gain(delta, n) });
  }
  return pts;
}
