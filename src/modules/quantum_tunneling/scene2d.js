import { createDualCanvas } from '../common/teachPlots.js';
import { Plot, CANVAS_COLORS } from '../common/canvasPlot.js';
import { el } from '../common/ui.js';
import { barrierPsi, sampleTransmissionCurve, transmission } from './physics.js';

export class QuantumTunneling2D {
  constructor(host) {
    this.energy = 1.2;
    this.barrierV = 2.5;
    this.barrierW = 1.0;
    this.paused = false;
    this._hud = el('div', 'mp-hud', '');
    host.appendChild(this._hud);
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h) {
      self._draw(ctx, w, h);
    });
    this._updateHud();
  }

  setParams(p) {
    if (!p) return;
    if (p.energy != null) this.energy = p.energy;
    if (p.barrierV != null) this.barrierV = p.barrierV;
    if (p.barrierW != null) this.barrierW = p.barrierW;
    this._updateHud();
  }

  setPaused(v) { this.paused = !!v; this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  dispose() {
    this._canvas.dispose();
    if (this._hud.parentNode) this._hud.parentNode.removeChild(this._hud);
  }

  _updateHud() {
    const T = transmission(this.energy, this.barrierV, this.barrierW);
    this._hud.textContent =
      'E = ' + this.energy.toFixed(2) + '   ·   V₀ = ' + this.barrierV.toFixed(2) +
      '   ·   T(E) ≈ ' + (T * 100).toFixed(1) + '%';
  }

  _draw(ctx, w, h) {
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, w, h);
    const topH = Math.floor(h * 0.58);
    const psi = barrierPsi(this.energy, this.barrierV, this.barrierW);
    let yMax = 0.05;
    for (let i = 0; i < psi.ys.length; i++) yMax = Math.max(yMax, Math.abs(psi.ys[i]));

    const pad = [48, 36, w - 20, topH - 16];
    const plot = new Plot(ctx, pad, [psi.xMin, psi.xMax], [-yMax * 1.2, yMax * 1.2]);
    plot.axes('x', 'Re ψ', [0, this.barrierW]);

    ctx.fillStyle = 'rgba(251,191,36,0.18)';
    ctx.fillRect(plot.X(0), pad[1], plot.X(this.barrierW) - plot.X(0), pad[3] - pad[1]);
    ctx.strokeStyle = 'rgba(251,191,36,0.55)';
    ctx.strokeRect(plot.X(0), pad[1], plot.X(this.barrierW) - plot.X(0), pad[3] - pad[1]);
    ctx.fillStyle = '#fbbf24';
    ctx.font = '9px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('V₀', plot.X(this.barrierW * 0.5), pad[1] + 12);

    plot.curve(psi.xs, psi.ys, CANVAS_COLORS.accent, 2.2);
    plot.vline(this.energy / this.barrierV * this.barrierW * 0.5, 'rgba(148,163,184,0.35)');

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Stationary ψ(x) — incident from left', 48, 22);

    const botY = topH + 8;
    const botH = h - botY - 12;
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(40, botY, w - 56, botH);
    const curve = sampleTransmissionCurve(this.barrierV, this.barrierW, 90);
    const tPad = [52, botY + 22, w - 28, botY + botH - 10];
    const tPlot = new Plot(ctx, tPad, [0, curve.eMax], [0, 1.05]);
    tPlot.axes('E', 'T(E)', [0, this.barrierV, curve.eMax], function (v) { return v.toFixed(1); });
    tPlot.curve(curve.xs, curve.ys, CANVAS_COLORS.accent2, 2);
    tPlot.vline(this.energy, CANVAS_COLORS.warn);
    tPlot.vline(this.barrierV, 'rgba(251,191,36,0.6)', [3, 3]);

    const Tnow = transmission(this.energy, this.barrierV, this.barrierW);
    ctx.fillStyle = CANVAS_COLORS.warn;
    ctx.beginPath();
    ctx.arc(tPlot.X(this.energy), tPlot.Y(Tnow), 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#64748b';
    ctx.font = '600 10px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Transmission T(E)', 48, botY + 14);
  }
}
