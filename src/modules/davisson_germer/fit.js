import { logGridStep } from "../common/aiPanel.js";
import { electronWavelengthPm, NI_SPACING_PM } from "./physics.js";
export class CrystalSpacingFitter {
  constructor() {
    this.data = [];
    this.trueD = NI_SPACING_PM;
    this.estimate = 240;
    this.window = [140, 320];
    this.iter = 0;
    this.lastLoss = NaN;
  }
  generateData(trueD = NI_SPACING_PM, noiseFrac = 0.02, n = 20, logger) {
    this.logger = logger || null;
    this.trueD = trueD;
    this.data = [];
    for (let i = 0; i < n; i++) {
      const V = 24 + Math.random() * 88;
      const lam = electronWavelengthPm(V);
      const thetaRad = Math.asin(lam / trueD);
      const theta = thetaRad * 180 / Math.PI;
      const noisy = theta * (1 + noiseFrac * (Math.random() - 0.5));
      this.data.push({ V, theta: noisy, lam });
    }
    this.window = [trueD * 0.55, trueD * 1.45];
    this.estimate = (this.window[0] + this.window[1]) / 2;
    this.iter = 0;
    this.lastLoss = this._loss(this.estimate);
    logger == null ? void 0 : logger.data(`collected ${n} diffraction peak angles, true d=${trueD.toFixed(0)} pm`);
  }
  _loss(d) {
    if (d <= 0) return Infinity;
    let s = 0;
    for (const pt of this.data) {
      const predTheta = Math.asin(Math.min(1, pt.lam / d)) * (180 / Math.PI);
      s += (predTheta - pt.theta) ** 2;
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
    this.window = [Math.max(100, best - half), Math.min(350, best + half)];
    this.iter++;
    logGridStep(this.logger, { iter: this.iter, estimate: best, loss: bl, window: this.window, trueValue: this.trueD, label: "d" });
    return bl;
  }
  get errorPct() {
    return Math.abs(this.estimate - this.trueD) / this.trueD * 100;
  }
}
