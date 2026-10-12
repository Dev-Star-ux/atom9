import { logGridStep } from "../common/aiPanel.js";
import { HBAR } from "./physics.js";
export class HbarFitter {
  constructor() {
    this.data = [];
    this.estimate = HBAR * 0.85;
    this.window = [HBAR * 0.5, HBAR * 1.3];
    this.iter = 0;
    this.lastLoss = NaN;
    this.logger = null;
  }
  generateData(noiseFrac = 0.04, n = 24, logger) {
    this.data = [];
    for (let i = 0; i < n; i++) {
      const sigma = (0.3 + Math.random() * 2.5) * 1e-10;
      const product = HBAR / 2 * (1 + noiseFrac * (Math.random() + Math.random() + Math.random() - 1.5));
      this.data.push({ sigma, product: Math.max(1e-26, product) });
    }
    this.logger = logger;
    this.window = [HBAR * 0.7, HBAR * 1.15];
    this.estimate = (this.window[0] + this.window[1]) / 2;
    this.iter = 0;
    this.lastLoss = this._loss(this.estimate);
    logger == null ? void 0 : logger.data(`Collected ${n} \u0394x\xB7\u0394p product samples, noise\u2248${(noiseFrac * 100).toFixed(0)}%`);
  }
  _loss(hbar) {
    if (hbar <= 0) return Infinity;
    const target = hbar / 2;
    let s = 0;
    for (const d of this.data) {
      s += ((target - d.product) / d.product) ** 2;
    }
    return s / (this.data.length || 1);
  }
  step() {
    const [lo, hi] = this.window;
    let best = lo, bl = Infinity;
    for (let k = 0; k < 72; k++) {
      const h = lo + (hi - lo) * k / 71;
      const l = this._loss(h);
      if (l < bl) {
        bl = l;
        best = h;
      }
    }
    this.estimate = best;
    this.lastLoss = bl;
    const half = (hi - lo) * 0.28;
    this.window = [Math.max(HBAR * 0.5, best - half), Math.min(HBAR * 1.4, best + half)];
    this.iter++;
    if (this.logger) {
      logGridStep(this.logger, {
        iter: this.iter,
        estimate: this.estimate,
        loss: bl,
        window: this.window,
        trueValue: HBAR,
        label: "\u0127"
      });
    }
    return bl;
  }
  get errorPct() {
    return Math.abs(this.estimate - HBAR) / HBAR * 100;
  }
}
