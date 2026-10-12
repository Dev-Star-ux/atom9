import { GridSearch1D } from "../common/canvasScene.js";
import { backscatterFraction, simulateCounts } from "./physics.js";
export class ZFromBackscatterFitter {
  constructor() {
    this.trueZ = 79;
    this.energy = 55;
    this.fracBack = 0;
    this.search = null;
    this.iter = 0;
    this.lastLoss = NaN;
  }
  generateData(Z = 79, energy = 55, logger) {
    this.trueZ = Z;
    this.energy = energy;
    const { fracBack } = simulateCounts(Z, energy, 500);
    this.fracBack = fracBack * (1 + 0.08 * (Math.random() + Math.random() - 1));
    this.search = new GridSearch1D({
      lo: 10,
      hi: 92,
      evalLoss: (z) => (backscatterFraction(z, energy) - this.fracBack) ** 2,
      logger,
      paramLabel: "Z"
    });
    this.search.trueValue = Z;
    this.iter = 0;
    this.lastLoss = this.search.lastLoss;
    logger == null ? void 0 : logger.data(`true Z=${Z}, E=${energy}, measured backscatter=${this.fracBack.toFixed(4)}, n=500`);
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
    return Math.abs(this.estimate - this.trueZ) / (this.trueZ || 1) * 100;
  }
}
