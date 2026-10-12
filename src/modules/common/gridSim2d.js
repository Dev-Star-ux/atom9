/** 2D grid helpers for wave / heat / RD sims. */
export function makeGrid(cols, rows, fill) {
  const g = new Float32Array(cols * rows);
  if (fill != null) g.fill(fill);
  return g;
}

export function idx(c, x, y) { return y * c + x; }

export function laplacian5(g, cols, rows, x, y) {
  const i = idx(cols, x, y);
  const c = g[i];
  let s = -4 * c;
  if (x > 0) s += g[i - 1];
  if (x < cols - 1) s += g[i + 1];
  if (y > 0) s += g[i - cols];
  if (y < rows - 1) s += g[i + cols];
  return s;
}

export function drawGridHeatmap(ctx, g, cols, rows, x0, y0, w, h, vmin, vmax, colorFn) {
  const cw = w / cols;
  const ch = h / rows;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const v = g[idx(cols, x, y)];
      const t = vmax > vmin ? (v - vmin) / (vmax - vmin) : 0;
      ctx.fillStyle = colorFn(Math.max(0, Math.min(1, t)), v);
      ctx.fillRect(x0 + x * cw, y0 + y * ch, cw + 0.5, ch + 0.5);
    }
  }
}

export function cyanMag(t) {
  const r = Math.floor(7 + t * 40);
  const g = Math.floor(13 + t * 180);
  const b = Math.floor(24 + t * 220);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}
