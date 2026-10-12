import { GridSearch1D } from "../common/canvasScene.js";
import { infiniteWellEnergyEV, M_E, HBAR, E_CHARGE } from "../common/wavePhysics.js";
export function wellEnergyEV(n, a, mass = M_E) {
  if (n < 1 || a <= 0) return 0;
  return n * n * Math.PI * Math.PI * HBAR * HBAR / (2 * mass * a * a * E_CHARGE);
}
export class BoxAFitter {
  constructor() {
    this.data = [];
    this.trueA = 1e-9;
    this.search = new GridSearch1D({
      lo: 4e-10,
      hi: 25e-10,
      evalLoss: (a) => this._loss(a)
    });
  }
  generateData(n1 = 1, n2 = 2, a = 1e-9, noiseFrac = 0.04, logger) {
    this.trueA = a;
    this.data = [
      { n: n1, E: wellEnergyEV(n1, a) * (1 + noiseFrac * (Math.random() - 0.5)) },
      { n: n2, E: wellEnergyEV(n2, a) * (1 + noiseFrac * (Math.random() - 0.5)) }
    ];
    for (let k = 0; k < 6; k++) {
      const n = 1 + Math.floor(Math.random() * 4);
      this.data.push({ n, E: wellEnergyEV(n, a) * (1 + noiseFrac * (Math.random() + Math.random() - 1)) });
    }
    this.search.logger = logger;
    this.search.paramLabel = "a";
    this.search.trueValue = a;
    this.search.window = [a * 0.5, a * 1.7];
    this.search.estimate = (this.search.window[0] + this.search.window[1]) / 2;
    this.search.iter = 0;
    this.search.lastLoss = this.search.evalLoss(this.search.estimate);
    logger == null ? void 0 : logger.data(`true a=${(a * 1e9).toFixed(2)} nm, n1=${n1}, n2=${n2}, samples=${this.data.length}`);
  }
  _loss(a) {
    if (a <= 0) return Infinity;
    let s = 0;
    for (const d of this.data) {
      const pred = wellEnergyEV(d.n, a);
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
