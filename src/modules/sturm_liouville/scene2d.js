import { createDualCanvas } from '../common/teachPlots.js';
import { Plot, CANVAS_COLORS } from '../common/canvasPlot.js';
import {
  legendreP,
  besselJ,
  sampleLegendre,
  sampleBessel,
  legendreInnerProduct,
  besselInnerProduct,
  productOnGrid,
  integrateTrapezoid,
} from './physics.js';

export class SturmLiouville2D {
  constructor(host) {
    this.host = host;
    this.family = 'legendre';
    this.order1 = 2;
    this.order2 = 3;
    this.paused = false;
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h) {
      self._draw(ctx, w, h);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.family != null) this.family = p.family;
    if (p.order1 != null) this.order1 = Math.round(p.order1);
    if (p.order2 != null) this.order2 = Math.round(p.order2);
  }

  setPaused(v) { this.paused = !!v; this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _draw(ctx, w, h) {
    ctx.fillStyle = '#05070d';
    ctx.fillRect(0, 0, w, h);

    const isLeg = this.family === 'legendre';
    const o1 = this.order1;
    const o2 = this.order2;

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(isLeg ? 'Legendre P_l(x) on [−1, 1]' : 'Bessel J_n(x) on [0, 10]', 14, 20);

    const topH = Math.floor(h * 0.55);
    const botY = topH + 10;
    const botH = h - botY - 12;

    let s1; let s2; let inner; let weightLabel;
    if (isLeg) {
      s1 = sampleLegendre(o1, 140);
      s2 = sampleLegendre(o2, 140);
      inner = legendreInnerProduct(o1, o2);
      weightLabel = 'w(x)=1';
      const prod = productOnGrid(
        function (x) { return legendreP(o1, x); },
        function (x) { return legendreP(o2, x); },
        function () { return 1; },
        -1, 1, 140
      );
      if (o1 !== o2) {
        const num = integrateTrapezoid(prod.xs, prod.ys);
        inner = num;
      }
    } else {
      s1 = sampleBessel(o1, 140, 10);
      s2 = sampleBessel(o2, 140, 10);
      inner = besselInnerProduct(o1, o2, 10);
      weightLabel = 'w(x)=x';
      const prod = productOnGrid(
        function (x) { return besselJ(o1, x); },
        function (x) { return besselJ(o2, x); },
        function (x) { return x; },
        0.001, 10, 140
      );
      inner = integrateTrapezoid(prod.xs, prod.ys);
    }

    let yMax = 1e-9;
    for (let i = 0; i < s1.ys.length; i++) {
      if (Math.abs(s1.ys[i]) > yMax) yMax = Math.abs(s1.ys[i]);
      if (Math.abs(s2.ys[i]) > yMax) yMax = Math.abs(s2.ys[i]);
    }
    yMax *= 1.15;

    const pad = [52, 36, w - 16, topH - 14];
    const plot = new Plot(ctx, pad, [s1.xs[0], s1.xs[s1.xs.length - 1]], [-yMax, yMax], CANVAS_COLORS);
    const sym = isLeg ? 'P' : 'J';
    plot.axes('x', sym + '(x)', isLeg ? [-1, 0, 1] : [0, 5, 10], function (v) { return String(v); });

    const c1 = '#38bdf8';
    const c2 = '#f472b6';
    plot.curve(s1.xs, s1.ys, c1, 2.4);
    plot.curve(s2.xs, s2.ys, c2, 2.4, [6, 4]);

    ctx.fillStyle = c1;
    ctx.fillRect(pad[0], pad[1] - 18, 10, 10);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px system-ui,sans-serif';
    ctx.fillText(sym + '_' + o1 + '(x)', pad[0] + 14, pad[1] - 9);
    ctx.fillStyle = c2;
    ctx.fillRect(pad[0] + 70, pad[1] - 18, 10, 10);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(sym + '_' + o2 + '(x)', pad[0] + 84, pad[1] - 9);

    const prod = isLeg
      ? productOnGrid(
        function (x) { return legendreP(o1, x); },
        function (x) { return legendreP(o2, x); },
        function () { return 1; },
        -1, 1, 120
      )
      : productOnGrid(
        function (x) { return besselJ(o1, x); },
        function (x) { return besselJ(o2, x); },
        function (x) { return x; },
        0.001, 10, 120
      );

    let pMax = 1e-9;
    for (let i = 0; i < prod.ys.length; i++) {
      if (Math.abs(prod.ys[i]) > pMax) pMax = Math.abs(prod.ys[i]);
    }
    pMax = Math.max(pMax, 0.05) * 1.2;

    const pPad = [52, botY + 28, w - 16, botY + botH - 8];
    const pPlot = new Plot(ctx, pPad, [prod.xs[0], prod.xs[prod.xs.length - 1]], [-pMax, pMax], CANVAS_COLORS);
    pPlot.axes('x', sym + '_' + o1 + ' · ' + sym + '_' + o2 + ' · w(x)', [], function () { return ''; });

    ctx.beginPath();
    for (let i = 0; i < prod.xs.length; i++) {
      const px = pPlot.X(prod.xs[i]);
      const py = pPlot.Y(prod.ys[i]);
      if (i === 0) ctx.moveTo(px, pPlot.Y(0));
      ctx.lineTo(px, py);
    }
    ctx.lineTo(pPlot.X(prod.xs[prod.xs.length - 1]), pPlot.Y(0));
    ctx.closePath();
    ctx.fillStyle = o1 === o2 ? 'rgba(45,212,191,0.22)' : 'rgba(148,163,184,0.18)';
    ctx.fill();
    pPlot.curve(prod.xs, prod.ys, o1 === o2 ? '#2dd4bf' : '#94a3b8', 2);

    ctx.fillStyle = '#64748b';
    ctx.font = '600 10px system-ui,sans-serif';
    ctx.fillText('Orthogonality: ∫ f_i f_j w(x) dx  ≈  ' + inner.toExponential(3) + '   (' + weightLabel + ')', 52, botY + 14);

    if (o1 !== o2 && Math.abs(inner) < 0.05) {
      ctx.fillStyle = '#2dd4bf';
      ctx.fillText('≈ 0  (orthogonal modes)', 52, botY + botH - 2);
    } else if (o1 === o2) {
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('same mode — norm integral', 52, botY + botH - 2);
    }
  }
}
