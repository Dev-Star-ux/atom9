import { GridSearch1D } from "../common/canvasScene.js";
import { infiniteWellProb } from "../common/wavePhysics.js";
export class WellWidthFitter {
  constructor() {
    this.data = [];
    this.n = 2;
    this.trueA = 1e-9;
    this.search = new GridSearch1D({
      lo: 4e-10,
      hi: 22e-10,
      evalLoss: (a) => this._loss(a)
    });
  }
  generateData(n = 2, a = 1e-9, count = 200, logger) {
    this.n = n;
    this.trueA = a;
    this.data = [];
    const fn = (x) => infiniteWellProb(n, x, a);
    const step = a / 80;
    for (let i = 0; i < 80; i++) {
      const x = (i + 0.5) * step;
      const w = Math.max(0, fn(x));
      const total = w * 80 || 1;
      for (let k = 0; k < Math.round(w * count / total); k++) {
        this.data.push(x + (Math.random() - 0.5) * step * 0.8);
      }
    }
    this.search.logger = logger;
    this.search.paramLabel = "a";
    this.search.trueValue = a;
    this.search.window = [a * 0.55, a * 1.65];
    this.search.estimate = (this.search.window[0] + this.search.window[1]) / 2;
    this.search.iter = 0;
    this.search.lastLoss = this.search.evalLoss(this.search.estimate);
    logger == null ? void 0 : logger.data(`true a=${(a * 1e9).toFixed(2)} nm, n=${n}, samples=${this.data.length}`);
  }
  _loss(a) {
    if (a <= 0) return Infinity;
    const bins = 20;
    const hist = new Array(bins).fill(0);
    for (const x of this.data) {
      const b = Math.min(bins - 1, Math.max(0, Math.floor(x / a * bins)));
      hist[b]++;
    }
    const hmax = Math.max(...hist) || 1;
    let s = 0;
    for (let i = 0; i < bins; i++) {
      const xc = a * (i + 0.5) / bins;
      const pred = infiniteWellProb(this.n, xc, a);
      const obs = hist[i] / hmax;
      s += (pred - obs) ** 2;
    }
    return s / bins;
  }
  step() {
    return this.search.step(64, 0.28);
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
