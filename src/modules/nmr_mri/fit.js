import { GridSearch1D } from '../common/canvasScene.js';

/** Recover T2 from noisy FID envelope A·exp(−t/T2). */
export class T2Fitter {
  constructor() {
    this.data = [];
    this.trueT2 = 0.5;
    this.search = new GridSearch1D({
      lo: 0.05,
      hi: 2.5,
      evalLoss: (t2) => this._loss(t2),
    });
    this.search.trueValue = this.trueT2;
  }

  generateData(trueT2, noiseFrac, logger) {
    this.trueT2 = trueT2 == null ? 0.35 + Math.random() * 0.8 : trueT2;
    this.data = [];
    const nf = noiseFrac == null ? 0.04 : noiseFrac;
    for (let i = 0; i < 12; i++) {
      const t = i * 0.08;
      const s = Math.exp(-t / this.trueT2);
      this.data.push({
        t: t,
        s: Math.max(0, s + nf * (Math.random() + Math.random() - 1)),
      });
    }
    this.search = new GridSearch1D({
      lo: 0.05,
      hi: 2.5,
      evalLoss: (t2) => this._loss(t2),
      logger: logger,
      paramLabel: 'T2',
    });
    this.search.trueValue = this.trueT2;
    this.search.lastLoss = this._loss(this.search.estimate);
    if (logger) logger.data('Collected FID decay; recover T2 from envelope.');
  }

  _loss(t2) {
    if (t2 <= 0) return Infinity;
    let s = 0;
    for (let i = 0; i < this.data.length; i++) {
      const d = this.data[i];
      const pred = Math.exp(-d.t / t2);
      s += Math.pow(pred - d.s, 2);
    }
    return s / (this.data.length || 1);
  }

  step() { return this.search.step(); }
  get estimate() { return this.search.estimate; }
  get errorPct() {
    return Math.abs(this.estimate - this.trueT2) / this.trueT2 * 100;
  }
  get lastLoss() { return this.search.lastLoss; }
  get iter() { return this.search.iter || 0; }
}
