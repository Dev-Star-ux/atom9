import { GridSearch1D } from "../common/canvasScene.js";
import { noisySpectrumSamples, planckU } from "./physics.js";
export class RayleighJeansTFitter {
  constructor() {
    this.data = [];
    this.trueT = 4e3;
    this.search = null;
    this.iter = 0;
    this.lastLoss = NaN;
  }
  generateData(T = 4e3, noiseFrac = 0.07, logger) {
    this.trueT = T;
    this.data = noisySpectrumSamples(T, noiseFrac);
    this.search = new GridSearch1D({
      lo: 800,
      hi: 9e3,
      evalLoss: (t) => this._loss(t),
      logger,
      paramLabel: "T"
    });
    this.search.trueValue = T;
    this.iter = 0;
    this.lastLoss = this._loss(this.search.estimate);
    logger == null ? void 0 : logger.data(`true T=${T} K, samples=${this.data.length}`);
  }
  _loss(T) {
    if (T <= 0) return Infinity;
    let s = 0;
    for (const d of this.data) {
      const p = planckU(d.lam, T);
      const denom = Math.max(d.u, 1e-30);
      s += ((p - d.u) / denom) ** 2;
    }
    return s / (this.data.length || 1);
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
