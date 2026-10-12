import { logGridStep } from "../common/aiPanel.js";
import { sigma2d, numberDensity, transmissionFraction } from "./physics.js";
export class CrossSectionFitter {
  constructor() {
    this.data = [];
    this.trueSigma = 20;
    this.estimate = 15;
    this.window = [4, 40];
    this.iter = 0;
    this.lastLoss = NaN;
    this.slabW = 14;
    this.slabH = 8;
    this.pathLength = 14;
  }
  generateData(trueRadius, densities, noiseFrac = 0.04, logger) {
    this.logger = logger || null;
    this.trueSigma = sigma2d(trueRadius * 0.08);
    this.data = [];
    for (const count of densities) {
      const n = numberDensity(count, this.slabW, this.slabH);
      const T = transmissionFraction(n, this.trueSigma, this.pathLength);
      const noisy = Math.min(1, Math.max(0, T * (1 + noiseFrac * (Math.random() + Math.random() - 1))));
      this.data.push({ n, T: noisy, count });
    }
    this.window = [this.trueSigma * 0.3, this.trueSigma * 2.5];
    this.estimate = (this.window[0] + this.window[1]) / 2;
    this.iter = 0;
    this.lastLoss = this._loss(this.estimate);
    logger == null ? void 0 : logger.data(`collected ${this.data.length} transmission points, true \u03C3=${this.trueSigma.toFixed(2)}`);
  }
  _loss(sigma) {
    if (sigma <= 0) return Infinity;
    let s = 0;
    for (const d of this.data) {
      const p = transmissionFraction(d.n, sigma, this.pathLength);
      s += (p - d.T) ** 2;
    }
    return s / (this.data.length || 1);
  }
  step() {
    const [lo, hi] = this.window;
    let best = lo, bl = Infinity;
    for (let k = 0; k < 64; k++) {
      const s = lo + (hi - lo) * k / 63;
      const l = this._loss(s);
      if (l < bl) {
        bl = l;
        best = s;
      }
    }
    this.estimate = best;
    this.lastLoss = bl;
    const half = (hi - lo) * 0.32;
    this.window = [Math.max(1, best - half), best + half];
    this.iter++;
    logGridStep(this.logger, { iter: this.iter, estimate: best, loss: bl, window: this.window, trueValue: this.trueSigma, label: "\u03C3" });
    return bl;
  }
  get errorPct() {
    return Math.abs(this.estimate - this.trueSigma) / this.trueSigma * 100;
  }
}
