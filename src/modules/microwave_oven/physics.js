/** Microwave oven cavity — standing waves + dielectric heating. */

var F0 = 2.45e9;
var C = 2.99792458e8;

/** Free-space wavelength at magnetron frequency (≈ 2.45 GHz → ~12.2 cm). */
export function freeSpaceWavelength(f) {
  var ff = f != null ? f : F0;
  return C / Math.max(ff, 1e-6);
}

/** Standing-wave |E| along cavity length L for mode index m: |sin(m π x / L)|. */
export function standingWaveE(x, L, modeIndex) {
  var m = Math.max(1, Math.round(modeIndex));
  var LL = Math.max(L, 1e-6);
  return Math.abs(Math.sin(m * Math.PI * x / LL));
}

/** Sample |E|(x) along cavity for plot. */
export function eFieldCurve(L, modeIndex, n) {
  var N = n || 80;
  var pts = [];
  for (let i = 0; i <= N; i++) {
    var x = (i / N) * L;
    pts.push({ x: x, E: standingWaveE(x, L, modeIndex) });
  }
  return pts;
}

/** Dielectric heating teaching: P ∝ ε'' E² · waterFraction · power.
 *  Returns relative absorption (arb.). */
export function heatingPower(power, epsImag, E, waterFrac) {
  var eps = Math.max(epsImag, 0);
  var w = Math.max(0, Math.min(1, waterFrac));
  var ee = Math.max(E, 0);
  return Math.max(power, 0) * eps * ee * ee * w;
}

/** Hot/cold spot map on a turntable: sample grid of relative |E|².
 *  angleRad rotates food when turntable is on. */
export function cavitySpotGrid(nx, ny, modeIndex, angleRad, turntableOn) {
  var pts = [];
  var m = Math.max(1, Math.round(modeIndex));
  var ang = turntableOn ? angleRad : 0;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      var u = (i + 0.5) / nx - 0.5;
      var v = (j + 0.5) / ny - 0.5;
      var x = u * Math.cos(ang) - v * Math.sin(ang);
      var y = u * Math.sin(ang) + v * Math.cos(ang);
      var Ex = Math.abs(Math.sin(m * Math.PI * (x + 0.5)));
      var Ey = Math.abs(Math.sin(Math.max(1, m - 1) * Math.PI * (y + 0.5) + 0.3));
      var E = 0.65 * Ex + 0.35 * Ey;
      pts.push({ i: i, j: j, E: E, E2: E * E });
    }
  }
  return pts;
}

/** Default magnetron frequency (Hz). */
export function magnetronFreq() { return F0; }

/** Cavity wavelength scale from mode: λ_c ≈ 2 L / m. */
export function cavityWavelength(L, modeIndex) {
  var m = Math.max(1, Math.round(modeIndex));
  return 2 * Math.max(L, 1e-6) / m;
}
