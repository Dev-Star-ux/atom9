import { H_TRUE, E, stoppingVoltage, thresholdFreq } from "./physics.js";
const FSCALE = 1e15;
export class PlanckFitter {
  constructor() {
    this.data = [];
    this.slope = 3;
    this.intercept = -1;
    this.epoch = 0;
    this.lastLoss = NaN;
    this.phi = 2.28;
  }
  // Simulate stopping-voltage measurements above threshold for a metal.
  generateData(phiEV, noiseFrac = 0.05, n = 24, logger) {
    this.phi = phiEV;
    const f0 = thresholdFreq(phiEV);
    this.data = [];
    for (let i = 0; i < n; i++) {
      const f = f0 * (1.05 + Math.random() * 0.9);
      const Vs = stoppingVoltage(f, phiEV) * (1 + noiseFrac * (Math.random() + Math.random() + Math.random() - 1.5));
      this.data.push({ f, Vs });
    }
    this.slope = 3;
    this.intercept = -1;
    this.epoch = 0;
    this.lastLoss = this._loss();
    logger == null ? void 0 : logger.data(`\u03C6=${phiEV.toFixed(2)} eV, ${n} points, f\u2080=${(f0 / 1e14).toFixed(2)}\xD710\xB9\u2074 Hz, noise=${(noiseFrac * 100).toFixed(0)}%`);
    logger == null ? void 0 : logger.info("Initial line fit: slope=3, intercept=\u22121 (deliberately wrong)");
  }
  _loss() {
    let s = 0;
    for (const d of this.data) {
      const p = this.slope * (d.f / FSCALE) + this.intercept;
      s += (p - d.Vs) ** 2;
    }
    return s / (this.data.length || 1);
  }
  // one gradient-descent step on (slope, intercept)
  step(lr = 0.05, logger) {
    let gS = 0, gB = 0;
    for (const d of this.data) {
      const x = d.f / FSCALE;
      const err = this.slope * x + this.intercept - d.Vs;
      gS += 2 * err * x;
      gB += 2 * err;
    }
    const n = this.data.length || 1;
    this.slope -= lr * gS / n;
    this.intercept -= lr * gB / n;
    this.epoch++;
    this.lastLoss = this._loss();
    logger == null ? void 0 : logger.step(
      `epoch ${this.epoch}: loss=${this.lastLoss.toExponential(3)}, h\u2248${(this.hEstimate * 1e34).toFixed(2)}e-34, \u03C6\u2248${this.workFunctionEstimate.toFixed(2)} eV`
    );
    return this.lastLoss;
  }
  // slope (V per 10¹⁵ Hz) = (h/e)·10¹⁵  →  h = slope·10⁻¹⁵·e
  get hEstimate() {
    return this.slope / FSCALE * E;
  }
  get errorPct() {
    return Math.abs(this.hEstimate - H_TRUE) / H_TRUE * 100;
  }
  get workFunctionEstimate() {
    return -this.intercept;
  }
  // intercept = −φ/e
  fittedLine() {
    if (!this.data.length) return [];
    const fs = this.data.map((d) => d.f);
    const lo = Math.min(...fs) * 0.95, hi = Math.max(...fs) * 1.02;
    return [
      { f: lo, Vs: this.slope * (lo / FSCALE) + this.intercept },
      { f: hi, Vs: this.slope * (hi / FSCALE) + this.intercept }
    ];
  }
}
