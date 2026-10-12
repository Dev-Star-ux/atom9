// Quantum computer teaching physics — qubits, gates, measurement, noise.
// Inspired by https://qentangle.tech/quantum-computers/ (richer step-by-step pedagogy).

export const GATES = ['I', 'X', 'H', 'Z', 'S', 'T', 'CNOT'];
// Match QEntangle learning modes (measurement always visible on the canvas)
export const LEARN_MODES = ['compare', 'qubit', 'gates', 'hardware'];

export function c(re, im) {
  return { re: re || 0, im: im || 0 };
}

export function cadd(a, b) {
  return c(a.re + b.re, a.im + b.im);
}

export function cmul(a, b) {
  return c(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
}

export function cconj(a) {
  return c(a.re, -a.im);
}

export function cabs2(a) {
  return a.re * a.re + a.im * a.im;
}

export function cnorm(a) {
  return Math.sqrt(cabs2(a));
}

export function cloneState(s) {
  return [c(s[0].re, s[0].im), c(s[1].re, s[1].im)];
}

export function ket0() {
  return [c(1, 0), c(0, 0)];
}

export function ket1() {
  return [c(0, 0), c(1, 0)];
}

export function ketPlus() {
  const s = Math.SQRT1_2;
  return [c(s, 0), c(s, 0)];
}

export function normalize(s) {
  const n = Math.sqrt(cabs2(s[0]) + cabs2(s[1]));
  if (n < 1e-12) return ket0();
  return [c(s[0].re / n, s[0].im / n), c(s[1].re / n, s[1].im / n)];
}

// 2×2 matrices as [[a,b],[c,d]] with complex entries.
const INV_SQRT2 = Math.SQRT1_2;

export const GATE_MAT = {
  I: [[c(1, 0), c(0, 0)], [c(0, 0), c(1, 0)]],
  X: [[c(0, 0), c(1, 0)], [c(1, 0), c(0, 0)]],
  H: [
    [c(INV_SQRT2, 0), c(INV_SQRT2, 0)],
    [c(INV_SQRT2, 0), c(-INV_SQRT2, 0)],
  ],
  Z: [[c(1, 0), c(0, 0)], [c(0, 0), c(-1, 0)]],
  S: [[c(1, 0), c(0, 0)], [c(0, 0), c(0, 1)]],
  T: [[c(1, 0), c(0, 0)], [c(0, 0), c(Math.cos(Math.PI / 8), Math.sin(Math.PI / 8))]],
};

export function applyMat(mat, state) {
  const a = cadd(cmul(mat[0][0], state[0]), cmul(mat[0][1], state[1]));
  const b = cadd(cmul(mat[1][0], state[0]), cmul(mat[1][1], state[1]));
  return normalize([a, b]);
}

export function applyGate(state, gate) {
  if (gate === 'CNOT') {
    // Entangle with ancilla |0⟩ then show reduced single-qubit view:
    // control = our qubit; after CNOT on |ψ⟩|0⟩ → α|00⟩+β|11⟩, reduced ρ is diagonal.
    // For teaching Bloch we keep amplitudes but note "entangled" — apply X if measuring
    // as classical flip demo when in |1⟩. Pedagogical: flip |1⟩ component label.
    return applyMat(GATE_MAT.X, state); // visual "target flips with control" on single view
  }
  const mat = GATE_MAT[gate] || GATE_MAT.I;
  return applyMat(mat, state);
}

// Proper two-qubit Bell from |00⟩ via H⊗I then CNOT — return probs for |00⟩,|01⟩,|10⟩,|11⟩.
export function bellProbs() {
  return { '00': 0.5, '01': 0, '10': 0, '11': 0.5 };
}

export function ry(theta) {
  const th = theta / 2;
  const cos = Math.cos(th);
  const sin = Math.sin(th);
  return [[c(cos, 0), c(-sin, 0)], [c(sin, 0), c(cos, 0)]];
}

export function applyRy(state, theta) {
  return applyMat(ry(theta), state);
}

export function bloch(state) {
  const a = state[0];
  const b = state[1];
  const ac = cconj(a);
  const ab = cmul(ac, b);
  return {
    x: 2 * ab.re,
    y: 2 * ab.im,
    z: cabs2(a) - cabs2(b),
  };
}

/** Build |ψ⟩ from Bloch polar angle θ and azimuthal phase φ (degrees). */
export function fromBlochAngles(thetaDeg, phiDeg) {
  const th = (thetaDeg || 0) * Math.PI / 180;
  const ph = (phiDeg || 0) * Math.PI / 180;
  const c0 = Math.cos(th / 2);
  const s0 = Math.sin(th / 2);
  return normalize([c(c0, 0), c(s0 * Math.cos(ph), s0 * Math.sin(ph))]);
}

/** Read θ, φ (degrees) from a state for slider sync. */
export function blochAngles(state) {
  const b = bloch(state);
  const r = Math.sqrt(b.x * b.x + b.y * b.y + b.z * b.z) || 1e-9;
  const theta = Math.acos(Math.max(-1, Math.min(1, b.z / r))) * 180 / Math.PI;
  const phi = Math.atan2(b.y, b.x) * 180 / Math.PI;
  return { theta: theta, phi: phi < 0 ? phi + 360 : phi };
}

export function probs(state) {
  return { p0: cabs2(state[0]), p1: cabs2(state[1]) };
}

export function sampleBit(state) {
  return Math.random() < cabs2(state[0]) ? 0 : 1;
}

// Mix toward I/2 with strength noise ∈ [0,1] (simple depolarizing teaching model).
export function applyNoise(state, noise) {
  const n = Math.max(0, Math.min(1, noise || 0));
  if (n < 1e-6) return cloneState(state);
  // Shrink Bloch vector by (1-n)
  const bl = bloch(state);
  const s = 1 - n;
  const x = bl.x * s;
  const y = bl.y * s;
  const z = bl.z * s;
  // Reconstruct pure-ish state from Bloch (approx when |r|<1)
  const r = Math.sqrt(x * x + y * y + z * z);
  if (r < 1e-8) {
    return normalize([c(Math.SQRT1_2, 0), c(Math.SQRT1_2, 0)]);
  }
  const theta = Math.acos(Math.max(-1, Math.min(1, z / Math.max(r, 1e-9))));
  const phi = Math.atan2(y, x);
  const c0 = Math.cos(theta / 2);
  const s0 = Math.sin(theta / 2);
  return normalize([c(c0, 0), c(s0 * Math.cos(phi), s0 * Math.sin(phi))]);
}

export function stateLabel(state) {
  const p = probs(state);
  if (p.p0 > 0.98) return '|0⟩';
  if (p.p1 > 0.98) return '|1⟩';
  if (Math.abs(p.p0 - 0.5) < 0.04 && Math.abs(bloch(state).y) < 0.15 && bloch(state).x > 0.7) return '|+⟩';
  if (Math.abs(p.p0 - 0.5) < 0.04 && Math.abs(bloch(state).y) < 0.15 && bloch(state).x < -0.7) return '|−⟩';
  return 'α|0⟩+β|1⟩';
}

export function formatAmp(z) {
  const re = z.re.toFixed(2);
  const im = z.im.toFixed(2);
  if (Math.abs(z.im) < 0.005) return re;
  if (Math.abs(z.re) < 0.005) return im + 'i';
  const sign = z.im >= 0 ? '+' : '';
  return re + sign + im + 'i';
}

// Classical bit register helpers (compare mode).
export function classicalNot(bits, i) {
  const out = bits.slice();
  out[i] = out[i] ? 0 : 1;
  return out;
}

export function GATE_HELP() {
  return {
    I: 'Identity — leave the qubit unchanged.',
    X: 'Pauli X — quantum NOT; swaps |0⟩ ↔ |1⟩.',
    H: 'Hadamard — creates equal superposition from a basis state.',
    Z: 'Pauli Z — phase flip on |1⟩; rotates Bloch about z.',
    S: 'Phase S — √Z; adds +π/2 phase to |1⟩.',
    T: 'T gate — π/4 phase; used in fault-tolerant circuits.',
    CNOT: 'CNOT — flips target when control is |1⟩; builds entanglement.',
  };
}
