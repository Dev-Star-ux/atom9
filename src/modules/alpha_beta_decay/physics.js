/** Teaching decay schemes with levels, nucleon counts, and spectra. */

export const MODES = {
  alpha: { label: 'α decay', color: '#f87171', particle: '⁴He (α)' },
  betaMinus: { label: 'β⁻ decay', color: '#4ade80', particle: 'e⁻ + ν̄' },
  betaPlus: { label: 'β⁺ decay', color: '#38bdf8', particle: 'e⁺ + ν' },
  gamma: { label: 'γ decay', color: '#a78bfa', particle: 'γ photon' },
};

/**
 * levels: { side: 'parent'|'daughter', E: MeV above ground, label }
 * transitions: decay arrows between levels
 */
export const SCHEMES = [
  {
    id: 'u238a',
    name: 'U-238 α',
    mode: 'alpha',
    Q: 4.27,
    halfLife: '4.5×10⁹ y',
    parent: { sym: '²³⁸U', Z: 92, N: 146, A: 238 },
    daughter: { sym: '²³⁴Th', Z: 90, N: 144, A: 234 },
    equation: '²³⁸U → ²³⁴Th + ⁴He',
    zChange: -2,
    nChange: -2,
    note: 'Alpha particle = ² protons + ² neutrons. Heavy nuclei emit α to move toward stability.',
    parentLevels: [{ E: 0, label: 'ground' }],
    daughterLevels: [{ E: 0, label: 'ground' }],
    transitions: [{ type: 'alpha', fromE: 0, toE: 0, E: 4.27 }],
    spectrum: { kind: 'line', lines: [{ E: 4.27, label: 'α line' }] },
  },
  {
    id: 'c14b',
    name: 'C-14 β⁻',
    mode: 'betaMinus',
    Q: 0.156,
    halfLife: '5730 y',
    parent: { sym: '¹⁴C', Z: 6, N: 8, A: 14 },
    daughter: { sym: '¹⁴N', Z: 7, N: 7, A: 14 },
    equation: 'n → p + e⁻ + ν̄   (in nucleus: ¹⁴C → ¹⁴N + e⁻ + ν̄)',
    zChange: +1,
    nChange: -1,
    note: 'Neutron converts to proton inside nucleus. Electron energy is continuous — neutrino carries the rest.',
    parentLevels: [{ E: 0, label: 'ground' }],
    daughterLevels: [{ E: 0, label: 'ground' }],
    transitions: [{ type: 'betaMinus', fromE: 0, toE: 0, E: 0.156 }],
    spectrum: { kind: 'beta', Q: 0.156 },
  },
  {
    id: 'f18b',
    name: 'F-18 β⁺',
    mode: 'betaPlus',
    Q: 1.04,
    halfLife: '110 min',
    parent: { sym: '¹⁸F', Z: 9, N: 9, A: 18 },
    daughter: { sym: '¹⁸O', Z: 8, N: 10, A: 18 },
    equation: 'p → n + e⁺ + ν   (¹⁸F → ¹⁸O + e⁺ + ν)',
    zChange: -1,
    nChange: +1,
    note: 'Proton-rich isotope: proton converts to neutron. Positron annihilates → 511 keV γ (PET imaging).',
    parentLevels: [{ E: 0, label: 'ground' }],
    daughterLevels: [{ E: 0, label: 'ground' }],
    transitions: [{ type: 'betaPlus', fromE: 0, toE: 0, E: 1.04 }],
    spectrum: { kind: 'beta', Q: 1.04 },
    extra: '511 keV γ from e⁺ + e⁻ annihilation',
  },
  {
    id: 'co60g',
    name: 'Co-60 cascade',
    mode: 'gamma',
    Q: 2.50,
    halfLife: '5.27 y',
    parent: { sym: '⁶⁰Co', Z: 27, N: 33, A: 60 },
    daughter: { sym: '⁶⁰Ni', Z: 28, N: 32, A: 60 },
    equation: '⁶⁰Co →⁶⁰Ni* + β⁻  → ⁶⁰Ni + γ + γ',
    zChange: +1,
    nChange: -1,
    note: 'β⁻ first populates excited ⁶⁰Ni; de-excitation emits discrete γ lines (1.17 & 1.33 MeV).',
    parentLevels: [{ E: 0, label: '⁶⁰Co g.s.' }],
    daughterLevels: [
      { E: 0, label: '⁶⁰Ni g.s.' },
      { E: 1.17, label: 'level I' },
      { E: 2.50, label: 'level II' },
    ],
    transitions: [
      { type: 'betaMinus', fromE: 0, toE: 2.50, E: 0.96, label: 'β⁻' },
      { type: 'gamma', fromE: 2.50, toE: 1.17, E: 1.33, label: 'γ₁' },
      { type: 'gamma', fromE: 1.17, toE: 0, E: 1.17, label: 'γ₂' },
    ],
    spectrum: { kind: 'gamma', lines: [{ E: 1.17, label: 'γ₂' }, { E: 1.33, label: 'γ₁' }] },
  },
];

export function getScheme(id) {
  for (let i = 0; i < SCHEMES.length; i++) {
    if (SCHEMES[i].id === id) return SCHEMES[i];
  }
  return SCHEMES[0];
}

/** Allowed β spectrum shape ∝ E(Q−E)² (teaching). */
export function betaSpectrumDensity(E, Q) {
  if (E <= 0 || E >= Q) return 0;
  return E * Math.pow(Q - E, 2);
}

export function sampleBetaEnergy(Q) {
  let best = 0;
  let bestD = 0;
  for (let i = 0; i < 12; i++) {
    const E = Q * Math.pow(Math.random(), 0.55) * (0.85 + Math.random() * 0.15);
    const d = betaSpectrumDensity(E, Q);
    if (d > bestD) { bestD = d; best = E; }
  }
  return Math.min(Q * 0.98, best);
}

export function modeMeta(mode) {
  return MODES[mode] || MODES.alpha;
}
