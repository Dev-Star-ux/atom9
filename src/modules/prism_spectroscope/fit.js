import { GridSearch1D } from "../common/canvasScene.js";
import { HYDROGEN_LINES, N_PRISM_TRUE, dispersion } from "./physics.js";
export class PrismIndexFitter {
  constructor() {
    this.data = [];
    this.search = new GridSearch1D({
      lo: 1.2,
      hi: 2,
      evalLoss: (n) => this._loss(n)
    });
    this.search.trueValue = N_PRISM_TRUE;
  }
  generateData(noiseFrac = 0.012, logger) {
    this.data = HYDROGEN_LINES.map(([nm, , label]) => ({
      nm,
      label,
      pos: dispersion(nm, N_PRISM_TRUE) * (1 + noiseFrac * (Math.random() + Math.random() + Math.random() - 1.5))
    }));
    this.search = new GridSearch1D({
      lo: 1.2,
      hi: 2,
      evalLoss: (n) => this._loss(n),
      logger,
      paramLabel: "n"
    });
    this.search.trueValue = N_PRISM_TRUE;
    this.search.lastLoss = this._loss(this.search.estimate);
    logger == null ? void 0 : logger.data(`Collected ${this.data.length} line positions, noise\u2248${(noiseFrac * 100).toFixed(1)}%`);
  }
  _loss(n) {
    if (n <= 1) return Infinity;
    let s = 0;
    for (const d of this.data) {
      const pred = dispersion(d.nm, n);
      s += (pred - d.pos) ** 2;
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
