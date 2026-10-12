/** Rectangular barrier — teaching units ℏ = m = 1. */

export function transmission(E, V0, width) {
  if (E <= 0 || V0 <= 0 || width <= 0) return 0;
  if (E >= V0) {
    const kp = Math.sqrt(2 * (E - V0));
    const s = Math.sin(kp * width);
    return 1 / (1 + (V0 * V0 * s * s) / (4 * E * (E - V0)));
  }
  const kappa = Math.sqrt(2 * (V0 - E));
  const sh = Math.sinh(kappa * width);
  return 1 / (1 + (V0 * V0 * sh * sh) / (4 * E * (V0 - E)));
}

/** Real part of ψ(x) for unit incident plane wave from x < 0. */
export function barrierPsi(E, V0, width, nPts, span) {
  if (nPts == null) nPts = 260;
  if (span == null) span = 8;
  const k = Math.sqrt(2 * Math.max(E, 1e-6));
  const T = transmission(E, V0, width);
  const tAmp = Math.sqrt(Math.max(0, T));
  const rAmp = Math.sqrt(Math.max(0, 1 - T));

  const xMin = -span * 0.35;
  const xMax = width + span * 0.65;
  const xs = [];
  const ys = [];

  for (let i = 0; i < nPts; i++) {
    const x = xMin + (xMax - xMin) * i / (nPts - 1);
    xs.push(x);
    let psi = 0;
    if (x < 0) {
      psi = Math.cos(k * x) + rAmp * Math.cos(k * x + Math.PI);
    } else if (x <= width) {
      if (E >= V0) {
        const kp = Math.sqrt(2 * (E - V0));
        psi = Math.cos(kp * x) + rAmp * Math.cos(kp * x + Math.PI);
      } else {
        const kap = Math.sqrt(2 * (V0 - E));
        const ea = Math.exp(kap * x);
        const em = Math.exp(-kap * x);
        const eaW = Math.exp(kap * width);
        const emW = Math.exp(-kap * width);
        const det = eaW - emW;
        const A = det !== 0 ? (2 * k * emW) / det : 0;
        const B = det !== 0 ? (-2 * k * eaW) / det : 0;
        psi = A * ea + B * em;
      }
    } else {
      psi = tAmp * Math.cos(k * (x - width));
    }
    ys.push(psi);
  }
  return { xs: xs, ys: ys, xMin: xMin, xMax: xMax, tAmp: tAmp, rAmp: rAmp };
}

export function sampleTransmissionCurve(V0, width, nPts, eMax) {
  if (nPts == null) nPts = 80;
  if (eMax == null) eMax = Math.max(V0 * 1.6, 4);
  const xs = [];
  const ys = [];
  for (let i = 0; i < nPts; i++) {
    const E = 0.05 + (eMax - 0.05) * i / (nPts - 1);
    xs.push(E);
    ys.push(transmission(E, V0, width));
  }
  return { xs: xs, ys: ys, eMax: eMax };
}
