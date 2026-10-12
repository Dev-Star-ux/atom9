// Bragg diffraction — Wave property of X-rays. nλ = 2d sin θ.
// Inspired by OSP @ Singapore Bragg's Law simulator (Lookang / Hwang / Teng / Wee):
// https://sg.iwant2study.org/ospsg/index.php/interactive-resources/physics/06-modern-physics/02-nuclear/709-braggslaw
export {
  braggConstructive,
  braggConstructiveAt,
  braggOrderNearest,
} from '../xray/physics.js';

import {
  braggConstructive,
  braggConstructiveAt,
  braggOrderNearest,
} from '../xray/physics.js';

/** First-order (or nth) Bragg angle θ where nλ = 2d sin θ. */
export function braggAngleDeg(n, dPm, lamPm) {
  if (dPm <= 0 || lamPm <= 0 || n < 1) return null;
  const s = (n * lamPm) / (2 * dPm);
  if (s > 1) return null;
  return (Math.asin(s) * 180) / Math.PI;
}

/** Path difference δ = 2 d sin θ (pm). */
export function pathDifferencePm(dPm, thetaDeg) {
  return 2 * dPm * Math.sin((thetaDeg * Math.PI) / 180);
}

/** Relative diffracted intensity — peaks when δ/λ ≈ integer. */
export function braggIntensity(thetaDeg, dPm, lamPm) {
  if (lamPm <= 0 || dPm <= 0) return 0;
  const pathInLam = pathDifferencePm(dPm, thetaDeg) / lamPm;
  let total = 0.06;
  const nMax = Math.max(1, Math.floor(2 * dPm / lamPm) + 1);
  for (let n = 1; n <= nMax; n++) {
    const width = 0.12;
    total += Math.exp(-((pathInLam - n) * (pathInLam - n)) / (2 * width * width));
  }
  return total;
}

export function intensityCurve(dPm, lamPm, thetaMin, thetaMax, steps) {
  const t0 = thetaMin != null ? thetaMin : 5;
  const t1 = thetaMax != null ? thetaMax : 80;
  const n = steps || 76;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const theta = t0 + (t1 - t0) * i / (n - 1);
    pts.push({ theta: theta, I: braggIntensity(theta, dPm, lamPm) });
  }
  return pts;
}

export function braggSummary(lamPm, dPm, thetaDeg) {
  const order = braggOrderNearest(dPm, lamPm, thetaDeg);
  const pathLam = braggConstructive(order, dPm, lamPm, thetaDeg);
  const bright = braggConstructiveAt(order, dPm, lamPm, thetaDeg);
  const delta = pathDifferencePm(dPm, thetaDeg);
  const peak1 = braggAngleDeg(1, dPm, lamPm);
  const peak2 = braggAngleDeg(2, dPm, lamPm);
  return {
    order: order,
    pathLam: pathLam,
    bright: bright,
    deltaPm: delta,
    peak1: peak1,
    peak2: peak2,
  };
}
