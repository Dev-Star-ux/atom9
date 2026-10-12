/** Sturm–Liouville eigenfunctions: Legendre P_l(x) and Bessel J_n(x). */

export const ORDER_MAX = 4;

export function legendreP(l, x) {
  l = Math.max(0, Math.round(l));
  if (l === 0) return 1;
  if (l === 1) return x;
  let p0 = 1;
  let p1 = x;
  for (let k = 1; k < l; k++) {
    const p2 = ((2 * k + 1) * x * p1 - k * p0) / (k + 1);
    p0 = p1;
    p1 = p2;
  }
  return p1;
}

/** Bessel J_n via ascending series (teaching accuracy). */
export function besselJ(n, x) {
  n = Math.max(0, Math.round(n));
  if (Math.abs(x) < 1e-12) return n === 0 ? 1 : 0;
  let sum = 0;
  const half = x / 2;
  for (let k = 0; k < 40; k++) {
    let denom = 1;
    for (let j = 1; j <= k; j++) denom *= j;
    let num = 1;
    for (let j = 1; j <= n + k; j++) num *= j;
    sum += Math.pow(-1, k) * Math.pow(half, n + 2 * k) / (denom * num);
  }
  return sum;
}

export function sampleLegendre(l, n, xMin, xMax) {
  n = n || 120;
  xMin = xMin != null ? xMin : -1;
  xMax = xMax != null ? xMax : 1;
  const xs = [];
  const ys = [];
  for (let i = 0; i <= n; i++) {
    const x = xMin + ((xMax - xMin) * i) / n;
    xs.push(x);
    ys.push(legendreP(l, x));
  }
  return { xs, ys };
}

export function sampleBessel(n, count, xMax) {
  count = count || 120;
  xMax = xMax != null ? xMax : 10;
  const xs = [];
  const ys = [];
  for (let i = 0; i <= count; i++) {
    const x = (xMax * i) / count;
    xs.push(x);
    ys.push(besselJ(n, x));
  }
  return { xs, ys };
}

/** ∫_{-1}^{1} P_l P_k dx — exact orthogonality on [-1, 1]. */
export function legendreInnerProduct(l, k) {
  l = Math.round(l);
  k = Math.round(k);
  if (l !== k) return 0;
  return 2 / (2 * l + 1);
}

/** Numerical ∫_0^R J_n J_k x dx on [0, R] (teaching estimate). */
export function besselInnerProduct(n, k, R, steps) {
  R = R != null ? R : 10;
  steps = steps || 400;
  let s = 0;
  for (let i = 0; i < steps; i++) {
    const x = (R * (i + 0.5)) / steps;
    s += besselJ(n, x) * besselJ(k, x) * x * (R / steps);
  }
  return s;
}

export function legendreWeight(x) {
  return 1;
}

export function besselWeight(x) {
  return x;
}

export function productOnGrid(fnA, fnB, weight, xMin, xMax, n) {
  n = n || 120;
  const xs = [];
  const ys = [];
  for (let i = 0; i <= n; i++) {
    const x = xMin + ((xMax - xMin) * i) / n;
    xs.push(x);
    ys.push(fnA(x) * fnB(x) * weight(x));
  }
  return { xs, ys };
}

export function integrateTrapezoid(xs, ys) {
  let s = 0;
  for (let i = 0; i < xs.length - 1; i++) {
    s += 0.5 * (ys[i] + ys[i + 1]) * (xs[i + 1] - xs[i]);
  }
  return s;
}
