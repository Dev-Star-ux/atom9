import { createDualCanvas } from '../common/teachPlots.js';
import { drawGridHeatmap } from '../common/gridSim2d.js';
import { el } from '../common/ui.js';
import {
  createGrayScott,
  stepGrayScott,
  gridRange,
  rdColor,
  GRID_COLS,
  GRID_ROWS,
  DEFAULT_DU,
  DEFAULT_DV,
} from './physics.js';

export class PdeVisual2D {
  constructor(host) {
    this.host = host;
    this.paused = false;
    this.speed = 1;
    this._sim = null;
    this._showField = 'v';

    this._hud = el('div', 'wb-hud', '');
    host.appendChild(this._hud);

    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h) {
      if (!self.paused) self._tick();
      self._draw(ctx, w, h);
    });
    this._initSim({});
  }

  _initSim(p) {
    const F = p.F != null ? p.F : 0.035;
    const k = p.k != null ? p.k : 0.065;
    const Du = p.Du != null ? p.Du : DEFAULT_DU;
    const Dv = p.Dv != null ? p.Dv : DEFAULT_DV;
    this._sim = createGrayScott(GRID_COLS, GRID_ROWS, F, k, Du, Dv);
  }

  setParams(p) {
    if (!p) return;
    if (p.speed != null) this.speed = p.speed;
    if (p.showField != null) this._showField = p.showField;
    const needReset = !!p.reset
      || (p.F != null && this._sim && p.F !== this._sim.F)
      || (p.k != null && this._sim && p.k !== this._sim.k)
      || (p.Du != null && this._sim && p.Du !== this._sim.Du)
      || (p.Dv != null && this._sim && p.Dv !== this._sim.Dv);
    if (needReset) {
      this._initSim(p);
    } else if (this._sim) {
      if (p.F != null) this._sim.F = p.F;
      if (p.k != null) this._sim.k = p.k;
      if (p.Du != null) this._sim.Du = p.Du;
      if (p.Dv != null) this._sim.Dv = p.Dv;
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
    if (!this._sim) return;
    const n = Math.max(1, Math.round(this.speed * 4));
    stepGrayScott(this._sim, n);
  }

  _updateHud() {
    if (!this._sim) return;
    this._hud.textContent =
      'Gray–Scott   ·   F=' + this._sim.F.toFixed(4) +
      '   k=' + this._sim.k.toFixed(4) +
      '   ·   showing ' + this._showField;
  }

  _draw(ctx, w, h) {
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, w, h);
    if (!this._sim) return;

    const pad = 28;
    const side = Math.min(w - pad * 2, h - pad * 2 - 20);
    const x0 = (w - side) / 2;
    const y0 = pad + 8;
    const field = this._showField === 'u' ? this._sim.u : this._sim.v;
    const range = gridRange(field);
    const vmin = range[0];
    const vmax = range[1];

    drawGridHeatmap(ctx, field, this._sim.cols, this._sim.rows, x0, y0, side, side, vmin, vmax, rdColor);

    ctx.strokeStyle = 'rgba(148,163,184,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x0, y0, side, side);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Reaction–diffusion (Gray–Scott)', pad, 20);

    ctx.fillStyle = '#64748b';
    ctx.font = '11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('activator v  ·  ∂u/∂t = Du∇²u − uv² + F(1−u)', w / 2, h - 10);
  }
}
