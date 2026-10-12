// Shared teaching plots for experiment panels (old-browser safe: no roundRect required).
import { Plot, CANVAS_COLORS } from './canvasPlot.js';

export function makeTeachCanvas(parent, className) {
  const c = document.createElement('canvas');
  c.className = className || 'teach-plot';
  c.width = 320;
  c.height = 140;
  parent.appendChild(c);
  return c;
}

export function drawIntensityPlot(canvas, ys, Is, fringeMm) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = '#0a1122';
  ctx.fillRect(0, 0, w, h);
  let iMax = 1e-9;
  for (let i = 0; i < Is.length; i++) if (Is[i] > iMax) iMax = Is[i];
  const yMin = ys[0];
  const yMax = ys[ys.length - 1];
  const plot = new Plot(ctx, [36, 16, w - 12, h - 28], [yMin * 1e3, yMax * 1e3], [0, 1.05]);
  plot.axes('y (mm)', 'I(y)', [-20, 0, 20], function (v) { return String(v); });
  const xs = [];
  const vals = [];
  for (let i = 0; i < ys.length; i++) {
    xs.push(ys[i] * 1e3);
    vals.push(Is[i] / iMax);
  }
  // fill under curve
  ctx.beginPath();
  for (let i = 0; i < xs.length; i++) {
    const px = plot.X(xs[i]);
    const py = plot.Y(vals[i]);
    if (i === 0) ctx.moveTo(px, plot.Y(0));
    ctx.lineTo(px, py);
  }
  ctx.lineTo(plot.X(xs[xs.length - 1]), plot.Y(0));
  ctx.closePath();
  ctx.fillStyle = 'rgba(34,211,238,0.22)';
  ctx.fill();
  plot.curve(xs, vals, CANVAS_COLORS.accent, 2);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px system-ui,sans-serif';
  if (fringeMm != null && isFinite(fringeMm)) {
    ctx.fillText('Δy ≈ ' + fringeMm.toFixed(2) + ' mm', 40, 14);
  }
}

export function drawHistVsTheory(canvas, hist, theoryXs, theoryYs, aNm) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = '#0a1122';
  ctx.fillRect(0, 0, w, h);
  const bins = hist.length;
  let hMax = 1;
  for (let i = 0; i < bins; i++) if (hist[i] > hMax) hMax = hist[i];
  let tMax = 1e-9;
  for (let i = 0; i < theoryYs.length; i++) if (theoryYs[i] > tMax) tMax = theoryYs[i];

  const plot = new Plot(ctx, [36, 14, w - 10, h - 28], [0, aNm], [0, 1.1]);
  plot.axes('x (nm)', 'P', [0, aNm / 2, aNm], function (v) { return v.toFixed(1); });

  const binW = aNm / bins;
  for (let i = 0; i < bins; i++) {
    const x = (i + 0.5) * binW;
    plot.bar(x, binW * 0.42, hist[i] / hMax, 'rgba(251,191,36,0.7)');
  }
  const xs = [];
  const ys = [];
  for (let i = 0; i < theoryXs.length; i++) {
    xs.push(theoryXs[i] * 1e9);
    ys.push(theoryYs[i] / tMax);
  }
  plot.curve(xs, ys, CANVAS_COLORS.accent, 2);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px system-ui,sans-serif';
  ctx.fillText('bars = hits · cyan = |ψ|²', 40, 12);
}

export function drawDecayAndSpectrum(canvas, ts, decay, Es, spec) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = '#0a1122';
  ctx.fillRect(0, 0, w, h);

  const mid = Math.floor(w / 2);
  // decay left
  let tMax = ts[ts.length - 1] || 1;
  const p1 = new Plot(ctx, [32, 16, mid - 10, h - 28], [0, tMax * 1e15], [0, 1.05]);
  p1.axes('t (fs)', '|ψ|²', [], function (v) { return String(Math.round(v)); });
  const txs = [];
  for (let i = 0; i < ts.length; i++) txs.push(ts[i] * 1e15);
  p1.curve(txs, decay, '#a78bfa', 2);

  // spectrum right
  let e0 = Es[0];
  let e1 = Es[Es.length - 1];
  let sMax = 1e-9;
  for (let i = 0; i < spec.length; i++) if (spec[i] > sMax) sMax = spec[i];
  const p2 = new Plot(ctx, [mid + 24, 16, w - 10, h - 28], [e0, e1], [0, 1.05]);
  p2.axes('E (eV)', 'I', [], function (v) { return v.toFixed(1); });
  const sn = [];
  for (let i = 0; i < spec.length; i++) sn.push(spec[i] / sMax);
  p2.curve(Es, sn, '#fbbf24', 2);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px system-ui,sans-serif';
  ctx.fillText('decay', 36, 12);
  ctx.fillText('spectrum', mid + 28, 12);
}

