/** Laser printer (xerographic process) — teaching physics (offline). */

/** Contrast voltage (V): |charged| minus |exposed/residual| potential, clamped at 0. */
export function contrastV(chargeV, expResidualV) {
  return Math.max(0, chargeV - expResidualV);
}

/** Saturating optical-density-like response of contrast voltage (0..~1). */
export function opticalDensity(contrastVal) {
  const cv = Math.max(0, contrastVal);
  return 1 - Math.exp(-cv / 300);
}

/** Fuser roller pair must sit in ~180-220 C to properly bond toner to paper. */
export function fuserOk(tempC) {
  return tempC >= 180 && tempC <= 220;
}

/**
 * Deterministic pseudo-raster pattern of n booleans along one scan line,
 * given an image "density" fraction (0..1). Not Math.random — reproducible,
 * based on a couple of sine harmonics so it looks like real page content.
 */
export function tonerCoveragePattern(density, n) {
  const d = Math.max(0, Math.min(1, density));
  const N = Math.max(1, Math.floor(n));
  const out = new Array(N);
  for (let i = 0; i < N; i++) {
    const u = i / N;
    // Sum of a few harmonics folded into 0..1 — deterministic, non-uniform,
    // reproducible "content" texture rather than random noise.
    const wave =
      0.5 +
      0.35 * Math.sin(u * 41.0) +
      0.15 * Math.sin(u * 97.0 + 1.3) +
      0.1 * Math.sin(u * 13.0 + 0.5);
    const w01 = Math.max(0, Math.min(1, wave));
    // Threshold so the exposed fraction tracks `density` monotonically:
    // density=0 -> all false, density=1 -> all true.
    out[i] = w01 <= d;
  }
  return out;
}

/** Fraction of raster cells actually exposed by the pattern (sanity readout). */
export function exposedFraction(pattern) {
  if (!pattern || !pattern.length) return 0;
  let c = 0;
  for (let i = 0; i < pattern.length; i++) if (pattern[i]) c++;
  return c / pattern.length;
}
