// Generates src/modules/periodic_table/elementsData.js — offline teaching dataset.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'modules', 'periodic_table');
fs.mkdirSync(dir, { recursive: true });

const names = [
  '', 'Hydrogen', 'Helium', 'Lithium', 'Beryllium', 'Boron', 'Carbon', 'Nitrogen', 'Oxygen', 'Fluorine', 'Neon',
  'Sodium', 'Magnesium', 'Aluminium', 'Silicon', 'Phosphorus', 'Sulfur', 'Chlorine', 'Argon', 'Potassium', 'Calcium',
  'Scandium', 'Titanium', 'Vanadium', 'Chromium', 'Manganese', 'Iron', 'Cobalt', 'Nickel', 'Copper', 'Zinc',
  'Gallium', 'Germanium', 'Arsenic', 'Selenium', 'Bromine', 'Krypton', 'Rubidium', 'Strontium', 'Yttrium', 'Zirconium',
  'Niobium', 'Molybdenum', 'Technetium', 'Ruthenium', 'Rhodium', 'Palladium', 'Silver', 'Cadmium', 'Indium', 'Tin',
  'Antimony', 'Tellurium', 'Iodine', 'Xenon', 'Caesium', 'Barium', 'Lanthanum', 'Cerium', 'Praseodymium', 'Neodymium',
  'Promethium', 'Samarium', 'Europium', 'Gadolinium', 'Terbium', 'Dysprosium', 'Holmium', 'Erbium', 'Thulium', 'Ytterbium',
  'Lutetium', 'Hafnium', 'Tantalum', 'Tungsten', 'Rhenium', 'Osmium', 'Iridium', 'Platinum', 'Gold', 'Mercury',
  'Thallium', 'Lead', 'Bismuth', 'Polonium', 'Astatine', 'Radon', 'Francium', 'Radium', 'Actinium', 'Thorium',
  'Protactinium', 'Uranium', 'Neptunium', 'Plutonium', 'Americium', 'Curium', 'Berkelium', 'Californium', 'Einsteinium', 'Fermium',
  'Mendelevium', 'Nobelium', 'Lawrencium', 'Rutherfordium', 'Dubnium', 'Seaborgium', 'Bohrium', 'Hassium', 'Meitnerium', 'Darmstadtium',
  'Roentgenium', 'Copernicium', 'Nihonium', 'Flerovium', 'Moscovium', 'Livermorium', 'Tennessine', 'Oganesson',
];

const sym = [
  '', 'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca',
  'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn', 'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr', 'Rb', 'Sr', 'Y', 'Zr',
  'Nb', 'Mo', 'Tc', 'Ru', 'Rh', 'Pd', 'Ag', 'Cd', 'In', 'Sn', 'Sb', 'Te', 'I', 'Xe', 'Cs', 'Ba', 'La', 'Ce', 'Pr', 'Nd',
  'Pm', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb', 'Lu', 'Hf', 'Ta', 'W', 'Re', 'Os', 'Ir', 'Pt', 'Au', 'Hg',
  'Tl', 'Pb', 'Bi', 'Po', 'At', 'Rn', 'Fr', 'Ra', 'Ac', 'Th', 'Pa', 'U', 'Np', 'Pu', 'Am', 'Cm', 'Bk', 'Cf', 'Es', 'Fm',
  'Md', 'No', 'Lr', 'Rf', 'Db', 'Sg', 'Bh', 'Hs', 'Mt', 'Ds', 'Rg', 'Cn', 'Nh', 'Fl', 'Mc', 'Lv', 'Ts', 'Og',
];

