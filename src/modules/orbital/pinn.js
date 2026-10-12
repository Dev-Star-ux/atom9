import * as tf from "@tensorflow/tfjs";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";
import { radialProb, rMaxFor } from "../../wavefunction.js";
const N_SAMPLES = 160;
export class WavefunctionNet {
  constructor() {
    this.backendName = "cpu";
    this.model = null;
    this.optimizer = null;
    this.xs = null;
    this.ys = null;
    this.epoch = 0;
    this.lastLoss = NaN;
    this.pMax = 1;
    this.rMax = 10;
  }
  async init() {
    try {
      setWasmPaths("/dist/");
      await tf.setBackend("wasm");
      await tf.ready();
      this.backendName = "wasm";
    } catch (e) {
      await tf.setBackend("cpu");
      await tf.ready();
      this.backendName = "cpu";
    }
    this._buildModel();
  }
  _buildModel() {
    if (this.model) this.model.dispose();
    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 48, activation: "tanh", inputShape: [1] }));
    model.add(tf.layers.dense({ units: 48, activation: "tanh" }));
    model.add(tf.layers.dense({ units: 48, activation: "tanh" }));
    model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));
    this.model = model;
    this.optimizer = tf.train.adam(0.01);
  }
  // Prepare training data for the chosen orbital's radial function.
  setTarget(n, l, logger) {
    this.epoch = 0;
    this.lastLoss = NaN;
    this._buildModel();
    this.rMax = rMaxFor(n);
    const rs = new Float32Array(N_SAMPLES);
    const ps = new Float32Array(N_SAMPLES);
    let pMax = 0;
    for (let i = 0; i < N_SAMPLES; i++) {
      const r = (i + 0.5) / N_SAMPLES * this.rMax;
      rs[i] = r / this.rMax;
      ps[i] = radialProb(n, l, r);
      if (ps[i] > pMax) pMax = ps[i];
    }
    this.pMax = pMax || 1;
    for (let i = 0; i < N_SAMPLES; i++) ps[i] /= this.pMax;
    if (this.xs) this.xs.dispose();
    if (this.ys) this.ys.dispose();
    this.xs = tf.tensor2d(rs, [N_SAMPLES, 1]);
    this.ys = tf.tensor2d(ps, [N_SAMPLES, 1]);
    logger == null ? void 0 : logger.data(`orbital n=${n}, \u2113=${l}, ${N_SAMPLES} radial samples, rMax=${this.rMax.toFixed(2)}`);
    logger == null ? void 0 : logger.info("Neural net rebuilt \u2014 weights randomised");
  }
  // Run `iters` optimizer steps; returns the latest loss value.
  step(iters = 1, logger) {
    if (!this.model || !this.xs) return this.lastLoss;
    let lossVal = this.lastLoss;
    for (let i = 0; i < iters; i++) {
      const lossTensor = this.optimizer.minimize(() => {
        const pred = this.model.apply(this.xs);
        return tf.losses.meanSquaredError(this.ys, pred);
      }, true);
      lossVal = lossTensor.dataSync()[0];
      lossTensor.dispose();
      this.epoch++;
      logger == null ? void 0 : logger.step(`epoch ${this.epoch}: loss=${lossVal.toExponential(3)}`);
    }
    this.lastLoss = lossVal;
    return lossVal;
  }
  // Predict the (normalized) curve over `count` points in [0, rMax].
  predictCurve(count = 120) {
    const rn = new Float32Array(count);
    for (let i = 0; i < count; i++) rn[i] = i / (count - 1);
    return tf.tidy(() => {
      const input = tf.tensor2d(rn, [count, 1]);
      const out = this.model.apply(input);
      return Array.from(out.dataSync());
    });
  }
  // Exact (normalized) target curve for the same points, for comparison.
  exactCurve(n, l, count = 120) {
    const out = new Array(count);
    for (let i = 0; i < count; i++) {
      const r = i / (count - 1) * this.rMax;
      out[i] = radialProb(n, l, r) / this.pMax;
    }
    return out;
  }
  reset() {
    this.setTargetLast && this.setTargetLast();
  }
  dispose() {
    if (this.model) this.model.dispose();
    if (this.xs) this.xs.dispose();
    if (this.ys) this.ys.dispose();
    if (this.optimizer) this.optimizer.dispose && this.optimizer.dispose();
  }
}
