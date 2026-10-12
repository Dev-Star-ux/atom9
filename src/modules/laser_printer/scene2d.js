/** Laser printer (xerographic process) teaching canvas. */
import { createDualCanvas } from '../common/teachPlots.js';
import { contrastV, opticalDensity, fuserOk, tonerCoveragePattern } from './physics.js';

const N_CELLS = 90;
const STAGES = ['CHARGE', 'EXPOSE', 'DEVELOP', 'TRANSFER', 'FUSE'];
const COL_CHARGED = '#1e1b4b';     // dark indigo/purple — charged, no toner
const COL_EXPOSED = '#fde047';     // bright yellow — discharged / latent image
const COL_ACCENT = '#fbbf24';
const COL_CORONA = '#a78bfa';
const COL_LASER = '#38bdf8';
const COL_TONER = '#e2e8f0';

export class LaserPrinter2D {
  constructor(host) {
    this.state = {
      chargeV: 800,
      expResidualV: 100,
      density: 0.35,
      fuserTempC: 195,
    };
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.chargeV != null) this.state.chargeV = p.chargeV;
    if (p.expResidualV != null) this.state.expResidualV = p.expResidualV;
    if (p.density != null) this.state.density = p.density;
    if (p.fuserTempC != null) this.state.fuserTempC = p.fuserTempC;
  }

  setPaused(v) { this._canvas.setPaused(v); }
  setActive(v) { this._active = !!v; }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _stageIndex(phase) {
    const cyc = (phase * 0.12) % 1;
    return Math.max(0, Math.min(4, Math.floor(cyc * 5)));
  }

  _draw(ctx, W, H, phase) {
    if (!W || !H) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);

    const capH = Math.max(28, Math.min(36, Math.floor(H * 0.09)));
    const stageIdx = this._stageIndex(phase);
    this._drawStageCaption(ctx, W, capH, stageIdx);

    const remH = H - capH;
    const schemH = Math.floor(remH * 0.7);
    ctx.save();
    ctx.translate(0, capH);
    this._drawSchematic(ctx, W, schemH, phase);
    ctx.restore();
    this._drawPotentialPlot(ctx, 0, capH + schemH + 4, W, H - capH - schemH - 4);
  }

  /** Bold top caption strip: "Stage: CHARGE → EXPOSE → ..." with current stage highlighted. */
  _drawStageCaption(ctx, W, capH, stageIdx) {
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, W, capH);
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
    ctx.beginPath();
    ctx.moveTo(0, capH - 0.5);
    ctx.lineTo(W, capH - 0.5);
    ctx.stroke();

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const y = capH / 2;
    let x = 14;

    ctx.font = '700 15px system-ui,sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('Stage:', x, y);
    x += ctx.measureText('Stage:').width + 10;

    for (let i = 0; i < STAGES.length; i++) {
      const active = i === stageIdx;
      ctx.font = active ? '800 16px system-ui,sans-serif' : '600 13px system-ui,sans-serif';
      ctx.fillStyle = active ? COL_ACCENT : 'rgba(148, 163, 184, 0.45)';
      ctx.fillText(STAGES[i], x, y);
      x += ctx.measureText(STAGES[i]).width + 8;
      if (i < STAGES.length - 1) {
        ctx.font = '600 13px system-ui,sans-serif';
        ctx.fillStyle = 'rgba(100, 116, 139, 0.55)';
        ctx.fillText('→', x, y);
        x += ctx.measureText('→').width + 8;
      }
    }
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
  }

  /** Arrow + label box pointing from (x,y) outward by (dx,dy). */
  _callout(ctx, x, y, dx, dy, text, color) {
    const tx = x + dx;
    const ty = y + dy;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(tx, ty);
    ctx.stroke();

    const ang = Math.atan2(y - ty, x - tx);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 7 * Math.cos(ang - 0.4), y - 7 * Math.sin(ang - 0.4));
    ctx.lineTo(x - 7 * Math.cos(ang + 0.4), y - 7 * Math.sin(ang + 0.4));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    ctx.font = '700 12px system-ui,sans-serif';
    ctx.textBaseline = 'middle';
    const alignLeft = dx >= 0;
    ctx.textAlign = alignLeft ? 'left' : 'right';
    const labelX = alignLeft ? tx + 6 : tx - 6;
    const wtext = ctx.measureText(text).width;
    const pad = 4;
    const boxX = alignLeft ? tx + 2 : tx - 4 - wtext - 2 * pad;
    ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
    ctx.fillRect(boxX, ty - 10, wtext + 2 * pad, 20);
    ctx.fillStyle = color;
    ctx.fillText(text, labelX, ty);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  _drawLegend(ctx, x, y) {
    const rows = [
      [COL_CHARGED, 'Charged (no toner)'],
      [COL_EXPOSED, 'Exposed (toner sticks)'],
    ];
    ctx.font = '700 11px system-ui,sans-serif';
    let maxW = 0;
    for (let i = 0; i < rows.length; i++) {
      maxW = Math.max(maxW, ctx.measureText(rows[i][1]).width);
    }
    const boxW = maxW + 34;
    const boxH = rows.length * 18 + 10;
    ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
    ctx.fillRect(x, y, boxW, boxH);
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.5)';
    ctx.strokeRect(x + 0.5, y + 0.5, boxW - 1, boxH - 1);
    ctx.textBaseline = 'middle';
    for (let i = 0; i < rows.length; i++) {
      const ry = y + 10 + i * 18;
      ctx.fillStyle = rows[i][0];
      ctx.strokeStyle = 'rgba(226,232,240,0.6)';
      ctx.lineWidth = 1;
      ctx.fillRect(x + 8, ry - 6, 14, 12);
      ctx.strokeRect(x + 8.5, ry - 5.5, 13, 11);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '600 11px system-ui,sans-serif';
      ctx.fillText(rows[i][1], x + 28, ry);
    }
    ctx.textBaseline = 'alphabetic';
  }

  _drawSchematic(ctx, W, H, phase) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
    ctx.beginPath();
    ctx.moveTo(0, H - 0.5);
    ctx.lineTo(W, H - 0.5);
    ctx.stroke();

    const pattern = tonerCoveragePattern(this.state.density, N_CELLS);
    const cV = contrastV(this.state.chargeV, this.state.expResidualV);
    const od = opticalDensity(cV);
    const fOk = fuserOk(this.state.fuserTempC);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.fillText(
      'ΔV = ' + cV.toFixed(0) + ' V · density ≈ ' + (100 * od).toFixed(0) + '% · fuser ' +
      this.state.fuserTempC.toFixed(0) + '°C (' + (fOk ? 'OK' : 'BAD') + ')',
      16, 16
    );

    // Layout
    const cy = H * 0.62;
    const drumR = Math.min(48, H * 0.28);
    const drumX = W * 0.22;
    const paperY = cy + drumR + 18;
    const paperX0 = W * 0.42;
    const paperX1 = W * 0.86;
    const fuserX = W * 0.90;

    // --- Corona wire (charging station) — upper-left of drum, before the laser ---
    const chargeAngle = -Math.PI / 2 - 0.95;
    const cwX = drumX + Math.cos(chargeAngle) * (drumR + 22);
    const cwY = cy + Math.sin(chargeAngle) * (drumR + 22);
    ctx.strokeStyle = COL_CORONA;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const wireLen = 22;
    const zig = [-1, -0.5, 0, 0.5, 1];
    for (let k = 0; k < zig.length; k++) {
      const i = zig[k];
      const px = cwX + i * (wireLen / 2);
      const py = cwY + (k % 2 === 0 ? 0 : -4);
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    // sparks toward the drum
    const sparkT = (phase * 2.4) % 1;
    for (let s = 0; s < 3; s++) {
      const t = (sparkT + s / 3) % 1;
      const sx = cwX + (s - 1) * 7;
      const sy = cwY + t * (drumR * 0.55);
      ctx.fillStyle = 'rgba(167, 139, 250, ' + (0.8 * (1 - t)).toFixed(2) + ')';
      ctx.beginPath();
      ctx.arc(sx, sy, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    this._callout(ctx, cwX, cwY, -34, -16, 'Corona wire (charges drum)', COL_CORONA);

    // --- Drum ---
    const rot = phase * 0.6;
    ctx.save();
    ctx.translate(drumX, cy);
    ctx.beginPath();
    ctx.arc(0, 0, drumR, 0, Math.PI * 2);
    ctx.fillStyle = COL_CHARGED;
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Charged / exposed arc segments around the drum, using the raster pattern.
    // High contrast: dark purple (charged) vs bright yellow (exposed / latent image).
    const nSeg = pattern.length;
    for (let i = 0; i < nSeg; i++) {
      const a0 = rot + (i / nSeg) * Math.PI * 2;
      const a1 = rot + ((i + 1) / nSeg) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, drumR, a0, a1);
      ctx.closePath();
      ctx.fillStyle = pattern[i] ? COL_EXPOSED : COL_CHARGED;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, drumR, 0, Math.PI * 2);
    ctx.strokeStyle = '#64748b';
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '700 12px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Drum', drumX, cy + drumR + 14);
    ctx.textAlign = 'left';

    // Laser beam sweeping onto drum top (writes the latent image).
    const laserSrcX = drumX;
    const laserSrcY = cy - drumR - 26;
    const sweepT = (phase * 0.25) % 1;
    const beamAngle = -Math.PI / 2 + (sweepT - 0.5) * 0.9;
    const beamX = drumX + Math.sin(beamAngle) * drumR;
    const beamY = cy - Math.cos(beamAngle) * drumR;
    ctx.strokeStyle = COL_LASER;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(laserSrcX, laserSrcY);
    ctx.lineTo(beamX, beamY);
    ctx.stroke();
    ctx.fillStyle = COL_LASER;
    ctx.beginPath();
    ctx.arc(laserSrcX, laserSrcY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '700 12px system-ui,sans-serif';
    this._callout(ctx, laserSrcX, laserSrcY, 30, -14, 'Laser (writes image)', COL_LASER);

    // Toner hopper at the "develop" station (right side of drum).
    const devAngle = 0.35;
    const devX = drumX + Math.cos(devAngle) * (drumR + 14);
    const devY = cy + Math.sin(devAngle) * (drumR + 14);
    ctx.fillStyle = '#334155';
    ctx.fillRect(devX - 10, devY - 16, 20, 20);
    ctx.strokeStyle = '#64748b';
    ctx.strokeRect(devX - 10.5, devY - 16.5, 21, 21);
    this._callout(ctx, devX, devY - 16, 36, -22, 'Toner hopper (develop)', COL_TONER);
    // Falling toner dots (only visually suggestive — density-scaled count).
    const nDots = Math.max(1, Math.round(this.state.density * 6));
    for (let i = 0; i < nDots; i++) {
      const t = (phase * 1.3 + i / nDots) % 1;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.arc(devX - 6 + i * 3, devY + t * 14, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Paper strip moving under the drum, picking up the raster pattern ---
    const paperT = (phase * 0.2) % 1;
    const stripH = 14;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(paperX0, paperY, paperX1 - paperX0, stripH);
    ctx.strokeStyle = '#94a3b8';
    ctx.strokeRect(paperX0 + 0.5, paperY + 0.5, paperX1 - paperX0 - 1, stripH - 1);
    const cellW = (paperX1 - paperX0) / nSeg;
    for (let i = 0; i < nSeg; i++) {
      // Shift printed pattern with paperT to suggest continuous feed.
      const idx = (i + Math.floor(paperT * nSeg)) % nSeg;
      if (pattern[idx]) {
        ctx.fillStyle = 'rgba(15, 23, 42, ' + (0.35 + 0.5 * od).toFixed(2) + ')';
        ctx.fillRect(paperX0 + i * cellW, paperY, Math.ceil(cellW) + 0.5, stripH);
      }
    }
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '700 12px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Paper (transfer)', paperX0, paperY + stripH + 14);

    // --- Fuser rollers ---
    const fr = 16;
    const fCol = fOk ? '#4ade80' : (this.state.fuserTempC < 180 ? '#f87171' : '#fb923c');
    ctx.save();
    ctx.translate(fuserX, paperY + stripH / 2);
    for (let s = -1; s <= 1; s += 2) {
      ctx.beginPath();
      ctx.arc(0, s * (fr - 4), fr, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fill();
      ctx.strokeStyle = fCol;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.55 + 0.35 * Math.sin(phase * 3 + s);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    this._callout(ctx, fuserX, paperY + stripH / 2, 34, -20, 'Fuser rollers (bond toner)', fCol);
    ctx.fillStyle = fCol;
    ctx.font = '700 11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(fOk ? 'bonding OK' : 'bad bond', fuserX, paperY + stripH + 30);
    ctx.textAlign = 'left';

    // Legend swatches (top-right of schematic).
    this._drawLegend(ctx, W - 172, 8);
  }

  _drawPotentialPlot(ctx, ox, oy, W, H) {
    const padL = 56;
    const padR = 20;
    const padT = 36;
    const padB = 34;
    const plotX = ox + padL;
    const plotY = oy + padT;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    if (plotW <= 4 || plotH <= 4) return;

    const pattern = tonerCoveragePattern(this.state.density, N_CELLS);
    const vHigh = -this.state.chargeV;
    const vLow = -this.state.expResidualV;
    const vMin = Math.min(vHigh, vLow) - 60;
    const vMax = 40;

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '700 14px system-ui,sans-serif';
    ctx.fillText('Drum surface potential along the raster line', ox + 16, oy + 22);

    ctx.fillStyle = '#0a1122';
    ctx.fillRect(plotX, plotY, plotW, plotH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(plotX + 0.5, plotY + 0.5, plotW - 1, plotH - 1);

    function X(i) { return plotX + (i / pattern.length) * plotW; }
    function Y(v) { return plotY + plotH * (vMax - v) / (vMax - vMin); }

    // Zero line
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(plotX, Y(0));
    ctx.lineTo(plotX + plotW, Y(0));
    ctx.stroke();
    ctx.setLineDash([]);

    // Square-wave potential trace across raster cells.
    ctx.strokeStyle = COL_LASER;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < pattern.length; i++) {
      const v = pattern[i] ? vLow : vHigh;
      const x0 = X(i);
      const x1 = X(i + 1);
      const y = Y(v);
      if (i === 0) ctx.moveTo(x0, y);
      else ctx.lineTo(x0, y);
      ctx.lineTo(x1, y);
    }
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('raster position →', plotX + plotW / 2, oy + H - 8);
    ctx.textAlign = 'left';
    ctx.save();
    ctx.translate(16, plotY + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('surface potential (V)', 0, 0);
    ctx.restore();
    ctx.textAlign = 'left';

    // Value labels on the two levels.
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.fillText('charged: ' + vHigh.toFixed(0) + ' V', plotX + 6, Y(vHigh) - 6);
    ctx.fillText('exposed: ' + vLow.toFixed(0) + ' V', plotX + 6, Y(vLow) + 14);

    // Callout explaining why toner sticks at the lower (exposed) level.
    const calloutXi = Math.floor(pattern.length * 0.72);
    const calloutX = X(calloutXi);
    const calloutY = Y(vLow);
    this._callout(ctx, calloutX, calloutY, 40, 26, 'lower potential = toner sticks here', COL_EXPOSED);
  }
}