const mass = [
  0, 1.008, 4.003, 6.94, 9.012, 10.81, 12.011, 14.007, 15.999, 18.998, 20.180, 22.990, 24.305, 26.982, 28.085, 30.974, 32.06, 35.45, 39.948, 39.098, 40.078,
  44.956, 47.867, 50.942, 51.996, 54.938, 55.845, 58.933, 58.693, 63.546, 65.38, 69.723, 72.630, 74.922, 78.971, 79.904, 83.798, 85.468, 87.62, 88.906, 91.224,
  92.906, 95.95, 98, 101.07, 102.91, 106.42, 107.87, 112.41, 114.82, 118.71, 121.76, 127.60, 126.90, 131.29, 132.91, 137.33, 138.91, 140.12, 140.91, 144.24,
  145, 150.36, 151.96, 157.25, 158.93, 162.50, 164.93, 167.26, 168.93, 173.05, 174.97, 178.49, 180.95, 183.84, 186.21, 190.23, 192.22, 195.08, 196.97, 200.59,
  204.38, 207.2, 208.98, 209, 210, 222, 223, 226, 227, 232.04, 231.04, 238.03, 237, 244, 243, 247, 247, 251, 252, 257,
  258, 259, 266, 267, 268, 269, 270, 269, 278, 281, 282, 285, 286, 289, 290, 293, 294, 294,
];

const configs = {
  1: '1s¹', 2: '1s²', 3: '[He] 2s¹', 4: '[He] 2s²', 5: '[He] 2s² 2p¹', 6: '[He] 2s² 2p²', 7: '[He] 2s² 2p³', 8: '[He] 2s² 2p⁴', 9: '[He] 2s² 2p⁵', 10: '[He] 2s² 2p⁶',
  11: '[Ne] 3s¹', 12: '[Ne] 3s²', 13: '[Ne] 3s² 3p¹', 14: '[Ne] 3s² 3p²', 15: '[Ne] 3s² 3p³', 16: '[Ne] 3s² 3p⁴', 17: '[Ne] 3s² 3p⁵', 18: '[Ne] 3s² 3p⁶',
  19: '[Ar] 4s¹', 20: '[Ar] 4s²', 26: '[Ar] 3d⁶ 4s²', 28: '[Ar] 3d⁸ 4s²', 29: '[Ar] 3d¹⁰ 4s¹', 36: '[Ar] 3d¹⁰ 4s² 4p⁶',
  54: '[Kr] 4d¹⁰ 5s² 5p⁶', 55: '[Xe] 6s¹', 56: '[Xe] 6s²', 79: '[Xe] 4f¹⁴ 5d¹⁰ 6s¹', 82: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p²', 86: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁶',
  90: '[Rn] 6d² 7s²', 92: '[Rn] 5f³ 6d¹ 7s²', 94: '[Rn] 5f⁶ 7s²',
};

function cat(z) {
  if ([1, 6, 7, 8, 15, 16, 34].indexOf(z) >= 0) return 'nonmetal';
  if ([5, 14, 32, 33, 51, 52].indexOf(z) >= 0) return 'metalloid';
  if ([9, 17, 35, 53, 85, 117].indexOf(z) >= 0) return 'halogen';
  if ([2, 10, 18, 36, 54, 86, 118].indexOf(z) >= 0) return 'noble';
  if ([3, 11, 19, 37, 55, 87].indexOf(z) >= 0) return 'alkali';
  if ([4, 12, 20, 38, 56, 88].indexOf(z) >= 0) return 'alkaline';
  if (z >= 57 && z <= 71) return 'lanthanide';
  if (z >= 89 && z <= 103) return 'actinide';
  if ([13, 31, 49, 50, 81, 82, 83, 84, 113, 114, 115, 116].indexOf(z) >= 0) return 'post';
  return 'transition';
}

function period(z) {
  if (z <= 2) return 1;
  if (z <= 10) return 2;
  if (z <= 18) return 3;
  if (z <= 36) return 4;
  if (z <= 54) return 5;
  if (z <= 86) return 6;
  return 7;
}

function group(z) {
  if ((z >= 57 && z <= 71) || (z >= 89 && z <= 103)) return 0;
  const map = { 1: 1, 2: 18, 3: 1, 4: 2, 5: 13, 6: 14, 7: 15, 8: 16, 9: 17, 10: 18, 11: 1, 12: 2 };
  if (map[z]) return map[z];
  if (z >= 21 && z <= 30) return z - 18;
  if (z >= 39 && z <= 48) return z - 36;
  if (z >= 72 && z <= 80) return z - 68;
  if (z >= 13 && z <= 18) return z - 10;
  if (z >= 31 && z <= 36) return z - 28;
  if (z >= 49 && z <= 54) return z - 46;
  if (z >= 81 && z <= 86) return z - 78;
  if (z >= 104 && z <= 118) return z - 100;
  return 0;
}

