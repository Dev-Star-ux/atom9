/** ³He / BF₃ proportional counters — teaching physics (offline). */

export const DETECTORS = [
  {
    id: 'he3',
    name: '³He',
    reaction: '³He(n,p)³H',
    products: 'p + ³H',
    QMeV: 0.764,
    note: 'High thermal cross-section; common in proportional tubes.',
  },
  {
    id: 'bf3',
    name: 'BF₃',
    reaction: '¹⁰B(n,α)⁷Li',
    products: 'α + ⁷Li',
    QMeV: 2.31,
    note: 'Capture on ¹⁰B; slightly lower efficiency than ³He for same pressure.',
  },
];

export function getDetector(id) {
  for (let i = 0; i < DETECTORS.length; i++) if (DETECTORS[i].id === id) return DETECTORS[i];
  return DETECTORS[0];
}

/**
 * Relative detection efficiency vs neutron energy (teaching curve).
 * Thermal (~0.025 eV) ≫ epithermal ≫ fast.
 * energyLog10: log10(E/eV); thermal ≈ −1.6
 */
export function relativeEfficiency(energyLog10, detectorId) {
  const Elog = energyLog10;
  // Peak near thermal, fall toward MeV
  const thermalPeak = -1.6;
  const x = Elog - thermalPeak;
  let base = Math.exp(-0.35 * x * x);
  if (Elog > 0) base *= Math.exp(-0.55 * Elog); // fast drop
  if (Elog < -2.5) base *= 0.85; // cold plateau-ish
  // ³He slightly higher thermal efficiency in this teaching model
  const scale = detectorId === 'bf3' ? 0.72 : 1.0;
  return Math.max(0.002, scale * base);
}

/** Count rate = flux × efficiency × strength (arb. units). */
export function countRate(flux, energyLog10, detectorId, strength) {
  const S = strength != null ? strength : 1;
  return S * flux * relativeEfficiency(energyLog10, detectorId) * 120;
}

/** Moderated flux boost for fast neutrons (teaching). */
export function moderatedEfficiency(energyLog10, detectorId, moderated) {
  if (!moderated) return relativeEfficiency(energyLog10, detectorId);
  // Moderator thermalizes → efficiency closer to thermal peak
  const raw = relativeEfficiency(energyLog10, detectorId);
  const thermal = relativeEfficiency(-1.6, detectorId);
  if (energyLog10 <= -1) return raw;
  const mix = Math.min(1, (energyLog10 + 1) / 6);
  return raw * (1 - mix) + thermal * 0.85 * mix;
}

export function moderatedCountRate(flux, energyLog10, detectorId, strength, moderated) {
  const S = strength != null ? strength : 1;
  return S * flux * moderatedEfficiency(energyLog10, detectorId, moderated) * 120;
}

/** Schematic pulse-height channels for capture products (wall effect blur). */
export function pulseHeightSpectrum(detectorId, wallEffect) {
  const det = getDetector(detectorId);
  const n = 64;
  const bins = new Float64Array(n);
  const Q = det.QMeV;
  // Full-energy peak near Q; wall effect adds continuum below Q
  for (let i = 0; i < n; i++) {
    const e = (i / (n - 1)) * Q * 1.15;
    let c = 0;
    // Full energy peak
    const df = (e - Q) / (0.04 * Q);
    c += Math.exp(-0.5 * df * df);
    if (wallEffect) {
      // Continuum of partial deposits (wall effect)
      if (e < Q && e > 0.1 * Q) c += 0.35 * (e / Q);
    }
    bins[i] = c;
  }
  return { bins: bins, eMax: Q * 1.15, Q: Q, reaction: det.reaction };
}

export function energyLabel(energyLog10) {
  const E = Math.pow(10, energyLog10);
  if (E < 0.1) return E.toFixed(3) + ' eV (thermal)';
  if (E < 1000) return E.toFixed(1) + ' eV';
  if (E < 1e6) return (E / 1000).toFixed(1) + ' keV';
  return (E / 1e6).toFixed(2) + ' MeV (fast)';
}
