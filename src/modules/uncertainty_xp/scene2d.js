// 2D Heisenberg teaching view — PhysSandbox-style matched |ψ(x)|² and |φ(p)|².
import { createDualCanvas } from '../common/teachPlots.js';
import {
  HBAR_HALF,
  gaussianDx,
  gaussianDp,
  xpProduct,
  samplePsiX,
  samplePhiP,
} from './physics.js';

function fillCurve(ctx, box, xMin, xMax, ys, fill, stroke) {
  const x0 = box[0];
  const y0 = box[1];
  const x1 = box[2];
  const y1 = box[3];
  let ymax = 1e-9;
  for (let i = 0; i < ys.length; i++) if (ys[i] > ymax) ymax = ys[i];
  ymax *= 1.12;
  function X(x) { return x0 + (x1 - x0) * (x - xMin) / (xMax - xMin); }
  function Y(y) { return y1 - (y1 - y0) * y / ymax; }

  ctx.beginPath();
  ctx.moveTo(X(xMin), y1);
  for (let i = 0; i < ys.length; i++) {
    const x = xMin + (xMax - xMin) * i / (ys.length - 1);
    ctx.lineTo(X(x), Y(ys[i]));
  }
  ctx.lineTo(X(xMax), y1);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();

  ctx.beginPath();
  for (let i = 0; i < ys.length; i++) {
    const x = xMin + (xMax - xMin) * i / (ys.length - 1);
    if (i === 0) ctx.moveTo(X(x), Y(ys[i]));
    else ctx.lineTo(X(x), Y(ys[i]));
  }
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2.4;
  ctx.stroke();

  return { X: X, Y: Y, ymax: ymax };
}

