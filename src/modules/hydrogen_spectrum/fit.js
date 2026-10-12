import { GridSearch1D } from "../common/canvasScene.js";
import { R_H, hydrogenWavelengthNm } from "./physics.js";
const LINES = [
  { n1: 2, n2: 3, label: "H\u03B1" },
  { n1: 2, n2: 4, label: "H\u03B2" },
  { n1: 2, n2: 5, label: "H\u03B3" },
  { n1: 2, n2: 6, label: "H\u03B4" }
];
export class RydbergFitter {
  constructor() {
    this.data = [];
    this.search = new GridSearch1D({
      lo: 9e6,
      hi: 12e6,
      evalLoss: (R) => this._loss(R)
    });
    this.search.trueValue = R_H;
  }
  generateData(noiseFrac = 3e-3, logger) {
    this.data = LINES.map((line) => ({
      ...line,
      nm: hydrogenWavelengthNm(line.n1, line.n2, R_H) * (1 + noiseFrac * (Math.random() + Math.random() + Math.random() - 1.5))
    }));
    this.search = new GridSearch1D({
      lo: 92e5,
      hi: 115e5,
      evalLoss: (R) => this._loss(R),
      logger,
      paramLabel: "R_H"
    });
    this.search.trueValue = R_H;
    this.search.lastLoss = this._loss(this.search.estimate);
    logger == null ? void 0 : logger.data(`Collected ${this.data.length} Balmer line wavelengths, noise\u2248${(noiseFrac * 100).toFixed(1)}%`);
  }
  _loss(R) {
    if (R <= 0) return Infinity;
    let s = 0;
    for (const d of this.data) {
      const pred = hydrogenWavelengthNm(d.n1, d.n2, R);
      s += ((pred - d.nm) / d.nm) ** 2;
    }
    return s / (this.data.length || 1);
  }
  step() {
    return this.search.step();
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
