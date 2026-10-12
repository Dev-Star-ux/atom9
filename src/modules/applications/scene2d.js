// PMT gain vs stages / solar current vs intensity.
import { createDualCanvas, drawXYView } from '../common/teachPlots.js';
import { pmtGain, solarCurrentUA } from './physics.js';

export class Applications2D {
  constructor(host) {
    this.state = { device: 'pmt', nDynodes: 6, delta: 3, intensity: 60 };
    this._iUA = 0;
    this._powerUW = 0;
    this._accum = 0;
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.device != null) this.state.device = p.device;
    if (p.nDynodes != null) this.state.nDynodes = p.nDynodes;
    if (p.delta != null) this.state.delta = p.delta;
    if (p.intensity != null) this.state.intensity = p.intensity;
  }

  getStats() {
    if (this.state.device === 'pmt') {
      return { pulseCount: 0, gain: pmtGain(this.state.nDynodes, this.state.delta) };
    }
    return { iUA: this._iUA || 0, powerUW: this._powerUW || 0 };
  }

  setPaused(v) { this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }

  tick(dt) {
    if (this.state.device === 'solar') {
      const r = solarCurrentUA(this.state.intensity, this._accum || 0, dt || 0.04);
      this._accum = r.current;
      this._iUA = r.iUA;
      this._powerUW = r.powerUW;
    }
  }

  _draw(ctx, w, h) {
    if (this.state.device === 'pmt') {
      const xs = [];
      const ys = [];
      for (let n = 3; n <= 10; n++) {
        xs.push(n);
        ys.push(pmtGain(n, this.state.delta));
      }
      const g = pmtGain(this.state.nDynodes, this.state.delta);
      drawXYView(ctx, w, h, {
        title: 'PMT gain δ^N  (δ = ' + this.state.delta.toFixed(1) + ')',
        xlabel: 'Dynode stages N',
        ylabel: 'Gain',
        xrange: [2.5, 10.5],
        yrange: [0, Math.max(ys[ys.length - 1] * 1.1, 10)],
        xticks: [3, 4, 5, 6, 7, 8, 9, 10],
        series: [{ xs: xs, ys: ys, color: '#22d3ee', width: 2.4 }],
        markers: [
          { vline: this.state.nDynodes, color: '#fbbf24', label: 'N=' + this.state.nDynodes + ' → ' + Math.round(g).toLocaleString() },
        ],
      });
    } else {
      const xs = [];
      const ys = [];
      for (let i = 0; i <= 40; i++) {
        const I = i * 2.5;
        xs.push(I);
        ys.push(I * 0.35);
      }
      drawXYView(ctx, w, h, {
        title: 'Solar cell current vs light intensity',
        xlabel: 'Intensity (%)',
        ylabel: 'I (µA)',
        xrange: [0, 100],
        yrange: [0, 40],
        xticks: [20, 40, 60, 80],
        series: [{ xs: xs, ys: ys, color: '#86efac', width: 2.4 }],
        markers: [
          { vline: this.state.intensity, color: '#fbbf24', label: 'I ≈ ' + (this._iUA || 0).toFixed(1) + ' µA' },
        ],
      });
    }
  }

  dispose() { this._canvas.dispose(); }
}
