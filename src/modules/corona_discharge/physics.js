/** Corona discharge — Peek's law onset field + needle-plane tip field. */

/** Peek's law onset field at the surface of a conductor of radius r (cm)
 *  in air of relative density delta (1.0 at standard conditions). Returns kV/cm. */
export function peekOnsetField(r_cm, delta) {
  const rd = Math.max(delta * r_cm, 1e-6);
  return 30 * delta * (1 + 0.301 / Math.sqrt(rd));
}

/** Needle-plane approximation of the field at the tip of a sharp point at
 *  voltage V (kV), radius r (cm), gap d (cm) to a grounded plane. Returns kV/cm. */
export function tipField(V_kV, r_cm, d_cm) {
  const ratio = Math.max(2 * d_cm / r_cm, 1.0001);
  return V_kV / (r_cm * Math.log(ratio));
}

/** True when the local tip field meets/exceeds the Peek onset threshold. */
export function coronaActive(V_kV, r_cm, d_cm, delta) {
  return tipField(V_kV, r_cm, d_cm) >= peekOnsetField(r_cm, delta);
}

/** Onset voltage (kV) at which corona begins, for the given geometry. */
export function onsetVoltage(r_cm, d_cm, delta) {
  const Eon = peekOnsetField(r_cm, delta);
  const ratio = Math.max(2 * d_cm / r_cm, 1.0001);
  return Eon * r_cm * Math.log(ratio);
}

/** Sample points of E_tip(V) from 0..VMax_kV, plus the flat Peek threshold. */
export function curvePoints(r_cm, d_cm, delta, VMax_kV, n) {
  const N = n || 80;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const V = (i / N) * VMax_kV;
    pts.push({ V: V, Etip: tipField(V, r_cm, d_cm) });
  }
  return { points: pts, threshold: peekOnsetField(r_cm, delta) };
}
