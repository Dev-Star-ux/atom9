/** Pulse radar teaching — antenna, target, A-scope, Pr vs R. */
import { createDualCanvas } from '../common/teachPlots.js';
import {
  delayFromRange, unambiguousRange, echoPowerRelative, echoPowerCurve,
  ascopeEcho, pulseLengthMeters, withinUnambiguous,
} from './physics.js';

export class RadarPrinciplesScene2D {
  constructor(host) {
    this.state = {
      pulseWidth: 1e-6,
      prf: 1000,
      range: 30000,
      sigma: 10,
      Pt: 1,
    };
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.pulseWidth != null) this.state.pulseWidth = p.pulseWidth;
    if (p.prf != null) this.state.prf = p.prf;
    if (p.range != null) this.state.range = p.range;
    if (p.sigma != null) this.state.sigma = p.sigma;
    if (p.Pt != null) this.state.Pt = p.Pt;
  }

  setPaused(v) { this._canvas.setPaused(v); }
  setActive(v) { this._active = !!v; }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _draw(ctx, W, H, phase) {
    if (!W || !H) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);

    const captionH = Math.min(52, Math.floor(H * 0.14));
    this._drawCaption(ctx, W, captionH);

    const schemH = Math.floor((H - captionH) * 0.68);
    this._drawSchematic(ctx, captionH, W, schemH, phase);
    this._drawCurve(ctx, 0, captionH + schemH + 4, W, H - captionH - schemH - 4);
  }

  _drawCaption(ctx, W, H) {
    const ok = withinUnambiguous(this.state.range, this.state.prf);
    ctx.fillStyle = ok ? 'rgba(22, 101, 52, 0.95)' : 'rgba(127, 29, 29, 0.96)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = ok ? '#4ade80' : '#f87171';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, H - 0.5);
    ctx.lineTo(W, H - 0.5);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 16px system-ui,sans-serif';
    ctx.fillText(
      ok
        ? 'RANGE LOCKED — echo delay maps cleanly to R = cτ / 2'
        : 'AMBIGUOUS (PRF too high / R too far) — lower PRF or bring target closer',
      14, H * 0.38
    );
    ctx.fillStyle = ok ? '#bbf7d0' : '#fecaca';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.fillText(
      'Pulse radar lab  ·  turn Pulse width, PRF, Range, RCS  ·  watch A-scope',
      14, H * 0.72
    );
    ctx.textBaseline = 'alphabetic';
  }

  _drawSchematic(ctx, top, W, H, phase) {
    ctx.save();
    ctx.translate(0, top);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 0, W, H);

    const R = this.state.range;
    const tau = delayFromRange(R);
    const Runamb = unambiguousRange(this.state.prf);
    const Pr = echoPowerRelative(this.state.Pt, this.state.sigma, R);
    const ok = withinUnambiguous(R, this.state.prf);
    const dR = pulseLengthMeters(this.state.pulseWidth);
    const pwUs = this.state.pulseWidth * 1e6;

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 14px system-ui,sans-serif';
    ctx.fillText('Pulse radar — TX dish → target → echo on A-scope', 16, 18);

    ctx.font = '700 13px system-ui,sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('R = cτ / 2', 16, 40);
    ctx.fillStyle = '#4ade80';
    ctx.fillText('τ = ' + (tau * 1e6).toFixed(2) + ' µs', 120, 40);
    ctx.fillStyle = '#67e8f9';
    ctx.fillText('R = ' + (R / 1000).toFixed(1) + ' km', 260, 40);
    ctx.fillStyle = '#a78bfa';
    ctx.fillText('pulse width = ' + pwUs.toFixed(2) + ' µs', 400, 40);

    const y = H * 0.42;
    const xAnt = W * 0.12;
    const xMax = W * 0.52;
    const frac = Math.min(R, Runamb * 1.15) / Math.max(Runamb, 1);
    const xT = xAnt + Math.min(1, frac) * (xMax - xAnt);

    // TX dish
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(xAnt, y, 28, -1.2, 1.2);
    ctx.stroke();
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(xAnt + 8, y, 5, 0, Math.PI * 2);
    ctx.fill();
    // pedestal
    ctx.fillStyle = '#64748b';
    ctx.fillRect(xAnt - 6, y + 26, 12, 18);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 12px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TX dish', xAnt, y + 58);

    // Flight path with range label
    ctx.strokeStyle = 'rgba(148,163,184,0.45)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(xAnt + 28, y);
    ctx.lineTo(xT - 20, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.fillText((R / 1000).toFixed(1) + ' km flight path', (xAnt + xT) / 2, y - 18);

    // Target diamond (aircraft/ship)
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(xT, y - 16);
    ctx.lineTo(xT + 20, y);
    ctx.lineTo(xT, y + 16);
    ctx.lineTo(xT - 20, y);
    ctx.closePath();
    ctx.fill();
    // wing tips hint
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xT - 14, y);
    ctx.lineTo(xT - 28, y - 10);
    ctx.moveTo(xT - 14, y);
    ctx.lineTo(xT - 28, y + 10);
    ctx.stroke();
    ctx.fillStyle = '#fef3c7';
    ctx.font = '700 12px system-ui,sans-serif';
    ctx.fillText('target', xT, y + 48);
    ctx.fillStyle = '#fbbf24';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('σ = ' + this.state.sigma.toFixed(1) + ' m²', xT, y + 64);
    ctx.textAlign = 'left';

    // Pulse animation
    const Tpri = 1 / Math.max(this.state.prf, 1);
    const cycle = (phase * 0.08) % 1;
    const pulsePos = cycle < 0.5 ? cycle * 2 : (cycle - 0.5) * 2;
    const goingOut = cycle < 0.5;
    const px = goingOut
      ? xAnt + pulsePos * (xT - xAnt)
      : xT - pulsePos * (xT - xAnt);
    ctx.fillStyle = goingOut ? 'rgba(74,222,128,0.9)' : 'rgba(56,189,248,0.9)';
    ctx.beginPath();
    ctx.arc(px, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = goingOut ? '#86efac' : '#7dd3fc';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText(goingOut ? 'TX pulse' : 'echo', px - 14, y - 12);

    // Status chip near geometry
    ctx.fillStyle = ok ? 'rgba(22,101,52,0.9)' : 'rgba(127,29,29,0.9)';
    ctx.fillRect(16, H * 0.72, ok ? 130 : 220, 26);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 12px system-ui,sans-serif';
    ctx.fillText(ok ? 'RANGE LOCKED' : 'AMBIGUOUS (PRF too high / R too far)', 24, H * 0.72 + 17);

    // A-scope
    const sx = W * 0.60;
    const sy = H * 0.18;
    const sw = W * 0.36;
    const sh = H * 0.58;
    ctx.fillStyle = '#020617';
    ctx.fillRect(sx, sy, sw, sh);
    ctx.strokeStyle = '#22c55e';
    ctx.strokeRect(sx, sy, sw, sh);
    ctx.fillStyle = '#4ade80';
    ctx.font = '700 12px system-ui,sans-serif';
    ctx.fillText('A-scope (amplitude vs time)', sx + 8, sy + 16);

    const tMax = Math.min(Tpri, 2 * Runamb / 2.99792458e8 * 1.05);
    const nSamp = 120;
    const plotTop = sy + 28;
    const plotBot = sy + sh - 28;
    const plotH = plotBot - plotTop;

    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= nSamp; i++) {
      const t = (i / nSamp) * tMax;
      let amp = 0;
      amp += ascopeEcho(t, 0, this.state.pulseWidth, 0.85);
      amp += ascopeEcho(t, tau, this.state.pulseWidth, Math.min(1, 0.15 + 40 * Math.sqrt(Pr)));
      const xx = sx + (i / nSamp) * sw;
      const yy = plotBot - amp * (plotH - 8);
      if (i === 0) ctx.moveTo(xx, yy);
      else ctx.lineTo(xx, yy);
    }
    ctx.stroke();

    const mx = sx + Math.min(1, tau / Math.max(tMax, 1e-12)) * sw;
    ctx.strokeStyle = '#fbbf24';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(mx, plotTop);
    ctx.lineTo(mx, plotBot);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#fbbf24';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('R marker', mx + 4, plotTop + 12);

    // Time axis labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('0', sx + 4, sy + sh - 10);
    ctx.fillText((tMax * 1e6).toFixed(0) + ' µs', sx + sw - 40, sy + sh - 10);
    ctx.textAlign = 'center';
    ctx.fillText('time →', sx + sw / 2, sy + sh - 8);
    ctx.textAlign = 'left';
    ctx.save();
    ctx.translate(sx + 10, (plotTop + plotBot) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('amp', 0, 0);
    ctx.restore();

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText(
      'ΔR ≈ c τ_p / 2 = ' + dR.toFixed(0) + ' m   ·   R_unamb = ' + (Runamb / 1000).toFixed(1) + ' km   ·   Good: green lock + echo under yellow marker',
      16, H - 8
    );
    ctx.restore();
  }

  _drawCurve(ctx, ox, oy, W, H) {
    const padL = 56;
    const padR = 20;
    const padT = 48;
    const padB = 40;
    const plotX = ox + padL;
    const plotY = oy + padT;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const Rmax = Math.max(this.state.range * 1.4, unambiguousRange(this.state.prf));
    const pts = echoPowerCurve(this.state.Pt, this.state.sigma, Rmax, 100);
    let pMax = 1e-12;
    for (let i = 0; i < pts.length; i++) {
      if (pts[i].Pr > pMax) pMax = pts[i].Pr;
    }
    const Pr = echoPowerRelative(this.state.Pt, this.state.sigma, this.state.range);
    const Runamb = unambiguousRange(this.state.prf);

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '700 14px system-ui,sans-serif';
    ctx.fillText('Echo power Pᵣ ∝ σ / R⁴ vs range', ox + 16, oy + 22);

    ctx.fillStyle = '#0a1122';
    ctx.fillRect(plotX, plotY, plotW, plotH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(plotX + 0.5, plotY + 0.5, plotW - 1, plotH - 1);

    function X(r) { return plotX + (r / Rmax) * plotW; }
    function Y(p) {
      const u = Math.log10(Math.max(p, pMax * 1e-6) / pMax);
      const t = (u + 6) / 6;
      return plotY + plotH - Math.max(0, Math.min(1, t)) * plotH;
    }

    // Unambiguous range line
    if (Runamb < Rmax) {
      ctx.strokeStyle = '#f87171';
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(X(Runamb), plotY);
      ctx.lineTo(X(Runamb), plotY + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#f87171';
      ctx.font = '600 10px system-ui,sans-serif';
      ctx.fillText('R_unamb', X(Runamb) + 4, plotY + 14);
    }

    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const px = X(pts[i].R);
      const py = Y(pts[i].Pr);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(X(this.state.range), Y(Pr), 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('range R (m) →', plotX + plotW / 2, oy + H - 10);
    ctx.textAlign = 'left';
    ctx.save();
    ctx.translate(14, plotY + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('log Pᵣ (arb.)', 0, 0);
    ctx.restore();
  }
}
