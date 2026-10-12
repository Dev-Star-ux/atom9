import { GridSearch1D } from "../common/canvasScene.js";
import { H, photonEnergyEV } from "./physics.js";
export class DualityHFitter {
  constructor() {
    this.data = [];
    this.search = new GridSearch1D({
      lo: H * 0.4,
      hi: H * 1.6,
      evalLoss: (h) => this._loss(h)
    });
    this.search.trueValue = H;
  }
  generateData(noiseFrac = 0.04, logger) {
    this.data = [];
    for (let f = 4; f <= 14; f += 1.2) {
      const E = photonEnergyEV(f, H);
      this.data.push({
        f,
        E: E * (1 + noiseFrac * (Math.random() + Math.random() + Math.random() - 1.5))
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
    logger == null ? void 0 : logger.data(`Collected ${this.data.length} E=h\u03BD measurements, noise\u2248${(noiseFrac * 100).toFixed(0)}%`);
  }
  _loss(h) {
    if (h <= 0) return Infinity;
    let s = 0;
    for (const d of this.data) {
      const pred = photonEnergyEV(d.f, h);
      s += ((pred - d.E) / Math.max(d.E, 0.1)) ** 2;
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
