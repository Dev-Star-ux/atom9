/** Silicon detector α spectroscopy — teaching physics (offline). */

export const SOURCES = [
  {
    id: 'am241',
    name: 'Am-241',
    lines: [
      { E: 5.486, intensity: 0.85, label: '5.486 MeV' },
      { E: 5.443, intensity: 0.13, label: '5.443 MeV' },
    ],
    note: 'Classic calibration α source — main line 5.486 MeV.',
  },
  {
    id: 'pu239',
    name: 'Pu-239',
    lines: [
      { E: 5.157, intensity: 0.73, label: '5.157 MeV' },
      { E: 5.144, intensity: 0.15, label: '5.144 MeV' },
      { E: 5.105, intensity: 0.12, label: '5.105 MeV' },
    ],
    note: 'Multiple close α lines — needs vacuum + good resolution.',
  },
  {
    id: 'cm244',
    name: 'Cm-244',
    lines: [
      { E: 5.805, intensity: 0.77, label: '5.805 MeV' },
      { E: 5.763, intensity: 0.23, label: '5.763 MeV' },
    ],
    note: 'Higher-energy α lines.',
  },
];

export function getSource(id) {
  for (let i = 0; i < SOURCES.length; i++) if (SOURCES[i].id === id) return SOURCES[i];
  return SOURCES[0];
}

/**
 * Air path effects (teaching):
 * - Energy loss ~ dE/dx · x → peak shifts down
 * - Straggling + path variation → FWHM grows with air thickness
 * Vacuum: intrinsic Si resolution ~15–25 keV (~0.3–0.5%).
 */
export function airShiftMeV(airMm) {
  // ~0.1 MeV per mm STP air for ~5 MeV α (order-of-magnitude teaching)
  return 0.095 * Math.max(0, airMm);
}

export function fwhmMeV(airMm) {
  const vacuumFwhm = 0.018; // ~18 keV intrinsic
  const air = Math.max(0, airMm);
  return vacuumFwhm + 0.012 * air + 0.004 * air * air;
}

function gaussSample(mean, sigma) {
  const u1 = Math.random() || 1e-12;
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + sigma * z;
}

function pickLine(lines) {
  let w = 0;
  for (let i = 0; i < lines.length; i++) w += lines[i].intensity;
  let r = Math.random() * w;
  for (let i = 0; i < lines.length; i++) {
    r -= lines[i].intensity;
    if (r <= 0) return lines[i];
  }
  return lines[lines.length - 1];
}

export function sampleDepositMeV(lineE, airMm) {
  const shift = airShiftMeV(airMm);
  const fwhm = fwhmMeV(airMm);
  const sigma = fwhm / 2.355;
  return Math.max(0, gaussSample(lineE - shift, sigma));
}

export function createSpectrum(nBins, eMin, eMax) {
  return {
    bins: new Float64Array(nBins),
    nBins: nBins,
    eMin: eMin,
    eMax: eMax,
    counts: 0,
    binWidth: (eMax - eMin) / nBins,
  };
}

export function addCount(spec, eMeV) {
  if (eMeV < spec.eMin || eMeV >= spec.eMax) return;
  const i = Math.min(spec.nBins - 1, Math.floor((eMeV - spec.eMin) / spec.binWidth));
  spec.bins[i] += 1;
  spec.counts += 1;
}

export function accumulate(spec, source, airMm, nEvents) {
  const lines = source.lines || [];
  if (!lines.length) return;
  for (let i = 0; i < nEvents; i++) {
    const line = pickLine(lines);
    addCount(spec, sampleDepositMeV(line.E, airMm));
  }
}

export function peakInfo(source, airMm) {
  const shift = airShiftMeV(airMm);
  const fwhm = fwhmMeV(airMm);
  return (source.lines || []).map(function (L) {
    const Eobs = L.E - shift;
    return {
      E: L.E,
      Eobs: Eobs,
      label: L.label,
      fwhm: fwhm,
      resolutionPct: Eobs > 0 ? (100 * fwhm) / Eobs : 0,
    };
  });
}

export function spectrumRange(source, airMm) {
  const peaks = peakInfo(source, airMm);
  let lo = 4.5;
  let hi = 6.2;
  for (let i = 0; i < peaks.length; i++) {
    const p = peaks[i];
    if (p.Eobs - 0.3 < lo) lo = p.Eobs - 0.3;
    if (p.E + 0.25 > hi) hi = p.E + 0.25;
  }
  return { eMin: Math.max(3.5, lo), eMax: Math.min(7.0, hi) };
}
