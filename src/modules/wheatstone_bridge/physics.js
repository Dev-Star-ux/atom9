/** Wheatstone bridge — resistance measurement teaching (offline). */

/*
 * Node / arm convention (diamond bridge):
 *
 *            + (top node, battery +)
 *           / \
 *         R1   R2
 *         /     \
 *   L (left) --- R (right)     galvanometer G between L and R
 *         \     /
 *         R3   Rx
 *           \ /
 *            - (bottom node, battery -)
 *
 * R1: top-left arm, R2: top-right arm, R3: bottom-left arm, Rx: bottom-right
 * arm (the unknown). Battery voltage V is applied across (+) and (-).
 * Left node L sits on the R1/R3 divider; right node R sits on the R2/Rx
 * divider. Balance (zero galvanometer current) requires V_L = V_R, i.e.
 * the R1/R3 divider ratio equals the R2/Rx divider ratio:
 *   R3/(R1+R3) = Rx/(R2+Rx)  <=>  R1*Rx = R2*R3
 */

/** Balance condition; zero at balance. R1*Rx - R2*R3 */
export function balanceCondition(R1, R2, R3, Rx) {
  return R1 * Rx - R2 * R3;
}

/** The Rx that balances the bridge given R1, R2, R3. */
export function solvedRx(R1, R2, R3) {
  if (R1 <= 0) return Infinity;
  return (R2 * R3) / R1;
}

/**
 * Open-circuit bridge ("galvanometer") voltage, valid for a high-impedance
 * galvanometer (negligible loading of the two voltage dividers).
 * Vg = V * [ R3/(R1+R3) - Rx/(R2+Rx) ]   (V_L - V_R, referenced to bottom node)
 */
export function bridgeVoltage(R1, R2, R3, Rx, V) {
  const vL = R3 / (R1 + R3);
  const vR = Rx / (R2 + Rx);
  return V * (vL - vR);
}

/** True if the bridge is balanced to within tolFrac of the R2*R3 product scale. */
export function isBalanced(R1, R2, R3, Rx, tolFrac) {
  const tol = tolFrac != null ? tolFrac : 0.01;
  const denom = Math.max(1e-9, R2 * R3);
  return Math.abs(balanceCondition(R1, R2, R3, Rx)) / denom < tol;
}

/** Sweep Vg over a range of Rx values (for the bottom teaching plot). */
export function sweepVg(R1, R2, R3, V, RxMin, RxMax, n) {
  const pts = [];
  const N = n || 80;
  for (let i = 0; i <= N; i++) {
    const rx = RxMin + ((RxMax - RxMin) * i) / N;
    pts.push({ rx: rx, vg: bridgeVoltage(R1, R2, R3, rx, V) });
  }
  return pts;
}

/** The R3 that balances the bridge given R1, R2, Rx (nulling the "known,
 *  adjustable" arm against a fixed unknown — the classic bridge procedure). */
export function solvedR3(R1, R2, Rx) {
  if (R2 <= 0) return Infinity;
  return (R1 * Rx) / R2;
}

function parallelPair(a, b) {
  const s = a + b;
  return s > 0 ? (a * b) / s : 0;
}

/**
 * Thevenin resistance seen by the galvanometer between the two bridge
 * midpoints, with the battery replaced by a short: R1 || R3 in series with
 * R2 || Rx (both dividers collapse onto the same battery-rail node).
 */
export function theveninResistance(R1, R2, R3, Rx) {
  return parallelPair(R1, R3) + parallelPair(R2, Rx);
}

/**
 * Actual galvanometer current (mA) once its own coil resistance Rg (Ohms)
 * is accounted for: I_g = V_th / (R_th + Rg). Zero exactly at balance,
 * regardless of Rg.
 */
export function galvanometerCurrentMA(R1, R2, R3, Rx, V, RgOhm) {
  const vth = bridgeVoltage(R1, R2, R3, Rx, V);
  const rth = theveninResistance(R1, R2, R3, Rx);
  return (1000 * vth) / (rth + Math.max(0, RgOhm));
}

/**
 * Bridge sensitivity near the current operating point: how much the
 * galvanometer current (mA) changes per Ohm of Rx mismatch — a numeric
 * derivative dI_g/dRx evaluated at the current Rx.
 */
export function sensitivityMAPerOhm(R1, R2, R3, Rx, V, RgOhm) {
  const dRx = Math.max(0.01, Rx * 1e-3);
  const i1 = galvanometerCurrentMA(R1, R2, R3, Rx + dRx, V, RgOhm);
  const i0 = galvanometerCurrentMA(R1, R2, R3, Rx, V, RgOhm);
  return (i1 - i0) / dRx;
}
