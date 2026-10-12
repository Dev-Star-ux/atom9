import { logGridStep } from "../common/aiPanel.js";
import { E_TRUE, makeDrop } from "./physics.js";
export class ChargeQuantumFinder {
  constructor() {
    this.data = [];
    this.estimate = NaN;
    this.window = [1.2, 2.2];
    this.iter = 0;
    this.lastLoss = NaN;
    this.searchRange = [1, 2.4];
  }
  generateData(n = 48, noiseFrac = 0.03, logger) {
    this.data = [];
    for (let i = 0; i < n; i++) this.data.push(makeDrop(noiseFrac));
    this.data[0] = { n: 1, q: E_TRUE * (1 + noiseFrac * 0.1), radiusUm: 0.7 };
    this.window = [1.2, 2.2];
    this.estimate = (this.window[0] + this.window[1]) / 2;
    this.iter = 0;
    this.lastLoss = this.combLoss(this.estimate);
    const qRange = this.data.map((d) => d.q);
    logger == null ? void 0 : logger.data(`${n} drops, noise=${(noiseFrac * 100).toFixed(1)}%, q\u2208[${Math.min(...qRange).toFixed(3)}, ${Math.max(...qRange).toFixed(3)}]\xD710\u207B\xB9\u2079 C`);
    logger == null ? void 0 : logger.info(`Search window [${this.window[0].toFixed(2)}, ${this.window[1].toFixed(2)}]\xD710\u207B\xB9\u2079 C`);
  }
  combLoss(e) {
    let s = 0;
    for (const d of this.data) {
      const t = Math.sin(Math.PI * d.q / e);
      s += t * t;
    }
    return s / (this.data.length || 1);
  }
  // one coarse-to-fine step: scan the current window, keep the best e, shrink.
  step(logger) {
    const [lo, hi] = this.window;
    let best = lo, bl = Infinity;
    for (let k = 0; k < 80; k++) {
      const e = lo + (hi - lo) * k / 79;
      const l = this.combLoss(e);
      if (l < bl) {
        bl = l;
        best = e;
      }
    }
    this.estimate = best;
    this.lastLoss = bl;
    const half = (hi - lo) * 0.32;
    this.window = [Math.max(1, best - half), Math.min(2.4, best + half)];
    this.iter++;
    if (logger) {
      logGridStep(logger, {
        iter: this.iter,
        estimate: best,
        loss: bl,
        window: this.window,
        trueValue: E_TRUE,
        label: "e"
      });
    }
    return bl;
  }
  get errorPct() {
    return Math.abs(this.estimate - E_TRUE) / E_TRUE * 100;
  }
  // L(e) landscape for plotting.
  lossCurve(count = 160) {
    const [lo, hi] = this.searchRange;
    const out = [];
    for (let i = 0; i < count; i++) {
      const e = lo + (hi - lo) * i / (count - 1);
      out.push({ e, loss: this.combLoss(e) });
    }
    return out;
  }
}
