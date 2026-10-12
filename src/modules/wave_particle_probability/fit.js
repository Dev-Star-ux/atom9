import { GridSearch1D } from "../common/canvasScene.js";
import { probGaussian } from "../common/wavePhysics.js";
export class SigmaFitter {
  constructor() {
    this.data = [];
    this.trueSigmaM = 5e-9;
    this.search = new GridSearch1D({
      lo: 15e-10,
      hi: 95e-10,
      evalLoss: (s) => this._loss(s)
    });
  }
  generateData(sigmaNm = 50, noiseFrac = 0.06, n = 120, logger) {
    this.trueSigmaM = sigmaNm * 1e-10;
    this.data = [];
    for (let i = 0; i < n; i++) {
      const u = Math.random() || 1e-9;
      const v = Math.random();
      const x = this.trueSigmaM * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      const noisy = x * (1 + noiseFrac * (Math.random() - 0.5));
      this.data.push(noisy);
    }
    this.search.logger = logger;
    this.search.paramLabel = "\u03C3";
    this.search.trueValue = this.trueSigmaM;
    this.search.window = [this.trueSigmaM * 0.45, this.trueSigmaM * 1.55];
    this.search.estimate = (this.search.window[0] + this.search.window[1]) / 2;
    this.search.iter = 0;
    this.search.lastLoss = this.search.evalLoss(this.search.estimate);
    logger == null ? void 0 : logger.data(`true \u03C3=${sigmaNm} (arb.), samples=${this.data.length}`);
  }
  _loss(sigma) {
    if (sigma <= 0) return Infinity;
    const bins = 24;
    const span = 4 * sigma;
    const hist = new Array(bins).fill(0);
    for (const x of this.data) {
      const b = Math.min(bins - 1, Math.max(0, Math.floor((x + span) / (2 * span) * bins)));
      hist[b]++;
    }
    const hmax = Math.max(...hist) || 1;
    let s = 0;
    for (let i = 0; i < bins; i++) {
      const xc = -span + (i + 0.5) * (2 * span / bins);
      const pred = probGaussian(xc, sigma);
      const obs = hist[i] / hmax;
      s += (pred - obs) ** 2;
    }
    return s / bins;
  }
  step() {
    return this.search.step(64, 0.3);
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
