/** Meissner effect — perfect diamagnetism of superconductors (offline teaching model). */

/** True when the sample is below its critical temperature (superconducting phase). */
export function isSuperconducting(tempK, tcK) {
  return tempK < tcK;
}

/**
 * Field magnitude at depth x (nm) inside the sample.
 * Superconducting (T<Tc): exponential screening, B(x) = B0·e^(−x/λ_L).
 * Normal (T>=Tc): field passes through unattenuated, B(x) = B0.
 */
export function fieldInside(depthNm, B0mT, lambdaNm, superconducting) {
  if (!superconducting) return B0mT;
  const lam = Math.max(1e-6, lambdaNm);
  return B0mT * Math.exp(-Math.max(0, depthNm) / lam);
}

/**
 * Teaching estimate of levitation force (arbitrary display units) for a small
 * magnet hovering heightMm above a superconducting puck. This is a simplified
 * image-dipole-style falloff (force ~ B0^2 / (h+1)^4), NOT an exact magnetostatic
 * result — it is chosen only so the numbers rise smoothly as gap shrinks and
 * read sensibly on-screen. Zero for a normal (non-superconducting) sample since
 * there is no flux expulsion / repulsion to react against.
 */
export function levitationForceEstimate(B0mT, heightMm, superconducting) {
  if (!superconducting) return 0;
  const k = 4; // teaching constant, chosen for readable on-screen magnitudes
  const h = Math.max(0, heightMm);
  return (k * B0mT * B0mT) / Math.pow(h + 1, 4);
}

/** Sample points of B(depth) for plotting, depth in [0, depthMaxNm]. */
export function fieldProfilePoints(B0mT, lambdaNm, superconducting, depthMaxNm, n) {
  const pts = [];
  const N = n || 80;
  const xMax = Math.max(1, depthMaxNm);
  for (let i = 0; i <= N; i++) {
    const x = (i / N) * xMax;
    pts.push({ depthNm: x, B: fieldInside(x, B0mT, lambdaNm, superconducting) });
  }
  return pts;
}
