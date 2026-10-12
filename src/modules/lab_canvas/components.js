/** Palette components for the Nuclear Lab Canvas. */

export const COMPONENTS = [
  {
    id: 'source',
    label: 'Radioactive source',
    short: 'Source',
    icon: '☢',
    color: '#fbbf24',
    category: 'emit',
    ports: { out: ['beam'] },
    defaults: { kind: 'neutron', rate: 40, energyMeV: 2 },
    kinds: [
      { id: 'neutron', label: 'Neutron source' },
      { id: 'alpha', label: 'α source' },
      { id: 'beta', label: 'β source' },
      { id: 'gamma', label: 'γ source' },
    ],
  },
  {
    id: 'nucleus',
    label: 'Nucleus',
    short: 'Nucleus',
    icon: '⚛',
    color: '#38bdf8',
    category: 'matter',
    ports: { in: ['beam'], out: ['beam', 'signal'] },
    defaults: { nuclide: 'U-235', role: 'sample' },
    nuclides: ['U-235', 'U-238', 'Pu-239', 'C-12', 'C-14', 'H-2', 'Li-7', 'B-10'],
  },
  {
    id: 'target',
    label: 'Target',
    short: 'Target',
    icon: '◎',
    color: '#f472b6',
    category: 'matter',
    ports: { in: ['beam'], out: ['beam', 'energy', 'signal'] },
    defaults: { nuclide: 'U-235' },
    nuclides: ['U-235', 'U-238', 'Pu-239', 'Be-9', 'B-10', 'H-2', 'H-3', 'C-12'],
  },
  {
    id: 'neutron',
    label: 'Neutron',
    short: 'n',
    icon: 'n',
    color: '#94a3b8',
    category: 'particle',
    ports: { in: ['beam'], out: ['beam'] },
    defaults: { energyMeV: 0.025e-3 },
  },
  {
    id: 'proton',
    label: 'Proton',
    short: 'p',
    icon: 'p⁺',
    color: '#f87171',
    category: 'particle',
    ports: { in: ['beam'], out: ['beam'] },
    defaults: { energyMeV: 2 },
  },
  {
    id: 'electron',
    label: 'Electron',
    short: 'e⁻',
    icon: 'e⁻',
    color: '#22d3ee',
    category: 'particle',
    ports: { in: ['beam'], out: ['beam'] },
    defaults: { energyKeV: 50 },
  },
  {
    id: 'efield',
    label: 'Electric field',
    short: 'E-field',
    icon: '⚡',
    color: '#a78bfa',
    category: 'field',
    ports: { in: ['beam'], out: ['beam'] },
    defaults: { strength: 0.6, polarity: 1 },
  },
  {
    id: 'bfield',
    label: 'Magnetic field',
    short: 'B-field',
    icon: '🧲',
    color: '#818cf8',
    category: 'field',
    ports: { in: ['beam'], out: ['beam'] },
    defaults: { strength: 0.6, direction: 1 },
  },
  {
    id: 'shield',
    label: 'Shielding',
    short: 'Shield',
    icon: '▣',
    color: '#64748b',
    category: 'field',
    ports: { in: ['beam'], out: ['beam'] },
    defaults: { material: 'lead', thickness: 0.5 },
    materials: [
      { id: 'lead', label: 'Lead', atten: 0.55 },
      { id: 'concrete', label: 'Concrete', atten: 0.35 },
      { id: 'water', label: 'Water', atten: 0.25 },
      { id: 'borated', label: 'Borated poly', atten: 0.7 },
    ],
  },
  {
    id: 'detector',
    label: 'Detector',
    short: 'Detector',
    icon: '📡',
    color: '#4ade80',
    category: 'sense',
    ports: { in: ['beam', 'signal', 'energy'] },
    defaults: { kind: 'gm', mode: 'count' },
    kinds: [
      { id: 'gm', label: 'GM tube' },
      { id: 'nai', label: 'NaI(Tl) γ' },
      { id: 'hpge', label: 'HPGe γ' },
      { id: 'si_alpha', label: 'Si α' },
      { id: 'he3', label: '³He neutron' },
      { id: 'bf3', label: 'BF₃ neutron' },
      { id: 'energy', label: 'Energy / heat' },
    ],
  },
];

export { DETECTOR_KINDS, getDetectorKind, tryDetect, senseBadges, prettyParticle, suggestDetectorFor } from './detectors.js';

export function getComponent(id) {
  for (let i = 0; i < COMPONENTS.length; i++) {
    if (COMPONENTS[i].id === id) return COMPONENTS[i];
  }
  return null;
}

export function makeNode(typeId, x, y, id) {
  const def = getComponent(typeId);
  if (!def) return null;
  const props = {};
  const d = def.defaults || {};
  Object.keys(d).forEach(function (k) { props[k] = d[k]; });
  return {
    id: id,
    type: typeId,
    x: x,
    y: y,
    props: props,
    w: 150,
    h: 72,
  };
}

export { EXPERIMENTS, getExperiment, PRESETS } from './experiments.js';
