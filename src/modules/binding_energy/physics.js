// Binding energy per nucleon B/A (MeV) — teaching curve + key nuclides.
export const FE_PEAK_A = 56;
export const FE_BE_A = 8.79;

/** [A, B/A MeV, symbol, category: light|peak|heavy] */
export const NUCLIDES = [
  [1, 0.0, '¹H', 'light'],
  [2, 1.11, '²H', 'light'],
  [3, 2.57, '³H', 'light'],
  [4, 7.07, '⁴He', 'light'],
  [12, 7.68, '¹²C', 'light'],
  [16, 7.98, '¹⁶O', 'light'],
  [56, 8.79, '⁵⁶Fe', 'peak'],
  [92, 7.59, '²³⁵U', 'heavy'],
  [235, 7.59, '²³⁵U', 'heavy'],
  [238, 7.57, '²³⁸U', 'heavy'],
];

export const FISSION_PARENTS = [
  { A: 235, sym: '²³⁵U' },
  { A: 238, sym: '²³⁸U' },
];

export const FUSION_PAIR = { a1: 2, a2: 3, sym1: '²H', sym2: '³H', product: 5, symP: '⁴He+n' };

/** Semi-empirical mass formula → B/A (teaching smooth curve). */
export function bePerNucleon(A) {
  const a = Math.max(2, A);
  const vol = 15.8 * a;
  const surf = -18.0 * Math.pow(a, 2 / 3);
  const coul = -0.72 * a * (a - 1) / Math.pow(a, 1 / 3);
  const asym = -23.0 * Math.pow((a - 2 * Math.round(a / 2.2)) / a, 2);
  const pair = a % 2 === 0 ? 12 / Math.sqrt(a) : 0;
  const B = vol + surf + coul + asym + pair;
  return Math.max(0.5, B / a);
}

export function totalBinding(A) {
  return bePerNucleon(A) * A;
}

export function curvePoints(nPts, aMin, aMax) {
  const xs = [];
  const ys = [];
  for (let i = 0; i < nPts; i++) {
    const A = aMin + (i / (nPts - 1)) * (aMax - aMin);
    xs.push(A);
    ys.push(bePerNucleon(A));
  }
  return { xs, ys };
}

export function fissionFragments(A) {
  const a1 = Math.round(A * 0.42);
  return { a1, a2: A - a1 };
}

export function fissionReleaseMeV(A) {
  const parent = totalBinding(A);
  const { a1, a2 } = fissionFragments(A);
  return Math.max(0, totalBinding(a1) + totalBinding(a2) - parent);
}

export function fusionReleaseMeV(a1, a2) {
  const A = a1 + a2;
  return Math.max(0, totalBinding(A) - totalBinding(a1) - totalBinding(a2));
}