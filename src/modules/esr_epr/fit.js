import { GridSearch1D } from '../common/canvasScene.js';
import { resonanceFieldMT, eprSpectrum } from './physics.js';

/** Recover g from measured centre field B0 (mT) at known microwave frequency. */
export class GFitter {
  constructor() {
    this.data = [];
    this.trueG = 2.003;
    this.freqGHz = 9.5;
    this.search = new GridSearch1D({
      lo: 1.95,
      hi: 2.15,
      evalLoss: (g) => this._loss(g),
    });
    this.search.trueValue = this.trueG;
  }

  generateData(trueG, freqGHz, noiseFrac, logger) {
    this.trueG = trueG == null ? 2.0 + Math.random() * 0.01 : trueG;
    this.freqGHz = freqGHz == null ? 9.5 : freqGHz;
    const B0 = resonanceFieldMT(this.trueG, this.freqGHz);
    const nf = noiseFrac == null ? 0.15 : noiseFrac;
    this.data = [];
    for (let i = 0; i < 6; i++) {
      this.data.push({
        B0: B0 + nf * (Math.random() - 0.5) * 2,
      });
    }
    this.search = new GridSearch1D({
      lo: 1.95,
      hi: 2.15,
      evalLoss: (g) => this._loss(g),
      logger: logger,
      paramLabel: 'g',
    });
    this.search.trueValue = this.trueG;
    this.search.lastLoss = this._loss(this.search.estimate);
    if (logger) logger.data('Collected B0 peaks; recover g from hν = gμBB.');
  }

  _loss(g) {
    if (g <= 0) return Infinity;
    const pred = resonanceFieldMT(g, this.freqGHz);
    let s = 0;
    for (let i = 0; i < this.data.length; i++) {
      s += Math.pow(pred - this.data[i].B0, 2);
    }
    return s / (this.data.length || 1);
  }

  step() { return this.search.step(); }
  get estimate() { return this.search.estimate; }
  get errorPct() {
    return Math.abs(this.estimate - this.trueG) / this.trueG * 100;
  }
  get lastLoss() { return this.search.lastLoss; }
  get iter() { return this.search.iter || 0; }
}
