// AI discovers an unknown Y-rotation angle θ from noisy shot statistics.
// P(1 | Ry(θ)|0⟩) = sin²(θ/2).
import { GridSearch1D } from '../common/canvasScene.js';
import { applyRy, ket0, probs } from './physics.js';

export class QubitAngleFitter {
  constructor() {
    this.data = [];
    this.trueTheta = 1.1;
    this.search = new GridSearch1D({
      lo: 0.2,
      hi: Math.PI - 0.2,
      evalLoss: (th) => this._loss(th),
    });
    this.search.trueValue = this.trueTheta;
  }

  generateData(noiseFrac, logger) {
    const nf = noiseFrac == null ? 0.05 : noiseFrac;
    this.trueTheta = 0.6 + Math.random() * 1.8;
    this.data = [];
    const shots = 8;
    for (let i = 0; i < shots; i++) {
      const th = 0.35 + i * 0.28;
      const st = applyRy(ket0(), th);
      const p1 = probs(st).p1;
      const noisy = Math.max(0, Math.min(1, p1 + nf * (Math.random() + Math.random() + Math.random() - 1.5)));
      this.data.push({ theta: th, p1: noisy });
    }
    // Also a secret single angle to recover from one dense shot set
    const secret = applyRy(ket0(), this.trueTheta);
    const pSecret = probs(secret).p1;
    this.data.push({
      theta: null,
      p1: Math.max(0, Math.min(1, pSecret + nf * (Math.random() + Math.random() - 1))),
      secret: true,
    });

    this.search = new GridSearch1D({
      lo: 0.15,
      hi: Math.PI - 0.15,
      evalLoss: (th) => this._loss(th),
      logger: logger,
      paramLabel: 'θ',
    });
    this.search.trueValue = this.trueTheta;
    this.search.lastLoss = this._loss(this.search.estimate);
    if (logger) {
      logger.data('Collected ' + this.data.length + ' shot rows; recover unknown Ry(θ) from P(1).');
    }
  }

  _loss(th) {
    if (th <= 0 || th >= Math.PI) return Infinity;
    let s = 0;
    let n = 0;
    for (let i = 0; i < this.data.length; i++) {
      const d = this.data[i];
      if (d.secret) {
        const pred = probs(applyRy(ket0(), th)).p1;
        s += Math.pow(pred - d.p1, 2);
        n++;
      } else if (d.theta != null) {
        const pred = probs(applyRy(ket0(), d.theta)).p1;
        // soft prior: known calibration shots should match sin² model
        s += 0.15 * Math.pow(pred - d.p1, 2);
        n += 0.15;
      }
    }
    return s / (n || 1);
  }

  step() {
    return this.search.step();
  }

  get estimate() { return this.search.estimate; }
  get errorPct() {
    const t = this.trueTheta;
    if (!t) return 100;
    return Math.abs(this.estimate - t) / t * 100;
  }
  get lastLoss() { return this.search.lastLoss; }
  get iter() { return this.search.iter || 0; }
}
