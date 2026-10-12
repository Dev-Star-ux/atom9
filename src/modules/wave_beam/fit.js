import { logGridStep } from "../common/aiPanel.js";
import { gaussianDk } from "./physics.js";
export class WaveSpreadFitter {
  constructor() {
    this.data = [];
    this.estimate = 0.55;
    this.window = [0.35, 0.75];
    this.iter = 0;
    this.lastLoss = NaN;
    this.trueK = 0.5;
    this.logger = null;
  }
  generateData(noiseFrac = 0.05, n = 22, logger) {
    this.data = [];
    for (let i = 0; i < n; i++) {
      const sigmaPx = 12 + Math.random() * 76;
      const sigmaM = sigmaPx * 1e-10;
      const dk = gaussianDk(sigmaM);
      const noisy = dk * (1 + noiseFrac * (Math.random() + Math.random() + Math.random() - 1.5));
      this.data.push({ sigmaM, dk: Math.max(1e8, noisy) });
    }
    this.logger = logger;
    this.trueK = 0.5;
    this.window = [0.38, 0.62];
    this.estimate = 0.5;
    this.iter = 0;
    this.lastLoss = this._loss(this.estimate);
    logger == null ? void 0 : logger.data(`Collected ${n} (\u03C3, \u0394k) wave-packet samples, noise\u2248${(noiseFrac * 100).toFixed(0)}%`);
  }
  _loss(k) {
    if (k <= 0) return Infinity;
    let s = 0;
    for (const d of this.data) {
      const pred = k / d.sigmaM;
      s += ((pred - d.dk) / d.dk) ** 2;
    }
    return s / (this.data.length || 1);
  }
  step() {
    const [lo, hi] = this.window;
    let best = lo, bl = Infinity;
    for (let k = 0; k < 72; k++) {
      const c = lo + (hi - lo) * k / 71;
      const l = this._loss(c);
      if (l < bl) {
        bl = l;
        best = c;
      }
    }
    this.estimate = best;
    this.lastLoss = bl;
    const half = (hi - lo) * 0.28;
    this.window = [Math.max(0.3, best - half), Math.min(0.7, best + half)];
    this.iter++;
    if (this.logger) {
      logGridStep(this.logger, {
        iter: this.iter,
        estimate: this.estimate,
        loss: bl,
        window: this.window,
        trueValue: this.trueK,
        label: "k"
      });
    }
    return bl;
  }
  get errorPct() {
    return Math.abs(this.estimate - this.trueK) / this.trueK * 100;
  }
}
