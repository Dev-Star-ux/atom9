import { GridSearch1D } from "../common/canvasScene.js";
import { H, MATERIALS, keMaxEV } from "./physics.js";
const WORK = MATERIALS.sodium;
export class QuantumHFitter {
  constructor() {
    this.data = [];
    this.search = new GridSearch1D({
      lo: H * 0.4,
      hi: H * 1.6,
      evalLoss: (h) => this._loss(h)
    });
    this.search.trueValue = H;
  }
  generateData(noiseFrac = 0.05, logger) {
    this.data = [];
    for (let f = 4; f <= 14; f += 0.7) {
      const ke = keMaxEV(f, WORK, H);
      if (ke <= 0) continue;
      this.data.push({
        f,
        ke: ke * (1 + noiseFrac * (Math.random() + Math.random() + Math.random() - 1.5))
      });
    }
    this.search = new GridSearch1D({
      lo: H * 0.4,
      hi: H * 1.6,
      evalLoss: (h) => this._loss(h),
      logger,
      paramLabel: "h"
    });
    this.search.trueValue = H;
    this.search.lastLoss = this._loss(this.search.estimate);
    logger == null ? void 0 : logger.data(`Collected ${this.data.length} KE_max vs \u03BD points, noise\u2248${(noiseFrac * 100).toFixed(0)}%`);
  }
  _loss(h) {
    if (h <= 0) return Infinity;
    let s = 0;
    for (const d of this.data) {
      const pred = keMaxEV(d.f, WORK, h);
      s += ((pred - d.ke) / Math.max(d.ke, 0.1)) ** 2;
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
