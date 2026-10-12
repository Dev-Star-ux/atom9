/** Photomultiplier tube teaching canvas: photocathode → dynode cascade → anode, plus gain-vs-n plot. */
import { createDualCanvas } from '../common/teachPlots.js';
import {
  secondaryYield,
  gain,
  photocurrentFromIntensity,
  outputCurrent,
  curvePoints,
} from './physics.js';

const N_DYNODES_DRAWN = 5; // representative visual chain (independent of nStages slider)

export class PMTScene2D {
  constructor(host) {
    this.state = {
      intensityRel: 0.5,
      quantumEfficiency: 0.25,
      voltagePerStage: 100,
      nStages: 9,
    };
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.intensityRel != null) this.state.intensityRel = p.intensityRel;
    if (p.quantumEfficiency != null) this.state.quantumEfficiency = p.quantumEfficiency;
    if (p.voltagePerStage != null) this.state.voltagePerStage = p.voltagePerStage;
    if (p.nStages != null) this.state.nStages = p.nStages;
  }

  setPaused(v) { this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _draw(ctx, W, H, phase) {
    if (!W || !H) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);

    const capH = Math.min(56, Math.floor(H * 0.16));
    this._drawCaption(ctx, W, capH);
    const schemH = Math.floor((H - capH) * 0.7);
    this._drawTube(ctx, W, schemH, phase, capH);
    this._drawCurve(ctx, 0, capH + schemH + 4, W, H - capH - schemH - 4);
  }

  /** Persistent bold caption strip stating the cascade in plain words with a live gain number. */
  _drawCaption(ctx, W, capH) {
    const delta = secondaryYield(this.state.voltagePerStage);
    const G = gain(delta, this.state.nStages);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.97)';
    ctx.fillRect(0, 0, W, capH);
    ctx.strokeStyle = 'rgba(96, 165, 250, 0.5)';
    ctx.beginPath();
    ctx.moveTo(0, capH - 0.5);
    ctx.lineTo(W, capH - 0.5);
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 16px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      '1 photon → 1 photoelectron → ×δ at each of ' + this.state.nStages + ' dynodes → gain G = ' +
      G.toExponential(2) + ' → huge anode pulse',
      14, Math.round(capH * 0.42)
    );
    ctx.fillStyle = '#93c5fd';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.fillText(
      'δ ≈ ' + delta.toFixed(2) + ' secondary electrons per stage  ·  G = δⁿ grows exponentially with n',
      14, Math.round(capH * 0.42) + 20
    );
  }

  _drawTube(ctx, W, H, phase, yOffset) {
    ctx.save();
    ctx.translate(0, yOffset);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
    ctx.beginPath();
    ctx.moveTo(0, H - 0.5);
    ctx.lineTo(W, H - 0.5);
    ctx.stroke();

    const delta = secondaryYield(this.state.voltagePerStage);
    const iPhoto = photocurrentFromIntensity(this.state.intensityRel, this.state.quantumEfficiency);
    const G = gain(delta, this.state.nStages);
    const iOut = outputCurrent(iPhoto, delta, this.state.nStages);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.fillText('Photocathode → dynode cascade → anode   ·   G = δⁿ', 16, 16);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(
      'δ ≈ ' + delta.toFixed(2) + '  ·  n = ' + this.state.nStages +
      '  ·  G ≈ ' + G.toExponential(2) + '  ·  I_out ≈ ' + iOut.toExponential(2) + ' A',
      16, 34
    );

    const y = H * 0.66;
    const xCathode = W * 0.09;
    const xTubeL = W * 0.16;
    const xTubeR = W * 0.93;
    const xAnode = W * 0.88;
    const chainL = xTubeL + 14;
    const chainR = xAnode - 20;

    // Tube envelope
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(xTubeL, y - 58);
    ctx.lineTo(xTubeR, y - 58);
    ctx.lineTo(xTubeR, y + 58);
    ctx.lineTo(xTubeL, y + 58);
    ctx.closePath();
    ctx.stroke();

    // Incoming light rays / photon dots hitting the photocathode
    const nPhotons = 4;
    for (let i = 0; i < nPhotons; i++) {
      const t = (phase * 0.9 + i / nPhotons) % 1;
      const x0 = 4;
      const yy = y - 40 + i * 24 + Math.sin(phase * 2 + i) * 2;
      const x = x0 + (xCathode - 6 - x0) * t;
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(Math.max(x0, x - 14), yy);
      ctx.lineTo(x, yy);
      ctx.stroke();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(x, yy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Photocathode plate
    ctx.fillStyle = 'rgba(250, 204, 21, 0.25)';
    ctx.fillRect(xCathode, y - 46, 6, 92);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(xCathode + 0.5, y - 46.5, 6, 91);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('photo-', xCathode - 2, y - 56);
    ctx.fillText('cathode', xCathode - 2, y - 44);

    // Dynode chain (zigzag), representative count independent of nStages
    const stageCount = N_DYNODES_DRAWN;
    const stageXs = [];
    for (let i = 0; i < stageCount; i++) {
      stageXs.push(chainL + ((chainR - chainL) * (i + 0.5)) / stageCount);
    }
    const ampY = 30;
    ctx.lineWidth = 1.5;
    ctx.textAlign = 'center';
    for (let i = 0; i < stageCount; i++) {
      const dy = (i % 2 === 0) ? y - ampY : y + ampY;
      const above = (i % 2 === 0); // plate sits above centerline -> label goes further above
      ctx.fillStyle = 'rgba(96, 165, 250, 0.28)';
      ctx.beginPath();
      ctx.moveTo(stageXs[i] - 10, dy - 10);
      ctx.lineTo(stageXs[i] + 10, dy);
      ctx.lineTo(stageXs[i] - 10, dy + 10);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#60a5fa';
      ctx.stroke();

      // Stage number, directly on the diagram so the cascade is legible step by step.
      const stageLabelY = above ? dy - 18 : dy + 26;
      ctx.fillStyle = '#dbeafe';
      ctx.font = '700 12px system-ui,sans-serif';
      ctx.fillText('Stage ' + (i + 1), stageXs[i], stageLabelY);

      // Illustrative electron count at this stage: n0 * delta^(i+1), rounded for readability.
      const countHere = Math.round(Math.pow(delta, i + 1));
      const countLabel = countHere >= 100000 ? countHere.toExponential(1) : String(countHere);
      const countLabelY = above ? dy + 26 : dy - 18;
      ctx.fillStyle = '#67e8f9';
      ctx.font = '700 12px system-ui,sans-serif';
      ctx.fillText('~' + countLabel + ' e⁻', stageXs[i], countLabelY);
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('dynode chain — each stage multiplies the electron count by δ', (chainL + chainR) / 2, y - ampY - 40 < 8 ? y - ampY - 12 : y - ampY - 34);
    ctx.textAlign = 'left';

    // Anode
    ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.5;
    roundRect(ctx, xAnode - 4, y - 34, 48, 68, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#facc15';
    ctx.font = '700 11px system-ui,sans-serif';
    ctx.fillText('Anode', xAnode + 20, y + 46);
    ctx.textAlign = 'left';

    // Electron cascade: one electron leaves cathode, doubles in visible count
    // after each dynode stage, ending in a burst at the anode.
    const cyclePeriod = 1.6;
    const t = (phase / cyclePeriod) % 1;
    const nSeg = stageCount + 1; // cathode->d1, d1->d2, ..., dN->anode
    const segT = t * nSeg;
    const seg = Math.min(nSeg - 1, Math.floor(segT));
    const localT = segT - seg;

    const xs = [xCathode + 6].concat(stageXs).concat([xAnode - 4]);
    const ys = [y].concat(stageXs.map(function (_, i) { return (i % 2 === 0) ? y - ampY : y + ampY; })).concat([y]);

    const dotsAtStage = Math.min(64, Math.pow(2, seg));
    const x0 = xs[seg];
    const y0 = ys[seg];
    const x1 = xs[seg + 1];
    const y1 = ys[seg + 1];
    const spread = Math.min(18, 3 + dotsAtStage * 0.9);
    ctx.fillStyle = seg >= stageCount ? '#facc15' : '#67e8f9';
    for (let i = 0; i < dotsAtStage; i++) {
      const jitter = (dotsAtStage > 1) ? (i / (dotsAtStage - 1) - 0.5) * spread : 0;
      const px = x0 + (x1 - x0) * localT;
      const py = y0 + (y1 - y0) * localT + jitter;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Burst flash at anode
    if (seg >= stageCount - 1 && localT > 0.7) {
      const burstA = (localT - 0.7) / 0.3;
      ctx.fillStyle = 'rgba(250, 204, 21, ' + (0.5 * (1 - burstA)) + ')';
      ctx.beginPath();
      ctx.arc(xAnode + 20, y, 30 * burstA, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText('Each dynode hit releases δ secondary electrons — the cloud multiplies stage by stage', 16, H - 8);
    ctx.restore();
  }

  _drawCurve(ctx, ox, oy, W, H) {
    const padL = 56;
    const padR = 20;
    const padT = 50;
    const padB = 42;
    const plotX = ox + padL;
    const plotY = oy + padT;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const delta = secondaryYield(this.state.voltagePerStage);
    const nMax = 14;
    const pts = curvePoints(delta, nMax);
    const G = gain(delta, this.state.nStages);
    const iPhoto = photocurrentFromIntensity(this.state.intensityRel, this.state.quantumEfficiency);
    const iOut = outputCurrent(iPhoto, delta, this.state.nStages);

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 14px system-ui,sans-serif';
    ctx.fillText('Gain G vs number of dynode stages n', ox + 16, oy + 22);

    ctx.fillStyle = '#0a1122';
    ctx.fillRect(plotX, plotY, plotW, plotH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(plotX + 0.5, plotY + 0.5, plotW - 1, plotH - 1);

    // Log-y axis, hand-drawn: decades from 1 (10^0) to 10^6
    const decMin = 0;
    const decMax = 6;
    function X(n) { return plotX + (n / nMax) * plotW; }
    function Y(g) {
      const gg = Math.max(1, g);
      const dec = Math.log10(gg);
      const clamped = Math.min(decMax, Math.max(decMin, dec));
      return plotY + plotH - ((clamped - decMin) / (decMax - decMin)) * plotH;
    }

    // Y ticks at decades
    const yTicks = [1, 100, 10000, 1000000];
    const yLabels = ['1', '100', '1e4', '1e6'];
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.6)';
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i < yTicks.length; i++) {
      const py = Y(yTicks[i]);
      ctx.beginPath();
      ctx.moveTo(plotX, py);
      ctx.lineTo(plotX + plotW, py);
      ctx.stroke();
      ctx.fillText(yLabels[i], plotX - 6, py + 3);
    }
    ctx.textAlign = 'left';

    // X ticks
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    const xTicks = [0, 4, 8, 12, nMax];
    for (let i = 0; i < xTicks.length; i++) {
      ctx.fillText(String(xTicks[i]), X(xTicks[i]), plotY + plotH + 14);
    }
    ctx.textAlign = 'left';

    // Curve
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const px = X(pts[i].n);
      const py = Y(pts[i].G);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Operating point marker at current nStages
    ctx.fillStyle = '#f87171';
    ctx.beginPath();
    ctx.arc(X(this.state.nStages), Y(G), 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('dynode stages n →', plotX + plotW / 2, oy + H - 10);
    ctx.textAlign = 'left';
    ctx.save();
    ctx.translate(16, plotY + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('gain G (log)', 0, 0);
    ctx.restore();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(
      'δ = ' + delta.toFixed(2) + '   ·   G = ' + G.toExponential(2) +
      '   ·   I_out = ' + iOut.toExponential(2) + ' A (I_cathode = ' + iPhoto.toExponential(2) + ' A)',
      plotX, oy + 40
    );
  }
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}
