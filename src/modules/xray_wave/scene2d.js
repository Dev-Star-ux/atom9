// 2D Bragg — OSP-style crystal planes + path difference + I(θ).
// https://sg.iwant2study.org/ospsg/.../709-braggslaw
import { createDualCanvas } from '../common/teachPlots.js';
import { el } from '../common/ui.js';
import {
  braggSummary,
  braggIntensity,
  intensityCurve,
  braggAngleDeg,
} from './physics.js';

export class XrayWave2D {
  constructor(host) {
    this.host = host;
    this.lam = 100;
    this.d = 200;
    this.theta = 30;
    this.paused = false;
    this._active = true;
    this._phase = 0;

    this._hud = el('div', 'xw-hud', '');
    host.appendChild(this._hud);

    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      if (!self.paused && self._active) self._phase = phase;
      self._draw(ctx, w, h);
    });
    this._updateHud();
  }

  setParams(p) {
    if (!p) return;
    if (p.lam != null) this.lam = p.lam;
    if (p.d != null) this.d = p.d;
    if (p.theta != null) this.theta = p.theta;
    this._updateHud();
  }

  setPaused(v) {
    this.paused = !!v;
    this._canvas.setPaused(v);
  }

  setActive(v) {
    this._active = !!v;
    this._hud.style.display = v ? '' : 'none';
  }

  resize() { this._canvas.resize(); }

  dispose() {
    this._canvas.dispose();
    if (this._hud.parentNode) this._hud.parentNode.removeChild(this._hud);
  }

  _updateHud() {
    const s = braggSummary(this.lam, this.d, this.theta);
    this._hud.textContent =
      'λ = ' + Math.round(this.lam) + ' pm   ·   d = ' + Math.round(this.d) +
      ' pm   ·   θ = ' + this.theta.toFixed(1) + '°   ·   δ = 2d sinθ ≈ ' +
      s.deltaPm.toFixed(0) + ' pm (' + s.pathLam.toFixed(2) + ' λ)   ·   ' +
      (s.bright ? 'CONSTRUCTIVE' : 'destructive');
  }

  _draw(ctx, w, h) {
    if (!this._active) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, w, h);

    const topH = Math.floor(h * 0.58);
    this._drawApparatus(ctx, w, topH);
    this._drawIntensity(ctx, 0, topH, w, h - topH);
  }

  _drawApparatus(ctx, w, h) {
    const s = braggSummary(this.lam, this.d, this.theta);
    const bright = s.bright;
    const rad = (this.theta * Math.PI) / 180;
    const L = 28;
    const R = w - 24;
    const T = 44;
    const B = h - 14;

    // Panel
    ctx.fillStyle = 'rgba(15,23,42,0.5)';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(L, T, R - L, B - T, 12);
    else ctx.rect(L, T, R - L, B - T);
    ctx.fill();
    ctx.strokeStyle = 'rgba(148,163,184,0.3)';
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText("Bragg's law  ·  nλ = 2d sin θ", L + 12, T - 10);

    // Crystal planes (horizontal) — spacing visual
    const nPlanes = 5;
    const planeGap = Math.min(28, Math.max(14, (this.d / 200) * 22));
    const cx = L + (R - L) * 0.48;
    const cy = (T + B) / 2 + 8;
    const planeW = Math.min(220, (R - L) * 0.42);

    for (let i = 0; i < nPlanes; i++) {
      const y = cy - ((nPlanes - 1) / 2) * planeGap + i * planeGap;
      ctx.strokeStyle = 'rgba(148,163,184,0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - planeW / 2, y);
      ctx.lineTo(cx + planeW / 2, y);
      ctx.stroke();
      // atoms on plane
      for (let j = -4; j <= 4; j++) {
        ctx.beginPath();
        ctx.arc(cx + j * (planeW / 9), y, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = '#94a3b8';
        ctx.fill();
      }
    }

    // d bracket between middle planes
    const yA = cy - planeGap / 2;
    const yB = cy + planeGap / 2;
    const bx = cx + planeW / 2 + 16;
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bx, yA);
    ctx.lineTo(bx + 8, yA);
    ctx.lineTo(bx + 8, yB);
    ctx.lineTo(bx, yB);
    ctx.stroke();
    ctx.fillStyle = '#a78bfa';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('d', bx + 14, (yA + yB) / 2 + 4);

    // Reflection points on two adjacent planes
    const hitX = cx - planeW * 0.12;
    const hitY0 = cy - planeGap / 2;
    const hitY1 = cy + planeGap / 2;

    // Incident direction (glancing angle θ from plane)
    const len = Math.min(160, (R - L) * 0.32);
    const ix = -Math.cos(rad);
    const iy = -Math.sin(rad); // coming from upper-left toward plane

    // Ray 1 (upper plane)
    const i1x0 = hitX + ix * len;
    const i1y0 = hitY0 + iy * len;
    // Ray 2 (lower plane) — path longer by 2 d sinθ
    const i2x0 = hitX + ix * len;
    const i2y0 = hitY1 + iy * len;

    // Reflected directions (specular)
    const rx = Math.cos(rad);
    const ry = -Math.sin(rad);

    const beamCol = bright ? '#4ade80' : '#64748b';
    const incCol = '#38bdf8';

    this._drawRay(ctx, i1x0, i1y0, hitX, hitY0, incCol, 2);
    this._drawRay(ctx, i2x0, i2y0, hitX, hitY1, incCol, 2);
    this._drawRay(ctx, hitX, hitY0, hitX + rx * len, hitY0 + ry * len, beamCol, bright ? 2.6 : 1.6);
    this._drawRay(ctx, hitX, hitY1, hitX + rx * len, hitY1 + ry * len, beamCol, bright ? 2.6 : 1.6);

    // Wavefront ticks on rays (in-phase when constructive)
    this._drawWavefronts(ctx, i1x0, i1y0, hitX, hitY0, incCol, this._phase);
    this._drawWavefronts(ctx, i2x0, i2y0, hitX, hitY1, incCol, this._phase);
    this._drawWavefronts(ctx, hitX, hitY0, hitX + rx * len, hitY0 + ry * len, beamCol, this._phase + (bright ? 0 : 1.2));
    this._drawWavefronts(ctx, hitX, hitY1, hitX + rx * len, hitY1 + ry * len, beamCol, this._phase);

    // θ arc at upper hit
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(hitX, hitY0, 28, Math.PI, Math.PI + rad, false);
    ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('θ', hitX - 36, hitY0 - 8);

    // Path-difference callout
    ctx.fillStyle = bright ? '#4ade80' : '#94a3b8';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.textAlign = 'left';
    const msg = bright
      ? 'In phase → constructive  (δ ≈ nλ)'
      : 'Out of phase → destructive';
    ctx.fillText(msg, L + 14, B - 12);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('crystal planes', cx - 36, B - 12);

    // Source / detector labels
    ctx.fillStyle = '#7dd3fc';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('X-ray', i1x0 - 8, i1y0 - 10);
    ctx.fillStyle = bright ? '#4ade80' : '#94a3b8';
    ctx.fillText('reflected', hitX + rx * len * 0.85, hitY0 + ry * len * 0.85 - 12);
  }

  _drawRay(ctx, x0, y0, x1, y1, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  _drawWavefronts(ctx, x0, y0, x1, y1, color, phase) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const px = -uy;
    const py = ux;
    const spacing = 14;
    const n = Math.floor(len / spacing);
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.2;
    for (let i = 0; i < n; i++) {
      const t = ((i * spacing + (phase * 18) % spacing) % len) / len;
      const x = x0 + dx * t;
      const y = y0 + dy * t;
      ctx.beginPath();
      ctx.moveTo(x - px * 6, y - py * 6);
      ctx.lineTo(x + px * 6, y + py * 6);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  _drawIntensity(ctx, x0, y0, w, h) {
    ctx.fillStyle = '#070a12';
    ctx.fillRect(x0, y0, w, h);

    const padL = 48;
    const padR = 16;
    const padT = 26;
    const padB = 26;
    const L = x0 + padL;
    const R = x0 + w - padR;
    const T = y0 + padT;
    const B = y0 + h - padB;

    const curve = intensityCurve(this.d, this.lam);
    let ymax = 1e-6;
    for (let i = 0; i < curve.length; i++) if (curve[i].I > ymax) ymax = curve[i].I;
    ymax *= 1.1;

    function X(th) { return L + (R - L) * (th - 5) / 75; }
    function Y(I) { return B - (B - T) * (I / ymax); }

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Diffracted intensity I(θ)  —  peaks when nλ = 2d sin θ', L, y0 + 16);

    ctx.strokeStyle = 'rgba(148,163,184,0.3)';
    ctx.beginPath();
    ctx.moveTo(L, T);
    ctx.lineTo(L, B);
    ctx.lineTo(R, B);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(X(curve[0].theta), B);
    for (let i = 0; i < curve.length; i++) ctx.lineTo(X(curve[i].theta), Y(curve[i].I));
    ctx.lineTo(X(curve[curve.length - 1].theta), B);
    ctx.closePath();
    ctx.fillStyle = 'rgba(74,222,128,0.15)';
    ctx.fill();

    ctx.beginPath();
    for (let i = 0; i < curve.length; i++) {
      const px = X(curve[i].theta);
      const py = Y(curve[i].I);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Mark Bragg angles n=1,2
    for (let n = 1; n <= 3; n++) {
      const peak = braggAngleDeg(n, this.d, this.lam);
      if (peak == null || peak < 5 || peak > 80) continue;
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(X(peak), T);
      ctx.lineTo(X(peak), B);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#fbbf24';
      ctx.font = '600 10px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('n=' + n, X(peak), T + 12);
    }

    const I = braggIntensity(this.theta, this.d, this.lam);
    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.arc(X(this.theta), Y(I), 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('θ (degrees)', (L + R) / 2, y0 + h - 6);
  }
}
