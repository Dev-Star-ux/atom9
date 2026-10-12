/** 2×2 matrix eigenvalues and unit eigenvectors. */
export function eigen2x2(a, b, c, d) {
  const tr = a + d;
  const det = a * d - b * c;
  const disc = tr * tr - 4 * det;
  if (disc < 0) {
    const re = tr * 0.5;
    const im = Math.sqrt(-disc) * 0.5;
    return {
      real: false,
      lambda1: { re, im },
      lambda2: { re, im: -im },
      v1: [{ re: 1, im: 0 }, { re: 0, im: 0 }],
      v2: [{ re: 1, im: 0 }, { re: 0, im: 0 }],
      trace: tr,
      det,
    };
  }
  const s = Math.sqrt(disc);
  const l1 = (tr + s) * 0.5;
  const l2 = (tr - s) * 0.5;
  return {
    real: true,
    lambda1: l1,
    lambda2: l2,
    v1: eigenvector(a, b, c, d, l1),
    v2: eigenvector(a, b, c, d, l2),
    trace: tr,
    det,
  };
}

function eigenvector(a, b, c, d, lambda) {
  let vx = b;
  let vy = lambda - a;
  if (Math.abs(vx) + Math.abs(vy) < 1e-9) {
    vx = lambda - d;
    vy = c;
  }
  if (Math.abs(vx) + Math.abs(vy) < 1e-9) {
    vx = 1;
    vy = 0;
  }
  const n = Math.hypot(vx, vy) || 1;
  return [vx / n, vy / n];
}

/** Fixed-end string mode sin(n π x / L), x ∈ [0, L]. */
export function stringMode(n, x, L) {
  if (L <= 0 || n < 1) return 0;
  return Math.sin(n * Math.PI * x / L);
}

export function stringModeFreq(n, L, c = 1) {
  if (L <= 0) return 0;
  return n * c / (2 * L);
}

export function sampleString(n, L, nPts) {
  const xs = [];
  const ys = [];
  for (let i = 0; i < nPts; i++) {
    const x = L * i / (nPts - 1);
    xs.push(x);
    ys.push(stringMode(n, x, L));
  }
  return { xs, ys };
}
