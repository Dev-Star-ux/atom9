/** Corona discharge teaching canvas — localized tip glow + Peek's law plot. */
import { createDualCanvas } from '../common/teachPlots.js';
import { peekOnsetField, tipField, coronaActive, curvePoints } from './physics.js';

export class CoronaDischargeScene2D {
  constructor(host) {
    this.state = {
      V: 20,
      r: 0.05,
      d: 10,
      delta: 1.0,
    };
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.V != null) this.state.V = p.V;
    if (p.r != null) this.state.r = p.r;
    if (p.d != null) this.state.d = p.d;
    if (p.delta != null) this.state.delta = p.delta;
  }

  setPaused(v) { this._canvas.setPaused(v); }
  setActive(v) { this._active = !!v; }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _draw(ctx, W, H, phase) {
    if (!W || !H) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);

    const captionH = Math.min(58, Math.floor(H * 0.16));
    this._drawCaption(ctx, W, captionH);

    const schemH = Math.floor((H - captionH) * 0.7);
    this._drawSchematic(ctx, captionH, W, schemH, phase);
    this._drawCurve(ctx, 0, captionH + schemH + 4, W, H - captionH - schemH - 4);
  }

  /** Bold persistent caption strip — the single most important/confusing point. */
  _drawCaption(ctx, W, H) {
    ctx.fillStyle = 'rgba(30, 20, 55, 0.92)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(167,139,250,0.55)';
    ctx.beginPath();
    ctx.moveTo(0, H - 0.5);
    ctx.lineTo(W, H - 0.5);
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.font = '700 16px system-ui,sans-serif';
    ctx.textBaseline = 'middle';
    const line1 = 'Field concentrates at the SHARP TIP only — corona ignites there';
    const line2 = 'even though the AVERAGE field across the gap is far below breakdown!';
    if (H >= 46) {
      ctx.fillText(line1, 14, H * 0.34);
      ctx.font = '700 15px system-ui,sans-serif';
      ctx.fillStyle = '#fde68a';
      ctx.fillText(line2, 14, H * 0.74);
    } else {
      ctx.fillText(line1 + ' ' + line2, 14, H / 2);
    }
    ctx.textBaseline = 'alphabetic';
  }

  _drawSchematic(ctx, top, W, H, phase) {
    ctx.save();
    ctx.translate(0, top);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
    ctx.beginPath();
    ctx.moveTo(0, H - 0.5);
    ctx.lineTo(W, H - 0.5);
    ctx.stroke();

    const { V, r, d, delta } = this.state;
    const Etip = tipField(V, r, d);
    const Eon = peekOnsetField(r, delta);
    const active = Etip >= Eon;
    const Eavg = V / Math.max(d, 1e-6);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.fillText('Needle tip → gap → grounded plane   ·   corona is LOCAL to the tip', 16, 18);

    // Prominent live E_tip / E_onset numbers with explicit comparison in words.
    ctx.font = '700 14px system-ui,sans-serif';
    ctx.fillStyle = '#67e8f9';
    ctx.fillText('E_tip = ' + Etip.toFixed(1) + ' kV/cm', 16, 38);
    ctx.fillStyle = '#fbbf24';
    const eOnsetX = 16 + ctx.measureText('E_tip = ' + Etip.toFixed(1) + ' kV/cm').width + 24;
    ctx.fillText('E_onset = ' + Eon.toFixed(1) + ' kV/cm', eOnsetX, 38);
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.fillStyle = active ? '#a78bfa' : '#64748b';
    const cmpText = active
      ? 'E_tip >= E_onset  →  CORONA ACTIVE at the tip'
      : 'E_tip < E_onset  →  inactive (no corona)';
    ctx.fillText(cmpText, 16, 56);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(
      'V = ' + V.toFixed(1) + ' kV · r = ' + r.toFixed(3) + ' cm · d = ' + d.toFixed(1) +
      ' cm · average gap field E_avg = V/d ≈ ' + Eavg.toFixed(2) + ' kV/cm (≪ E_tip)',
      16, 72
    );

    const y = H * 0.78;
    const xTip = W * 0.16;
    const xPlane = W * 0.86;

    // Grounded plane
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(xPlane, y - 46);
    ctx.lineTo(xPlane, y + 46);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    for (let i = -4; i <= 4; i++) {
      const yy = y - 40 + i * 11;
      ctx.beginPath();
      ctx.moveTo(xPlane, yy);
      ctx.lineTo(xPlane + 8, yy + 8);
      ctx.stroke();
    }
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('grounded plane', xPlane, y + 62);

    // Needle electrode (triangle pointing right toward the plane)
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(xTip - 46, y - 12);
    ctx.lineTo(xTip - 46, y + 12);
    ctx.lineTo(xTip, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('needle (+V)', xTip - 46, y + 30);
    ctx.fillText('r = ' + r.toFixed(3) + ' cm', xTip - 46, y + 44);

    // Gap dimension line
    ctx.strokeStyle = 'rgba(148,163,184,0.4)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(xTip, y - 54);
    ctx.lineTo(xPlane, y - 54);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('gap d = ' + d.toFixed(1) + ' cm', (xTip + xPlane) / 2, y - 60);

    ctx.textAlign = 'left';

    // Contrast outline: what a FULL spark/arc filling the gap would look like.
    // Drawn faint and dashed so it reads as "not this" next to the real, localized glow.
    ctx.save();
    ctx.strokeStyle = 'rgba(248,113,113,0.32)';
    ctx.lineWidth = 3;
    ctx.setLineDash([2, 4]);
    const archH = 34;
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const x = xTip + (xPlane - xTip) * t;
      const wob = Math.sin(t * 11 + phase * 2) * 3;
      const yy = y - archH * Math.sin(t * Math.PI) * 0.6 + wob * 0.5;
      if (i === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    ctx.fillStyle = 'rgba(248,113,113,0.55)';
    ctx.font = '10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('(full breakdown would look like this — corona does NOT fill the gap)', (xTip + xPlane) / 2, y - archH - 6);
    ctx.textAlign = 'left';

    if (active) {
      this._drawCoronaGlow(ctx, xTip, y, phase, Etip, Eon);
    } else {
      // dark inactive tip
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(xTip, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('Same field-concentration idea as lightning rods & precipitators — only the sharp tip ionizes', 16, H - 8);
    ctx.restore();
  }

  _drawCoronaGlow(ctx, xTip, y, phase, Etip, Eon) {
    // Intensity grows modestly above threshold, capped for visual sanity.
    const over = Math.max(0, Math.min(1.5, (Etip - Eon) / Math.max(Eon, 1)));
    const intensity = 0.4 + 0.6 * Math.min(1, over * 2);

    // Soft halo
    const haloR = 16 + 6 * intensity;
    const grd = ctx.createRadialGradient(xTip, y, 0, xTip, y, haloR);
    const flick = 0.75 + 0.25 * Math.sin(phase * 9.3) * (0.6 + 0.4 * Math.sin(phase * 2.1));
    grd.addColorStop(0, 'rgba(167,139,250,' + (0.85 * flick).toFixed(3) + ')');
    grd.addColorStop(0.4, 'rgba(103,232,249,' + (0.4 * flick).toFixed(3) + ')');
    grd.addColorStop(1, 'rgba(103,232,249,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(xTip, y, haloR, 0, Math.PI * 2);
    ctx.fill();

    // Bright core
    ctx.fillStyle = 'rgba(224,231,255,' + (0.7 + 0.3 * flick).toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(xTip, y, 2.4, 0, Math.PI * 2);
    ctx.fill();

    // Short branching streamer filaments, deterministic pseudo-random via seeded angles
    const nBranch = 5 + Math.round(3 * Math.min(1, over));
    for (let i = 0; i < nBranch; i++) {
      const seed = i * 2.399963; // golden-angle-ish spacing for a natural look
      const baseAngle = seed + phase * 0.6;
      const jitter = Math.sin(phase * 6 + i * 7.1) * 0.18;
      const angle = baseAngle + jitter;
      const len = (10 + 8 * intensity) * (0.6 + 0.4 * Math.sin(phase * 5 + i * 3.3) * 0.5 + 0.5);
      const x1 = xTip + Math.cos(angle) * len;
      const y1 = y + Math.sin(angle) * len;
      const alpha = (0.25 + 0.35 * intensity) * flick;
      ctx.strokeStyle = 'rgba(196,181,253,' + alpha.toFixed(3) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xTip, y);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      // tiny sub-branch
      const midx = xTip + Math.cos(angle) * len * 0.6;
      const midy = y + Math.sin(angle) * len * 0.6;
      const branchAngle = angle + (i % 2 === 0 ? 0.5 : -0.5);
      const blen = len * 0.35;
      ctx.beginPath();
      ctx.moveTo(midx, midy);
      ctx.lineTo(midx + Math.cos(branchAngle) * blen, midy + Math.sin(branchAngle) * blen);
      ctx.stroke();
    }

    // Small spark dots drifting slightly outward (deterministic burst pattern)
    const nDots = 8;
    for (let i = 0; i < nDots; i++) {
      const t = (phase * 0.5 + i / nDots) % 1;
      const seed = i * 1.813;
      const angle = seed + Math.sin(seed) * 1.5;
      const rr = 3 + t * (14 + 6 * intensity);
      const dx = xTip + Math.cos(angle) * rr;
      const dy = y + Math.sin(angle) * rr;
      const a = (1 - t) * 0.6 * intensity;
      if (a <= 0.02) continue;
      ctx.fillStyle = 'rgba(103,232,249,' + a.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(dx, dy, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawCurve(ctx, ox, oy, W, H) {
    const padL = 52;
    const padR = 20;
    const padT = 50;
    const padB = 42;
    const plotX = ox + padL;
    const plotY = oy + padT;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const { V, r, d, delta } = this.state;
    const VMax = 100;
    const { points, threshold } = curvePoints(r, d, delta, VMax, 100);
    const Etip = tipField(V, r, d);
    const active = coronaActive(V, r, d, delta);

    let yMax = threshold * 1.3;
    for (let i = 0; i < points.length; i++) if (points[i].Etip > yMax) yMax = points[i].Etip * 1.05;
    yMax = Math.min(yMax, Math.max(threshold * 2.5, Etip * 1.3, 1));

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 14px system-ui,sans-serif';
    ctx.fillText('Tip field E_tip(V) vs Peek onset threshold', ox + 16, oy + 22);

    ctx.fillStyle = '#0a1122';
    ctx.fillRect(plotX, plotY, plotW, plotH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(plotX + 0.5, plotY + 0.5, plotW - 1, plotH - 1);

    function X(v) { return plotX + (v / VMax) * plotW; }
    function Y(e) { return plotY + plotH - Math.max(0, Math.min(1, e / yMax)) * plotH; }

    // Threshold line
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.8)';
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(plotX, Y(threshold));
    ctx.lineTo(plotX + plotW, Y(threshold));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#fbbf24';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('E_onset ' + threshold.toFixed(1) + ' kV/cm', plotX + 6, Y(threshold) - 4);

    // E_tip(V) curve
    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const px = X(points[i].V);
      const py = Y(points[i].Etip);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Operating point marker
    ctx.fillStyle = active ? '#a78bfa' : '#64748b';
    ctx.beginPath();
    ctx.arc(X(V), Y(Etip), 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('voltage V (kV) →', plotX + plotW / 2, oy + H - 10);
    ctx.textAlign = 'left';
    ctx.save();
    ctx.translate(14, plotY + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('E (kV/cm)', 0, 0);
    ctx.restore();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(
      'E_tip = ' + Etip.toFixed(1) + ' kV/cm   ·   E_onset = ' + threshold.toFixed(1) +
      ' kV/cm   ·   ' + (active ? 'corona ON' : 'corona off'),
      plotX, oy + 40
    );
  }
}
