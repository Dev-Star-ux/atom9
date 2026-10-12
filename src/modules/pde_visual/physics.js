/** Gray–Scott reaction–diffusion on a 2D grid (u, v). */
import { makeGrid, idx, laplacian5 } from '../common/gridSim2d.js';

export const GRID_COLS = 128;
export const GRID_ROWS = 128;
export const DEFAULT_DU = 0.16;
export const DEFAULT_DV = 0.08;

/** Classic (F, k) presets — spots, stripes, and related morphologies. */
export const PRESETS = {
  spots: { F: 0.035, k: 0.065, label: 'Spots' },
  stripes: { F: 0.055, k: 0.062, label: 'Stripes' },
  coral: { F: 0.0545, k: 0.062, label: 'Coral' },
  maze: { F: 0.029, k: 0.057, label: 'Maze' },
};

export function createGrayScott(cols, rows, F, k, Du, Dv) {
  const u = makeGrid(cols, rows, 1);
  const v = makeGrid(cols, rows, 0);
  seedCenter(u, v, cols, rows);
  return {
    u,
    v,
    uNext: makeGrid(cols, rows),
    vNext: makeGrid(cols, rows),
    cols,
    rows,
    F,
    k,
    Du,
    Dv,
    dt: 1.0,
  };
}

function seedCenter(u, v, cols, rows) {
  const cx = Math.floor(cols / 2);
  const cy = Math.floor(rows / 2);
  const r = Math.floor(Math.min(cols, rows) * 0.06);
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if (x < 0 || x >= cols || y < 0 || y >= rows) continue;
      const i = idx(cols, x, y);
      u[i] = 0.5 + Math.random() * 0.15;
      v[i] = 0.25 + Math.random() * 0.15;
    }
  }
}

/** Explicit Euler step with 5-point Laplacian and zero-flux implicit boundaries. */
export function stepGrayScott(sim, steps) {
  const { cols, rows, F, k, Du, Dv, dt } = sim;
  for (let s = 0; s < steps; s++) {
    const u = sim.u;
    const v = sim.v;
    const uNext = sim.uNext;
    const vNext = sim.vNext;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = idx(cols, x, y);
        const uVal = u[i];
        const vVal = v[i];
        const uvv = uVal * vVal * vVal;
        const lapU = laplacian5(u, cols, rows, x, y);
        const lapV = laplacian5(v, cols, rows, x, y);
        uNext[i] = uVal + dt * (Du * lapU - uvv + F * (1 - uVal));
        vNext[i] = vVal + dt * (Dv * lapV + uvv - (F + k) * vVal);
      }
    }
    sim.u = uNext;
    sim.uNext = u;
    sim.v = vNext;
    sim.vNext = v;
  }
}

export function gridRange(g) {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < g.length; i++) {
    const v = g[i];
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return [lo, hi];
}

/** Purple → cyan heatmap for activator field v. */
export function rdColor(t) {
  const r = Math.floor(18 + t * 210);
  const g = Math.floor(8 + t * 170);
  const b = Math.floor(48 + (1 - t) * 160);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}
