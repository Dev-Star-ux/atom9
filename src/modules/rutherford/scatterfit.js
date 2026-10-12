import * as tf from "@tensorflow/tfjs";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";
import { rutherfordCount } from "./physics.js";
export const FIT_K = 0.01;
export class ScatterFitter {
  constructor() {
    this.backendName = "cpu";
    this.u = null;
    this.optimizer = null;
    this.angles = [];
    this.obsLogN = null;
    this.logSinHalf = null;
    this.data = [];
    this.epoch = 0;
    this.lastLoss = NaN;
    this.Ztrue = 79;
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
  // Simulate a noisy angular distribution for the true nucleus charge.
  generateData(Ztrue, noiseFrac = 0.06, logger) {
    this.Ztrue = Ztrue;
    this.epoch = 0;
    this.lastLoss = NaN;
    const angles = [];
    for (let a = 20; a <= 160; a += 8) angles.push(a);
    this.angles = angles;
    this.data = [];
    const logN = new Float32Array(angles.length);
    const logSin = new Float32Array(angles.length);
    for (let i = 0; i < angles.length; i++) {
      const N = rutherfordCount(Ztrue, angles[i], FIT_K);
      const noisy = Math.log(N) + noiseFrac * (Math.random() + Math.random() + Math.random() - 1.5);
      logN[i] = noisy;
      logSin[i] = Math.log(Math.sin(angles[i] * Math.PI / 360));
      this.data.push({ theta: angles[i], N: Math.exp(noisy) });
    }
    this._dispose();
    this.obsLogN = tf.tensor1d(logN);
    this.logSinHalf = tf.tensor1d(logSin);
    this.u = tf.variable(tf.scalar(Math.log(20)));
    this.optimizer = tf.train.adam(0.08);
    logger == null ? void 0 : logger.data(`true Z=${Ztrue}, ${angles.length} angles, noise=${(noiseFrac * 100).toFixed(0)}%, backend=${this.backendName}`);
    logger == null ? void 0 : logger.info("Initial Z guess \u2248 20 (deliberately wrong)");
  }
  step(iters = 1, logger) {
    if (!this.u) return this.lastLoss;
    const lnK = Math.log(FIT_K);
    let loss = this.lastLoss;
    for (let i = 0; i < iters; i++) {
      const l = this.optimizer.minimize(() => {
        const pred = tf.add(tf.add(tf.scalar(lnK), tf.mul(this.u, 2)), tf.mul(this.logSinHalf, -4));
        return tf.losses.meanSquaredError(this.obsLogN, pred);
      }, true);
      loss = l.dataSync()[0];
      l.dispose();
      this.epoch++;
      const z = Math.exp(this.u.dataSync()[0]);
      logger == null ? void 0 : logger.step(`epoch ${this.epoch}: loss=${loss.toExponential(3)}, Z\u2248${z.toFixed(2)}`);
    }
    this.lastLoss = loss;
    return loss;
  }
  get zEstimate() {
    return this.u ? Math.exp(this.u.dataSync()[0]) : NaN;
  }
  get errorPct() {
    return Math.abs(this.zEstimate - this.Ztrue) / this.Ztrue * 100;
  }
  fittedCurve(count = 80) {
    const Z = this.zEstimate;
    const out = [];
    for (let i = 0; i < count; i++) {
      const theta = 15 + (165 - 15) * i / (count - 1);
      out.push({ theta, N: rutherfordCount(Z, theta, FIT_K) });
    }
    return out;
  }
  _dispose() {
    for (const t of [this.obsLogN, this.logSinHalf, this.u]) if (t) t.dispose();
    this.obsLogN = this.logSinHalf = this.u = null;
  }
  dispose() {
    this._dispose();
    if (this.optimizer && this.optimizer.dispose) this.optimizer.dispose();
  }
}
