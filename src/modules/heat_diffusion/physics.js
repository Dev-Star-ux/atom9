import { makeGrid, idx, laplacian5 } from '../common/gridSim2d.js';

export const GRID_1D = 120;
export const GRID_2D = 64;

/** Explicit finite-difference heat equation: ∂u/∂t = D∇²u */
export class HeatSim {
  constructor() {
    this.dim = 2;
    this.D = 0.18;
    this.cols = GRID_2D;
    this.rows = GRID_2D;
    this.u = makeGrid(this.cols, this.rows, 0);
    this.uNext = makeGrid(this.cols, this.rows, 0);
    this.t = 0;
    this.dx = 1 / this.cols;
    this._alloc();
    this.resetPulse();
  }

  _alloc() {
    const n = this.cols * this.rows;
    this.u = makeGrid(this.cols, this.rows, 0);
    this.uNext = makeGrid(this.cols, this.rows, 0);
    this.dx = 1 / Math.max(this.cols, this.rows);
  }

  setDim(dim) {
    const d = dim === 1 ? 1 : 2;
    if (d === this.dim) return;
    this.dim = d;
    if (d === 1) {
      this.cols = GRID_1D;
      this.rows = 1;
    } else {
      this.cols = GRID_2D;
      this.rows = GRID_2D;
    }
    this._alloc();
    this.resetPulse();
  }

  setD(D) {
    this.D = Math.max(0.01, D);
  }

  /** Stable explicit step: α ≤ 0.5 (1D) or ≤ 0.25 (2D). */
  maxDt() {
    const alphaMax = this.dim === 1 ? 0.48 : 0.22;
    return alphaMax * this.dx * this.dx / this.D;
  }

  resetPulse() {
    this.u.fill(0);
    const cx = (this.cols - 1) * 0.5;
    const cy = (this.rows - 1) * 0.5;
    const r = this.dim === 1 ? 3 : Math.max(3, Math.min(this.cols, this.rows) * 0.1);
    const r2 = r * r;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const dx = x - cx;
        const dy = this.dim === 1 ? 0 : y - cy;
        if (dx * dx + dy * dy <= r2) {
          this.u[idx(this.cols, x, y)] = 1;
        }
      }
    }
    this.t = 0;
  }

  step() {
    const dt = this.maxDt();
    const alpha = this.D * dt / (this.dx * this.dx);
    const { cols, rows, u, uNext } = this;

    if (this.dim === 1) {
      for (let x = 1; x < cols - 1; x++) {
        const lap = u[x - 1] - 2 * u[x] + u[x + 1];
        uNext[x] = u[x] + alpha * lap;
      }
      uNext[0] = uNext[cols - 1] = 0;
    } else {
      for (let y = 1; y < rows - 1; y++) {
        for (let x = 1; x < cols - 1; x++) {
          uNext[idx(cols, x, y)] = u[idx(cols, x, y)] + alpha * laplacian5(u, cols, rows, x, y);
        }
      }
    }

    u.set(uNext);
    this.t += dt;
  }

  peak() {
    let m = 0;
    for (let i = 0; i < this.u.length; i++) if (this.u[i] > m) m = this.u[i];
    return m;
  }

  totalEnergy() {
    let s = 0;
    for (let i = 0; i < this.u.length; i++) s += this.u[i];
    return s / this.u.length;
  }
}
