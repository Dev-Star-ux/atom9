import { createDualCanvas } from '../common/teachPlots.js';
import { Plot } from '../common/canvasPlot.js';
import { el } from '../common/ui.js';
import {
  METHODS,
  createIntegrators,
  advanceAll,
  exactSolution,
  energy,
} from './physics.js';

const TRAIL_MAX = 600;
const HISTORY_MAX = 400;

export class NumericalMethods2D {
  constructor(host) {
    this.host = host;
    this.paused = false;
    this.omega = 2;
    this.dt = 0.08;
    this.x0 = 1;
    this.v0 = 0;
    this._t = 0;
    this._integrators = null;
    this._history = { t: [], exact: [] };

    this._hud = el('div', 'wb-hud', '');
    host.appendChild(this._hud);

    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h) {
      if (!self.paused) self._tick();
      self._draw(ctx, w, h);
    });
    this._reset({});
  }

  _reset(p) {
    this.omega = p.omega != null ? p.omega : this.omega;
    this.dt = p.dt != null ? p.dt : this.dt;
    this.x0 = p.x0 != null ? p.x0 : this.x0;
    this.v0 = p.v0 != null ? p.v0 : this.v0;
    this._t = 0;
    this._integrators = createIntegrators(this.x0, this.v0, this.omega);
    this._history = { t: [0], exact: [this.x0] };
    this._updateHud();
  }

  setParams(p) {
    if (!p) return;
    const needReset = !!p.reset
      || (p.omega != null && p.omega !== this.omega)
      || (p.dt != null && p.dt !== this.dt)
      || (p.x0 != null && p.x0 !== this.x0)
      || (p.v0 != null && p.v0 !== this.v0);
    if (needReset) this._reset(p);
    else {
      if (p.omega != null) this.omega = p.omega;
      if (p.dt != null) this.dt = p.dt;
    }
    this._updateHud();
  }

  setPaused(v) {
    this.paused = !!v;
    this._canvas.setPaused(v);
  }

  resize() { this._canvas.resize(); }

  dispose() {
    this._canvas.dispose();
    if (this._hud.parentNode) this._hud.parentNode.removeChild(this._hud);
  }

  _tick() {
    if (!this._integrators) return;
    advanceAll(this._integrators, this.dt, this.omega, TRAIL_MAX);
    this._t += this.dt;
    this._history.t.push(this._t);
    this._history.exact.push(exactSolution(this._t, this.x0, this.v0, this.omega).x);
    if (this._history.t.length > HISTORY_MAX) {
      this._history.t.shift();
      this._history.exact.shift();
    }
  }

  _updateHud() {
    const e0 = energy(this.x0, this.v0, this.omega);
    this._hud.textContent =
      'ω=' + this.omega.toFixed(2) + '   ·   Δt=' + this.dt.toFixed(3) +
      '   ·   E₀=' + e0.toFixed(3);
  }

  _draw(ctx, w, h) {
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, w, h);

    const pad = { l: 48, r: 16, t: 36, b: 36 };
    const gap = 14;
    const midY = Math.floor(h * 0.42);
    const topBox = [pad.l, pad.t, w - pad.r, midY];
    const botBox = [pad.l, midY + gap, w - pad.r, h - pad.b];

    this._drawTimeSeries(ctx, topBox);
    this._drawPhase(ctx, botBox);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Harmonic oscillator integrators', pad.l, 20);
  }

  _drawTimeSeries(ctx, box) {
    const hist = this._history;
    if (!hist.t.length || !this._integrators) return;

    const tMin = hist.t[0];
    const tMax = Math.max(hist.t[hist.t.length - 1], tMin + 0.1);
    let yMin = -1.2;
    let yMax = 1.2;
    for (const m of METHODS) {
      const trail = this._integrators[m.id].trail;
      for (let i = 0; i < trail.length; i++) {
        if (trail[i].x < yMin) yMin = trail[i].x;
        if (trail[i].x > yMax) yMax = trail[i].x;
      }
    }
    yMin = Math.min(yMin, -1.2);
    yMax = Math.max(yMax, 1.2);

    const plot = new Plot(ctx, box, [tMin, tMax], [yMin, yMax]);
    plot.axes('t', 'x(t)', [], function (v) { return v.toFixed(1); });

    plot.curve(hist.t, hist.exact, 'rgba(148,163,184,0.55)', 1.5, [4, 3]);

    for (const m of METHODS) {
      const trail = this._integrators[m.id].trail;
      const xs = [];
      const ys = [];
      const n = trail.length;
      const tStart = this._t - (n - 1) * this.dt;
      for (let i = 0; i < n; i++) {
        xs.push(tStart + i * this.dt);
        ys.push(trail[i].x);
      }
      plot.curve(xs, ys, m.color, 2);
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('x(t)', box[0] + 6, box[1] + 14);
  }

  _drawPhase(ctx, box) {
    if (!this._integrators) return;

    const lim = 1.6;
    const vLim = lim * this.omega;
    const plot = new Plot(ctx, box, [-lim, lim], [-vLim, vLim]);
    plot.axes('x', 'v = dx/dt', [-1, 0, 1], function (v) { return v.toFixed(1); });

    // Exact reference ellipse (quarter arc segments)
    const refX = [];
    const refY = [];
    for (let i = 0; i <= 120; i++) {
      const ang = (i / 120) * Math.PI * 2;
      refX.push(this.x0 * Math.cos(ang) + (this.v0 / this.omega) * Math.sin(ang));
      refY.push(this.v0 * Math.cos(ang) - this.x0 * this.omega * Math.sin(ang));
    }
    plot.curve(refX, refY, 'rgba(148,163,184,0.35)', 1.5, [4, 3]);

    for (const m of METHODS) {
      const trail = this._integrators[m.id].trail;
      const xs = [];
      const ys = [];
      for (let i = 0; i < trail.length; i++) {
        xs.push(trail[i].x);
        ys.push(trail[i].v);
      }
      plot.curve(xs, ys, m.color, 2);

      const last = trail[trail.length - 1];
      if (last) {
        ctx.fillStyle = m.color;
        ctx.beginPath();
        ctx.arc(plot.X(last.x), plot.Y(last.v), 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Phase space (x, v)', box[0] + 6, box[1] + 14);

    let lx = box[2] - 8;
    for (let i = METHODS.length - 1; i >= 0; i--) {
      const m = METHODS[i];
      ctx.fillStyle = m.color;
      ctx.textAlign = 'right';
      ctx.fillText(m.label, lx, box[1] + 14);
      lx -= ctx.measureText(m.label).width + 16;
    }
  }
}
