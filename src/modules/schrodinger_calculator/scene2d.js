import { createDualCanvas } from '../common/teachPlots.js';
import { Plot, CANVAS_COLORS } from '../common/canvasPlot.js';
import { el } from '../common/ui.js';
import { solveWell, levelCurves, analyticEnergyEV, N_LEVELS } from './physics.js';

export class SchrodingerCalculator2D {
  constructor(host) {
    this.state = { L: 1e-9, level: 1 };
    this.solution = solveWell(1e-9);
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
    let rebuild = false;
    if (p.L != null && p.L !== this.state.L) {
      this.state.L = p.L;
      rebuild = true;
    }
    if (p.level != null) this.state.level = Math.max(1, Math.min(N_LEVELS, Math.round(p.level)));
    if (rebuild || p.reset) this.solution = solveWell(this.state.L);
    this._updateHud();
  }

  setPaused(v) { this.paused = !!v; this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }

  dispose() {
    this._canvas.dispose();
    if (this._hud.parentNode) this._hud.parentNode.removeChild(this._hud);
  }

  _updateHud() {
    const idx = this.state.level - 1;
    const lvl = this.solution.levels[idx];
    const E = lvl ? lvl.E : 0;
    const Ea = analyticEnergyEV(this.state.level, this.state.L);
    this._hud.textContent =
      'FDM square well  ·  L=' + (this.state.L * 1e9).toFixed(2) + ' nm  ·  n=' + this.state.level +
      '  ·  E_FDM=' + E.toFixed(3) + ' eV  ·  E_exact=' + Ea.toFixed(3) + ' eV';
  }

  _draw(ctx, w, h) {
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, w, h);

    const topH = Math.floor(h * 0.38);
    this._drawLevels(ctx, 40, 36, w - 56, topH - 12);
    this._drawWave(ctx, 40, topH + 8, w - 56, h - topH - 24);

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('1D Schrödinger — infinite square well (FDM)', 40, 22);
  }

  _drawLevels(ctx, x0, y0, w, h) {
    const levels = this.solution.levels;
    let eMax = 1e-9;
    for (let i = 0; i < levels.length; i++) if (levels[i].E > eMax) eMax = levels[i].E;
    eMax *= 1.15;

    const box = [x0, y0, x0 + w, y0 + h];
    const plot = new Plot(ctx, box, [0, N_LEVELS + 1], [0, eMax], CANVAS_COLORS);
    plot.axes('level n', 'E (eV)', [1, 2, 3, 4], function (v) { return 'n=' + v; });

    for (let i = 0; i < levels.length; i++) {
      const E = levels[i].E;
      const sel = i + 1 === this.state.level;
      ctx.strokeStyle = sel ? '#fbbf24' : '#22d3ee';
      ctx.lineWidth = sel ? 3 : 2;
      const y = plot.Y(E);
      const xL = plot.X(i + 0.65);
      const xR = plot.X(i + 1.35);
      ctx.beginPath();
      ctx.moveTo(xL, y);
      ctx.lineTo(xR, y);
      ctx.stroke();

      const Ea = analyticEnergyEV(i + 1, this.state.L);
      ctx.fillStyle = sel ? '#fbbf24' : '#64748b';
      ctx.font = '9px system-ui,sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(E.toFixed(2) + ' eV', xR + 4, y + 3);
      ctx.fillStyle = '#475569';
      ctx.fillText('(' + Ea.toFixed(2) + ')', xR + 4, y + 13);
    }
  }

  _drawWave(ctx, x0, y0, w, h) {
    const idx = this.state.level - 1;
    const curves = levelCurves(this.solution, idx);
    const Lnm = this.state.L * 1e9;

    const box = [x0 + 40, y0 + 20, x0 + w - 12, y0 + h - 28];
    const plot = new Plot(ctx, box, [0, Lnm], [-1.15, 1.15], CANVAS_COLORS);
    plot.axes('x (nm)', 'ψ_n(x)', [0, Lnm * 0.5, Lnm], function (v) { return v.toFixed(1); });

    plot.vline(0, '#ef4444');
    plot.vline(Lnm, '#ef4444');
    plot.curve(curves.xs, curves.psi, CANVAS_COLORS.accent, 2.4);

    const probXs = curves.xs;
    const probYs = curves.prob;
    let pMax = 1e-9;
    for (let i = 0; i < probYs.length; i++) if (probYs[i] > pMax) pMax = probYs[i];
    const probNorm = probYs.map(function (v) { return v / pMax; });
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    for (let i = 0; i < probXs.length; i++) {
      const px = plot.X(probXs[i]);
      const py = plot.Y(probNorm[i]);
      if (i === 0) ctx.moveTo(px, plot.Y(0));
      ctx.lineTo(px, py);
    }
    ctx.lineTo(plot.X(probXs[probXs.length - 1]), plot.Y(0));
    ctx.closePath();
    ctx.fillStyle = '#a78bfa';
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('|ψ|² (scaled)', box[0], box[1] - 6);
  }
}
