// Hydrogen wave-function math, shared by the 3D renderer and the AI.
// ψ_nlm(r,θ,φ) = R_nl(r) · Y_lm(θ,φ), real spherical harmonics, distances in
// Bohr radii (a0 = 1). Pure JS so it also runs under Node for tests.
// Verified: ∫|ψ|²dV ≈ 1, R_2p(0)=0, R_1s(0)=2.

const FACT = [1];
for (let i = 1; i <= 30; i++) FACT[i] = FACT[i - 1] * i;
const fact = (n) => FACT[n];

// Associated Legendre P_l^m(x), m>=0, Condon–Shortley phase.
export function assocLegendre(l, m, x) {
  let pmm = 1;
  if (m > 0) {
    const s = Math.sqrt(Math.max(0, (1 - x) * (1 + x)));
    let f = 1;
    for (let i = 1; i <= m; i++) { pmm *= -f * s; f += 2; }
  }
  if (l === m) return pmm;
  let pmmp1 = x * (2 * m + 1) * pmm;
  if (l === m + 1) return pmmp1;
  let pll = 0;
  for (let ll = m + 2; ll <= l; ll++) {
    pll = ((2 * ll - 1) * x * pmmp1 - (ll + m - 1) * pmm) / (ll - m);
    pmm = pmmp1; pmmp1 = pll;
  }
  return pll;
}

// Real spherical harmonic (sign carries the orbital's lobes/phase).
export function realSH(l, m, theta, phi) {
  const x = Math.cos(theta), am = Math.abs(m);
  const norm = Math.sqrt((2 * l + 1) / (4 * Math.PI) * fact(l - am) / fact(l + am));
  const P = assocLegendre(l, am, x);
  if (m > 0) return Math.SQRT2 * norm * P * Math.cos(am * phi);
  if (m < 0) return Math.SQRT2 * norm * P * Math.sin(am * phi);
  return norm * P;
}

// Generalized Laguerre L_k^alpha(x).
export function assocLaguerre(k, alpha, x) {
  if (k === 0) return 1;
  let Lm1 = 1, L = 1 + alpha - x;
  for (let i = 1; i < k; i++) {
    const Lp1 = ((2 * i + 1 + alpha - x) * L - (i + alpha) * Lm1) / (i + 1);
    Lm1 = L; L = Lp1;
  }
  return L;
}

// Radial wave function R_nl(r), r in Bohr radii.
export function radial(n, l, r) {
  const rho = 2 * r / n;
  const norm = Math.sqrt(Math.pow(2 / n, 3) * fact(n - l - 1) / (2 * n * fact(n + l)));
  return norm * Math.exp(-rho / 2) * Math.pow(rho, l) * assocLaguerre(n - l - 1, 2 * l + 1, rho);
}

export function psi(n, l, m, r, theta, phi) {
  return radial(n, l, r) * realSH(l, m, theta, phi);
}

export function rMaxFor(n) { return 2.2 * n * n + 6; }

// Radial probability density P(r) = r² R_nl(r)²  (what the AI will learn).
export function radialProb(n, l, r) {
  const R = radial(n, l, r);
  return r * r * R * R;
}

// Sample a point cloud [{x,y,z,sign}] with probability ∝ |ψ|² (rejection).
export function sampleCloud(n, l, m, count) {
  const rMax = rMaxFor(n);
  let maxD = 0;
  for (let i = 0; i < 3000; i++) {
    const x = (Math.random() * 2 - 1) * rMax, y = (Math.random() * 2 - 1) * rMax, z = (Math.random() * 2 - 1) * rMax;
    const r = Math.hypot(x, y, z); if (r > rMax) continue;
    const d = psi(n, l, m, r, Math.acos(z / (r || 1e-9)), Math.atan2(y, x));
    if (d * d > maxD) maxD = d * d;
  }
  maxD = maxD * 0.9 || 1e-12;

  const xs = new Float32Array(count), ys = new Float32Array(count), zs = new Float32Array(count);
  const signs = new Int8Array(count);
  let got = 0, tries = 0, cap = count * 250;
  while (got < count && tries < cap) {
    tries++;
    const x = (Math.random() * 2 - 1) * rMax, y = (Math.random() * 2 - 1) * rMax, z = (Math.random() * 2 - 1) * rMax;
    const r = Math.hypot(x, y, z); if (r > rMax) continue;
    const wf = psi(n, l, m, r, Math.acos(z / (r || 1e-9)), Math.atan2(y, x));
    if (Math.random() < (wf * wf) / maxD) {
      xs[got] = x; ys[got] = y; zs[got] = z; signs[got] = wf >= 0 ? 1 : -1; got++;
    }
  }
  return { xs, ys, zs, signs, count: got, rMax };
}

export const SUBSHELL = ['s', 'p', 'd', 'f', 'g'];
export const SHELL = ['K', 'L', 'M', 'N', 'O'];
export function orbitalLabel(n, l) { return `${n}${SUBSHELL[l] || '?'}`; }

// Energy of level n (eV): E_n = -13.6057 / n².
export function energyEV(n) { return -13.605693 / (n * n); }

// Valid (l, m) helpers for the UI.
export function clampL(n, l) { return Math.max(0, Math.min(l, n - 1)); }
export function clampM(l, m) { return Math.max(-l, Math.min(l, m)); }
