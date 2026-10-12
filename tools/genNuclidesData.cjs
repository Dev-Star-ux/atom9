// Generates src/modules/chart_of_nuclides/nuclidesData.js — offline teaching chart.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'modules', 'chart_of_nuclides');
fs.mkdirSync(dir, { recursive: true });

// Import element list by requiring the generated ES module as text/JSON-ish is hard;
// rebuild a compact set of nuclides for the chart + full decay chains.
const SYM = [
  '', 'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca',
  'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn', 'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr', 'Rb', 'Sr', 'Y', 'Zr',
  'Nb', 'Mo', 'Tc', 'Ru', 'Rh', 'Pd', 'Ag', 'Cd', 'In', 'Sn', 'Sb', 'Te', 'I', 'Xe', 'Cs', 'Ba', 'La', 'Ce', 'Pr', 'Nd',
  'Pm', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb', 'Lu', 'Hf', 'Ta', 'W', 'Re', 'Os', 'Ir', 'Pt', 'Au', 'Hg',
  'Tl', 'Pb', 'Bi', 'Po', 'At', 'Rn', 'Fr', 'Ra', 'Ac', 'Th', 'Pa', 'U', 'Np', 'Pu', 'Am', 'Cm', 'Bk', 'Cf',
];
const NAME = [
  '', 'Hydrogen', 'Helium', 'Lithium', 'Beryllium', 'Boron', 'Carbon', 'Nitrogen', 'Oxygen', 'Fluorine', 'Neon',
  'Sodium', 'Magnesium', 'Aluminium', 'Silicon', 'Phosphorus', 'Sulfur', 'Chlorine', 'Argon', 'Potassium', 'Calcium',
  'Scandium', 'Titanium', 'Vanadium', 'Chromium', 'Manganese', 'Iron', 'Cobalt', 'Nickel', 'Copper', 'Zinc',
  'Gallium', 'Germanium', 'Arsenic', 'Selenium', 'Bromine', 'Krypton', 'Rubidium', 'Strontium', 'Yttrium', 'Zirconium',
  'Niobium', 'Molybdenum', 'Technetium', 'Ruthenium', 'Rhodium', 'Palladium', 'Silver', 'Cadmium', 'Indium', 'Tin',
  'Antimony', 'Tellurium', 'Iodine', 'Xenon', 'Caesium', 'Barium', 'Lanthanum', 'Cerium', 'Praseodymium', 'Neodymium',
  'Promethium', 'Samarium', 'Europium', 'Gadolinium', 'Terbium', 'Dysprosium', 'Holmium', 'Erbium', 'Thulium', 'Ytterbium',
  'Lutetium', 'Hafnium', 'Tantalum', 'Tungsten', 'Rhenium', 'Osmium', 'Iridium', 'Platinum', 'Gold', 'Mercury',
  'Thallium', 'Lead', 'Bismuth', 'Polonium', 'Astatine', 'Radon', 'Francium', 'Radium', 'Actinium', 'Thorium',
  'Protactinium', 'Uranium', 'Neptunium', 'Plutonium', 'Americium', 'Curium', 'Berkelium', 'Californium',
];

function key(z, a) { return z + '-' + a; }
function label(z, a) { return (SYM[z] || '?') + '-' + a; }

const map = {};

function add(z, a, props) {
  if (z < 1 || z >= SYM.length || a < z) return;
  const n = a - z;
  const id = key(z, a);
  const prev = map[id];
  const next = Object.assign({
    z: z,
    n: n,
    a: a,
    symbol: SYM[z],
    name: NAME[z] || SYM[z],
    halfLife: 'stable',
    decay: 'stable',
    spin: '—',
    bindingMeV: null,
    abundance: null,
  }, props || {});
  if (!prev) map[id] = next;
  else {
    // prefer richer data
    map[id] = Object.assign({}, prev, next, {
      halfLife: next.halfLife !== 'stable' || !prev.halfLife ? next.halfLife : prev.halfLife,
      decay: next.decay !== 'stable' || !prev.decay ? next.decay : prev.decay,
      bindingMeV: next.bindingMeV != null ? next.bindingMeV : prev.bindingMeV,
      spin: next.spin !== '—' ? next.spin : prev.spin,
      abundance: next.abundance != null ? next.abundance : prev.abundance,
    });
  }
}

