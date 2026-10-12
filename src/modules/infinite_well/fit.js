import { GridSearch1D } from "../common/canvasScene.js";
import { infiniteWellEnergyEV } from "../common/wavePhysics.js";
export class WellAFitter {
  constructor() {
    this.data = [];
    this.trueA = 1e-9;
    this.search = new GridSearch1D({
      lo: 4e-10,
      hi: 25e-10,
      evalLoss: (a) => this._loss(a)
    });
  }
  generateData(n = 2, a = 1e-9, noiseFrac = 0.05, extra = 5, logger) {
    this.trueA = a;
    this.data = [{ n, E: infiniteWellEnergyEV(n, a) * (1 + noiseFrac * (Math.random() - 0.5)) }];
    for (let i = 0; i < extra; i++) {
      const lvl = 1 + Math.floor(Math.random() * 5);
      this.data.push({
        n: lvl,
        E: infiniteWellEnergyEV(lvl, a) * (1 + noiseFrac * (Math.random() + Math.random() - 1))
      });
    }
    this.search.logger = logger;
    this.search.paramLabel = "a";
    this.search.trueValue = a;
    this.search.window = [a * 0.5, a * 1.7];
    this.search.estimate = (this.search.window[0] + this.search.window[1]) / 2;
    this.search.iter = 0;
    this.search.lastLoss = this.search.evalLoss(this.search.estimate);
    logger == null ? void 0 : logger.data(`true a=${(a * 1e9).toFixed(2)} nm, n=${n}, samples=${this.data.length}`);
  }
  _loss(a) {
    if (a <= 0) return Infinity;
    let s = 0;
    for (const d of this.data) {
      const pred = infiniteWellEnergyEV(d.n, a);
      s += ((pred - d.E) / d.E) ** 2;
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
