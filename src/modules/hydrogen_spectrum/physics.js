// Hydrogen spectrum — Balmer, Lyman, Paschen series (Ch.2 §3).

export const R_H = 1.0973731568160e7;
export const E_RYDBERG = 13.605693;

export const SERIES = [
  ['balmer', 2],
  ['lyman', 1],
  ['paschen', 3],
];

export function energyLevelEV(n) {
  return -E_RYDBERG / (n * n);
}

export function hydrogenWavelengthNm(n1, n2, R = R_H) {
  if (n2 <= n1 || n1 < 1) return 0;
  const inv = R * (1 / (n1 * n1) - 1 / (n2 * n2));
  return inv > 0 ? 1e9 / inv : 0;
}

export function transitionEnergyEV(n1, n2) {
  return energyLevelEV(n1) - energyLevelEV(n2);
}

export function hydrogenSeries(n1, nMax = 7, R = R_H) {
  const greek = ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η'];
  const seriesLetter = { 1: 'L', 2: 'B', 3: 'P' };
  const out = [];
  for (let i = 0; i < nMax - n1; i++) {
    const n2 = n1 + 1 + i;
    const lam = hydrogenWavelengthNm(n1, n2, R);
    if (lam <= 0) continue;
    const rel = 1 / ((n2 - n1) ** 1.5);
    const letter = seriesLetter[n1] || '';
    out.push([lam, rel, letter ? `${letter}${greek[i]}` : `${n1}→${n2}`]);
  }
  const peak = Math.max(...out.map(([, r]) => r), 1);
  return out.map(([lam, r, lbl]) => [lam, r / peak, lbl]);
}

export function wavelengthToCss(nm) {
  if (nm < 380 || nm > 780) return '#aaaaaa';
  let r = 0, g = 0, b = 0;
  if (nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else { r = 1; }
  const ch = (v) => Math.round(Math.max(0, Math.min(1, v * 0.85)) ** 0.8 * 255);
  return `rgb(${ch(r)},${ch(g)},${ch(b)})`;
}
