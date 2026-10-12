import { M_E, E_CHARGE, HBAR } from '../common/wavePhysics.js';

export const N_GRID = 80;
export const N_LEVELS = 4;

/** Build −ℏ²/2m d²/dx² on interior points (Dirichlet at well walls). */
export function buildHamiltonian(L, nPts) {
  const dx = L / (nPts + 1);
  const scale = (HBAR * HBAR) / (2 * M_E * dx * dx * E_CHARGE);
  const n = nPts;
  const H = [];
  for (let i = 0; i < n; i++) {
    H[i] = new Float64Array(n);
    H[i][i] = 2 * scale;
    if (i > 0) H[i][i - 1] = -scale;
    if (i < n - 1) H[i][i + 1] = -scale;
  }
  return { H, dx, L, nPts: n };
}

/** Jacobi diagonalisation for small symmetric matrices. */
export function symmetricEigen(H, maxIter) {
  const n = H.length;
  const A = H.map(function (row) { return row.slice(); });
  const V = [];
  for (let i = 0; i < n; i++) {
    V[i] = new Float64Array(n);
    V[i][i] = 1;
  }
  const maxIt = maxIter || 80 * n;

  for (let iter = 0; iter < maxIt; iter++) {
    let p = 0;
    let q = 1;
    let max = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const v = Math.abs(A[i][j]);
        if (v > max) {
          max = v;
          p = i;
          q = j;
        }
      }
    }
    if (max < 1e-12) break;

    const app = A[p][p];
    const aqq = A[q][q];
    const apq = A[p][q];
    const phi = 0.5 * Math.atan2(2 * apq, aqq - app);
    const c = Math.cos(phi);
    const s = Math.sin(phi);

    for (let k = 0; k < n; k++) {
      const akp = A[k][p];
      const akq = A[k][q];
      A[k][p] = c * akp - s * akq;
      A[p][k] = A[k][p];
      A[k][q] = s * akp + c * akq;
      A[q][k] = A[k][q];
    }
    A[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
    A[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
    A[p][q] = A[q][p] = 0;

    for (let k = 0; k < n; k++) {
      const vkp = V[k][p];
      const vkq = V[k][q];
      V[k][p] = c * vkp - s * vkq;
      V[k][q] = s * vkp + c * vkq;
    }
  }

  const evals = [];
  for (let i = 0; i < n; i++) evals.push({ E: A[i][i], idx: i });
  evals.sort(function (a, b) { return a.E - b.E; });

  const levels = [];
  for (let k = 0; k < Math.min(N_LEVELS, evals.length); k++) {
    const idx = evals[k].idx;
    const vec = new Float64Array(n);
    for (let i = 0; i < n; i++) vec[i] = V[i][idx];
    normalize(vec);
    levels.push({ n: k + 1, E: evals[k].E, psi: vec });
  }
  return levels;
}

function normalize(v) {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i] * v[i];
  s = Math.sqrt(s) || 1;
  for (let i = 0; i < v.length; i++) v[i] /= s;
}

export function analyticEnergyEV(n, L) {
  return (n * n * Math.PI * Math.PI * HBAR * HBAR) / (2 * M_E * L * L * E_CHARGE);
}

export function solveWell(L, nPts) {
  const built = buildHamiltonian(L, nPts || N_GRID);
  const levels = symmetricEigen(built.H);
  return {
    levels,
    dx: built.dx,
    L: built.L,
    nPts: built.nPts,
    xs: gridXs(built.L, built.nPts),
  };
}

function gridXs(L, nPts) {
  const xs = [];
  const dx = L / (nPts + 1);
  for (let i = 0; i < nPts; i++) xs.push((i + 1) * dx);
  return xs;
}

export function levelCurves(solution, levelIndex) {
  const lvl = solution.levels[levelIndex];
  if (!lvl) return { xs: [], psi: [], prob: [] };
  const xs = solution.xs.map(function (x) { return x * 1e9; });
  const psi = [];
  const prob = [];
  for (let i = 0; i < lvl.psi.length; i++) {
    psi.push(lvl.psi[i]);
    prob.push(lvl.psi[i] * lvl.psi[i]);
  }
  return { xs, psi, prob, E: lvl.E, n: lvl.n };
}