const ISO = {
  H: [
    { a: 1, ab: 99.98, hl: 'stable', decay: '—', spin: '1/2+', BE: 0 },
    { a: 2, ab: 0.02, hl: 'stable', decay: '—', spin: '1+', BE: 1.112 },
    { a: 3, ab: 0, hl: '12.32 y', decay: 'β⁻', spin: '1/2+', BE: 2.827 },
  ],
  He: [
    { a: 3, ab: 0.0001, hl: 'stable', decay: '—', spin: '1/2+', BE: 2.573 },
    { a: 4, ab: 99.9999, hl: 'stable', decay: '—', spin: '0+', BE: 7.074 },
  ],
  C: [
    { a: 12, ab: 98.9, hl: 'stable', decay: '—', spin: '0+', BE: 7.680 },
    { a: 13, ab: 1.1, hl: 'stable', decay: '—', spin: '1/2−', BE: 7.470 },
    { a: 14, ab: 0, hl: '5700 y', decay: 'β⁻', spin: '0+', BE: 7.520 },
  ],
  N: [
    { a: 14, ab: 99.6, hl: 'stable', decay: '—', spin: '1+', BE: 7.476 },
    { a: 15, ab: 0.4, hl: 'stable', decay: '—', spin: '1/2−', BE: 7.699 },
  ],
  O: [
    { a: 16, ab: 99.76, hl: 'stable', decay: '—', spin: '0+', BE: 7.976 },
    { a: 18, ab: 0.2, hl: 'stable', decay: '—', spin: '0+', BE: 7.767 },
  ],
  F: [
    { a: 19, ab: 100, hl: 'stable', decay: '—', spin: '1/2+', BE: 7.779 },
    { a: 18, ab: 0, hl: '109.8 min', decay: 'β⁺', spin: '1+', BE: 7.632 },
  ],
  P: [
    { a: 31, ab: 100, hl: 'stable', decay: '—', spin: '1/2+', BE: 8.411 },
    { a: 32, ab: 0, hl: '14.3 d', decay: 'β⁻', spin: '1+', BE: 8.398 },
  ],
  Fe: [
    { a: 56, ab: 91.8, hl: 'stable', decay: '—', spin: '0+', BE: 8.790 },
    { a: 54, ab: 5.8, hl: 'stable', decay: '—', spin: '0+', BE: 8.736 },
    { a: 57, ab: 2.1, hl: 'stable', decay: '—', spin: '1/2−', BE: 8.768 },
  ],
  Co: [
    { a: 59, ab: 100, hl: 'stable', decay: '—', spin: '7/2−', BE: 8.768 },
    { a: 60, ab: 0, hl: '5.27 y', decay: 'β⁻', spin: '5+', BE: 8.747 },
  ],
  Sr: [
    { a: 88, ab: 82.6, hl: 'stable', decay: '—', spin: '0+', BE: 8.733 },
    { a: 90, ab: 0, hl: '28.8 y', decay: 'β⁻', spin: '0+', BE: 8.710 },
  ],
  Tc: [
    { a: 99, ab: 0, hl: '2.11×10⁵ y', decay: 'β⁻', spin: '9/2+', BE: 8.614 },
    { a: 99, aLabel: '99m', ab: 0, hl: '6.01 h', decay: 'IT', spin: '1/2−', BE: 8.614 },
  ],
  Ag: [
    { a: 107, ab: 51.8, hl: 'stable', decay: '—', spin: '1/2−', BE: 8.554 },
    { a: 109, ab: 48.2, hl: 'stable', decay: '—', spin: '1/2−', BE: 8.553 },
  ],
  I: [
    { a: 127, ab: 100, hl: 'stable', decay: '—', spin: '5/2+', BE: 8.446 },
    { a: 131, ab: 0, hl: '8.02 d', decay: 'β⁻', spin: '7/2+', BE: 8.424 },
  ],
  Xe: [
    { a: 132, ab: 26.9, hl: 'stable', decay: '—', spin: '0+', BE: 8.442 },
    { a: 133, ab: 0, hl: '5.25 d', decay: 'β⁻', spin: '3/2+', BE: 8.436 },
  ],
  Cs: [
    { a: 133, ab: 100, hl: 'stable', decay: '—', spin: '7/2+', BE: 8.483 },
    { a: 137, ab: 0, hl: '30.1 y', decay: 'β⁻', spin: '7/2+', BE: 8.389 },
  ],
  Au: [{ a: 197, ab: 100, hl: 'stable', decay: '—', spin: '3/2+', BE: 7.916 }],
  Pb: [
    { a: 206, ab: 24.1, hl: 'stable', decay: '—', spin: '0+', BE: 7.875 },
    { a: 207, ab: 22.1, hl: 'stable', decay: '—', spin: '1/2−', BE: 7.870 },
    { a: 208, ab: 52.4, hl: 'stable', decay: '—', spin: '0+', BE: 7.867 },
  ],
  Bi: [{ a: 209, ab: 100, hl: '1.9×10¹⁹ y', decay: 'α', spin: '9/2−', BE: 7.848 }],
  Po: [{ a: 210, ab: 0, hl: '138.4 d', decay: 'α', spin: '0+', BE: 7.834 }],
  Rn: [{ a: 222, ab: 0, hl: '3.82 d', decay: 'α', spin: '0+', BE: 7.695 }],
  Ra: [{ a: 226, ab: 0, hl: '1600 y', decay: 'α', spin: '0+', BE: 7.662 }],
  Th: [
    { a: 232, ab: 100, hl: '1.40×10¹⁰ y', decay: 'α', spin: '0+', BE: 7.614 },
    { a: 230, ab: 0, hl: '7.54×10⁴ y', decay: 'α', spin: '0+', BE: 7.633 },
  ],
  U: [
    { a: 238, ab: 99.274, hl: '4.468×10⁹ y', decay: 'α', spin: '0+', BE: 7.570 },
    { a: 235, ab: 0.720, hl: '7.04×10⁸ y', decay: 'α', spin: '7/2−', BE: 7.591 },
    { a: 234, ab: 0.005, hl: '2.455×10⁵ y', decay: 'α', spin: '0+', BE: 7.601 },
    { a: 233, ab: 0, hl: '1.592×10⁵ y', decay: 'α', spin: '5/2+', BE: 7.606 },
  ],
  Np: [{ a: 237, ab: 0, hl: '2.14×10⁶ y', decay: 'α', spin: '5/2+', BE: 7.575 }],
  Pu: [
    { a: 239, ab: 0, hl: '2.411×10⁴ y', decay: 'α', spin: '1/2+', BE: 7.560 },
    { a: 238, ab: 0, hl: '87.7 y', decay: 'α', spin: '0+', BE: 7.568 },
    { a: 240, ab: 0, hl: '6561 y', decay: 'α', spin: '0+', BE: 7.556 },
  ],
  Am: [{ a: 241, ab: 0, hl: '432.2 y', decay: 'α', spin: '5/2−', BE: 7.543 }],
  Kr: [
    { a: 84, ab: 57.0, hl: 'stable', decay: '—', spin: '0+', BE: 8.718 },
    { a: 85, ab: 0, hl: '10.8 y', decay: 'β⁻', spin: '9/2+', BE: 8.707 },
  ],
};

