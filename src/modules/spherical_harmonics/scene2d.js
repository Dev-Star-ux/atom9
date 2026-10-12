import { createDualCanvas } from '../common/teachPlots.js';
import { drawGridHeatmap, cyanMag } from '../common/gridSim2d.js';
import { buildProbGrid } from './physics.js';

export class SphericalHarmonics2D {
  constructor(host) {
    this.host = host;
    this.l = 2;
    this.m = 1;
    this.paused = false;
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h) {
      self._draw(ctx, w, h);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.l != null) this.l = Math.round(p.l);
    if (p.m != null) this.m = Math.round(p.m);
  }

  setPaused(v) { this.paused = !!v; this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _draw(ctx, w, h) {
    ctx.fillStyle = '#05070d';
    ctx.fillRect(0, 0, w, h);

    const data = buildProbGrid(this.l, this.m, 90, 45);
    const padL = 52;
    const padT = 40;
    const padR = 18;
    const padB = 44;
    const boxW = w - padL - padR;
    const boxH = h - padT - padB;

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('|Y_l^m(θ, φ)|²  heatmap', 14, 22);

    drawGridHeatmap(ctx, data.grid, data.cols, data.rows, padL, padT, boxW, boxH, 0, data.vmax, cyanMag);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(padL, padT, boxW, boxH);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('φ →  (0 … 2π)', padL + boxW / 2, h - 10);
    ctx.save();
    ctx.translate(14, padT + boxH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('θ (0 … π)', 0, 0);
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = '600 11px system-ui,sans-serif';
    const mStr = data.m >= 0 ? '+' + data.m : String(data.m);
    ctx.fillText('l = ' + data.l + ',  m = ' + mStr, padL, padT - 8);

    const barX = w - padR - 14;
    const barY = padT;
    const barH = boxH;
    for (let i = 0; i < barH; i++) {
      const t = 1 - i / barH;
      ctx.fillStyle = cyanMag(t);
      ctx.fillRect(barX, barY + i, 10, 1);
    }
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(barX, barY, 10, barH);
    ctx.fillStyle = '#64748b';
    ctx.font = '8px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('max', barX + 14, barY + 8);
    ctx.fillText('0', barX + 14, barY + barH);
  }
}
