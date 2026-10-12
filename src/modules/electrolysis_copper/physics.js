/** Electrolysis of copper sulfate — copper electrorefining/electroplating (offline). */

export const F_CONST = 96485; // Faraday constant, C/mol
export const Z_CU = 2;        // electrons per Cu2+ ion
export const M_CU = 63.55;    // molar mass of copper, g/mol

/** Moles of copper deposited: n = I t / (z F). */
export function molesDeposited(I_A, t_s, z, F) {
  const zz = z || Z_CU;
  const FF = F || F_CONST;
  const I = Math.max(0, I_A);
  const t = Math.max(0, t_s);
  return (I * t) / (zz * FF);
}

/** Mass of copper deposited (grams): m = n * M. */
export function massDepositedGrams(I_A, t_s, M, z, F) {
  const MM = M || M_CU;
  return molesDeposited(I_A, t_s, z, F) * MM;
}

/**
 * Sample points tracing the linear mass-vs-time growth for a fixed current I_A,
 * from t=0 to t=tMax_s.
 */
export function curvePoints(I_A, tMax_s, n, M, z, F) {
  const pts = [];
  const N = n || 80;
  const tMax = Math.max(0, tMax_s);
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * tMax;
    pts.push({ t: t, massG: massDepositedGrams(I_A, t, M, z, F) });
  }
  return pts;
}
