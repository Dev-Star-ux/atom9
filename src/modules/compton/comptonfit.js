import { formatSci } from "../common/aiPanel.js";
import { comptonShiftPm, LAMBDA_C_PM } from "./physics.js";
export class ComptonFitter {
  constructor() {
    this.data = [];
    this.slope = 2;
    this.epoch = 0;
    this.lastLoss = NaN;
  }
  generateData(lamPm = 50, noiseFrac = 0.04, n = 18, logger) {
    this.logger = logger || null;
    this.data = [];
    for (let i = 0; i < n; i++) {
      const deg = 10 + Math.random() * 160;
      const rad = deg * Math.PI / 180;
      const x = 1 - Math.cos(rad);
      const shift = comptonShiftPm(rad) * (1 + noiseFrac * (Math.random() + Math.random() + Math.random() - 1.5));
      this.data.push({ x, shift, deg });
    }
    this.slope = 2;
    this.epoch = 0;
    this.lastLoss = this._loss();
    logger == null ? void 0 : logger.data(`collected ${n} Compton shift measurements at \u03BB=${lamPm} pm`);
  }
  _loss() {
    let s = 0;
    for (const d of this.data) {
      const p = this.slope * d.x;
      s += (p - d.shift) ** 2;
    }
    return s / (this.data.length || 1);
  }
  step(lr = 0.08) {
    var _a;
    let g = 0;
    for (const d of this.data) {
      g += 2 * (this.slope * d.x - d.shift) * d.x;
    }
    this.slope -= lr * g / (this.data.length || 1);
    this.epoch++;
    this.lastLoss = this._loss();
    (_a = this.logger) == null ? void 0 : _a.step(`epoch ${this.epoch}: \u03BB_C=${formatSci(this.slope)} pm, loss=${this.lastLoss.toExponential(3)}`);
    return this.lastLoss;
  }
  get lambdaCEstimate() {
    return this.slope;
  }
  get errorPct() {
    return Math.abs(this.slope - LAMBDA_C_PM) / LAMBDA_C_PM * 100;
  }
  fittedLine() {
    return [{ x: 0, shift: 0 }, { x: 2, shift: this.slope * 2 }];
  }
}
