/** Spark discharge — transient breakdown + RC relaxation oscillator (offline teaching model). */

export const A_DEFAULT = 15;      // (cm·Torr)^-1, teaching constant for air
export const B_DEFAULT = 365;     // V/(cm·Torr), teaching constant for air
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

/**
 * Time (s) for an RC circuit charging toward Vsupply through R to reach Vb.
 * Standard RC charging formula solved for time: t = R*C*ln[Vsupply/(Vsupply-Vb)].
 * Only valid if Vsupply > Vb (otherwise the gap never fires — returns Infinity).
 */
export function chargeTimeToBreakdown(R_ohm, C_farad, Vsupply, Vb) {
  if (!(Vsupply > Vb)) return Infinity;
  if (!(R_ohm > 0) || !(C_farad > 0)) return Infinity;
  return R_ohm * C_farad * Math.log(Vsupply / (Vsupply - Vb));
}

/**
 * Capacitor voltage at time tSec, assuming an instantaneous reset to 0 V
 * immediately after each breakdown (repeating sawtooth).
 */
export function sawtoothVoltage(tSec, R_ohm, C_farad, Vsupply, Vb) {
  const period = chargeTimeToBreakdown(R_ohm, C_farad, Vsupply, Vb);
  if (!isFinite(period) || period <= 0) {
    // Never fires: just charge monotonically toward Vsupply (capped, no reset).
    const tau = R_ohm * C_farad;
    if (!(tau > 0)) return 0;
    return Vsupply * (1 - Math.exp(-Math.max(0, tSec) / tau));
  }
  const t = tSec % period;
  const tMod = t < 0 ? t + period : t;
  const tau = R_ohm * C_farad;
  return Vsupply * (1 - Math.exp(-tMod / tau));
}

/** Spark repetition frequency (Hz) = 1 / chargeTimeToBreakdown. */
export function sparkFrequency(R_ohm, C_farad, Vsupply, Vb) {
  const t = chargeTimeToBreakdown(R_ohm, C_farad, Vsupply, Vb);
  if (!isFinite(t) || t <= 0) return 0;
  return 1 / t;
}
