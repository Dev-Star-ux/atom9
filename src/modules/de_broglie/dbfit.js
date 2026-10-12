import { logGridStep } from "../common/aiPanel.js";
import { H, momentum, deBroglieWavelength } from "./physics.js";
export class DeBroglieFitter {
  constructor() {
    this.data = [];
    this.mass = 91093837015e-41;
    this.estimate = H * 0.7;
    this.window = [H * 0.4, H * 1.4];
    this.iter = 0;
    this.lastLoss = NaN;
  }
  generateData(mass, noiseFrac = 0.04, n = 24, logger) {
    this.logger = logger || null;
    this.mass = mass;
    this.data = [];
    for (let i = 0; i < n; i++) {
      const v = (0.2 + Math.random() * 9.8) * 1e6;
      const p = momentum(mass, v);
      const lam = deBroglieWavelength(mass, v);
      const noisy = lam * (1 + noiseFrac * (Math.random() + Math.random() + Math.random() - 1.5));
      this.data.push({ v, p, lam: noisy, lamTrue: lam });
    }
    this.window = [H * 0.55, H * 1.35];
    this.estimate = (this.window[0] + this.window[1]) / 2;
    this.iter = 0;
    this.lastLoss = this._loss(this.estimate);
    logger == null ? void 0 : logger.data(`collected ${n} (p,\u03BB) points, m=${mass.toExponential(2)} kg, search h \u2208 [${this.window[0].toExponential(2)}, ${this.window[1].toExponential(2)}]`);
  }
  _loss(h) {
    if (h <= 0) return Infinity;
    let s = 0;
    for (const d of this.data) {
      const pred = h / d.p;
      s += ((pred - d.lam) / d.lam) ** 2;
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
    this.window = [Math.max(H * 0.3, best - half), Math.min(H * 1.6, best + half)];
    this.iter++;
    logGridStep(this.logger, { iter: this.iter, estimate: best, loss: bl, window: this.window, trueValue: H, label: "h" });
    return bl;
  }
  get errorPct() {
    return Math.abs(this.estimate - H) / H * 100;
  }
  modelLine(steps = 40) {
    if (!this.data.length) return [];
    const vs = this.data.map((d) => d.v);
    const vmin = Math.min(...vs), vmax = Math.max(...vs);
    const h = this.estimate;
    const pts = [];
    for (let i = 0; i < steps; i++) {
      const v = vmin + (vmax - vmin) * i / (steps - 1);
      const p = momentum(this.mass, v);
      pts.push({ invV: 1 / v, lam: h / p });
    }
    return pts;
  }
}
