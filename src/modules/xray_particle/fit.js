import { logGridStep } from "../common/aiPanel.js";
import { HC_KEV_NM, lambdaPmFromEnergyKeV } from "./physics.js";
export class PhotonEnergyFitter {
  constructor() {
    this.data = [];
    this.estimate = 1.2;
    this.window = [0.9, 1.5];
    this.iter = 0;
    this.lastLoss = NaN;
  }
  generateData(noiseFrac = 0.035, n = 26, logger) {
    this.logger = logger || null;
    this.data = [];
    for (let i = 0; i < n; i++) {
      const E = 8 + Math.random() * 88;
      const lamPm = lambdaPmFromEnergyKeV(E);
      const noisy = lamPm * (1 + noiseFrac * (Math.random() + Math.random() + Math.random() - 1.5));
      this.data.push({ E, lamPm: Math.max(1, noisy) });
    }
    this.window = [0.95, 1.45];
    this.estimate = (this.window[0] + this.window[1]) / 2;
    this.iter = 0;
    this.lastLoss = this._loss(this.estimate);
    logger == null ? void 0 : logger.data(`collected ${n} (E, \u03BB) photon measurements`);
  }
  _loss(hc) {
    if (hc <= 0) return Infinity;
    let s = 0;
    for (const d of this.data) {
      const predPm = hc / d.E * 1e3;
      s += ((predPm - d.lamPm) / d.lamPm) ** 2;
    }
    return s / (this.data.length || 1);
  }
  step() {
    const [lo, hi] = this.window;
    let best = lo, bl = Infinity;
    for (let k = 0; k < 72; k++) {
      const hc = lo + (hi - lo) * k / 71;
      const l = this._loss(hc);
      if (l < bl) {
        bl = l;
        best = hc;
      }
    }
    this.estimate = best;
    this.lastLoss = bl;
    const half = (hi - lo) * 0.28;
    this.window = [Math.max(0.8, best - half), Math.min(1.6, best + half)];
    this.iter++;
    logGridStep(this.logger, { iter: this.iter, estimate: best, loss: bl, window: this.window, trueValue: HC_KEV_NM, label: "hc" });
    return bl;
  }
  get errorPct() {
    return Math.abs(this.estimate - HC_KEV_NM) / HC_KEV_NM * 100;
  }
}
