/** Real spherical harmonics |Y_l^m(θ, φ)|² on a θ–φ grid (teaching normalization). */

export const L_MAX = 4;

function fact(n) {
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
}

/** Associated Legendre P_l^m(x) for m ≥ 0, |m| ≤ l. */
export function assocLegendre(l, m, x) {
  m = Math.abs(m);
  if (m > l) return 0;
  if (m === l) {
    let df = 1;
    for (let k = 0; k < 2 * m - 1; k += 2) df *= k + 1;
    return Math.pow(-1, m) * df * Math.pow(1 - x * x, m / 2);
  }
  const pm = assocLegendre(m, m, x);
  if (l === m + 1) return x * (2 * m + 1) * pm;
  return ((2 * l - 1) * x * assocLegendre(l - 1, m, x) - (l + m - 1) * assocLegendre(l - 2, m, x)) / (l - m);
}

/** |Y_l^m|² — same for ±m. */
export function sphericalHarmonicProb(l, m, theta, phi) {
  const ma = Math.abs(m);
  const plm = assocLegendre(l, ma, Math.cos(theta));
  const N2 = ((2 * l + 1) / (4 * Math.PI)) * (fact(l - ma) / fact(l + ma));
  return N2 * plm * plm;
}

export function clampM(l, m) {
  return Math.max(-l, Math.min(l, Math.round(m)));
}

export function buildProbGrid(l, m, cols, rows) {
  cols = cols || 72;
  rows = rows || 36;
  m = clampM(l, m);
  const grid = new Float32Array(cols * rows);
  let vmax = 0;
  for (let j = 0; j < rows; j++) {
    const theta = (Math.PI * (j + 0.5)) / rows;
    for (let i = 0; i < cols; i++) {
      const phi = (2 * Math.PI * i) / cols;
      const v = sphericalHarmonicProb(l, m, theta, phi);
      grid[j * cols + i] = v;
      if (v > vmax) vmax = v;
    }
  }
  return { grid, cols, rows, vmax, l, m };
}
