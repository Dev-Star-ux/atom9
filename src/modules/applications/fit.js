import { GridSearch1D } from "../common/canvasScene.js";
import { DELTA_TRUE, pmtGain } from "./physics.js";
export class DeltaFitter {
  constructor() {
    this.data = [];
    this.search = new GridSearch1D({
      lo: 1.8,
      hi: 5.2,
      evalLoss: (d) => this._loss(d)
    });
    this.search.trueValue = DELTA_TRUE;
  }
  generateData(noiseFrac = 0.04, logger) {
    this.data = [];
    for (let n = 3; n <= 10; n++) {
      const g = pmtGain(n, DELTA_TRUE);
      this.data.push({
        n,
        gain: g * (1 + noiseFrac * (Math.random() + Math.random() + Math.random() - 1.5))
      });
    }
    this.search = new GridSearch1D({
      lo: 1.8,
      hi: 5.2,
      evalLoss: (d) => this._loss(d),
      logger,
      paramLabel: "\u03B4"
    });
    this.search.trueValue = DELTA_TRUE;
    this.search.lastLoss = this._loss(this.search.estimate);
    logger == null ? void 0 : logger.data(`Collected ${this.data.length} PMT gain measurements, noise\u2248${(noiseFrac * 100).toFixed(0)}%`);
  }
  _loss(delta) {
    if (delta < 1.5) return Infinity;
    let s = 0;
    for (const d of this.data) {
      const pred = pmtGain(d.n, delta);
      s += ((pred - d.gain) / Math.max(d.gain, 1)) ** 2;
    }
    return s / (this.data.length || 1);
  }
  step() {
    return this.search.step();
  }
  get estimate() {
    return this.search.estimate;
  }
  get iter() {
    return this.search.iter;
  }
  get lastLoss() {
    return this.search.lastLoss;
  }
  get errorPct() {
    return this.search.errorPct();
  }
}
