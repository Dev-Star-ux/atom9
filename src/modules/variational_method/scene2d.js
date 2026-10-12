import { createDualCanvas } from '../common/teachPlots.js';
import { Plot, CANVAS_COLORS } from '../common/canvasPlot.js';
import {
  EXACT_ALPHA,
  EXACT_ENERGY,
  expectationEnergy,
  optimalAlpha,
  scanEnergyCurve,
  sampleTrialWaveform,
} from './physics.js';

export class Variational2D {
  constructor(host) {
    this.host = host;
    this.alpha = 0.5;
    this.paused = false;
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h) {
      self._draw(ctx, w, h);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.alpha != null) this.alpha = p.alpha;
  }

  setPaused(v) { this.paused = !!v; this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _draw(ctx, w, h) {
    ctx.fillStyle = '#05070d';
    ctx.fillRect(0, 0, w, h);

    const topH = Math.floor(h * 0.52);
    const botY = topH + 8;
    const botH = h - botY - 10;

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Variational method — harmonic oscillator ground state', 14, 20);

    const curve = scanEnergyCurve(100, 0.05, 2);
    const eMin = EXACT_ENERGY * 0.92;
    const eMax = Math.max.apply(null, curve.ys) * 1.05;
    const pad = [48, 34, w - 16, topH - 18];
    const plot = new Plot(ctx, pad, [0, 2], [eMin, eMax], CANVAS_COLORS);
    plot.axes('α', '⟨H⟩', [0, 0.5, 1, 1.5, 2], function (v) { return v.toFixed(1); });

    ctx.beginPath();
    for (let i = 0; i < curve.xs.length; i++) {
      const px = plot.X(curve.xs[i]);
      const py = plot.Y(curve.ys[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    const aOpt = optimalAlpha();
    plot.vline(aOpt, '#2dd4bf', [4, 3]);
    ctx.fillStyle = '#2dd4bf';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('α_min = ' + aOpt.toFixed(2) + '  (E₀ = ' + EXACT_ENERGY.toFixed(2) + ')', plot.X(aOpt) + 6, pad[1] + 12);

    const eCur = expectationEnergy(this.alpha);
    const pxA = plot.X(this.alpha);
    const pyE = plot.Y(eCur);
    ctx.beginPath();
    ctx.arc(pxA, pyE, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#fbbf24';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('trial ψ = exp(−αx²)', pad[0], pad[1] - 8);

    const wave = sampleTrialWaveform(this.alpha, 100, 4);
    let yMax = 1e-9;
    for (let i = 0; i < wave.trial.length; i++) {
      if (wave.trial[i] > yMax) yMax = wave.trial[i];
      if (wave.exact[i] > yMax) yMax = wave.exact[i];
    }
    yMax *= 1.15;

    const wPad = [48, botY + 28, w - 16, botY + botH - 10];
    const wPlot = new Plot(ctx, wPad, [-4, 4], [0, yMax], CANVAS_COLORS);
    wPlot.axes('x', 'ψ(x)', [-2, 0, 2], function (v) { return String(v); });

    const toYs = function (arr) {
      const out = [];
      for (let i = 0; i < arr.length; i++) out.push(arr[i]);
      return out;
    };
    wPlot.curve(wave.xs, toYs(wave.exact), '#2dd4bf', 2, [5, 4]);
    wPlot.curve(wave.xs, toYs(wave.trial), '#fbbf24', 2.4);

    ctx.fillStyle = '#64748b';
    ctx.font = '600 10px system-ui,sans-serif';
    ctx.fillText('ψ trial (α=' + this.alpha.toFixed(2) + ') vs exact (α=' + EXACT_ALPHA + ')', wPad[0], botY + 14);

    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(w - 150, botY + 10, 10, 10);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px system-ui,sans-serif';
    ctx.fillText('trial', w - 134, botY + 19);
    ctx.fillStyle = '#2dd4bf';
    ctx.fillRect(w - 100, botY + 10, 10, 10);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('exact', w - 84, botY + 19);
  }
}
