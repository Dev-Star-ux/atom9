/** Electric arc discharge — teaching model (offline).
 *
 * A high-current, relatively low-voltage, thermally-sustained gas discharge:
 * the cathode is hot enough (thermionic emission) to keep supplying electrons
 * without needing the large cathode-fall voltage a glow discharge needs, so
 * arc voltage is comparatively low while current is very high. The defining
 * teaching feature is a NEGATIVE differential resistance: as current rises,
 * arc voltage FALLS (over the normal operating range) — the opposite of a
 * resistor. This is modelled with a teaching form of Ayrton's 1901 empirical
 * arc equation:
 *
 *   V = a + b/I + (c + d/I)*L
 *
 * where I = arc current (A), L = arc gap length (cm). a, b, c, d below are
 * ILLUSTRATIVE teaching constants (volts / amps / cm units) — not measured
 * data for any specific electrode material or gas.
 */

export const A0 = 15; // V, "floor" voltage term
export const B0 = 15; // V·A, current-dependent voltage-drop term
export const C0 = 1;  // V/cm, gap gradient term
export const D0 = 3;  // V·A/cm, current-dependent gap gradient term

/** Ayrton-style arc voltage (V). I_A in amps, L_cm in cm. */
export function arcVoltage(I_A, L_cm, a, b, c, d) {
  const aa = a != null ? a : A0;
  const bb = b != null ? b : B0;
  const cc = c != null ? c : C0;
  const dd = d != null ? d : D0;
  const I = Math.max(I_A, 0.1);
  return aa + bb / I + (cc + dd / I) * L_cm;
}

/** Arc electrical power (W). */
export function arcPower(V, I_A) {
  return V * I_A;
}

/** Trace the falling V–I arc characteristic for a fixed gap length. */
export function curvePoints(L_cm, IMin, IMax, n, a, b, c, d) {
  const pts = [];
  const N = n || 80;
  const lo = Math.max(0.1, IMin);
  const hi = Math.max(lo + 0.1, IMax);
  for (let i = 0; i <= N; i++) {
    const I = lo + ((hi - lo) * i) / N;
    pts.push({ I: I, V: arcVoltage(I, L_cm, a, b, c, d) });
  }
  return pts;
}
