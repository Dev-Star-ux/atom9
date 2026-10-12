import { logGridStep } from "../common/aiPanel.js";
import { frankHertzCurrent, V_MAX } from "./physics.js";
export class ExcitationFitter {
  constructor() {
    this.data = [];
    this.trueE0 = 4.89;
    this.estimate = 5;
    this.window = [2, 20];
    this.iter = 0;
    this.lastLoss = NaN;
  }
  generateData(E0, noiseFrac = 0.07, n = 50, logger) {
    this.logger = logger || null;
    this.trueE0 = E0;
    this.data = [];
    for (let i = 0; i < n; i++) {
      const V = 0.3 + Math.random() * (V_MAX - 0.3);
      const I = frankHertzCurrent(V, E0) * (1 + noiseFrac * (Math.random() + Math.random() + Math.random() - 1.5));
      this.data.push({ V, I: Math.max(0, I) });
    }
    this.window = [Math.max(1, E0 * 0.4), Math.min(22, E0 * 2.2)];
    this.estimate = (this.window[0] + this.window[1]) / 2;
    this.iter = 0;
    this.lastLoss = this._loss(this.estimate);
    logger == null ? void 0 : logger.data(`collected ${n} I\u2013V points, true E\u2080=${E0.toFixed(2)} eV`);
  }
  _loss(e0) {
    if (e0 <= 0) return Infinity;
    let s = 0;
    for (const d of this.data) {
      const p = frankHertzCurrent(d.V, e0);
      s += (p - d.I) ** 2;
    }
    return s / (this.data.length || 1);
  }
  step() {
    const [lo, hi] = this.window;
    let best = lo, bl = Infinity;
    for (let k = 0; k < 72; k++) {
      const e0 = lo + (hi - lo) * k / 71;
      const l = this._loss(e0);
      if (l < bl) {
        bl = l;
        best = e0;
      }
    }
    this.estimate = best;
    this.lastLoss = bl;
    const half = (hi - lo) * 0.32;
    this.window = [Math.max(0.5, best - half), Math.min(22, best + half)];
    this.iter++;
    logGridStep(this.logger, { iter: this.iter, estimate: best, loss: bl, window: this.window, trueValue: this.trueE0, label: "E\u2080" });
    return bl;
  }
  get errorPct() {
    return Math.abs(this.estimate - this.trueE0) / this.trueE0 * 100;
  }
  modelCurve(e0 = this.estimate, steps = 80) {
    const pts = [];
    for (let i = 0; i < steps; i++) {
      const V = V_MAX * i / (steps - 1);
      pts.push({ V, I: frankHertzCurrent(V, e0) });
    }
    return pts;
  }
}