/**
 * Draw blackbody / RJ spectra into a full viewport canvas.
 * opts: { planck:[{nm,u}], rj:[{nm,u}], peakNm, cursorNm, title, showRj, band }
 */
export function drawSpectrumView(ctx, w, h, opts) {
  opts = opts || {};
  ctx.fillStyle = '#05060a';
  ctx.fillRect(0, 0, w, h);
  const pad = { l: 52, r: opts.starColor ? 88 : 18, t: 40, b: 44 };
  const box = [pad.l, pad.t, w - pad.r, h - pad.b];
  let nmMax = opts.nmMax || 2600;
  let nmMin = opts.nmMin || 100;
  let uMax = 1e-30;
  const planck = opts.planck || [];
  const rj = opts.rj || [];
  for (let i = 0; i < planck.length; i++) {
    if (planck[i].nm < nmMin || planck[i].nm > nmMax) continue;
    if (planck[i].u > uMax) uMax = planck[i].u;
  }
  if (opts.showRj) {
    for (let i = 0; i < rj.length; i++) {
      const capped = Math.min(rj[i].u, uMax * 3);
      if (capped > uMax) uMax = capped;
    }
  }
  const plot = new Plot(ctx, box, [nmMin, nmMax], [0, uMax * 1.08], CANVAS_COLORS);
  plot.axes('λ (nm)', 'u(λ)', opts.xticks || [400, 800, 1200, 1600, 2000, 2400], function (v) { return String(v); });

  // Visible band rainbow (physics-simulations / Lookang style)
  if (opts.showVisible !== false) {
    const v0 = Math.max(nmMin, 380);
    const v1 = Math.min(nmMax, 750);
    const x0 = plot.X(v0);
    const x1 = plot.X(v1);
    const bands = [
      [380, 450, '#7c3aed'],
      [450, 495, '#2563eb'],
      [495, 570, '#22c55e'],
      [570, 590, '#eab308'],
      [590, 620, '#f97316'],
      [620, 750, '#ef4444'],
    ];
    for (let i = 0; i < bands.length; i++) {
      const a = Math.max(v0, bands[i][0]);
      const b = Math.min(v1, bands[i][1]);
      if (b <= a) continue;
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = bands[i][2];
      ctx.fillRect(plot.X(a), box[1], plot.X(b) - plot.X(a), box[3] - box[1]);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    if (nmMin < 350) ctx.fillText('UV', plot.X(Math.max(nmMin, 250)), box[1] + 12);
    ctx.fillText('visible', (x0 + x1) / 2, box[1] + 12);
    if (nmMax > 800) ctx.fillText('IR', plot.X(Math.min(nmMax, 1400)), box[1] + 12);
  }

  if (opts.band && opts.band[0] != null) {
    const x0 = plot.X(opts.band[0]);
    const x1 = plot.X(opts.band[1]);
    ctx.fillStyle = 'rgba(34,211,238,0.12)';
    ctx.fillRect(x0, box[1], x1 - x0, box[3] - box[1]);
  }

  // Reference ghost curves
  const refs = opts.refCurves || [];
  for (let r = 0; r < refs.length; r++) {
    const ser = refs[r];
    if (!ser || !ser.length) continue;
    const xs = [];
    const ys = [];
    for (let i = 0; i < ser.length; i++) {
      if (ser[i].nm < nmMin || ser[i].nm > nmMax) continue;
      xs.push(ser[i].nm);
      ys.push(ser[i].u);
    }
    plot.curve(xs, ys, ser.color || 'rgba(148,163,184,0.45)', 1.4, [4, 3]);
  }

  if (opts.showRj && rj.length) {
    const xs = [];
    const ys = [];
    for (let i = 0; i < rj.length; i++) {
      xs.push(rj[i].nm);
      ys.push(Math.min(rj[i].u, uMax * 3));
    }
    plot.curve(xs, ys, '#f87171', 2);
  }
  if (planck.length) {
    const xs = [];
    const ys = [];
    for (let i = 0; i < planck.length; i++) {
      if (planck[i].nm < nmMin || planck[i].nm > nmMax) continue;
      xs.push(planck[i].nm);
      ys.push(planck[i].u);
    }
    ctx.beginPath();
    for (let i = 0; i < xs.length; i++) {
      const px = plot.X(xs[i]);
      const py = plot.Y(ys[i]);
      if (i === 0) ctx.moveTo(px, plot.Y(0));
      ctx.lineTo(px, py);
    }
    if (xs.length) {
      ctx.lineTo(plot.X(xs[xs.length - 1]), plot.Y(0));
      ctx.closePath();
      ctx.fillStyle = 'rgba(251,191,36,0.16)';
      ctx.fill();
      plot.curve(xs, ys, opts.curveColor || '#fbbf24', 2.6);
    }
  }
  if (opts.peakNm) {
    plot.vline(opts.peakNm, '#fbbf24', [4, 3]);
    ctx.fillStyle = '#fbbf24';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.textAlign = 'left';
    const px = plot.X(opts.peakNm);
    const label = 'Peak: ' + Math.round(opts.peakNm) + ' nm (Wien)';
    ctx.fillText(label, Math.min(px + 6, box[2] - 140), box[1] + 28);
    if (opts.tempLabel) {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(opts.tempLabel, Math.min(px + 6, box[2] - 140), box[1] + 44);
    }
  }
  if (opts.cursorNm != null) {
    plot.vline(opts.cursorNm, '#a78bfa', [2, 2]);
  }

  // Star / colour swatch (physics-simulations style)
  if (opts.starColor) {
    const cx = w - 44;
    const cy = pad.t + 36;
    const grd = ctx.createRadialGradient(cx - 6, cy - 6, 4, cx, cy, 28);
    grd.addColorStop(0, '#ffffff');
    grd.addColorStop(0.35, opts.starColor);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('colour', cx, cy + 42);
  }

  ctx.fillStyle = '#eaf0fb';
  ctx.font = '600 13px system-ui,sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(opts.title || 'Spectral density u(λ)', pad.l, 22);
  if (opts.showRj) {
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('Planck', pad.l + 200, 22);
    ctx.fillStyle = '#f87171';
    ctx.fillText('Rayleigh–Jeans', pad.l + 260, 22);
  }
}

/** Generic XY line chart for teaching canvases filling a viewport. */
export function drawXYView(ctx, w, h, opts) {
  opts = opts || {};
  ctx.fillStyle = '#05060a';
  ctx.fillRect(0, 0, w, h);
  const pad = { l: 52, r: 16, t: 36, b: 40 };
  const plot = new Plot(ctx, [pad.l, pad.t, w - pad.r, h - pad.b],
    opts.xrange || [0, 1], opts.yrange || [0, 1], CANVAS_COLORS);
  plot.axes(opts.xlabel || 'x', opts.ylabel || 'y', opts.xticks || [], opts.xtickFmt || function (v) { return String(v); });
  const series = opts.series || [];
  for (let s = 0; s < series.length; s++) {
    const ser = series[s];
    if (ser.fill) {
      ctx.beginPath();
      for (let i = 0; i < ser.xs.length; i++) {
        const px = plot.X(ser.xs[i]);
        const py = plot.Y(ser.ys[i]);
        if (i === 0) ctx.moveTo(px, plot.Y(0));
        ctx.lineTo(px, py);
      }
      ctx.lineTo(plot.X(ser.xs[ser.xs.length - 1]), plot.Y(0));
      ctx.closePath();
      ctx.fillStyle = ser.fill;
      ctx.fill();
    }
    plot.curve(ser.xs, ser.ys, ser.color || CANVAS_COLORS.accent, ser.width || 2, ser.dash || null);
  }
  const markers = opts.markers || [];
  for (let i = 0; i < markers.length; i++) {
    const m = markers[i];
    if (m.vline != null) plot.vline(m.vline, m.color || '#fbbf24', m.dash || [4, 3]);
    if (m.label) {
      ctx.fillStyle = m.color || '#fbbf24';
      ctx.font = '11px system-ui,sans-serif';
      ctx.fillText(m.label, plot.X(m.vline != null ? m.vline : m.x) + 4, pad.t + 12 + i * 14);
    }
  }
  ctx.fillStyle = '#eaf0fb';
  ctx.font = '13px system-ui,sans-serif';
  ctx.fillText(opts.title || '', pad.l, 22);
}

/** Lightweight full-viewport 2D canvas scene helper. */
export function createDualCanvas(host, drawFn) {
  const canvas = document.createElement('canvas');
  canvas.className = 'dual-2d-canvas';
  host.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, alive = true, paused = false, raf = 0, phase = 0;

  function resize() {
    w = host.clientWidth || 640;
    h = host.clientHeight || 400;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function loop() {
    if (!alive) return;
    raf = requestAnimationFrame(loop);
    if (!paused) phase += 0.016;
    drawFn(ctx, w, h, phase);
  }

  resize();
  raf = requestAnimationFrame(loop);

  return {
    canvas: canvas,
    ctx: ctx,
    get phase() { return phase; },
    get paused() { return paused; },
    setPaused: function (v) { paused = !!v; },
    resize: resize,
    dispose: function () {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    },
  };
}

