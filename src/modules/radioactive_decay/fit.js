import { logGridStep } from '../common/aiPanel.js';
import { remainingFraction } from './physics.js';

/** AI finds half-life from noisy N(t)/N0 samples. */
export class HalfLifeFitter {
  constructor() {
    this.data = [];
    this.estimate = 8;
    this.window = [2, 30];
    this.iter = 0;
    this.lastLoss = NaN;
    this.trueHalf = 10;
  }

  generateData(trueHalf, noiseFrac, n, logger) {
    this.logger = logger || null;
    this.trueHalf = trueHalf;
    this.data = [];
    const count = n || 24;
    for (let i = 0; i < count; i++) {
      const t = Math.random() * trueHalf * 4;
      const f = remainingFraction(t, trueHalf);
      const noisy = f * (1 + noiseFrac * (Math.random() + Math.random() + Math.random() - 1.5));
      this.data.push({ t: t, f: Math.max(0.001, Math.min(1.2, noisy)) });
    }
    this.window = [trueHalf * 0.4, trueHalf * 1.8];
    this.estimate = (this.window[0] + this.window[1]) / 2;
    this.iter = 0;
    this.lastLoss = this._loss(this.estimate);
    if (logger) logger.data('collected ' + count + ' decay points; true T½ = ' + trueHalf);
  }

  _loss(half) {
    if (half <= 0.1) return Infinity;
    let s = 0;
    for (let i = 0; i < this.data.length; i++) {
      const d = this.data[i];
      const pred = remainingFraction(d.t, half);
      const err = pred - d.f;
      s += err * err;
    }
    return s / (this.data.length || 1);
  }

  step() {
    const lo = this.window[0];
    const hi = this.window[1];
    let best = lo;
    let bl = Infinity;
    for (let i = 0; i < 72; i++) {
      const h = lo + (hi - lo) * i / 71;
      const l = this._loss(h);
      if (l < bl) { bl = l; best = h; }
    }
    this.estimate = best;
    this.lastLoss = bl;
    const half = (hi - lo) * 0.28;
    this.window = [Math.max(0.5, best - half), best + half];
    this.iter++;
    logGridStep(this.logger, {
      iter: this.iter, estimate: best, loss: bl, window: this.window,
      trueValue: this.trueHalf, label: 'T½',
    });
    return bl;
  }

  get errorPct() {
    return Math.abs(this.estimate - this.trueHalf) / this.trueHalf * 100;
  }
}
