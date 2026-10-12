/**
 * Detector kinds for Lab Canvas — which radiation each sensor can see.
 * Efficiencies are teaching values (0–1), not real lab calibrations.
 */

export const DETECTOR_KINDS = [
  {
    id: 'gm',
    label: 'GM tube',
    short: 'GM',
    icon: '📟',
    color: '#a3e635',
    blurb: 'Counts ionizing events — not energy. Blind to most neutrons.',
    senses: { alpha: 0.88, beta: 0.82, electron: 0.82, gamma: 0.18, neutron: 0.03, proton: 0.75, energy: 0.05 },
    tags: ['α', 'β', 'γ~'],
  },
  {
    id: 'nai',
    label: 'NaI(Tl) γ',
    short: 'NaI',
    icon: '📊',
    color: '#67e8f9',
    blurb: 'Scintillator for γ / X-rays. Housing stops α; neutrons rarely interact.',
    senses: { alpha: 0.04, beta: 0.22, electron: 0.22, gamma: 0.62, neutron: 0.04, proton: 0.08, energy: 0.35 },
    tags: ['γ', 'β~'],
  },
  {
    id: 'hpge',
    label: 'HPGe γ',
    short: 'HPGe',
    icon: '❄',
    color: '#38bdf8',
    blurb: 'High-resolution γ spectroscopy (needs cooling in a real lab).',
    senses: { alpha: 0.02, beta: 0.12, electron: 0.12, gamma: 0.55, neutron: 0.03, proton: 0.05, energy: 0.3 },
    tags: ['γ'],
  },
  {
    id: 'si_alpha',
    label: 'Si α detector',
    short: 'Si-α',
    icon: 'α',
    color: '#fbbf24',
    blurb: 'Surface-barrier / PIPS for α lines — needs thin window or vacuum path.',
    senses: { alpha: 0.95, beta: 0.2, electron: 0.18, gamma: 0.03, neutron: 0.02, proton: 0.7, energy: 0.1 },
    tags: ['α', 'p'],
  },
  {
    id: 'he3',
    label: '³He neutron',
    short: '³He',
    icon: 'n',
    color: '#c4b5fd',
    blurb: 'Proportional tube: ³He(n,p)³H — sees neutrons via charged products.',
    senses: { alpha: 0.05, beta: 0.04, electron: 0.04, gamma: 0.06, neutron: 0.78, proton: 0.15, energy: 0.05 },
    tags: ['n'],
  },
  {
    id: 'bf3',
    label: 'BF₃ neutron',
    short: 'BF₃',
    icon: 'B',
    color: '#ddd6fe',
    blurb: '¹⁰B(n,α) in BF₃ gas — classic thermal-neutron counter.',
    senses: { alpha: 0.06, beta: 0.04, electron: 0.04, gamma: 0.05, neutron: 0.72, proton: 0.12, energy: 0.05 },
    tags: ['n'],
  },
  {
    id: 'energy',
    label: 'Energy / heat',
    short: 'Energy',
    icon: '🔥',
    color: '#fb923c',
    blurb: 'Teaching calorimeter channel — records large energy deposits (e.g. fission Q).',
    senses: { alpha: 0.25, beta: 0.2, electron: 0.2, gamma: 0.25, neutron: 0.15, proton: 0.3, energy: 0.95 },
    tags: ['E'],
  },
];

export function getDetectorKind(id) {
  for (let i = 0; i < DETECTOR_KINDS.length; i++) {
    if (DETECTOR_KINDS[i].id === id) return DETECTOR_KINDS[i];
  }
  return DETECTOR_KINDS[0];
}

/** Normalize particle label for matrix lookup. */
export function particleKey(kind) {
  const k = kind || 'other';
  if (k === 'beta') return 'beta';
  if (k === 'electron') return 'electron';
  return k;
}

/**
 * Probability that this detector registers the particle.
 * Returns { hit: boolean, eff, reason, detLabel, particle }.
 */
export function tryDetect(detProps, particleKind) {
  const det = getDetectorKind((detProps && detProps.kind) || 'gm');
  const pk = particleKey(particleKind);
  const senses = det.senses || {};
  const eff = senses[pk] != null ? senses[pk] : 0.05;
  const hit = Math.random() < eff;
  let reason = '';
  if (hit) {
    reason = det.short + ' sensed ' + prettyParticle(pk);
  } else {
    reason = det.short + ' insensitive to ' + prettyParticle(pk) +
      ' (ε≈' + Math.round(eff * 100) + '%) — try a ' + suggestDetectorFor(pk);
  }
  return {
    hit: hit,
    eff: eff,
    reason: reason,
    detId: det.id,
    detLabel: det.short,
    particle: pk,
  };
}

export function prettyParticle(kind) {
  const k = particleKey(kind);
  if (k === 'alpha') return 'α';
  if (k === 'beta' || k === 'electron') return 'β/e⁻';
  if (k === 'gamma') return 'γ';
  if (k === 'neutron') return 'n';
  if (k === 'proton') return 'p';
  if (k === 'energy') return 'energy deposit';
  return k;
}

export function suggestDetectorFor(kind) {
  const k = particleKey(kind);
  if (k === 'alpha') return 'Si-α';
  if (k === 'beta' || k === 'electron') return 'GM';
  if (k === 'gamma') return 'NaI or HPGe';
  if (k === 'neutron') return '³He or BF₃';
  if (k === 'energy') return 'Energy channel';
  if (k === 'proton') return 'Si-α or GM';
  return 'matching detector';
}

/** Compact sense tags for UI badges. */
export function senseBadges(detId) {
  const det = getDetectorKind(detId);
  const s = det.senses || {};
  return [
    { id: 'alpha', label: 'α', ok: (s.alpha || 0) >= 0.4 },
    { id: 'beta', label: 'β', ok: (s.beta || 0) >= 0.4 },
    { id: 'gamma', label: 'γ', ok: (s.gamma || 0) >= 0.4 },
    { id: 'neutron', label: 'n', ok: (s.neutron || 0) >= 0.4 },
    { id: 'energy', label: 'E', ok: (s.energy || 0) >= 0.5 },
  ];
}