const CHAINS = {
  U: [
    {
      id: 'u238',
      title: 'Uranium-238 series (4n+2)',
      steps: [
        { nuclide: '²³⁸U', mode: 'α', hl: '4.468×10⁹ y' },
        { nuclide: '²³⁴Th', mode: 'β⁻', hl: '24.1 d' },
        { nuclide: '²³⁴Pa', mode: 'β⁻', hl: '1.17 min' },
        { nuclide: '²³⁴U', mode: 'α', hl: '2.455×10⁵ y' },
        { nuclide: '²³⁰Th', mode: 'α', hl: '7.54×10⁴ y' },
        { nuclide: '²²⁶Ra', mode: 'α', hl: '1600 y' },
        { nuclide: '²²²Rn', mode: 'α', hl: '3.82 d' },
        { nuclide: '²¹⁸Po', mode: 'α', hl: '3.10 min' },
        { nuclide: '²¹⁴Pb', mode: 'β⁻', hl: '26.8 min' },
        { nuclide: '²¹⁴Bi', mode: 'β⁻', hl: '19.9 min' },
        { nuclide: '²¹⁴Po', mode: 'α', hl: '164 µs' },
        { nuclide: '²¹⁰Pb', mode: 'β⁻', hl: '22.2 y' },
        { nuclide: '²¹⁰Bi', mode: 'β⁻', hl: '5.01 d' },
        { nuclide: '²¹⁰Po', mode: 'α', hl: '138.4 d' },
        { nuclide: '²⁰⁶Pb', mode: 'stable', hl: '—' },
      ],
    },
    {
      id: 'u235',
      title: 'Uranium-235 series (4n+3)',
      steps: [
        { nuclide: '²³⁵U', mode: 'α', hl: '7.04×10⁸ y' },
        { nuclide: '²³¹Th', mode: 'β⁻', hl: '25.5 h' },
        { nuclide: '²³¹Pa', mode: 'α', hl: '3.28×10⁴ y' },
        { nuclide: '²²⁷Ac', mode: 'β⁻', hl: '21.8 y' },
        { nuclide: '²²⁷Th', mode: 'α', hl: '18.7 d' },
        { nuclide: '²²³Ra', mode: 'α', hl: '11.4 d' },
        { nuclide: '²¹⁹Rn', mode: 'α', hl: '3.96 s' },
        { nuclide: '²¹⁵Po', mode: 'α', hl: '1.78 ms' },
        { nuclide: '²¹¹Pb', mode: 'β⁻', hl: '36.1 min' },
        { nuclide: '²¹¹Bi', mode: 'α', hl: '2.14 min' },
        { nuclide: '²⁰⁷Tl', mode: 'β⁻', hl: '4.77 min' },
        { nuclide: '²⁰⁷Pb', mode: 'stable', hl: '—' },
      ],
    },
  ],
  Th: [
    {
      id: 'th232',
      title: 'Thorium-232 series (4n)',
      steps: [
        { nuclide: '²³²Th', mode: 'α', hl: '1.40×10¹⁰ y' },
        { nuclide: '²²⁸Ra', mode: 'β⁻', hl: '5.75 y' },
        { nuclide: '²²⁸Ac', mode: 'β⁻', hl: '6.15 h' },
        { nuclide: '²²⁸Th', mode: 'α', hl: '1.91 y' },
        { nuclide: '²²⁴Ra', mode: 'α', hl: '3.63 d' },
        { nuclide: '²²⁰Rn', mode: 'α', hl: '55.6 s' },
        { nuclide: '²¹⁶Po', mode: 'α', hl: '0.145 s' },
        { nuclide: '²¹²Pb', mode: 'β⁻', hl: '10.6 h' },
        { nuclide: '²¹²Bi', mode: 'β⁻ / α', hl: '60.6 min' },
        { nuclide: '²⁰⁸Pb', mode: 'stable', hl: '—' },
      ],
    },
  ],
  Ra: [
    {
      id: 'ra226',
      title: 'Radium-226 path (part of U-238 series)',
      steps: [
        { nuclide: '²²⁶Ra', mode: 'α', hl: '1600 y' },
        { nuclide: '²²²Rn', mode: 'α', hl: '3.82 d' },
        { nuclide: '²¹⁸Po', mode: 'α', hl: '3.10 min' },
        { nuclide: '²¹⁴Pb', mode: 'β⁻', hl: '26.8 min' },
        { nuclide: '²¹⁴Bi', mode: 'β⁻', hl: '19.9 min' },
        { nuclide: '²¹⁴Po', mode: 'α', hl: '164 µs' },
        { nuclide: '²¹⁰Pb', mode: 'β⁻', hl: '22.2 y' },
        { nuclide: '²¹⁰Bi', mode: 'β⁻', hl: '5.01 d' },
        { nuclide: '²¹⁰Po', mode: 'α', hl: '138.4 d' },
        { nuclide: '²⁰⁶Pb', mode: 'stable', hl: '—' },
      ],
    },
  ],
  Pu: [
    {
      id: 'pu239',
      title: 'Plutonium-239 → uranium-235 series',
      steps: [
        { nuclide: '²³⁹Pu', mode: 'α', hl: '2.411×10⁴ y' },
        { nuclide: '²³⁵U', mode: 'α', hl: '7.04×10⁸ y' },
        { nuclide: '…', mode: '→', hl: 'joins U-235 series' },
      ],
    },
  ],
};

