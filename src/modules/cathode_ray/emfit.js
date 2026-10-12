import * as tf from "@tensorflow/tfjs";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";
import { GEO, EM_TRUE, deflectionB } from "./physics.js";
const C = GEO.L * (GEO.L / 2 + GEO.L2);
export class EMFitter {
  constructor() {
    this.backendName = "cpu";
    this.u = null;
    this.optimizer = null;
    this.B = null;
    this.Vacc = null;
    this.Y = null;
    this.data = [];
    this.epoch = 0;
    this.lastLoss = NaN;
  }
  async init() {
    try {
      setWasmPaths("/dist/");
      await tf.setBackend("wasm");
      await tf.ready();
      this.backendName = "wasm";
    } catch {
      await tf.setBackend("cpu");
      await tf.ready();
      this.backendName = "cpu";
    }
  }
  // Generate noisy magnetic-deflection measurements from the true e/m.
  generateData(n = 140, noiseFrac = 0.03, logger) {
    this.logger = logger || null;
    this.epoch = 0;
    this.lastLoss = NaN;
    const Bs = new Float32Array(n), Vs = new Float32Array(n), Ys = new Float32Array(n);
    this.data = [];
    for (let i = 0; i < n; i++) {
      const B = 5e-4 + Math.random() * 15e-4;
      const Vacc = 1e3 + Math.random() * 3e3;
      const trueY = deflectionB(B, Vacc, EM_TRUE);
      const noise = trueY * noiseFrac * (Math.random() + Math.random() + Math.random() - 1.5);
      const Y = Math.max(0, trueY + noise);
      Bs[i] = B;
      Vs[i] = Vacc;
      Ys[i] = Y;
      this.data.push({ B, Vacc, Y });
    }
    this._dispose();
    this.B = tf.tensor1d(Bs);
    this.Vacc = tf.tensor1d(Vs);
    this.Y = tf.tensor1d(Ys);
    this.u = tf.variable(tf.scalar(Math.log(7e10)));
    this.optimizer = tf.train.adam(0.06);
    logger == null ? void 0 : logger.data(`generated ${n} deflection measurements, backend=${this.backendName}`);
  }
  _predict() {
    const em = tf.exp(this.u);
    return tf.mul(tf.scalar(C), tf.mul(this.B, tf.sqrt(tf.div(em, tf.mul(this.Vacc, 2)))));
  }
  step(iters = 1) {
    var _a;
    if (!this.u) return this.lastLoss;
    let loss = this.lastLoss;
    for (let i = 0; i < iters; i++) {
      const l = this.optimizer.minimize(() => {
        const pred = this._predict();
        return tf.losses.meanSquaredError(this.Y, pred);
      }, true);
      loss = l.dataSync()[0];
      l.dispose();
      this.epoch++;
    }
    this.lastLoss = loss;
    (_a = this.logger) == null ? void 0 : _a.step(`epoch ${this.epoch}: loss=${loss.toExponential(3)}, e/m\u2248${(this.emEstimate / 1e11).toFixed(3)}\xD710\xB9\xB9 C/kg`);
    return loss;
  }
  get emEstimate() {
    return this.u ? Math.exp(this.u.dataSync()[0]) : NaN;
  }
  get errorPct() {
    return Math.abs(this.emEstimate - EM_TRUE) / EM_TRUE * 100;
  }
  // Fitted magnetic deflection vs B (for the current estimate), for plotting.
  fittedCurve(Vacc, count = 60) {
    const em = this.emEstimate;
    const out = [];
    for (let i = 0; i < count; i++) {
      const B = 5e-4 + (2e-3 - 5e-4) * i / (count - 1);
      out.push({ B, Y: deflectionB(B, Vacc, em) });
    }
    return out;
  }
  _dispose() {
    for (const t of [this.B, this.Vacc, this.Y, this.u]) if (t) t.dispose();
    this.B = this.Vacc = this.Y = this.u = null;
  }
  dispose() {
    this._dispose();
    if (this.optimizer && this.optimizer.dispose) this.optimizer.dispose();
  }
}
