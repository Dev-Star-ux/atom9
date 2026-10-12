import { logGridStep } from '../common/aiPanel.js';
import { fissionMultiplication } from './physics.js';

/** AI finds enrichment that makes k ≈ 1. */
export class CriticalEnrichmentFitter {
  constructor() {
    this.data = [];
    this.estimate = 45;
    this.window = [10, 90];
    this.iter = 0;
    this.lastLoss = NaN;
    this.trueE = 46;
  }

  generateData(noiseFrac, n, logger) {
    this.logger = logger || null;
    this.data = [];
    let trueE = 46;
    for (let e = 5; e <= 95; e++) {
      if (Math.abs(fissionMultiplication(e) - 1) <
          Math.abs(fissionMultiplication(trueE) - 1)) trueE = e;
    }
    this.trueE = trueE;
    const count = n || 20;
    for (let i = 0; i < count; i++) {
      const e = 8 + Math.random() * 85;
      const k = fissionMultiplication(e);
      const noisy = k * (1 + noiseFrac * (Math.random() + Math.random() - 1));
      this.data.push({ e: e, k: Math.max(0.05, noisy) });
    }
    this.window = [trueE * 0.5, Math.min(95, trueE * 1.5)];
    this.estimate = (this.window[0] + this.window[1]) / 2;
    this.iter = 0;
    this.lastLoss = this._loss(this.estimate);
    if (logger) logger.data('collected ' + count + ' (enrichment → k) points; true critical ≈ ' + trueE + '%');
  }

  _loss(e) {
    const k = fissionMultiplication(e);
    return (k - 1) * (k - 1);
  }

  step() {
    const lo = this.window[0];
    const hi = this.window[1];
    let best = lo;
    let bl = Infinity;
    for (let i = 0; i < 80; i++) {
      const e = lo + (hi - lo) * i / 79;
      const l = this._loss(e);
      if (l < bl) { bl = l; best = e; }
    }
    this.estimate = best;
    this.lastLoss = bl;
    const half = (hi - lo) * 0.28;
    this.window = [Math.max(5, best - half), Math.min(95, best + half)];
    this.iter++;
    logGridStep(this.logger, {
      iter: this.iter, estimate: best, loss: bl, window: this.window,
      trueValue: this.trueE, label: 'enrich%',
    });
    return bl;
  }

  get errorPct() {
    return Math.abs(this.estimate - this.trueE) / Math.max(1, this.trueE) * 100;
  }
}
