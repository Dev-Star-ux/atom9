// Frank–Hertz I–V with n·E₀ dip markers + level ladder.
import { createDualCanvas, drawXYView } from '../common/teachPlots.js';
import { GASES, frankHertzCurrent, V_MAX, ivCurve } from './physics.js';

export class FrankHertz2D {
  constructor(host) {
    this.state = { gasIdx: 0, voltage: 6 };
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h) {
      self._draw(ctx, w, h);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.gasIdx != null) this.state.gasIdx = p.gasIdx;
    if (p.voltage != null) this.state.voltage = p.voltage;
    if (p.E0 != null) this._E0 = p.E0;
  }

  setGas(E0) { this._E0 = E0; }
  setVoltage(v) { this.state.voltage = v; }

  setPaused(v) { this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  tick() {}

  _E0val() {
    if (this._E0 != null) return this._E0;
    const g = GASES[this.state.gasIdx] || GASES[0];
    return g.E0;
  }

  _draw(ctx, w, h) {
    const E0 = this._E0val();
    const pts = ivCurve(E0, 100);
    const xs = [];
    const ys = [];
    let iMax = 1e-9;
    for (let i = 0; i < pts.length; i++) {
      xs.push(pts[i].V);
      ys.push(pts[i].I);
      if (pts[i].I > iMax) iMax = pts[i].I;
    }
    const markers = [];
    for (let n = 1; n * E0 < V_MAX; n++) {
      markers.push({
        vline: n * E0,
        color: n === 1 ? '#f87171' : '#fbbf24',
        label: n + '·E₀',
      });
    }
    markers.push({
      vline: this.state.voltage,
      color: '#22d3ee',
      label: 'V = ' + this.state.voltage.toFixed(1) + ' V',
    });

    const plotH = Math.floor(h * 0.72);
    drawXYView(ctx, w, plotH, {
      title: 'Collector current I vs accelerating voltage V',
      xlabel: 'V (volts)',
      ylabel: 'I (arb.)',
      xrange: [0, V_MAX],
      yrange: [0, iMax * 1.15],
      xticks: [5, 10, 15, 20, 25],
      series: [{ xs: xs, ys: ys, color: '#38bdf8', width: 2.2, fill: 'rgba(56,189,248,0.15)' }],
      markers: markers,
    });

    // Level ladder
    const y0 = plotH + 8;
    const lh = h - plotH - 16;
    ctx.fillStyle = '#0a1122';
    ctx.fillRect(0, plotH, w, h - plotH);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('Energy levels (excitation ladder)', 20, y0 + 12);
    const baseY = y0 + lh - 8;
    const scale = (lh - 28) / (3.2 * E0);
    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(40, baseY);
    ctx.lineTo(w - 40, baseY);
    ctx.stroke();
    for (let n = 0; n <= 3; n++) {
      const ey = baseY - n * E0 * scale;
      ctx.strokeStyle = n === 0 ? '#64748b' : '#fbbf24';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(60, ey);
      ctx.lineTo(w - 80, ey);
      ctx.stroke();
      ctx.fillStyle = '#eaf0fb';
      ctx.fillText(n === 0 ? 'ground' : 'n=' + n + '  (' + (n * E0).toFixed(2) + ' eV)', w - 200, ey - 4);
    }
    // Current marker
    const I = frankHertzCurrent(this.state.voltage, E0);
    void I;
  }

  dispose() { this._canvas.dispose(); }
}
