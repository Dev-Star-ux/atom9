// Effective cross-section & mean free path (Ch.1 Sec.2). λ = 1/(nσ), transmission ∝ exp(−L/λ).

export function sigma2d(radiusPx) {
  return 2 * radiusPx;
}

export function numberDensity(count, slabWidth, slabHeight) {
  const area = slabWidth * slabHeight;
  return area > 0 ? count / area : 0;
}

export function meanFreePath(n, sigma) {
  const ns = n * sigma;
  return ns > 0 ? 1 / ns : Infinity;
}

export function transmissionFraction(n, sigma, pathLength) {
  const lam = meanFreePath(n, sigma);
  if (!isFinite(lam)) return 1;
  return Math.exp(-pathLength / lam);
}

export function theoreticalTransmission(density, radius, slabW, slabH, pathLength) {
  const n = numberDensity(density, slabW, slabH);
  return transmissionFraction(n, sigma2d(radius), pathLength);
}
