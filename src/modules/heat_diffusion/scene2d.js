import { createDualCanvas } from '../common/teachPlots.js';
import { Plot, CANVAS_COLORS } from '../common/canvasPlot.js';
import { drawGridHeatmap, cyanMag } from '../common/gridSim2d.js';
import { el } from '../common/ui.js';
import { HeatSim } from './physics.js';

export class HeatDiffusion2D {
  constructor(host) {
    this.host = host;
    this.sim = new HeatSim();
    this.paused = false;
    this._hud = el('div', 'mp-hud', '');
    host.appendChild(this._hud);
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h) {
      if (!self.paused) self.sim.step();
      self._draw(ctx, w, h);
    });
    this._updateHud();
  }

  setParams(p) {
    if (!p) return;
    if (p.D != null) this.sim.setD(p.D);
    if (p.dim != null) this.sim.setDim(p.dim);
    if (p.reset) this.sim.resetPulse();
    this._updateHud();
  }

  setPaused(v) { this.paused = !!v; this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }

  dispose() {
    this._canvas.dispose();
    if (this._hud.parentNode) this._hud.parentNode.removeChild(this._hud);
  }

  _updateHud() {
    const d = this.sim.dim;
    this._hud.textContent =
      '∂u/∂t = D∇²u  ·  explicit FD  ·  ' +
      (d === 1 ? '1D' : '2D') +
      '  ·  t = ' + this.sim.t.toFixed(3) +
      '  ·  peak = ' + this.sim.peak().toFixed(3);
  }

  _draw(ctx, w, h) {
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, w, h);

    const pad = { l: 48, r: 16, t: 44, b: 40 };
    const box = [pad.l, pad.t, w - pad.r, h - pad.b];

    if (this.sim.dim === 2) {
      drawGridHeatmap(
        ctx, this.sim.u, this.sim.cols, this.sim.rows,
        box[0], box[1], box[2] - box[0], box[3] - box[1],
        0, 1, cyanMag,
      );
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(box[0], box[1], box[2] - box[0], box[3] - box[1]);
    } else {
      const plot = new Plot(ctx, box, [0, 1], [0, 1.05], CANVAS_COLORS);
      plot.axes('x', 'u(x)', [0, 0.25, 0.5, 0.75, 1], function (v) { return v.toFixed(2); });
      const xs = [];
      const ys = [];
      const u = this.sim.u;
      const n = this.sim.cols;
      for (let i = 0; i < n; i++) {
        xs.push(i / (n - 1));
        ys.push(u[i]);
      }
      ctx.beginPath();
      for (let i = 0; i < xs.length; i++) {
        const px = plot.X(xs[i]);
        const py = plot.Y(ys[i]);
        if (i === 0) ctx.moveTo(px, plot.Y(0));
        ctx.lineTo(px, py);
      }
      ctx.lineTo(plot.X(xs[xs.length - 1]), plot.Y(0));
      ctx.closePath();
      ctx.fillStyle = 'rgba(34,211,238,0.22)';
      ctx.fill();
      plot.curve(xs, ys, CANVAS_COLORS.accent, 2.2);
    }

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Heat diffusion — hot centre pulse', pad.l, 24);

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('cold', box[2], box[3] + 28);
    ctx.textAlign = 'left';
    ctx.fillText('hot', box[0], box[3] + 28);

    this._updateHud();
  }
}