// Valley of stability (teaching): a few A around N≈Z (light) / N>Z (heavy)
for (let z = 1; z <= 82; z++) {
  const a0 = z <= 20 ? 2 * z : Math.round(2.0 * z + 0.015 * z * z);
  for (let da = -2; da <= 3; da++) {
    const a = a0 + da;
    if (a <= z) continue;
    const neutronExcess = a - 2 * z;
    let decay = 'stable';
    let half = 'stable';
    if (z >= 84) { decay = 'α'; half = 'radioactive'; }
    else if (da <= -2) { decay = 'β⁺'; half = 'short'; }
    else if (da >= 3 && z > 20) { decay = 'β⁻'; half = 'short'; }
    else if (z === 43 || z === 61) { decay = 'β⁻'; half = 'radioactive'; }
    add(z, a, {
      decay: decay,
      halfLife: half,
      bindingMeV: z >= 26 && z <= 28 ? 8.7 : (8.5 - Math.abs(neutronExcess) * 0.02),
    });
  }
}

// Explicit important nuclides (overwrite with real teaching values)
const EXPLICIT = [
  [1, 1, { decay: 'stable', halfLife: 'stable', spin: '1/2+', abundance: 99.98, bindingMeV: 0 }],
  [1, 2, { decay: 'stable', halfLife: 'stable', spin: '1+', abundance: 0.02, bindingMeV: 1.112 }],
  [1, 3, { decay: 'β⁻', halfLife: '12.32 y', spin: '1/2+', bindingMeV: 2.827 }],
  [2, 3, { decay: 'stable', halfLife: 'stable', spin: '1/2+', bindingMeV: 2.573 }],
  [2, 4, { decay: 'stable', halfLife: 'stable', spin: '0+', abundance: 100, bindingMeV: 7.074 }],
  [6, 12, { decay: 'stable', halfLife: 'stable', spin: '0+', abundance: 98.9, bindingMeV: 7.680 }],
  [6, 14, { decay: 'β⁻', halfLife: '5700 y', spin: '0+', bindingMeV: 7.520 }],
  [8, 16, { decay: 'stable', halfLife: 'stable', spin: '0+', abundance: 99.76, bindingMeV: 7.976 }],
  [26, 56, { decay: 'stable', halfLife: 'stable', spin: '0+', abundance: 91.8, bindingMeV: 8.790 }],
  [27, 60, { decay: 'β⁻', halfLife: '5.27 y', spin: '5+', bindingMeV: 8.747 }],
  [38, 90, { decay: 'β⁻', halfLife: '28.8 y', spin: '0+', bindingMeV: 8.710 }],
  [43, 99, { decay: 'β⁻', halfLife: '2.11×10⁵ y', spin: '9/2+', bindingMeV: 8.614 }],
  [53, 131, { decay: 'β⁻', halfLife: '8.02 d', spin: '7/2+', bindingMeV: 8.424 }],
  [55, 137, { decay: 'β⁻', halfLife: '30.1 y', spin: '7/2+', bindingMeV: 8.389 }],
  [82, 206, { decay: 'stable', halfLife: 'stable', spin: '0+', abundance: 24.1, bindingMeV: 7.875 }],
  [82, 207, { decay: 'stable', halfLife: 'stable', spin: '1/2−', abundance: 22.1, bindingMeV: 7.870 }],
  [82, 208, { decay: 'stable', halfLife: 'stable', spin: '0+', abundance: 52.4, bindingMeV: 7.867 }],
  [83, 209, { decay: 'α', halfLife: '1.9×10¹⁹ y', spin: '9/2−', abundance: 100, bindingMeV: 7.848 }],
  [84, 210, { decay: 'α', halfLife: '138.4 d', spin: '0+', bindingMeV: 7.834 }],
  [84, 214, { decay: 'α', halfLife: '164 µs', spin: '0+', bindingMeV: 7.72 }],
  [84, 218, { decay: 'α', halfLife: '3.10 min', spin: '0+', bindingMeV: 7.70 }],
  [86, 222, { decay: 'α', halfLife: '3.82 d', spin: '0+', bindingMeV: 7.695 }],
  [88, 226, { decay: 'α', halfLife: '1600 y', spin: '0+', bindingMeV: 7.662 }],
  [90, 230, { decay: 'α', halfLife: '7.54×10⁴ y', spin: '0+', bindingMeV: 7.633 }],
  [90, 232, { decay: 'α', halfLife: '1.40×10¹⁰ y', spin: '0+', abundance: 100, bindingMeV: 7.614 }],
  [90, 234, { decay: 'β⁻', halfLife: '24.1 d', spin: '0+', bindingMeV: 7.60 }],
  [91, 234, { decay: 'β⁻', halfLife: '1.17 min', spin: '0+', bindingMeV: 7.59 }],
  [92, 233, { decay: 'α', halfLife: '1.592×10⁵ y', spin: '5/2+', bindingMeV: 7.606 }],
  [92, 234, { decay: 'α', halfLife: '2.455×10⁵ y', spin: '0+', abundance: 0.005, bindingMeV: 7.601 }],
  [92, 235, { decay: 'α', halfLife: '7.04×10⁸ y', spin: '7/2−', abundance: 0.720, bindingMeV: 7.591 }],
  [92, 238, { decay: 'α', halfLife: '4.468×10⁹ y', spin: '0+', abundance: 99.274, bindingMeV: 7.570 }],
  [94, 239, { decay: 'α', halfLife: '2.411×10⁴ y', spin: '1/2+', bindingMeV: 7.560 }],
  // U-235 series extras
  [90, 231, { decay: 'β⁻', halfLife: '25.5 h', spin: '—', bindingMeV: 7.61 }],
  [91, 231, { decay: 'α', halfLife: '3.28×10⁴ y', spin: '—', bindingMeV: 7.60 }],
  [89, 227, { decay: 'β⁻', halfLife: '21.8 y', spin: '—', bindingMeV: 7.65 }],
  [90, 227, { decay: 'α', halfLife: '18.7 d', spin: '—', bindingMeV: 7.64 }],
  [88, 223, { decay: 'α', halfLife: '11.4 d', spin: '—', bindingMeV: 7.68 }],
  [86, 219, { decay: 'α', halfLife: '3.96 s', spin: '—', bindingMeV: 7.70 }],
  [84, 215, { decay: 'α', halfLife: '1.78 ms', spin: '—', bindingMeV: 7.72 }],
  [82, 211, { decay: 'β⁻', halfLife: '36.1 min', spin: '—', bindingMeV: 7.85 }],
  [83, 211, { decay: 'α', halfLife: '2.14 min', spin: '—', bindingMeV: 7.84 }],
  [81, 207, { decay: 'β⁻', halfLife: '4.77 min', spin: '—', bindingMeV: 7.87 }],
  // Th-232 extras
  [88, 228, { decay: 'β⁻', halfLife: '5.75 y', spin: '—', bindingMeV: 7.66 }],
  [89, 228, { decay: 'β⁻', halfLife: '6.15 h', spin: '—', bindingMeV: 7.65 }],
  [90, 228, { decay: 'α', halfLife: '1.91 y', spin: '—', bindingMeV: 7.64 }],
  [88, 224, { decay: 'α', halfLife: '3.63 d', spin: '—', bindingMeV: 7.67 }],
  [86, 220, { decay: 'α', halfLife: '55.6 s', spin: '—', bindingMeV: 7.70 }],
  [84, 216, { decay: 'α', halfLife: '0.145 s', spin: '—', bindingMeV: 7.72 }],
  [82, 212, { decay: 'β⁻', halfLife: '10.6 h', spin: '—', bindingMeV: 7.85 }],
  [83, 212, { decay: 'β⁻ / α', halfLife: '60.6 min', spin: '—', bindingMeV: 7.84 }],
  [82, 210, { decay: 'β⁻', halfLife: '22.2 y', spin: '—', bindingMeV: 7.86 }],
  [83, 210, { decay: 'β⁻', halfLife: '5.01 d', spin: '—', bindingMeV: 7.85 }],
  [82, 214, { decay: 'β⁻', halfLife: '26.8 min', spin: '—', bindingMeV: 7.84 }],
  [83, 214, { decay: 'β⁻', halfLife: '19.9 min', spin: '—', bindingMeV: 7.83 }],
];
EXPLICIT.forEach(function (row) { add(row[0], row[1], row[2]); });

