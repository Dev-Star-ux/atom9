// Double-slit interference I ∝ cos²(π d y / λL) (Ch.3 §3).
import {
  doubleSlitIntensity, freqToNm, fringeSpacingM,
} from '../common/wavePhysics.js';

export { doubleSlitIntensity, freqToNm, fringeSpacingM };

export const Y_SPAN = 0.04;

export function wavelengthM(freq1e14) {
  return freqToNm(freq1e14) * 1e-9;
}

export function slitSepM(slitSepUm) {
  return slitSepUm * 1e-6;
}

export function intensityProfile(freq, slitSepUm, distance, n = 100) {
  const lam = wavelengthM(freq);
  const d = slitSepM(slitSepUm);
  const ys = [];
  const Is = [];
  for (let i = 0; i < n; i++) {
    const y = -Y_SPAN + 2 * Y_SPAN * i / (n - 1);
    ys.push(y);
    Is.push(doubleSlitIntensity(y, d, lam, distance));
  }
  return { ys, Is, lam, d, fringe: fringeSpacingM(lam, d, distance) };
}
