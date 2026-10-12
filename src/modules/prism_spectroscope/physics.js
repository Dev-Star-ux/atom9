// Prism spectroscope — continuous vs line spectra (Ch.2 §3).

export const N_PRISM_TRUE = 1.52;
export const PRISM_ANGLE = 0.42;
export const NM_MIN = 380;
export const NM_MAX = 750;

export const SOURCES = ['continuous', 'hydrogen', 'helium', 'sodium'];

export const HYDROGEN_LINES = [
  [656.3, 1.00, 'Hα'], [486.1, 0.55, 'Hβ'], [434.0, 0.35, 'Hγ'],
  [410.2, 0.22, 'Hδ'], [397.0, 0.15, 'Hε'],
];
export const HELIUM_LINES = [
  [587.6, 0.90, 'He D3'], [447.1, 0.70, 'He blue'], [492.2, 0.45, 'He green'],
  [667.8, 0.55, 'He red'], [706.5, 0.40, 'He IR'],
];
export const SODIUM_LINES = [[589.0, 1.00, 'D2'], [589.6, 0.95, 'D1']];

export function linesForSource(source) {
  if (source === 'hydrogen') return HYDROGEN_LINES;
  if (source === 'helium') return HELIUM_LINES;
  if (source === 'sodium') return SODIUM_LINES;
  return [];
}

export function isContinuous(source) {
  return source === 'continuous';
}

export function dispersion(nm, nPrism = N_PRISM_TRUE) {
  const base = (nm - NM_MIN) / (NM_MAX - NM_MIN);
  const scale = nPrism / N_PRISM_TRUE;
  return Math.max(0, Math.min(1, 0.5 + (base - 0.5) * scale));
}

export function deviationAngle(nm, nPrism = N_PRISM_TRUE) {
  const t = dispersion(nm, nPrism);
  return -PRISM_ANGLE + t * 2 * PRISM_ANGLE;
}

/** Screen position 0–1 (violet → red). */
export function nmToScreenX(nm, nPrism = N_PRISM_TRUE) {
  const a0 = deviationAngle(NM_MIN, nPrism);
  const a1 = deviationAngle(NM_MAX, nPrism);
  const a = deviationAngle(nm, nPrism);
  return Math.max(0, Math.min(1, (a - a0) / (a1 - a0 || 1)));
}

export function wienPeakNm(T) {
  return 2.897771e6 / Math.max(500, T);
}

/** Relative blackbody brightness at λ (visual weight). */
export function blackbodyWeight(nm, T) {
  const peak = wienPeakNm(T);
  const sig = Math.max(80, peak * 0.38);
  return Math.exp(-0.5 * ((nm - peak) / sig) ** 2);
}

export function blackbodyRgb(T) {
  return wavelengthToCss(wienPeakNm(T));
}

export function wavelengthToCss(nm) {
  if (nm < 380 || nm > 780) return '#888888';
  let r = 0; let g = 0; let b = 0;
  if (nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else { r = 1; }
  const ch = (v) => Math.round(Math.max(0, Math.min(1, v)) ** 0.8 * 255);
  return `rgb(${ch(r)},${ch(g)},${ch(b)})`;
}

/** Draw spectrum strip (shared by 3D screen texture + panel chart). */
export function drawSpectrum(ctx, w, h, source, temp, { axis = false, labels = false } = {}) {
  ctx.fillStyle = '#060a12';
  ctx.fillRect(0, 0, w, h);

  const pad = axis ? 28 : 4;
  const stripY = pad;
  const stripH = h - pad - (axis ? 22 : 4);

  if (isContinuous(source)) {
    for (let x = 0; x < w; x++) {
      const nm = NM_MIN + (NM_MAX - NM_MIN) * x / w;
      const wt = blackbodyWeight(nm, temp);
      ctx.fillStyle = wavelengthToCss(nm);
      ctx.globalAlpha = 0.25 + 0.75 * wt;
      ctx.fillRect(x, stripY, 2, stripH);
    }
    ctx.globalAlpha = 1;
    if (labels) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('every wavelength present → smooth rainbow', w / 2, h - 6);
    }
  } else {
    const lines = linesForSource(source);
    for (let x = 0; x < w; x++) {
      const nm = NM_MIN + (NM_MAX - NM_MIN) * x / w;
      ctx.fillStyle = '#0a1020';
      ctx.fillRect(x, stripY, 1, stripH);
    }
    for (const [nm, int, label] of lines) {
      const x = nmToScreenX(nm) * w;
      const bw = Math.max(3, 5 * int);
      const col = wavelengthToCss(nm);
      ctx.fillStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 14;
      ctx.fillRect(x - bw / 2, stripY + stripH * (1 - int) * 0.15, bw, stripH * (0.55 + 0.45 * int));
      ctx.shadowBlur = 0;
      if (labels && label) {
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '9px system-ui,sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, x, stripY - 3);
      }
    }
    if (labels) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('only specific λ emitted → sharp bright lines', w / 2, h - 6);
    }
  }

  if (axis) {
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, stripY - 0.5, w - 1, stripH + 1);
    ctx.fillStyle = '#64748b';
    ctx.font = '9px system-ui,sans-serif';
    ctx.textAlign = 'center';
    for (const nm of [400, 500, 600, 700]) {
      const x = nmToScreenX(nm) * w;
      ctx.fillText(`${nm}`, x, h - 14);
    }
    ctx.fillText('λ (nm) →', w / 2, h - 2);
  }
}

export function continuousRaySamples(temp, step = 12) {
  const out = [];
  for (let nm = NM_MIN; nm <= NM_MAX; nm += step) {
    out.push([nm, blackbodyWeight(nm, temp)]);
  }
  return out;
}

export function raySamplesForSource(source, temp) {
  if (isContinuous(source)) return continuousRaySamples(temp, 10);
  return linesForSource(source);
}
