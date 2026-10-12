import { logGridStep } from "../common/aiPanel.js";
import { braggConstructive } from "./physics.js";
const TRUE_D = 200;
export class BraggSpacingFitter {
  constructor() {
    this.data = [];
    this.estimate = 220;
    this.window = [120, 320];
    this.iter = 0;
    this.lastLoss = NaN;
  }
  generateData(trueD = TRUE_D, noiseFrac = 0.03, n = 24, logger) {
    this.logger = logger || null;
    this.trueD = trueD;
    this.data = [];
    for (let i = 0; i < n; i++) {
      const lam = 50 + Math.random() * 180;
      const theta = 8 + Math.random() * 68;
      const n2 = Math.max(1, Math.round(2 * trueD * Math.sin(theta * Math.PI / 180) / lam));
      const path = braggConstructive(n2, trueD, lam, theta);
      const noisy = path * (1 + noiseFrac * (Math.random() - 0.5));
      this.data.push({ n: n2, lam, theta, path: noisy });
    }
    this.window = [trueD * 0.55, trueD * 1.45];
    this.estimate = (this.window[0] + this.window[1]) / 2;
    this.iter = 0;
    this.lastLoss = this._loss(this.estimate);
    logger == null ? void 0 : logger.data(`collected ${n} Bragg measurements, true d=${trueD.toFixed(0)} pm`);
  }
  _loss(d) {
    if (d <= 0) return Infinity;
    let s = 0;
    for (const pt of this.data) {
      const pred = braggConstructive(pt.n, d, pt.lam, pt.theta);
      s += (pred - pt.path) ** 2;
    }
    return s / (this.data.length || 1);
  }
  step() {
    const [lo, hi] = this.window;
    let best = lo, bl = Infinity;
    for (let k = 0; k < 72; k++) {
      const d = lo + (hi - lo) * k / 71;
      const l = this._loss(d);
      if (l < bl) {
        bl = l;
        best = d;
      }
    }
    this.estimate = best;
    this.lastLoss = bl;
    const half = (hi - lo) * 0.28;
    this.window = [Math.max(80, best - half), Math.min(420, best + half)];
    this.iter++;
    logGridStep(this.logger, { iter: this.iter, estimate: best, loss: bl, window: this.window, trueValue: this.trueD, label: "d" });
    return bl;
  }
  get errorPct() {
    return Math.abs(this.estimate - this.trueD) / this.trueD * 100;
  }
}
