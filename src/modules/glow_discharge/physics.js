/** Glow discharge tube — Paschen's law teaching model (offline). */

export const A_DEFAULT = 15;     // (cm·Torr)^-1, teaching constant for air
export const B_DEFAULT = 365;    // V/(cm·Torr), teaching constant for air
export const GAMMA_DEFAULT = 0.01; // secondary emission coefficient

/**
 * Paschen breakdown voltage V_b(p*d) = B*(pd) / [ln(A*pd) - ln(ln(1+1/gamma))]
 * pd_torrCm: pressure*distance product in Torr*cm.
 * Guards against invalid log domain (ln(A*pd) <= 0, or non-positive pd) by
 * returning a very large number (teaching "breakdown voltage skyrockets").
 */
export function paschenVoltage(pd_torrCm, A, B, gamma) {
  const a = A != null ? A : A_DEFAULT;
  const b = B != null ? B : B_DEFAULT;
  const g = gamma != null ? gamma : GAMMA_DEFAULT;
  const pd = pd_torrCm;
  if (!(pd > 0)) return 1e9;
  const lnApd = Math.log(a * pd);
  if (!(lnApd > 0)) return 1e9;
  const lnGammaTerm = Math.log(Math.log(1 + 1 / g));
  const denom = lnApd - lnGammaTerm;
  if (!(denom > 1e-9)) return 1e9;
  const Vb = (b * pd) / denom;
  if (!isFinite(Vb) || Vb < 0) return 1e9;
  return Vb;
}

/** Is the tube glowing (self-sustained discharge) at applied voltage V? */
export function isGlowing(V, pd, A, B, gamma) {
  const Vb = paschenVoltage(pd, A, B, gamma);
  return V > Vb;
}

/** Trace the classic U-shaped Paschen curve over [pdMin, pdMax] (linear pd axis). */
export function curvePoints(pdMin, pdMax, n, A, B, gamma) {
  const pts = [];
  const N = n || 100;
  const lo = Math.max(1e-4, pdMin);
  const hi = Math.max(lo + 1e-3, pdMax);
  for (let i = 0; i <= N; i++) {
    const pd = lo + ((hi - lo) * i) / N;
    pts.push({ pd: pd, Vb: paschenVoltage(pd, A, B, gamma) });
  }
  return pts;
}

/** Find the approximate Paschen minimum (pd*, Vb*) by scanning the curve. */
export function paschenMinimum(pdMin, pdMax, n, A, B, gamma) {
  const pts = curvePoints(pdMin, pdMax, n, A, B, gamma);
  let best = pts[0];
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].Vb < best.Vb) best = pts[i];
  }
  return best;
}
