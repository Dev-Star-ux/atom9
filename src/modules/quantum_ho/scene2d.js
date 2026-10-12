import { createDualCanvas } from '../common/teachPlots.js';
import { Plot, CANVAS_COLORS } from '../common/canvasPlot.js';
import { el } from '../common/ui.js';
import { sampleLevel, hoEnergy, nodeCount } from './physics.js';

export class QuantumHO2D {
  constructor(host) {
    this.level = 0;
    this.showProb = true;
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
    if (p.level != null) this.level = Math.max(0, Math.min(6, Math.round(p.level)));
    if (p.showProb != null) this.showProb = !!p.showProb;
    this._updateHud();
  }

  setPaused(v) { this.paused = !!v; this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  dispose() {
    this._canvas.dispose();
    if (this._hud.parentNode) this._hud.parentNode.removeChild(this._hud);
  }

  _updateHud() {
    const n = this.level;
    this._hud.textContent =
      'n = ' + n + '   ·   Eₙ = ' + hoEnergy(n).toFixed(1) + ' ℏω   ·   nodes = ' + nodeCount(n);
  }

  _draw(ctx, w, h) {
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, w, h);
    const n = this.level;
    const sample = sampleLevel(n, -4.5, 4.5);
    let yMax = 0.05;
    for (let i = 0; i < sample.psi.length; i++) {
      yMax = Math.max(yMax, Math.abs(sample.psi[i]));
    }
    let pMax = 0.05;
    for (let i = 0; i < sample.prob.length; i++) pMax = Math.max(pMax, sample.prob[i]);

    const pad = [48, 40, w - 24, h - 36];
    const plot = new Plot(ctx, pad, [-4.5, 4.5], [0, pMax * 1.15]);
    plot.axes('x', '|ψ|²', [-4, 0, 4]);

    if (this.showProb) {
      ctx.beginPath();
      ctx.moveTo(plot.X(sample.xs[0]), plot.Y(0));
      for (let i = 0; i < sample.xs.length; i++) {
        ctx.lineTo(plot.X(sample.xs[i]), plot.Y(sample.prob[i]));
      }
      ctx.lineTo(plot.X(sample.xs[sample.xs.length - 1]), plot.Y(0));
      ctx.closePath();
      ctx.fillStyle = 'rgba(168,85,247,0.25)';
      ctx.fill();
      plot.curve(sample.xs, sample.prob, '#c084fc', 2.2);
    }

    const psiPlot = new Plot(ctx, pad, [-4.5, 4.5], [-yMax * 1.15, yMax * 1.15]);
    psiPlot.curve(sample.xs, sample.psi, CANVAS_COLORS.accent, 2, [5, 3]);

    const wellY = psiPlot.Y(-yMax * 1.05);
    ctx.strokeStyle = 'rgba(148,163,184,0.35)';
    ctx.beginPath();
    ctx.moveTo(pad[0], wellY);
    ctx.lineTo(pad[2], wellY);
    ctx.stroke();
    ctx.fillStyle = '#64748b';
    ctx.font = '9px system-ui,sans-serif';
    ctx.fillText('V = ½mω²x² (parabolic well)', pad[0], wellY - 6);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Quantum harmonic oscillator ψₙ(x)', 48, 22);
    ctx.fillStyle = CANVAS_COLORS.accent;
    ctx.font = '600 10px system-ui,sans-serif';
    ctx.fillText('ψₙ dashed', pad[2] - 52, pad[1] - 8);
    ctx.fillStyle = '#c084fc';
    ctx.fillText('|ψ|² filled', pad[2] - 52, pad[1] + 6);
  }
}
