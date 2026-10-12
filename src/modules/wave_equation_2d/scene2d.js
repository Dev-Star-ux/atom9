import { createDualCanvas } from '../common/teachPlots.js';
import { drawGridHeatmap, cyanMag } from '../common/gridSim2d.js';
import { el } from '../common/ui.js';
import { WaveGrid2D, COLS, ROWS } from './physics.js';

export class WaveEquation2D {
  constructor(host) {
    this.sim = new WaveGrid2D(COLS, ROWS);
    this.slit = false;
    this.sourceStrength = 45;
    this.paused = false;
    this._hud = el('div', 'mp-hud', '');
    host.appendChild(this._hud);
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h) {
      if (!self.paused) self.sim.step(2);
      self._draw(ctx, w, h);
    });
    this._updateHud();
  }

  setParams(p) {
    if (!p) return;
    if (p.slit != null) {
      this.slit = !!p.slit;
      this.sim.setSlit(this.slit);
    }
    if (p.sourceStrength != null) {
      this.sourceStrength = p.sourceStrength;
      this.sim.amplitude = 0.15 + (p.sourceStrength / 100) * 0.55;
    }
    if (p.omega != null) this.sim.omega = 0.08 + (p.omega / 100) * 0.35;
    if (p.reset) this.sim.reset();
    this._updateHud();
  }

  setPaused(v) { this.paused = !!v; this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  dispose() {
    this._canvas.dispose();
    if (this._hud.parentNode) this._hud.parentNode.removeChild(this._hud);
  }

  _updateHud() {
    this._hud.textContent =
      COLS + '×' + ROWS + ' FDTD grid   ·   point source   ·   ' +
      (this.slit ? 'barrier + slit (diffraction)' : 'open medium');
  }

  _draw(ctx, w, h) {
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, w, h);
    const margin = 36;
    const gw = w - margin * 2;
    const gh = h - margin * 2 - 20;
    const peak = this.sim.peakAbs();
    drawGridHeatmap(ctx, this.sim.u, COLS, ROWS, margin, margin + 10, gw, gh, -peak, peak, cyanMag);

    if (this.slit) {
      const bx = margin + (COLS * 0.52 / COLS) * gw;
      ctx.strokeStyle = 'rgba(251,191,36,0.55)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(bx, margin + 10);
      ctx.lineTo(bx, margin + 10 + gh);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const sx = margin + (this.sim.sourceX / COLS) * gw;
    const sy = margin + 10 + (this.sim.sourceY / ROWS) * gh;
    ctx.beginPath();
    ctx.arc(sx, sy, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#fbbf24';
    ctx.fill();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('2-D wave field u(x,y,t)', margin, 22);
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('∂²u/∂t² = c² ∇²u', margin, h - 10);
  }
}
