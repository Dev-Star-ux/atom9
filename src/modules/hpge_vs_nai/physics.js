/** HPGe vs NaI(Tl) resolution comparison — teaching physics (offline). */

export const SOURCES = [
  {
    id: 'cs137',
    name: 'Cs-137',
    lines: [{ E: 661.7, intensity: 1, label: '662 keV' }],
    note: 'Single line — clearest resolution contrast.',
  },
  {
    id: 'co60',
    name: 'Co-60',
    lines: [
      { E: 1173.2, intensity: 1, label: '1173 keV' },
      { E: 1332.5, intensity: 1, label: '1332 keV' },
    ],
    note: 'Two close peaks — HPGe separates them cleanly; NaI blends them.',
  },
];

export function getSource(id) {
  for (let i = 0; i < SOURCES.length; i++) if (SOURCES[i].id === id) return SOURCES[i];
  return SOURCES[0];
}

/** FWHM (keV) referenced to resolution % at 662 keV; ~√E scaling. */
export function fwhmKeV(E, resolutionPct662) {
  const r = (resolutionPct662 != null ? resolutionPct662 : 7) / 100;
  const fwhm662 = 661.7 * r;
  return fwhm662 * Math.sqrt(Math.max(E, 1) / 661.7);
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

/** Photopeak-dominated deposit (teaching: emphasize resolution, not Compton). */
export function sampleDepositKeV(lineE, resolutionPct662) {
  const fwhm = fwhmKeV(lineE, resolutionPct662);
  const sigma = fwhm / 2.355;
  return Math.max(0, gaussSample(lineE, sigma));
}

export function createSpectrum(nBins, eMaxKeV) {
  return {
    bins: new Float64Array(nBins),
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
    addCount(spec, sampleDepositKeV(line.E, resolutionPct662));
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
    };
  });
}

export function eMaxForSource(src) {
  let maxE = 200;
  const lines = src.lines || [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].E > maxE) maxE = lines[i].E;
  }
  return Math.ceil((maxE * 1.2) / 50) * 50;
}
