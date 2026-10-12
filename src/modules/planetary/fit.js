import { GridSearch1D } from "../common/canvasScene.js";
import { measureOrbitPeriod } from "./physics.js";
export class OrbitRadiusFitter {
  constructor() {
    this.data = [];
    this.trueR = 130;
    this.search = null;
    this.iter = 0;
    this.lastLoss = NaN;
  }
  generateData(baseRadius = 130, n = 12, noiseFrac = 0.05, logger) {
    this.trueR = baseRadius;
    this.data = [];
    for (let i = 0; i < n; i++) this.data.push(measureOrbitPeriod(baseRadius, noiseFrac));
    this.search = new GridSearch1D({
      lo: 60,
      hi: 200,
      evalLoss: (r) => this._loss(r),
      logger,
      paramLabel: "r"
    });
    this.search.trueValue = baseRadius;
    this.iter = 0;
    this.lastLoss = this._loss(this.search.estimate);
    logger == null ? void 0 : logger.data(`true r=${baseRadius} px, samples=${this.data.length}`);
  }
  _loss(r) {
    const periodPred = periodFromRadius(r);
    let s = 0;
    for (const T of this.data) {
      s += ((periodPred - T) / T) ** 2;
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
function periodFromRadius(r) {
  const rr = r * 0.78;
  const omega = 2.4 * (110 / Math.max(20, rr)) ** 1.5;
  return Math.PI * 2 / omega;
}
