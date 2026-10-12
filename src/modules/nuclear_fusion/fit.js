import { logGridStep } from '../common/aiPanel.js';
import { fusionProbability } from './physics.js';

/** AI finds temperature where fusion probability crosses ~0.5 at fixed confinement. */
export class FusionTempFitter {
  constructor() {
    this.data = [];
    this.estimate = 80;
    this.window = [20, 500];
    this.iter = 0;
    this.lastLoss = NaN;
    this.trueT = 150;
    this.conf = 70;
  }

  generateData(noiseFrac, n, logger) {
    this.logger = logger || null;
    this.conf = 70;
    let trueT = 150;
    for (let t = 30; t <= 550; t += 5) {
      if (Math.abs(fusionProbability(t, this.conf) - 0.5) <
          Math.abs(fusionProbability(trueT, this.conf) - 0.5)) trueT = t;
    }
    this.trueT = trueT;
    this.data = [];
    const count = n || 22;
    for (let i = 0; i < count; i++) {
      const t = 25 + Math.random() * 520;
      const p = fusionProbability(t, this.conf);
      const noisy = p * (1 + noiseFrac * (Math.random() + Math.random() - 1));
      this.data.push({ t: t, p: Math.max(0, Math.min(1, noisy)) });
    }
    this.window = [trueT * 0.45, trueT * 1.55];
    this.estimate = (this.window[0] + this.window[1]) / 2;
    this.iter = 0;
    this.lastLoss = this._loss(this.estimate);
    if (logger) logger.data('collected ' + count + ' (T → P_fusion) points; P≈0.5 near ' + trueT + ' MK');
  }

  _loss(t) {
    const p = fusionProbability(t, this.conf);
    return (p - 0.5) * (p - 0.5);
  }

  step() {
    const lo = this.window[0];
    const hi = this.window[1];
    let best = lo;
    let bl = Infinity;
    for (let i = 0; i < 72; i++) {
      const t = lo + (hi - lo) * i / 71;
      const l = this._loss(t);
      if (l < bl) { bl = l; best = t; }
    }
    this.estimate = best;
    this.lastLoss = bl;
    const half = (hi - lo) * 0.28;
    this.window = [Math.max(20, best - half), Math.min(600, best + half)];
    this.iter++;
    logGridStep(this.logger, {
      iter: this.iter, estimate: best, loss: bl, window: this.window,
      trueValue: this.trueT, label: 'T_MK',
    });
    return bl;
  }

  get errorPct() {
    return Math.abs(this.estimate - this.trueT) / Math.max(1, this.trueT) * 100;
  }
}
