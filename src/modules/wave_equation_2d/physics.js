/** 2-D scalar wave equation — explicit FDTD on a fixed grid. */
import { makeGrid, idx, laplacian5 } from '../common/gridSim2d.js';

export const COLS = 80;
export const ROWS = 60;
export const C2 = 0.35;
export const DAMP = 0.9995;

export class WaveGrid2D {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.u = makeGrid(cols, rows, 0);
    this.uPrev = makeGrid(cols, rows, 0);
    this.mask = makeGrid(cols, rows, 0);
    this.t = 0;
    this.sourceX = Math.floor(cols * 0.5);
    this.sourceY = Math.floor(rows * 0.5);
    this.omega = 0.22;
    this.amplitude = 0.45;
  }

  setSlit(on) {
    this.mask.fill(0);
    if (!on) return;
    const bx = Math.floor(this.cols * 0.52);
    const cy = Math.floor(this.rows * 0.5);
    const gap = 5;
    for (let y = 1; y < this.rows - 1; y++) {
      if (Math.abs(y - cy) > gap) this.mask[idx(this.cols, bx, y)] = 1;
    }
  }

  reset() {
    this.u.fill(0);
    this.uPrev.fill(0);
    this.t = 0;
  }

  step(steps) {
    if (steps == null) steps = 1;
    const { cols, rows, mask } = this;
    for (let s = 0; s < steps; s++) {
      const u = this.u;
      const uPrev = this.uPrev;
      const next = makeGrid(cols, rows, 0);
      for (let y = 1; y < rows - 1; y++) {
        for (let x = 1; x < cols - 1; x++) {
          const i = idx(cols, x, y);
          if (mask[i]) {
            next[i] = 0;
            continue;
          }
          const lap = laplacian5(u, cols, rows, x, y);
          next[i] = DAMP * (2 * u[i] - uPrev[i] + C2 * lap);
        }
      }
      const sx = this.sourceX;
      const sy = this.sourceY;
      if (!mask[idx(cols, sx, sy)]) {
        next[idx(cols, sx, sy)] += this.amplitude * Math.sin(this.t * this.omega * Math.PI * 2);
      }
      this.uPrev = u;
      this.u = next;
      this.t += 1;
    }
  }

  peakAbs() {
    let m = 1e-9;
    for (let i = 0; i < this.u.length; i++) {
      const a = Math.abs(this.u[i]);
      if (a > m) m = a;
    }
    return m;
  }
}
