import { logGridStep } from '../common/aiPanel.js';
import { predictElectricMw } from './physics.js';

/** AI discovers rod-response exponent α in P_e ∝ (1 − rod)^α (fixed flow). */
export class ReactorRodFitter {
  constructor() {
    this.data = [];
    this.estimate = 1.2;
    this.window = [0.6, 2.0];
    this.iter = 0;
    this.lastLoss = NaN;
    this.trueAlpha = 1.35;
    this.flow = 80;
    this.p0 = 1;
  }

  generateData(noiseFrac, n, logger) {
    this.logger = logger || null;
    this.data = [];
    this.flow = 80;
    this.p0 = predictElectricMw(0, this.flow);
    const count = n || 22;
    for (let i = 0; i < count; i++) {
      const rod = 0.02 + Math.random() * 0.9;
      const trueE = predictElectricMw(rod, this.flow);
      const noisy = trueE * (1 + noiseFrac * (Math.random() + Math.random() + Math.random() - 1.5));
      this.data.push({ rod: rod, electric: Math.max(1, noisy) });
    }
    this.window = [0.7, 1.95];
    this.estimate = (this.window[0] + this.window[1]) / 2;
    this.iter = 0;
    this.lastLoss = this._loss(this.estimate);
    if (logger) {
      logger.data('collected ' + count + ' rod→power points at flow=' + this.flow + '%');
    }
  }

  _loss(alpha) {
    if (alpha <= 0.05) return Infinity;
    let s = 0;
    for (let i = 0; i < this.data.length; i++) {
      const d = this.data[i];
      const pred = this.p0 * Math.pow(Math.max(0.001, 1 - d.rod), alpha);
      const err = (pred - d.electric) / (Math.abs(d.electric) + 15);
      s += err * err;
    }
    return s / (this.data.length || 1);
  }

  step() {
    const lo = this.window[0];
    const hi = this.window[1];
    let best = lo;
    let bl = Infinity;
    for (let k = 0; k < 72; k++) {
      const a = lo + (hi - lo) * k / 71;
      const l = this._loss(a);
      if (l < bl) {
        bl = l;
        best = a;
      }
    }
    this.estimate = best;
    this.lastLoss = bl;
    const half = (hi - lo) * 0.28;
    this.window = [Math.max(0.5, best - half), Math.min(2.2, best + half)];
    this.iter++;
    logGridStep(this.logger, {
      iter: this.iter,
      estimate: best,
      loss: bl,
      window: this.window,
      trueValue: this.trueAlpha,
      label: 'α',
    });
    return bl;
  }

  get errorPct() {
    return Math.abs(this.estimate - this.trueAlpha) / this.trueAlpha * 100;
  }
}