// Fill actinide band for chart density
for (let z = 84; z <= 96; z++) {
  const a0 = Math.round(2.4 * z);
  for (let da = -4; da <= 6; da++) {
    const a = a0 + da;
    if (a <= z) continue;
    add(z, a, { decay: da < 0 ? 'α / β⁺' : 'α / β⁻', halfLife: 'radioactive' });
  }
}

const CHAINS = {
  '92-238': {
    id: 'u238',
    title: 'Uranium-238 series (4n+2)',
    startLabel: 'U-238',
    steps: [
      { z: 92, a: 238, mode: 'α', hl: '4.468×10⁹ y' },
      { z: 90, a: 234, mode: 'β⁻', hl: '24.1 d' },
      { z: 91, a: 234, mode: 'β⁻', hl: '1.17 min' },
      { z: 92, a: 234, mode: 'α', hl: '2.455×10⁵ y' },
      { z: 90, a: 230, mode: 'α', hl: '7.54×10⁴ y' },
      { z: 88, a: 226, mode: 'α', hl: '1600 y' },
      { z: 86, a: 222, mode: 'α', hl: '3.82 d' },
      { z: 84, a: 218, mode: 'α', hl: '3.10 min' },
      { z: 82, a: 214, mode: 'β⁻', hl: '26.8 min' },
      { z: 83, a: 214, mode: 'β⁻', hl: '19.9 min' },
      { z: 84, a: 214, mode: 'α', hl: '164 µs' },
      { z: 82, a: 210, mode: 'β⁻', hl: '22.2 y' },
      { z: 83, a: 210, mode: 'β⁻', hl: '5.01 d' },
      { z: 84, a: 210, mode: 'α', hl: '138.4 d' },
      { z: 82, a: 206, mode: 'stable', hl: '—' },
    ],
  },
  '92-235': {
    id: 'u235',
    title: 'Uranium-235 series (4n+3)',
    startLabel: 'U-235',
    steps: [
      { z: 92, a: 235, mode: 'α', hl: '7.04×10⁸ y' },
      { z: 90, a: 231, mode: 'β⁻', hl: '25.5 h' },
      { z: 91, a: 231, mode: 'α', hl: '3.28×10⁴ y' },
      { z: 89, a: 227, mode: 'β⁻', hl: '21.8 y' },
      { z: 90, a: 227, mode: 'α', hl: '18.7 d' },
      { z: 88, a: 223, mode: 'α', hl: '11.4 d' },
      { z: 86, a: 219, mode: 'α', hl: '3.96 s' },
      { z: 84, a: 215, mode: 'α', hl: '1.78 ms' },
      { z: 82, a: 211, mode: 'β⁻', hl: '36.1 min' },
      { z: 83, a: 211, mode: 'α', hl: '2.14 min' },
      { z: 81, a: 207, mode: 'β⁻', hl: '4.77 min' },
      { z: 82, a: 207, mode: 'stable', hl: '—' },
    ],
  },
  '90-232': {
    id: 'th232',
    title: 'Thorium-232 series (4n)',
    startLabel: 'Th-232',
    steps: [
      { z: 90, a: 232, mode: 'α', hl: '1.40×10¹⁰ y' },
      { z: 88, a: 228, mode: 'β⁻', hl: '5.75 y' },
      { z: 89, a: 228, mode: 'β⁻', hl: '6.15 h' },
      { z: 90, a: 228, mode: 'α', hl: '1.91 y' },
      { z: 88, a: 224, mode: 'α', hl: '3.63 d' },
      { z: 86, a: 220, mode: 'α', hl: '55.6 s' },
      { z: 84, a: 216, mode: 'α', hl: '0.145 s' },
      { z: 82, a: 212, mode: 'β⁻', hl: '10.6 h' },
      { z: 83, a: 212, mode: 'β⁻ / α', hl: '60.6 min' },
      { z: 82, a: 208, mode: 'stable', hl: '—' },
    ],
  },
  '88-226': {
    id: 'ra226',
    title: 'Radium-226 path (part of U-238 series)',
    startLabel: 'Ra-226',
    steps: [
      { z: 88, a: 226, mode: 'α', hl: '1600 y' },
      { z: 86, a: 222, mode: 'α', hl: '3.82 d' },
      { z: 84, a: 218, mode: 'α', hl: '3.10 min' },
      { z: 82, a: 214, mode: 'β⁻', hl: '26.8 min' },
      { z: 83, a: 214, mode: 'β⁻', hl: '19.9 min' },
      { z: 84, a: 214, mode: 'α', hl: '164 µs' },
      { z: 82, a: 210, mode: 'β⁻', hl: '22.2 y' },
      { z: 83, a: 210, mode: 'β⁻', hl: '5.01 d' },
      { z: 84, a: 210, mode: 'α', hl: '138.4 d' },
      { z: 82, a: 206, mode: 'stable', hl: '—' },
    ],
  },
  '94-239': {
    id: 'pu239',
    title: 'Plutonium-239 → U-235 series',
    startLabel: 'Pu-239',
    steps: [
      { z: 94, a: 239, mode: 'α', hl: '2.411×10⁴ y' },
      { z: 92, a: 235, mode: 'α', hl: '7.04×10⁸ y' },
      { z: 90, a: 231, mode: 'β⁻', hl: '25.5 h' },
      { z: 91, a: 231, mode: 'α', hl: '3.28×10⁴ y' },
      { z: 89, a: 227, mode: 'β⁻', hl: '21.8 y' },
      { z: 90, a: 227, mode: 'α', hl: '18.7 d' },
      { z: 88, a: 223, mode: 'α', hl: '11.4 d' },
      { z: 86, a: 219, mode: 'α', hl: '3.96 s' },
      { z: 84, a: 215, mode: 'α', hl: '1.78 ms' },
      { z: 82, a: 211, mode: 'β⁻', hl: '36.1 min' },
      { z: 83, a: 211, mode: 'α', hl: '2.14 min' },
      { z: 81, a: 207, mode: 'β⁻', hl: '4.77 min' },
      { z: 82, a: 207, mode: 'stable', hl: '—' },
    ],
  },
};

