import { formatSci } from "../common/aiPanel.js";
import { planckU, H, C, K } from "./physics.js";
export class PlanckHFitter {
  constructor() {
    this.data = [];
    this.T = 4e3;
    this.estimate = H * 0.7;
    this.epoch = 0;
    this.lastLoss = NaN;
  }
  generateData(T = 4e3, noiseFrac = 0.06, logger) {
    this.logger = logger || null;
    this.T = T;
    this.data = [];
    const lambdas = [3e-7, 45e-8, 65e-8, 9e-7, 12e-7, 18e-7];
    for (const lam of lambdas) {
      const u = planckU(lam, T, H);
      this.data.push({
        lam,
        u: u * (1 + noiseFrac * (Math.random() + Math.random() + Math.random() - 1.5))
      });
    }
    this.estimate = H * 0.6;
    this.epoch = 0;
    this.lastLoss = this._loss(H);
    logger == null ? void 0 : logger.data(`collected ${this.data.length} spectral points at T=${T} K`);
  }
  _loss(h) {
    if (h <= 0) return Infinity;
    let s = 0;
    for (const d of this.data) {
      const p = planckU(d.lam, this.T, h);
      const denom = Math.max(d.u, 1e-30);
      s += ((p - d.u) / denom) ** 2;
    }
    return s / (this.data.length || 1);
  }
  step(lr = 0.08) {
    var _a;
    const eps = H * 2e-3;
    const l0 = this._loss(this.estimate);
    const lUp = this._loss(this.estimate + eps);
    const grad = (lUp - l0) / eps;
    this.estimate -= lr * grad * H * 0.5;
    this.estimate = Math.max(H * 0.05, Math.min(H * 1.5, this.estimate));
    this.epoch++;
    this.lastLoss = this._loss(this.estimate);
    (_a = this.logger) == null ? void 0 : _a.step(`epoch ${this.epoch}: h=${formatSci(this.estimate)}, loss=${this.lastLoss.toExponential(3)}`);
    return this.lastLoss;
  }
  get hEstimate() {
    return this.estimate;
  }
  get errorPct() {
    return Math.abs(this.estimate - H) / H * 100;
  }
}
