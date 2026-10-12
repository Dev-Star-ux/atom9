import { GridSearch1D } from "../common/canvasScene.js";
import { HBAR_EV_S } from "../common/wavePhysics.js";
export class HbarFitter {
  constructor() {
    this.data = [];
    this.search = new GridSearch1D({
      lo: HBAR_EV_S * 0.4,
      hi: HBAR_EV_S * 1.6,
      evalLoss: (h) => this._loss(h),
      paramLabel: "\u0127"
    });
    this.search.trueValue = HBAR_EV_S;
  }
  generateData(tauFs = 5, noiseFrac = 0.08, n = 28, logger) {
    this.data = [];
    for (let i = 0; i < n; i++) {
      const tau = (0.5 + Math.random() * 19.5) * 1e-15;
      const dE = HBAR_EV_S / (2 * tau) * (1 + noiseFrac * (Math.random() + Math.random() - 1));
      this.data.push({ tau, dE: Math.max(1e-6, dE) });
    }
    this.search.logger = logger;
    this.search.window = [HBAR_EV_S * 0.55, HBAR_EV_S * 1.45];
    this.search.estimate = (this.search.window[0] + this.search.window[1]) / 2;
    this.search.iter = 0;
    this.search.lastLoss = this.search.evalLoss(this.search.estimate);
    logger == null ? void 0 : logger.data(`Collected ${n} (\u03C4, \u0394E) pairs, noise\u2248${(noiseFrac * 100).toFixed(0)}%`);
  }
  _loss(hbar) {
    if (hbar <= 0) return Infinity;
    let s = 0;
    for (const d of this.data) {
      const pred = hbar / (2 * d.tau);
      s += ((pred - d.dE) / d.dE) ** 2;
    }
    return s / (this.data.length || 1);
  }
  step() {
    return this.search.step(72, 0.28);
  }
  get estimate() {
    return this.search.estimate;
  }
  get iter() {
    return this.search.iter;
  }
  get lastLoss() {
    return this.search.lastLoss;
  }
  get errorPct() {
    return this.search.errorPct();
  }
}
