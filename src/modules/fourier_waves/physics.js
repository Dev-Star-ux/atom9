/** Fourier synthesis — square / saw / triangle presets (period 2π). */

export const PRESETS = [
  { id: 'square', label: 'Square' },
  { id: 'saw', label: 'Sawtooth' },
  { id: 'triangle', label: 'Triangle' },
];

export function getPreset(id) {
  for (let i = 0; i < PRESETS.length; i++) {
    if (PRESETS[i].id === id) return PRESETS[i];
  }
  return PRESETS[0];
}

/** sin-series coefficient for harmonic n (1-based). */
export function harmonicCoeff(preset, n) {
  if (n < 1) return 0;
  if (preset === 'square') {
    if (n % 2 === 0) return 0;
    return 4 / (n * Math.PI);
  }
  if (preset === 'saw') {
    return (2 / (n * Math.PI)) * Math.pow(-1, n + 1);
  }
  if (preset === 'triangle') {
    if (n % 2 === 0) return 0;
    return (8 / (Math.PI * Math.PI * n * n)) * Math.pow(-1, (n - 1) / 2);
  }
  return 0;
}

export function synthesize(preset, nMax, x, t, speed) {
  let sum = 0;
  for (let n = 1; n <= nMax; n++) {
    const a = harmonicCoeff(preset, n);
    sum += a * Math.sin(n * x - n * speed * t);
  }
  return sum;
}

export function harmonicBars(preset, nMax) {
  const bars = [];
  for (let n = 1; n <= nMax; n++) {
    bars.push({ n: n, a: harmonicCoeff(preset, n) });
  }
  return bars;
}

export function sampleWave(preset, nMax, t, speed, nPts) {
  if (nPts == null) nPts = 240;
  const xs = [];
  const ys = [];
  for (let i = 0; i < nPts; i++) {
    const x = -Math.PI + (2 * Math.PI) * i / (nPts - 1);
    xs.push(x);
    ys.push(synthesize(preset, nMax, x, t, speed));
  }
  return { xs: xs, ys: ys };
}

export function targetWave(preset, x) {
  const t = ((x + Math.PI) / (2 * Math.PI)) % 1;
  if (preset === 'square') {
    return x < 0 ? -1 : 1;
  }
  if (preset === 'saw') {
    return 2 * t - 1;
  }
  return 2 * Math.abs(2 * t - 1) - 1;
}
