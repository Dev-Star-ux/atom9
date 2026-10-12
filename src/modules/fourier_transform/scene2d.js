import { createDualCanvas } from '../common/teachPlots.js';
import { Plot, CANVAS_COLORS } from '../common/canvasPlot.js';
import { el } from '../common/ui.js';
import { pulsePair, sampleTime, sampleSpectrum, T_MAX } from './physics.js';

export class FourierTransform2D {
  constructor(host) {
    this.state = { mode: 'gauss', width: 0.8 };
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
    if (p.mode != null) this.state.mode = p.mode;
    if (p.width != null) this.state.width = p.width;
    this._updateHud();
  }

  setPaused(v) { this.paused = !!v; this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }

  dispose() {
    this._canvas.dispose();
    if (this._hud.parentNode) this._hud.parentNode.removeChild(this._hud);
  }

  _updateHud() {
    const pair = pulsePair(this.state.mode, this.state.width);
    this._hud.textContent =
      pair.label + '  ·  width σ/w = ' + this.state.width.toFixed(2) +
      '  ·  narrower pulse → broader |F(ω)|';
  }

  _draw(ctx, w, h) {
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, w, h);

    const mid = Math.floor(w * 0.5);
    const pad = 12;
    const pair = pulsePair(this.state.mode, this.state.width);
    const time = sampleTime(pair.time, -T_MAX, T_MAX, 200);
    const spec = sampleSpectrum(pair.spec, -8, 8, 200);

    this._drawPanel(ctx, pad, 40, mid - pad * 2, h - 52, time, 'f(t)', 't');
    this._drawPanel(ctx, mid + pad, 40, w - mid - pad * 2, h - 52, spec, '|F(ω)|', 'ω');

    ctx.strokeStyle = 'rgba(51,65,85,0.8)';
    ctx.beginPath();
    ctx.moveTo(mid, 36);
    ctx.lineTo(mid, h - 8);
    ctx.stroke();

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Fourier transform — time domain ↔ frequency domain', w * 0.5, 22);
  }

  _drawPanel(ctx, x0, y0, w, h, data, ylabel, xlabel) {
    const box = [x0 + 36, y0 + 16, x0 + w - 8, y0 + h - 28];
    const xmin = data.xs[0];
    const xmax = data.xs[data.xs.length - 1];
    const plot = new Plot(ctx, box, [xmin, xmax], [0, 1.08], CANVAS_COLORS);
    plot.axes(xlabel, ylabel, [], function (v) { return v.toFixed(1); });

    ctx.beginPath();
    for (let i = 0; i < data.xs.length; i++) {
      const px = plot.X(data.xs[i]);
      const py = plot.Y(data.ys[i]);
      if (i === 0) ctx.moveTo(px, plot.Y(0));
      ctx.lineTo(px, py);
    }
    ctx.lineTo(plot.X(data.xs[data.xs.length - 1]), plot.Y(0));
    ctx.closePath();
    ctx.fillStyle = 'rgba(34,211,238,0.18)';
    ctx.fill();
    plot.curve(data.xs, data.ys, CANVAS_COLORS.accent, 2.2);
  }
}
