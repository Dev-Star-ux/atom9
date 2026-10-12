import { GridSearch1D } from "../common/canvasScene.js";
import { fringeSpacingM } from "../common/wavePhysics.js";
export class SlitSepFitter {
  constructor() {
    this.data = [];
    this.L = 1;
    this.trueD = 8e-5;
    this.search = new GridSearch1D({
      lo: 25e-6,
      hi: 16e-5,
      evalLoss: (d) => this._loss(d)
    });
  }
  generateData(freq = 7, slitSepUm = 80, distance = 1, noiseFrac = 0.05, n = 22, logger) {
    this.L = distance;
    this.trueD = slitSepUm * 1e-6;
    this.data = [];
    for (let i = 0; i < n; i++) {
      const f = freq * (0.85 + Math.random() * 0.3);
      const lamI = 299792458 / (f * 1e14) * 1e-9;
      const fringe = fringeSpacingM(lamI, this.trueD, distance);
      const noisy = fringe * (1 + noiseFrac * (Math.random() + Math.random() - 1));
      this.data.push({ lam: lamI, fringe: noisy });
    }
    this.search.logger = logger;
    this.search.paramLabel = "d";
    this.search.trueValue = this.trueD;
    this.search.window = [this.trueD * 0.45, this.trueD * 1.55];
    this.search.estimate = (this.search.window[0] + this.search.window[1]) / 2;
    this.search.iter = 0;
    this.search.lastLoss = this.search.evalLoss(this.search.estimate);
    logger == null ? void 0 : logger.data(`true d=${slitSepUm} \xB5m, L=${distance} m, samples=${this.data.length}`);
  }
  _loss(d) {
    if (d <= 0) return Infinity;
    let s = 0;
    for (const pt of this.data) {
      const pred = fringeSpacingM(pt.lam, d, this.L);
      s += ((pred - pt.fringe) / pt.fringe) ** 2;
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
