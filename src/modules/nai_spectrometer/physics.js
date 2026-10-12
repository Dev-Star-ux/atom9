/** NaI(Tl) gamma spectrometer — teaching physics (offline). */

export const ME = 511; // electron rest energy keV

export const SOURCES = [
  {
    id: 'cs137',
    name: 'Cs-137',
    lines: [{ E: 661.7, intensity: 1, label: '662 keV' }],
    note: 'Single strong photopeak — best first spectrum.',
  },
  {
    id: 'co60',
    name: 'Co-60',
    lines: [
      { E: 1173.2, intensity: 1, label: '1173 keV' },
      { E: 1332.5, intensity: 1, label: '1332 keV' },
    ],
    note: 'Two photopeaks — classic resolution demo.',
  },
  {
    id: 'na22',
    name: 'Na-22',
    lines: [
      { E: 511.0, intensity: 1.8, label: '511 keV (β⁺)' },
      { E: 1274.5, intensity: 1, label: '1275 keV' },
    ],
    note: 'Annihilation peak + high-energy gamma.',
  },
  {
    id: 'am241',
    name: 'Am-241',
    lines: [{ E: 59.5, intensity: 1, label: '59.5 keV' }],
    note: 'Low-energy line — resolution looks broader in % terms.',
  },
];

export function getSource(id) {
  for (let i = 0; i < SOURCES.length; i++) if (SOURCES[i].id === id) return SOURCES[i];
  return SOURCES[0];
}

/** FWHM (keV) at energy E for NaI — teaching model ~7% at 662 keV. */
export function fwhmKeV(E, resolutionPct662) {
  const r = (resolutionPct662 != null ? resolutionPct662 : 7) / 100;
  const fwhm662 = 661.7 * r;
  // Roughly scales as sqrt(E)
  return fwhm662 * Math.sqrt(Math.max(E, 1) / 661.7);
}

export function comptonEdge(E) {
  // E' max recoil electron: E / (1 + 2E/mc²)  → edge = E - E_min_scatter
  // Compton edge = E * (2α)/(1+2α), α=E/mc²
  const a = E / ME;
  return E * (2 * a) / (1 + 2 * a);
}

export function backscatterPeak(E) {
  // Photon scattered ~180°: E / (1 + 2α)
  const a = E / ME;
  return E / (1 + 2 * a);
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

/**
 * Sample one deposited energy (keV) for a gamma interaction in NaI.
 * Channels: photopeak, Compton continuum, backscatter bump.
 */
export function sampleDepositKeV(lineE, resolutionPct662) {
  const fwhm = fwhmKeV(lineE, resolutionPct662);
  const sigma = fwhm / 2.355;
  const edge = comptonEdge(lineE);
  const back = backscatterPeak(lineE);
  const r = Math.random();

  // Branching (teaching weights)
  if (r < 0.42) {
    // Full energy peak (photoelectric + multiple scatters that sum)
    return Math.max(0, gaussSample(lineE, sigma));
  }
  if (r < 0.82) {
    // Single Compton — continuum 0..edge, denser near edge
    const u = Math.random();
    const e = edge * Math.pow(u, 0.55);
    return Math.max(0, gaussSample(e, sigma * 0.9));
  }
  // Backscatter bump from surrounding materials
  return Math.max(0, gaussSample(back, sigma * 1.2));
}

export function createSpectrum(nBins, eMaxKeV) {
  const bins = new Float64Array(nBins);
  return {
    bins: bins,
    nBins: nBins,
    eMax: eMaxKeV,
    counts: 0,
    binWidth: eMaxKeV / nBins,
  };
}

export function addCount(spec, eKeV) {
  if (eKeV < 0 || eKeV >= spec.eMax) return;
  const i = Math.min(spec.nBins - 1, Math.floor(eKeV / spec.binWidth));
  spec.bins[i] += 1;
  spec.counts += 1;
}

export function accumulate(spec, source, resolutionPct662, nEvents) {
  const lines = source.lines || [];
  if (!lines.length) return;
  for (let i = 0; i < nEvents; i++) {
    const line = pickLine(lines);
    const e = sampleDepositKeV(line.E, resolutionPct662);
    addCount(spec, e);
  }
}

export function peakInfo(source, resolutionPct662) {
  return (source.lines || []).map(function (L) {
    const fwhm = fwhmKeV(L.E, resolutionPct662);
    return {
      E: L.E,
      label: L.label,
      fwhm: fwhm,
      resolutionPct: (100 * fwhm) / L.E,
      comptonEdge: comptonEdge(L.E),
      backscatter: backscatterPeak(L.E),
    };
  });
}

export function featuresForSource(source, resolutionPct662) {
  const peaks = peakInfo(source, resolutionPct662);
  return {
    peaks: peaks,
    // Use strongest (first) line for feature callouts if multiple
    photopeak: peaks[0] ? peaks[0].E : 0,
    comptonEdge: peaks[0] ? peaks[0].comptonEdge : 0,
    backscatter: peaks[0] ? peaks[0].backscatter : 0,
  };
}
