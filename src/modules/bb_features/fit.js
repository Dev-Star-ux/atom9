import { GridSearch1D } from "../common/canvasScene.js";
import { WIEN, noisyPeakNm, wienPeakNm } from "./physics.js";
export class WienTemperatureFitter {
  constructor() {
    this.peakNm = 580;
    this.trueT = 5e3;
    this.search = null;
    this.iter = 0;
    this.lastLoss = NaN;
  }
  generateData(T = 5e3, logger) {
    this.trueT = T;
    this.peakNm = noisyPeakNm(T, 30);
    this.search = new GridSearch1D({
      lo: 1e3,
      hi: 8e3,
      evalLoss: (t) => {
        const pred = wienPeakNm(t);
        return ((pred - this.peakNm) / this.peakNm) ** 2;
      },
      logger,
      paramLabel: "T"
    });
    this.search.trueValue = T;
    this.iter = 0;
    this.lastLoss = this.search.lastLoss;
    logger == null ? void 0 : logger.data(`true T=${T} K, measured peak=${this.peakNm.toFixed(0)} nm`);
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
  get measuredPeak() {
    return this.peakNm;
  }
}
export function TfromWienPeak(nm) {
  return WIEN / (nm * 1e-9);
}
