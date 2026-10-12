import { createDualCanvas } from '../common/teachPlots.js';
import { Plot, CANVAS_COLORS } from '../common/canvasPlot.js';
import { el } from '../common/ui.js';
import { eigen2x2, sampleString } from './physics.js';

export class EigenvalueLab2D {
  constructor(host) {
    this.state = { a: 2, b: 1, c: 1, d: 0, n: 1, L: 1 };
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
    if (p.a != null) this.state.a = p.a;
    if (p.b != null) this.state.b = p.b;
    if (p.c != null) this.state.c = p.c;
    if (p.d != null) this.state.d = p.d;
    if (p.n != null) this.state.n = Math.max(1, Math.round(p.n));
    if (p.L != null) this.state.L = p.L;
    this._updateHud();
  }

  setPaused(v) { this.paused = !!v; this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }

  dispose() {
    this._canvas.dispose();
    if (this._hud.parentNode) this._hud.parentNode.removeChild(this._hud);
  }

  _updateHud() {
    const ev = eigen2x2(this.state.a, this.state.b, this.state.c, this.state.d);
    let line = 'λ₁, λ₂ + sin(nπx/L)  ·  ';
    if (ev.real) {
      line += 'λ₁=' + ev.lambda1.toFixed(2) + '  λ₂=' + ev.lambda2.toFixed(2);
    } else {
      line += 'λ=' + ev.lambda1.re.toFixed(2) + '±' + ev.lambda1.im.toFixed(2) + 'i';
    }
    line += '  ·  n=' + this.state.n;
    this._hud.textContent = line;
  }

  _draw(ctx, w, h) {
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, w, h);
    const mid = Math.floor(w * 0.5);
    const pad = 12;
    this._drawMatrix(ctx, pad, 36, mid - pad * 2, h - 48);
    this._drawString(ctx, mid + pad, 36, w - mid - pad * 2, h - 48);

    ctx.strokeStyle = 'rgba(51,65,85,0.8)';
    ctx.beginPath();
    ctx.moveTo(mid, 32);
    ctx.lineTo(mid, h - 8);
    ctx.stroke();

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Eigenvalue lab — matrix & string modes', w * 0.5, 22);
  }

  _drawMatrix(ctx, x0, y0, w, h) {
    const { a, b, c, d } = this.state;
    const ev = eigen2x2(a, b, c, d);
    const cx = x0 + w * 0.5;
    const cy = y0 + h * 0.38;

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('A v = λ v', cx, y0 + 14);

    ctx.fillStyle = 'rgba(10,17,34,0.95)';
    ctx.fillRect(x0 + w * 0.15, cy - 50, w * 0.7, 100);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(x0 + w * 0.15, cy - 50, w * 0.7, 100);

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 16px ui-monospace,monospace';
    ctx.fillText('[' + a.toFixed(1) + '  ' + b.toFixed(1) + ']', cx, cy - 18);
    ctx.fillText('[' + c.toFixed(1) + '  ' + d.toFixed(1) + ']', cx, cy + 14);

    const axisLen = Math.min(w, h) * 0.22;
    this._drawEigenArrow(ctx, cx - axisLen * 0.55, cy + 70, ev.v1, '#22d3ee', 'v₁');
    this._drawEigenArrow(ctx, cx + axisLen * 0.55, cy + 70, ev.v2, '#fbbf24', 'v₂');

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10px system-ui,sans-serif';
    if (ev.real) {
      ctx.fillText('λ₁ = ' + ev.lambda1.toFixed(3), cx - axisLen * 0.55, cy + 70 + axisLen + 28);
      ctx.fillText('λ₂ = ' + ev.lambda2.toFixed(3), cx + axisLen * 0.55, cy + 70 + axisLen + 28);
    } else {
      ctx.fillText('λ = ' + ev.lambda1.re.toFixed(2) + ' ± ' + ev.lambda1.im.toFixed(2) + 'i', cx, cy + 70 + axisLen + 28);
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('tr=' + ev.trace.toFixed(2) + '  det=' + ev.det.toFixed(2), cx, y0 + h - 8);
  }

  _drawEigenArrow(ctx, ox, oy, v, color, label) {
    const len = 42;
    const ex = v[0] * len;
    const ey = -v[1] * len;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + ex, oy + ey);
    ctx.stroke();
    const ang = Math.atan2(ey, ex);
    ctx.beginPath();
    ctx.moveTo(ox + ex, oy + ey);
    ctx.lineTo(ox + ex - 8 * Math.cos(ang - 0.4), oy + ey - 8 * Math.sin(ang - 0.4));
    ctx.lineTo(ox + ex - 8 * Math.cos(ang + 0.4), oy + ey - 8 * Math.sin(ang + 0.4));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = color;
    ctx.font = '600 10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, ox, oy - 10);
  }

  _drawString(ctx, x0, y0, w, h) {
    const { n, L } = this.state;
    const sample = sampleString(n, L, 160);
    const box = [x0 + 36, y0 + 24, x0 + w - 12, y0 + h - 36];
    const plot = new Plot(ctx, box, [0, L], [-1.15, 1.15], CANVAS_COLORS);
    plot.axes('x', 'y(x)', [0, L * 0.5, L], function (v) { return v.toFixed(1); });

    plot.curve(sample.xs, sample.ys, CANVAS_COLORS.accent, 2.4);
    plot.vline(0, '#ef4444');
    plot.vline(L, '#ef4444');

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('sin(' + n + 'πx/L)', (box[0] + box[2]) * 0.5, y0 + 14);
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('fixed ends at x=0, L', (box[0] + box[2]) * 0.5, box[3] + 22);
  }
}
