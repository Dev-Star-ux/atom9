import { logGridStep } from "../common/aiPanel.js";
import { R_H, rydbergWavelengthNm, H_LINES } from "./physics.js";
export class RydbergFitter {
  constructor() {
    this.data = [];
    this.estimate = 105e5;
    this.window = [9e6, 12e6];
    this.iter = 0;
    this.lastLoss = NaN;
  }
  generateData(noiseFrac = 3e-3, logger) {
    this.logger = logger || null;
    this.data = H_LINES.map((line) => ({
      n1: line.n1,
      n2: line.n2,
      label: line.label,
      nm: rydbergWavelengthNm(line.n1, line.n2, R_H) * (1 + noiseFrac * (Math.random() + Math.random() + Math.random() - 1.5))
    }));
    this.window = [92e5, 115e5];
    this.estimate = (this.window[0] + this.window[1]) / 2;
    this.iter = 0;
    this.lastLoss = this._loss(this.estimate);
    logger == null ? void 0 : logger.data(`collected ${this.data.length} H-line wavelengths, search R_H \u2208 [${this.window[0].toExponential(2)}, ${this.window[1].toExponential(2)}]`);
  }
  _loss(R) {
    let s = 0;
    for (const d of this.data) {
      const pred = rydbergWavelengthNm(d.n1, d.n2, R);
      s += ((pred - d.nm) / d.nm) ** 2;
    }
    return s / (this.data.length || 1);
  }
  step() {
    const [lo, hi] = this.window;
    let best = lo, bl = Infinity;
    for (let k = 0; k < 64; k++) {
      const R = lo + (hi - lo) * k / 63;
      const l = this._loss(R);
      if (l < bl) {
        bl = l;
        best = R;
      }
    }
    this.estimate = best;
    this.lastLoss = bl;
    const half = (hi - lo) * 0.28;
    this.window = [Math.max(85e5, best - half), Math.min(12e6, best + half)];
    this.iter++;
    logGridStep(this.logger, { iter: this.iter, estimate: best, loss: bl, window: this.window, trueValue: R_H, label: "R_H" });
    return bl;
  }
  get errorPct() {
    return Math.abs(this.estimate - R_H) / R_H * 100;
  }
}