function defaultIso(z, m) {
  const A = Math.round(m);
  const stable = z < 84;
  return [{
    a: A,
    abundance: stable ? 100 : null,
    halfLife: stable ? 'stable' : (z <= 92 ? 'long-lived / rare' : 'synthetic'),
    decay: stable ? '—' : (z >= 84 ? 'α / β' : 'α'),
    spin: '—',
    bindingMeV: null,
  }];
}

const elements = [];
for (let z = 1; z <= 118; z++) {
  const s = sym[z];
  let isotopes = ISO[s];
  if (!isotopes) isotopes = defaultIso(z, mass[z]);
  else {
    isotopes = isotopes.map(function (iso) {
      const o = {
        a: iso.a,
        abundance: iso.ab != null ? iso.ab : null,
        halfLife: iso.hl,
        decay: iso.decay,
        spin: iso.spin,
        bindingMeV: iso.BE != null ? iso.BE : null,
      };
      if (iso.aLabel) o.aLabel = iso.aLabel;
      return o;
    });
  }
  elements.push({
    z: z,
    symbol: s,
    name: names[z],
    mass: mass[z],
    category: cat(z),
    period: period(z),
    group: group(z),
    config: configs[z] || ('[noble core] … (Z = ' + z + ')'),
    isotopes: isotopes,
    decayChains: CHAINS[s] || null,
  });
}

