import { GridSearch1D } from "../common/canvasScene.js";
import { sampleEnergyDecay } from "./physics.js";
export class CollapseRateFitter {
  constructor() {
    this.samples = [];
    this.trueRate = 28;
    this.search = null;
    this.iter = 0;
    this.lastLoss = NaN;
  }
  generateData(rate = 28, n = 10, logger) {
    this.trueRate = rate;
    this.samples = Array.from({ length: n }, () => sampleEnergyDecay(rate, 0.08));
    this.search = new GridSearch1D({
      lo: 10,
      hi: 50,
      evalLoss: (r) => this._loss(r),
      logger,
      paramLabel: "rate"
    });
    this.search.trueValue = rate;
    this.iter = 0;
    this.lastLoss = this._loss(this.search.estimate);
    logger == null ? void 0 : logger.data(`true rate=${rate} %/s, samples=${this.samples.length}`);
  }
  _loss(rate) {
    let s = 0;
    for (const d of this.samples) {
      const pred = Math.max(0, 100 - rate * d.t);
      s += ((pred - d.e) / 100) ** 2;
    }
    return s / (this.samples.length || 1);
  }
  step() {
    if (!this.search) return NaN;
    const l = this.search.step();
    this.iter = this.search.iter;
    this.lastLoss = l;
    return l;
  }
  get estimate() {
    var _a, _b;
    return (_b = (_a = this.search) == null ? void 0 : _a.estimate) != null ? _b : NaN;
  }
  get errorPct() {
    var _a, _b;
    return (_b = (_a = this.search) == null ? void 0 : _a.errorPct()) != null ? _b : NaN;
  }
}
