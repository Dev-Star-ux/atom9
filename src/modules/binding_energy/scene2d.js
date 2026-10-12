import { createDualCanvas } from '../common/teachPlots.js';
import { Plot, CANVAS_COLORS } from '../common/canvasPlot.js';
import { el } from '../common/ui.js';
import {
  curvePoints, NUCLIDES, fissionReleaseMeV, fusionReleaseMeV, FE_PEAK_A,
  bePerNucleon, fissionFragments, FISSION_PARENTS, FUSION_PAIR, totalBinding,
} from './physics.js';

export class BindingEnergy2D {
  constructor(host) {
    this.host = host;
    this.mode = 'view';
    this.fissionA = 235;
    this._phase = 0;
    this.paused = false;
    this._active = true;
    this._animT = 0;
    this._hud = el('div', 'be-hud', '');
    host.appendChild(this._hud);
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      if (!self.paused && self._active) {
        self._phase = phase;
        self._animT += 0.016;
      }
      self._draw(ctx, w, h);
    });
    this._updateHud();
  }

  setParams(p) {
    if (!p) return;
    if (p.mode != null) this.mode = p.mode;
    if (p.fissionA != null) this.fissionA = p.fissionA;
    if (p.reset) this._animT = 0;
    this._updateHud();
  }

  setPaused(v) { this.paused = !!v; this._canvas.setPaused(v); }
  setActive(v) { this._active = !!v; this._hud.style.display = v ? '' : 'none'; }
  resize() { this._canvas.resize(); }
  dispose() {
    this._canvas.dispose();
    if (this._hud.parentNode) this._hud.parentNode.removeChild(this._hud);
  }

  _updateHud() {
    const fQ = fissionReleaseMeV(this.fissionA);
    const fuQ = fusionReleaseMeV(FUSION_PAIR.a1, FUSION_PAIR.a2);
    let line = 'B/A vs A  ·  peak at ⁵⁶Fe (8.79 MeV/nucleon)';
    if (this.mode === 'fission') line += '  ·  ΔE ≈ +' + fQ.toFixed(0) + ' MeV';
    if (this.mode === 'fusion') line += '  ·  D+T ΔE ≈ +' + fuQ.toFixed(1) + ' MeV';
    this._hud.textContent = line;
  }

  _draw(ctx, w, h) {
    if (!this._active) return;
    const mainH = Math.floor(h * 0.72);
    this._drawCurve(ctx, w, mainH);
    this._drawEnergyBar(ctx, 0, mainH, w, h - mainH);
  }

  _drawCurve(ctx, w, h) {
    ctx.fillStyle = '#070d18';
    ctx.fillRect(0, 0, w, h);

    const pad = [48, 20, w - 16, h - 36];
    const plot = new Plot(ctx, pad, [0, 250], [0, 9.5]);
    const curve = curvePoints(140, 1, 250);

    // Region shading
    ctx.fillStyle = 'rgba(74,222,128,0.06)';
    ctx.fillRect(plot.X(0), plot.y0, plot.X(28) - plot.X(0), plot.y1 - plot.y0);
    ctx.fillStyle = 'rgba(248,113,113,0.06)';
    ctx.fillRect(plot.X(150), plot.y0, plot.X(250) - plot.X(150), plot.y1 - plot.y0);

    ctx.fillStyle = 'rgba(251,191,36,0.08)';
    ctx.fillRect(plot.X(FE_PEAK_A - 20), plot.y0, plot.X(FE_PEAK_A + 20) - plot.X(FE_PEAK_A - 20), plot.y1 - plot.y0);

    plot.axes('Mass number A', 'B/A (MeV)', [0, 56, 120, 200, 250], function (v) { return String(v); });

    // Fill under curve
    ctx.beginPath();
    for (let i = 0; i < curve.xs.length; i++) {
      const px = plot.X(curve.xs[i]);
      const py = plot.Y(curve.ys[i]);
      if (i === 0) ctx.moveTo(px, plot.Y(0));
      ctx.lineTo(px, py);
    }
    ctx.lineTo(plot.X(curve.xs[curve.xs.length - 1]), plot.Y(0));
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, plot.y0, 0, plot.y1);
    grad.addColorStop(0, 'rgba(34,211,238,0.28)');
    grad.addColorStop(1, 'rgba(34,211,238,0.04)');
    ctx.fillStyle = grad;
    ctx.fill();
    plot.curve(curve.xs, curve.ys, CANVAS_COLORS.accent, 2.5);

    ctx.font = '600 10px system-ui,sans-serif';
    ctx.fillStyle = '#86efac';
    ctx.textAlign = 'left';
    ctx.fillText('FUSION → climb curve', plot.X(4), plot.y0 + 14);
    ctx.fillStyle = '#fca5a5';
    ctx.fillText('FISSION → climb curve', plot.X(168), plot.y0 + 14);
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'center';
    ctx.fillText('max stability', plot.X(FE_PEAK_A), plot.Y(bePerNucleon(FE_PEAK_A)) - 14);

    if (this.mode === 'fission') this._drawFission(ctx, plot);
    if (this.mode === 'fusion') this._drawFusion(ctx, plot);

    // Key nuclide markers (dedupe by A)
    const seen = {};
    for (let j = 0; j < NUCLIDES.length; j++) {
      const n = NUCLIDES[j];
      if (seen[n[0]]) continue;
      seen[n[0]] = true;
      const px = plot.X(n[0]);
      const py = plot.Y(n[1]);
      const r = n[3] === 'peak' ? 7 : n[3] === 'heavy' ? 6 : 5;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = n[3] === 'peak' ? '#fbbf24' : n[3] === 'heavy' ? '#f87171' : '#4ade80';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '9px system-ui,sans-serif';
      ctx.fillText(n[2], px, py - r - 4);
    }

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Binding energy per nucleon — one curve for fission & fusion', 14, 18);
  }

  _drawFission(ctx, plot) {
    const A = this.fissionA;
    const { a1, a2 } = fissionFragments(A);
    const pulse = 0.5 + 0.5 * Math.sin(this._animT * 3);
    const split = Math.min(1, this._animT * 0.35);
    const px = plot.X(A);
    const py = plot.Y(bePerNucleon(A));
    const px1 = plot.X(a1);
    const py1 = plot.Y(bePerNucleon(a1));
    const px2 = plot.X(a2);
    const py2 = plot.Y(bePerNucleon(a2));

    ctx.strokeStyle = 'rgba(248,113,113,' + (0.5 + pulse * 0.3) + ')';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px1 + (px - px1) * (1 - split), py1 + (py - py1) * (1 - split));
    ctx.moveTo(px, py);
    ctx.lineTo(px2 + (px - px2) * (1 - split), py2 + (py - py2) * (1 - split));
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(px, py, 9 + pulse * 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(248,113,113,0.25)';
    ctx.fill();
    ctx.strokeStyle = '#f87171';
    ctx.stroke();

    if (split > 0.6) {
      ctx.beginPath();
      ctx.arc(px1, py1, 6, 0, Math.PI * 2);
      ctx.arc(px2, py2, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#fb923c';
      ctx.fill();
    }
  }

  _drawFusion(ctx, plot) {
    const { a1, a2 } = FUSION_PAIR;
    const A = a1 + a2;
    const merge = Math.min(1, this._animT * 0.4);
    const px1 = plot.X(a1);
    const py1 = plot.Y(bePerNucleon(a1));
    const px2 = plot.X(a2);
    const py2 = plot.Y(bePerNucleon(a2));
    const pxP = plot.X(A);
    const pyP = plot.Y(bePerNucleon(A));
    const mx = px1 + (px2 - px1) * 0.5;
    const my = py1 + (py2 - py1) * 0.5;
    const cx = px1 + (mx - px1) * (1 - merge) + (pxP - px1) * merge;
    const cy = py1 + (my - py1) * (1 - merge) + (pyP - py1) * merge;

    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px1, py1);
    ctx.lineTo(cx, cy);
    ctx.moveTo(px2, py2);
    ctx.lineTo(cx, cy);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 7 + merge * 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(74,222,128,0.35)';
    ctx.fill();
    ctx.strokeStyle = '#4ade80';
    ctx.stroke();
  }

  _drawEnergyBar(ctx, x, y, w, h) {
    ctx.fillStyle = '#0a1122';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(51,65,85,0.6)';
    ctx.strokeRect(x + 12, y + 8, w - 24, h - 16);

    const fQ = fissionReleaseMeV(this.fissionA);
    const fuQ = fusionReleaseMeV(FUSION_PAIR.a1, FUSION_PAIR.a2);
    const maxQ = 220;
    const barY = y + h * 0.42;
    const barL = x + 40;
    const barW = w - 80;

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Energy released (teaching model)', barL, y + 22);

    ctx.fillStyle = '#fca5a5';
    ctx.fillText('Fission ' + this.fissionA, barL, barY - 6);
    ctx.fillStyle = 'rgba(248,113,113,0.7)';
    ctx.fillRect(barL, barY, barW * Math.min(1, fQ / maxQ), 14);

    ctx.fillStyle = '#86efac';
    ctx.fillText('Fusion D+T', barL, barY + 28);
    ctx.fillStyle = 'rgba(74,222,128,0.7)';
    ctx.fillRect(barL, barY + 34, barW * Math.min(1, fuQ / maxQ), 14);

    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';
    ctx.fillText(fQ.toFixed(0) + ' MeV', barL + barW, barY + 12);
    ctx.fillText(fuQ.toFixed(1) + ' MeV', barL + barW, barY + 46);
  }
}