const categories = {
  alkali: { label: 'Alkali metal', color: '#f87171' },
  alkaline: { label: 'Alkaline earth', color: '#fb923c' },
  transition: { label: 'Transition metal', color: '#fbbf24' },
  post: { label: 'Post-transition', color: '#a3e635' },
  metalloid: { label: 'Metalloid', color: '#34d399' },
  nonmetal: { label: 'Reactive nonmetal', color: '#22d3ee' },
  halogen: { label: 'Halogen', color: '#38bdf8' },
  noble: { label: 'Noble gas', color: '#818cf8' },
  lanthanide: { label: 'Lanthanide', color: '#e879f9' },
  actinide: { label: 'Actinide', color: '#f472b6' },
};

const file =
  '/** Local offline periodic table + nuclear teaching data (no network). */\n' +
  'export const CATEGORIES = ' + JSON.stringify(categories, null, 2) + ';\n\n' +
  'export const ELEMENTS = ' + JSON.stringify(elements, null, 2) + ';\n\n' +
  'export function getElement(z) {\n' +
  '  for (let i = 0; i < ELEMENTS.length; i++) if (ELEMENTS[i].z === z) return ELEMENTS[i];\n' +
  '  return null;\n' +
  '}\n\n' +
  'export function getElementBySymbol(sym) {\n' +
  '  const s = String(sym || "");\n' +
  '  for (let i = 0; i < ELEMENTS.length; i++) if (ELEMENTS[i].symbol === s) return ELEMENTS[i];\n' +
  '  return null;\n' +
  '}\n';

fs.writeFileSync(path.join(dir, 'elementsData.js'), file, 'utf8');
console.log('Wrote', elements.length, 'elements ->', path.join(dir, 'elementsData.js'));
