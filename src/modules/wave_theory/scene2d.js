// Wave theory failure: classical delay-vs-I myth vs prompt quantum emission.
import { createDualCanvas, drawXYView } from '../common/teachPlots.js';
import { classicalDelayS, classicalKeEV, keMaxEV } from './physics.js';

export class WaveTheory2D {
  constructor(host) {
    this.state = { freq: 7, intensity: 60, accum: 0 };
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h) {
      self._draw(ctx, w, h);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.freq != null) this.state.freq = p.freq;
    if (p.intensity != null) this.state.intensity = p.intensity;
    if (p.accum != null) this.state.accum = p.accum;
  }

  setPaused(v) { this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  tick() {}

  _draw(ctx, w, h) {
    const xs = [];
    const delayY = [];
    const quantumY = [];
    for (let i = 0; i <= 40; i++) {
      const I = 5 + (100 - 5) * i / 40;
      xs.push(I);
      delayY.push(classicalDelayS(I));
      quantumY.push(0.02); // prompt (near-zero delay)
    }
    const I0 = this.state.intensity;
    const delay = classicalDelayS(I0);
    const keQ = Math.max(0, keMaxEV(this.state.freq));
    const keC = classicalKeEV(I0);

    drawXYView(ctx, w, Math.floor(h * 0.7), {
      title: 'Classical “accumulation delay” vs quantum (prompt)',
      xlabel: 'Intensity (%)',
      ylabel: 'Delay (s)',
      xrange: [0, 100],
      yrange: [0, Math.max(0.5, delay * 1.2)],
      xticks: [20, 40, 60, 80],
      series: [
        { xs: xs, ys: delayY, color: '#f87171', width: 2, dash: [5, 4] },
        { xs: xs, ys: quantumY, color: '#22d3ee', width: 2.4 },
      ],
      markers: [
        { vline: I0, color: '#fbbf24', label: 'I = ' + I0 + '%' },
      ],
    });

    const y0 = Math.floor(h * 0.72);
    ctx.fillStyle = '#0a1122';
    ctx.fillRect(0, y0, w, h - y0);
    ctx.fillStyle = '#eaf0fb';
    ctx.font = '13px system-ui,sans-serif';
    ctx.fillText(
      'Classical KE∝I → ' + keC.toFixed(2) + ' eV myth  |  Quantum KE = hf−φ → ' + keQ.toFixed(2) + ' eV',
      20,
      y0 + (h - y0) / 2 + 4
    );
  }

  dispose() { this._canvas.dispose(); }
}