// Ensure all chain members exist
Object.keys(CHAINS).forEach(function (cid) {
  CHAINS[cid].steps.forEach(function (s) {
    add(s.z, s.a, { decay: s.mode === 'stable' ? 'stable' : s.mode, halfLife: s.hl === '—' ? 'stable' : s.hl });
  });
});

const NUCLIDES = Object.keys(map).map(function (k) { return map[k]; });
NUCLIDES.sort(function (a, b) { return a.z - b.z || a.a - b.a; });

const DECAY_COLORS = {
  stable: '#4ade80',
  'β⁻': '#38bdf8',
  'β⁺': '#f472b6',
  α: '#fbbf24',
  'α / β⁻': '#fb923c',
  'α / β⁺': '#e879f9',
  'β⁻ / α': '#f97316',
  IT: '#a78bfa',
  radioactive: '#94a3b8',
  short: '#64748b',
};

const file =
  '/** Offline chart of nuclides — teaching dataset (no network). */\n' +
  'export const DECAY_COLORS = ' + JSON.stringify(DECAY_COLORS, null, 2) + ';\n\n' +
  'export const NUCLIDES = ' + JSON.stringify(NUCLIDES, null, 2) + ';\n\n' +
  'export const CHAINS = ' + JSON.stringify(CHAINS, null, 2) + ';\n\n' +
  'export function nuclideKey(z, a) { return z + "-" + a; }\n\n' +
  'export function getNuclide(z, a) {\n' +
  '  const id = nuclideKey(z, a);\n' +
  '  for (let i = 0; i < NUCLIDES.length; i++) {\n' +
  '    if (NUCLIDES[i].z === z && NUCLIDES[i].a === a) return NUCLIDES[i];\n' +
  '  }\n' +
  '  return null;\n' +
  '}\n\n' +
  'export function getChainFor(z, a) {\n' +
  '  return CHAINS[nuclideKey(z, a)] || null;\n' +
  '}\n\n' +
  'export function findChainContaining(z, a) {\n' +
  '  const keys = Object.keys(CHAINS);\n' +
  '  for (let i = 0; i < keys.length; i++) {\n' +
  '    const ch = CHAINS[keys[i]];\n' +
  '    const steps = ch.steps || [];\n' +
  '    for (let j = 0; j < steps.length; j++) {\n' +
  '      if (steps[j].z === z && steps[j].a === a) {\n' +
  '        return { chain: ch, index: j, chainKey: keys[i] };\n' +
  '      }\n' +
  '    }\n' +
  '  }\n' +
  '  return null;\n' +
  '}\n\n' +
  'export function nuclideLabel(n) {\n' +
  '  if (!n) return "";\n' +
  '  return n.symbol + "-" + n.a;\n' +
  '}\n';

fs.writeFileSync(path.join(dir, 'nuclidesData.js'), file, 'utf8');
console.log('Wrote', NUCLIDES.length, 'nuclides,', Object.keys(CHAINS).length, 'chains');
