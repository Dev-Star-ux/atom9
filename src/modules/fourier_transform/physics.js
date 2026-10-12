/** Analytic and numeric Fourier transforms for teaching pulses. */
export const T_MAX = 6;

export function gaussian(t, sigma) {
  if (sigma <= 0) return 0;
  return Math.exp(-0.5 * (t / sigma) * (t / sigma));
}

export function rectPulse(t, width) {
  const hw = width * 0.5;
  return Math.abs(t) <= hw ? 1 : 0;
}

/** |F(ω)| for Gaussian (unitary-style, up to scale). */
export function gaussianSpectrum(w, sigma) {
  if (sigma <= 0) return 0;
  return sigma * Math.sqrt(2 * Math.PI) * Math.exp(-0.5 * sigma * sigma * w * w);
}

/** |F(ω)| for rect pulse of width w0. */
export function rectSpectrum(w, width) {
  if (width <= 0) return 0;
  const x = 0.5 * width * w;
  return width * Math.abs(Math.sin(x) / (x || 1e-12));
}

export function sampleTime(fn, tMin, tMax, nPts) {
  const xs = [];
  const ys = [];
  for (let i = 0; i < nPts; i++) {
    const t = tMin + (tMax - tMin) * i / (nPts - 1);
    xs.push(t);
    ys.push(fn(t));
  }
  return { xs, ys };
}

export function sampleSpectrum(fn, wMin, wMax, nPts) {
  const xs = [];
  const ys = [];
  for (let i = 0; i < nPts; i++) {
    const w = wMin + (wMax - wMin) * i / (nPts - 1);
    xs.push(w);
    ys.push(fn(w));
  }
  let m = 1e-12;
  for (let i = 0; i < ys.length; i++) if (ys[i] > m) m = ys[i];
  const yn = ys.map(function (v) { return v / m; });
  return { xs, ys: yn, peak: m };
}

export function pulsePair(mode, width) {
  if (mode === 'rect') {
    return {
      time: function (t) { return rectPulse(t, width); },
      spec: function (w) { return rectSpectrum(w, width); },
      label: 'Rect pulse',
    };
  }
  return {
    time: function (t) { return gaussian(t, width); },
    spec: function (w) { return gaussianSpectrum(w, width); },
    label: 'Gaussian',
  };
}
