import { createDualCanvas } from '../common/teachPlots.js';
import { Plot, CANVAS_COLORS } from '../common/canvasPlot.js';
import { el } from '../common/ui.js';
import { PRESETS, harmonicBars, sampleWave, targetWave } from './physics.js';

export class FourierWaves2D {
  constructor(host) {
    this.preset = 'square';
    this.nHarmonics = 7;
    this.speed = 1;
    this.paused = false;
    this._phase = 0;
    this._hud = el('div', 'mp-hud', '');
    host.appendChild(this._hud);
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      if (!self.paused) self._phase = phase * self.speed;
      self._draw(ctx, w, h);
    });
    this._updateHud();
  }

  setParams(p) {
    if (!p) return;
    if (p.preset != null) this.preset = p.preset;
    if (p.nHarmonics != null) this.nHarmonics = Math.max(1, Math.round(p.nHarmonics));
    if (p.speed != null) this.speed = p.speed;
    if (p.reset) this._phase = 0;
    this._updateHud();
  }

  setPaused(v) { this.paused = !!v; this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  dispose() {
    this._canvas.dispose();
    if (this._hud.parentNode) this._hud.parentNode.removeChild(this._hud);
  }

  _updateHud() {
    const pr = PRESETS.find(function (x) { return x.id === this.preset; }.bind(this));
    this._hud.textContent =
      (pr ? pr.label : this.preset) + ' wave   ·   N = ' + this.nHarmonics +
      ' harmonics   ·   Gibbs overshoot at jumps';
  }

  _draw(ctx, w, h) {
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, w, h);
    const topH = Math.floor(h * 0.62);
    const pad = [48, 36, w - 20, topH - 18];
    const wave = sampleWave(this.preset, this.nHarmonics, this._phase, this.speed);
    let yMax = 0.05;
    for (let i = 0; i < wave.ys.length; i++) yMax = Math.max(yMax, Math.abs(wave.ys[i]), 1.05);

    const plot = new Plot(ctx, pad, [-Math.PI, Math.PI], [-yMax, yMax]);
    plot.axes('x', 'f(x)', [-Math.PI, 0, Math.PI], function (v) {
      if (Math.abs(v) < 0.01) return '0';
      if (Math.abs(v - Math.PI) < 0.01) return 'π';
      if (Math.abs(v + Math.PI) < 0.01) return '−π';
      return v.toFixed(1);
    });

    const target = [];
    for (let i = 0; i < wave.xs.length; i++) target.push(targetWave(this.preset, wave.xs[i]));
    plot.curve(wave.xs, target, 'rgba(148,163,184,0.45)', 1.5, [4, 4]);
    plot.curve(wave.xs, wave.ys, CANVAS_COLORS.accent, 2.4);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Fourier sum (solid) vs ideal (dashed)', pad[0], 22);

    const bars = harmonicBars(this.preset, this.nHarmonics);
    const botY = topH + 10;
    const botH = h - botY - 14;
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(40, botY, w - 56, botH);
    ctx.fillStyle = '#64748b';
    ctx.font = '600 10px system-ui,sans-serif';
    ctx.fillText('Harmonic amplitudes aₙ', 48, botY + 14);

    let aMax = 0.05;
    for (let i = 0; i < bars.length; i++) aMax = Math.max(aMax, Math.abs(bars[i].a));
    const barPlot = new Plot(ctx, [52, botY + 22, w - 28, botY + botH - 8], [0.5, bars.length + 0.5], [-aMax * 1.1, aMax * 1.1]);
    for (let i = 0; i < bars.length; i++) {
      const b = bars[i];
      const col = b.a >= 0 ? CANVAS_COLORS.accent2 : CANVAS_COLORS.warn;
      barPlot.bar(b.n, 0.32, b.a, col);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '8px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(b.n), barPlot.X(b.n), botY + botH - 2);
    }
  }
}
