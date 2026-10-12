// Einstein photoelectric line: KE vs f (slope h, intercept ν₀).
import { createDualCanvas, drawXYView } from '../common/teachPlots.js';
import { MATERIALS, keMaxEV, thresholdF14, FMAX } from './physics.js';

export class QuantumTheory2D {
  constructor(host) {
    this.state = { freq: 8, material: 'sodium' };
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h) {
      self._draw(ctx, w, h);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.freq != null) this.state.freq = p.freq;
    if (p.material != null) this.state.material = p.material;
  }

  setPaused(v) { this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  tick() {}

  _draw(ctx, w, h) {
    const work = MATERIALS[this.state.material] || MATERIALS.sodium;
    const f0 = thresholdF14(work);
    const xs = [];
    const ys = [];
    for (let i = 0; i <= 50; i++) {
      const f = 3 + (FMAX - 3) * i / 50;
      xs.push(f);
      ys.push(Math.max(0, keMaxEV(f, work)));
    }
    const ke = Math.max(0, keMaxEV(this.state.freq, work));
    drawXYView(ctx, w, h, {
      title: 'Einstein: KE_max = h(f − ν₀)  ·  slope ∝ h',
      xlabel: 'f (×10¹⁴ Hz)',
      ylabel: 'KE_max (eV)',
      xrange: [3, FMAX],
      yrange: [0, Math.max(5, ke + 1)],
      xticks: [4, 6, 8, 10, 12, 14],
      series: [{ xs: xs, ys: ys, color: '#22d3ee', width: 2.5 }],
      markers: [
        { vline: f0, color: '#f87171', label: 'ν₀ = ' + f0.toFixed(2) },
        { vline: this.state.freq, color: '#fbbf24', label: 'KE = ' + ke.toFixed(2) + ' eV' },
      ],
    });
  }

  dispose() { this._canvas.dispose(); }
}
