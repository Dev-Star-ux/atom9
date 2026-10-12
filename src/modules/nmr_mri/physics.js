// NMR / MRI — Bloch equation teaching model.
// Reference: https://www.drcmr.dk/BlochSimulator/ , https://www.mysimulator.uk/mri-physics/

export const GAMMA = 42.58; // MHz/T (proton gyromagnetic ratio, teaching units)

export const TISSUES = {
  water: { name: 'Water', T1: 1.0, T2: 0.5, M0: 1.0 },
  fat: { name: 'Fat', T1: 0.25, T2: 0.08, M0: 0.85 },
  muscle: { name: 'Muscle', T1: 0.9, T2: 0.04, M0: 0.9 },
  grey: { name: 'Grey matter', T1: 1.2, T2: 0.1, M0: 0.95 },
  white: { name: 'White matter', T1: 0.8, T2: 0.08, M0: 0.88 },
  csf: { name: 'CSF', T1: 2.0, T2: 0.7, M0: 1.0 },
};

export function larmorMHz(B0T) {
  return GAMMA * Math.max(0.01, B0T || 1.5);
}

export function cloneM(M) {
  return { x: M.x, y: M.y, z: M.z };
}

export function magTransverse(M) {
  return Math.sqrt(M.x * M.x + M.y * M.y);
}

/** FID signal ∝ transverse magnetisation (detected component). */
export function fidSignal(M) {
  return magTransverse(M);
}

export function equilibrium(M0) {
  return { x: 0, y: 0, z: M0 == null ? 1 : M0 };
}

/** Rotate M about x-axis by angle (radians) — RF pulse along x in rotating frame. */
export function rotateX(M, angleRad) {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return {
    x: M.x,
    y: M.y * c - M.z * s,
    z: M.y * s + M.z * c,
  };
}

/** Apply 90° or 180° pulse (degrees). */
export function applyPulse(M, pulseDeg) {
  return rotateX(M, (pulseDeg * Math.PI) / 180);
}

/**
 * One Bloch step (lab frame, simplified):
 * precession about z at ω = 2π·f, T1/T2 relaxation.
 */
export function blochStep(M, dt, B0T, T1, T2, M0, omegaRad) {
  const w = omegaRad != null ? omegaRad : 2 * Math.PI * larmorMHz(B0T) * 1e6;
  const c = Math.cos(w * dt);
  const s = Math.sin(w * dt);
  let x = M.x * c - M.y * s;
  let y = M.x * s + M.y * c;
  let z = M.z;
  const t2 = Math.max(0.01, T2);
  const t1 = Math.max(0.01, T1);
  const d2 = Math.exp(-dt / t2);
  const d1 = Math.exp(-dt / t1);
  x *= d2;
  y *= d2;
  z = M0 + (z - M0) * d1;
  return { x: x, y: y, z: z };
}

export function tissuePreset(key) {
  return TISSUES[key] || TISSUES.water;
}
