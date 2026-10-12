/** Thermionic emission — Richardson-Dushman law + a simple diode I-V teaching model (offline). */

export const KB = 1.380649e-23; // J/K
export const QE = 1.602176634e-19; // C (eV -> J conversion)
export const A_RICHARDSON = 6.0e5; // A/(m^2 K^2), generic teaching value (not material-specific)

// Fixed small emitter area folded in so current magnitudes (A) stay readable
// on screen instead of the raw current-density (A/m^2) numbers.
export const EMITTER_AREA_M2 = 1e-6; // m^2, illustrative filament area

/**
 * Richardson-Dushman saturated current density: J = A T^2 exp(-W / (kB T)).
 * T_K: cathode temperature (K); W_eV: work function (eV); A: Richardson constant.
 * Returns J in A/m^2.
 */
export function richardsonCurrentDensity(T_K, W_eV, A) {
  const Aconst = A != null ? A : A_RICHARDSON;
  const T = Math.max(1, T_K);
  const W_J = W_eV * QE;
  return Aconst * T * T * Math.exp(-W_J / (KB * T));
}

/** Temperature-limited (saturation) current in Amps, using the fixed emitter area. */
export function richardsonCurrent(T_K, W_eV, A) {
  return richardsonCurrentDensity(T_K, W_eV, A) * EMITTER_AREA_M2;
}

/**
 * Child-Langmuir space-charge-limited current — simplified teaching form
 * I_CL = K * V^1.5 (Amps). This is NOT the full Child-Langmuir law with real
 * diode geometry (area, cathode-anode spacing) — K is a single tunable
 * constant chosen so the curve crosses the Richardson saturation current at
 * a reasonable anode voltage across the slider ranges (T: 800-3000 K,
 * W: 1.5-6 eV, V: 0-300 V).
 */
export function childLangmuirCurrent(V, K) {
  const Kc = K != null ? K : 2e-6;
  return Kc * Math.pow(Math.max(V, 0), 1.5);
}

/**
 * Actual diode current = min(temperature-limited, space-charge-limited).
 * At low V the diode is space-charge limited (Child-Langmuir, rises with V^1.5);
 * once V is high enough that Child-Langmuir would exceed the Richardson
 * saturation current, the diode current flattens out (temperature-limited).
 */
export function diodeCurrent(T_K, W_eV, A, V, K) {
  const Irich = richardsonCurrent(T_K, W_eV, A);
  const Icl = childLangmuirCurrent(V, K);
  return Math.min(Irich, Icl);
}

/** Which regime is currently binding: 'temperature' or 'space-charge'. */
export function limitingRegime(T_K, W_eV, A, V, K) {
  const Irich = richardsonCurrent(T_K, W_eV, A);
  const Icl = childLangmuirCurrent(V, K);
  return Icl >= Irich ? 'temperature' : 'space-charge';
}

/** Sample the classic diode I-V curve: rises as V^1.5 then saturates. */
export function curvePoints(T_K, W_eV, A, K, VMax, n) {
  const pts = [];
  const N = n || 80;
  for (let i = 0; i <= N; i++) {
    const V = (i / N) * VMax;
    pts.push({ V: V, I: diodeCurrent(T_K, W_eV, A, V, K) });
  }
  return pts;
}