function widthMarks(ctx, map, sigma, y0, y1, color, label) {
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  for (const s of [-sigma, sigma]) {
    const x = map.X(s);
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // bracket for ±σ
  const xa = map.X(-sigma);
  const xb = map.X(sigma);
  const yb = y0 + 14;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(xa, yb);
  ctx.lineTo(xb, yb);
  ctx.moveTo(xa, yb - 4);
  ctx.lineTo(xa, yb + 4);
  ctx.moveTo(xb, yb - 4);
  ctx.lineTo(xb, yb + 4);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = '600 11px system-ui,sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, (xa + xb) / 2, yb - 6);
}

export class UncertaintyXP2D {
  constructor(host) {
    this.host = host;
    this.sigma = 1e-10;
    this.excess = 1;
    this.paused = false;
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h) {
      self._draw(ctx, w, h);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.sigma != null) this.sigma = p.sigma;
    if (p.excess != null) this.excess = p.excess;
  }

  setPaused(v) {
    this.paused = !!v;
    this._canvas.setPaused(v);
  }

  resize() { this._canvas.resize(); }
  tick() {}

  _draw(ctx, W, H) {
    if (!W || !H) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);

    const dx = gaussianDx(this.sigma);
    const dp = gaussianDp(this.sigma, this.excess);
    const prod = xpProduct(this.sigma, this.excess);
    const above = prod / HBAR_HALF - 1;

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 15px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Heisenberg product  σₓ σₚ  ≥  ℏ/2', W / 2, 22);
    ctx.fillStyle = '#8092b4';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('Narrower in position → broader in momentum (Fourier / wave-packet width)', W / 2, 40);

    const pad = 20;
    const top = 56;
    const gap = 16;
    const panelH = Math.min(210, (H - top - 70) * 0.48);
    const panelW = (W - pad * 2 - gap) / 2;

    const psi = samplePsiX(this.sigma);
    const phi = samplePhiP(this.sigma, this.excess);

    // Position panel
    const boxX = [pad, top, pad + panelW, top + panelH];
    ctx.fillStyle = 'rgba(10,17,34,0.9)';
    ctx.fillRect(boxX[0], boxX[1], panelW, panelH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(boxX[0], boxX[1], panelW, panelH);
    ctx.fillStyle = '#7dd3fc';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('|ψ(x)|²   position', boxX[0] + 10, boxX[1] + 18);
    const mapX = fillCurve(
      ctx,
      [boxX[0] + 12, boxX[1] + 28, boxX[2] - 12, boxX[3] - 28],
      psi.xMin, psi.xMax, psi.ys,
      'rgba(56,189,248,0.22)', '#38bdf8'
    );
    widthMarks(
      ctx, mapX, psi.sigmaA,
      boxX[1] + 28, boxX[3] - 28,
      '#fbbf24', '2σₓ ≈ ' + (2 * psi.sigmaA).toFixed(2) + ' Å'
    );
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('x (Å)', (boxX[0] + boxX[2]) / 2, boxX[3] - 8);

    // Momentum panel
    const boxP = [pad + panelW + gap, top, pad + 2 * panelW + gap, top + panelH];
    ctx.fillStyle = 'rgba(10,17,34,0.9)';
    ctx.fillRect(boxP[0], boxP[1], panelW, panelH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(boxP[0], boxP[1], panelW, panelH);
    ctx.fillStyle = '#f9a8d4';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('|φ(p)|²   momentum', boxP[0] + 10, boxP[1] + 18);
    const mapP = fillCurve(
      ctx,
      [boxP[0] + 12, boxP[1] + 28, boxP[2] - 12, boxP[3] - 28],
      phi.xMin, phi.xMax, phi.ys,
      'rgba(244,114,182,0.22)', '#f472b6'
    );
    widthMarks(
      ctx, mapP, phi.sigmaP,
      boxP[1] + 28, boxP[3] - 28,
      '#fbbf24', '2σₚ (plot units)'
    );
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('p  (units of ℏ/Å)', (boxP[0] + boxP[2]) / 2, boxP[3] - 8);

    // Measured values card (PhysSandbox-style)
    const cy = top + panelH + 18;
    const cardH = Math.min(120, H - cy - 16);
    const cardW = Math.min(520, W - 40);
    const cx = (W - cardW) / 2;
    ctx.fillStyle = 'rgba(10,17,34,0.92)';
    ctx.fillRect(cx, cy, cardW, cardH);
    ctx.strokeStyle = above > 0.02 ? '#fbbf24' : '#2dd4bf';
    ctx.strokeRect(cx, cy, cardW, cardH);

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Measured values', cx + 14, cy + 22);

    const col1 = cx + 14;
    const col2 = cx + cardW * 0.38;
    const col3 = cx + cardW * 0.68;
    const row1 = cy + 48;
    const row2 = cy + 78;

    function metric(x, y, k, v, accent) {
      ctx.fillStyle = '#8092b4';
      ctx.font = '11px system-ui,sans-serif';
      ctx.fillText(k, x, y);
      ctx.fillStyle = accent || '#eaf0fb';
      ctx.font = '600 16px system-ui,sans-serif';
      ctx.fillText(v, x, y + 20);
    }

    metric(col1, row1 - 8, 'σₓ', (dx * 1e10).toFixed(3) + ' Å', '#7dd3fc');
    metric(col2, row1 - 8, 'σₚ', dp.toExponential(3) + ' kg·m/s', '#f9a8d4');
    metric(col3, row1 - 8, 'σₓ σₚ', prod.toExponential(3), '#fbbf24');
    metric(col1, row2, 'ℏ/2 floor', HBAR_HALF.toExponential(3), '#5eead4');
    metric(col2, row2, 'Above ℏ/2', above < 0.005 ? '0 (minimum)' : (above * 100).toFixed(1) + '%', above > 0.02 ? '#fbbf24' : '#5eead4');
    metric(col3, row2, 'excess', this.excess.toFixed(2) + '×', '#c4b5fd');
  }

  dispose() { this._canvas.dispose(); }
}
