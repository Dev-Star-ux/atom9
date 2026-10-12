/** Copper sulfate electrolysis (electrorefining) teaching canvas. */
import { createDualCanvas } from '../common/teachPlots.js';
import {
  molesDeposited,
  massDepositedGrams,
  curvePoints,
  F_CONST,
  Z_CU,
  M_CU,
} from './physics.js';

// How fast the animated "elapsed time" clock runs relative to the target t
// (seconds of simulated elapsed time per second of wall-clock phase).
const RATE_S_PER_PHASE = 40;

export class ElectrolysisScene2D {
  constructor(host) {
    this.state = {
      I: 0.5,
      t: 600,
    };
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.I != null) this.state.I = p.I;
    if (p.t != null) this.state.t = p.t;
  }

  setPaused(v) { this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _elapsedS(phase) {
    // Elapsed time loops within [0, t] so the deposit visibly grows and resets.
    const tMax = Math.max(1, this.state.t);
    const raw = (phase * RATE_S_PER_PHASE) % tMax;
    return raw;
  }

  _draw(ctx, W, H, phase) {
    if (!W || !H) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);

    const capH = 30;
    this._drawCaption(ctx, W, capH);
    const schemH = Math.floor((H - capH) * 0.7);
    this._drawCell(ctx, W, capH, schemH, phase);
    this._drawCurve(ctx, 0, capH + schemH + 4, W, H - capH - schemH - 4, phase);
  }

  // Bold, persistent caption strip: both half-reactions stated together so the
  // transfer direction (dissolve at anode -> deposit at cathode) is unmistakable.
  _drawCaption(ctx, W, capH) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.98)';
    ctx.fillRect(0, 0, W, capH);
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.7)';
    ctx.beginPath();
    ctx.moveTo(0, capH - 0.5);
    ctx.lineTo(W, capH - 0.5);
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.font = '700 16px system-ui,sans-serif';
    ctx.fillStyle = '#f97316';
    ctx.fillText('Cathode (−): Cu²⁺ + 2e⁻ → Cu (deposits)', 12, capH / 2 + 1);
    const midX = W * 0.56;
    ctx.fillStyle = 'rgba(148,163,184,0.6)';
    ctx.fillText('|', midX, capH / 2 + 1);
    ctx.fillStyle = '#c2410c';
    ctx.fillText('Anode (+): Cu → Cu²⁺ + 2e⁻ (dissolves)', midX + 14, capH / 2 + 1);
  }

  _drawCell(ctx, W, capY, H, phase) {
    ctx.save();
    ctx.translate(0, capY);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
    ctx.beginPath();
    ctx.moveTo(0, H - 0.5);
    ctx.lineTo(W, H - 0.5);
    ctx.stroke();

    const elapsed = this._elapsedS(phase);
    const massG = massDepositedGrams(this.state.I, elapsed, M_CU, Z_CU, F_CONST);
    const massAtT = massDepositedGrams(this.state.I, this.state.t, M_CU, Z_CU, F_CONST);

    // Live numeric mass readout, prominent near the top of the cell panel.
    ctx.fillStyle = '#fde68a';
    ctx.font = '700 14px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('mass deposited ≈ ' + massG.toFixed(4) + ' g', 16, 20);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(
      'I = ' + this.state.I.toFixed(2) + ' A · elapsed ' + elapsed.toFixed(0) + ' s of ' + this.state.t + ' s',
      16, 38
    );

    // Beaker geometry
    const beakerX0 = W * 0.16;
    const beakerX1 = W * 0.84;
    const beakerY0 = H * 0.34;
    const beakerY1 = H * 0.95;
    const beakerW = beakerX1 - beakerX0;

    // Battery box above the beaker, wires down to each electrode
    const battX = W * 0.5;
    const battY = H * 0.12;
    ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    roundRect(ctx, battX - 34, battY - 14, 68, 28, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.font = '700 12px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DC supply', battX, battY + 4);
    ctx.textAlign = 'left';

    // Electrode x positions (cathode left = deposit grows, anode right = dissolves)
    const cathX = beakerX0 + beakerW * 0.32;
    const anodX = beakerX0 + beakerW * 0.68;
    const elecTop = beakerY0 + 10;
    const elecBot = beakerY1 - 10;

    // Wires: battery -> cathode (left terminal) and battery -> anode (right terminal)
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(battX - 34, battY);
    ctx.lineTo(cathX, battY);
    ctx.lineTo(cathX, elecTop - 14);
    ctx.moveTo(battX + 34, battY);
    ctx.lineTo(anodX, battY);
    ctx.lineTo(anodX, elecTop - 14);
    ctx.stroke();

    // Current-direction arrows on the wires (conventional current: + terminal -> anode -> solution -> cathode -> - terminal)
    this._arrowOnSeg(ctx, battX + 34, battY, anodX, battY, '#fbbf24');
    this._arrowOnSeg(ctx, cathX, battY, battX - 34, battY, '#fbbf24');

    ctx.fillStyle = '#fbbf24';
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('−', cathX, battY - 18);
    ctx.fillText('+', anodX, battY - 18);
    ctx.textAlign = 'left';

    // Beaker outline
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(beakerX0, beakerY0);
    ctx.lineTo(beakerX0, beakerY1);
    ctx.lineTo(beakerX1, beakerY1);
    ctx.lineTo(beakerX1, beakerY0);
    ctx.stroke();

    // CuSO4 solution fill (blue tint)
    ctx.fillStyle = 'rgba(56, 130, 246, 0.18)';
    ctx.fillRect(beakerX0 + 2, beakerY0 + 4, beakerW - 4, beakerY1 - beakerY0 - 6);
    ctx.fillStyle = '#93c5fd';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.fillText('CuSO₄ (aq)', beakerX0 + 8, beakerY0 + 18);

    // --- Cathode (copper deposit grows) ---
    const baseW = 10;
    const maxGrowW = 14; // extra width at full target-time deposit (visual cap)
    const growFrac = massAtT > 1e-9 ? Math.min(1, massG / Math.max(massG, massAtT)) : 0;
    // Scale growth by how far elapsed is toward state.t, visually capped
    const growW = Math.min(maxGrowW, maxGrowW * (elapsed / Math.max(1, this.state.t)));
    ctx.fillStyle = '#b45309'; // copper plate base
    ctx.fillRect(cathX - baseW / 2, elecTop, baseW, elecBot - elecTop);
    // deposit layer (reddish copper), grows outward on both faces
    ctx.fillStyle = '#f97316';
    ctx.fillRect(cathX - baseW / 2 - growW, elecTop, growW, elecBot - elecTop);
    ctx.fillRect(cathX + baseW / 2, elecTop, growW, elecBot - elecTop);
    ctx.strokeStyle = '#fed7aa';
    ctx.lineWidth = 1;
    ctx.strokeRect(cathX - baseW / 2 - growW, elecTop + 0.5, baseW + 2 * growW, elecBot - elecTop - 1);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Cathode ( − )', cathX, elecTop - 20);
    ctx.fillStyle = '#f97316';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.fillText('Cu²⁺ + 2e⁻ → Cu', cathX, elecTop - 6);
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('deposit grows', cathX, elecBot + 16);

    // --- Anode (copper dissolves, thins slightly) ---
    const anodShrink = Math.min(baseW * 0.4, baseW * 0.4 * (elapsed / Math.max(1, this.state.t)));
    const anodW = Math.max(2, baseW - anodShrink);
    ctx.fillStyle = '#c2410c';
    ctx.fillRect(anodX - anodW / 2, elecTop, anodW, elecBot - elecTop);
    ctx.strokeStyle = '#fed7aa';
    ctx.strokeRect(anodX - anodW / 2, elecTop + 0.5, anodW, elecBot - elecTop - 1);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.fillText('Anode ( + )', anodX, elecTop - 20);
    ctx.fillStyle = '#fb923c';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.fillText('Cu → Cu²⁺ + 2e⁻', anodX, elecTop - 6);
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('dissolves', anodX, elecBot + 16);
    ctx.textAlign = 'left';

    // Cu2+ ions drifting from anode toward cathode (deterministic phase-based drift)
    const nIons = 10;
    for (let i = 0; i < nIons; i++) {
      const speed = 0.18;
      const lane = i % 3;
      const y = elecTop + 16 + lane * ((elecBot - elecTop - 32) / 2) + (i % 5) * 3;
      const tt = (phase * speed + i / nIons) % 1;
      const x = anodX - anodW / 2 - 6 - (anodX - anodW / 2 - 6 - (cathX + baseW / 2 + growW + 6)) * tt;
      ctx.fillStyle = 'rgba(96, 165, 250, 0.85)';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(191, 219, 254, 0.9)';
      ctx.font = '600 10px system-ui,sans-serif';
      ctx.fillText('2+', x + 4, y - 4);
    }

    ctx.restore();
  }

  _arrowOnSeg(ctx, x0, y0, x1, y1, color) {
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    const ang = Math.atan2(y1 - y0, x1 - x0);
    ctx.fillStyle = color;
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-4, -4);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  _drawCurve(ctx, ox, oy, W, H, phase) {
    const padL = 56;
    const padR = 20;
    const padT = 50;
    const padB = 42;
    const plotX = ox + padL;
    const plotY = oy + padT;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const tMax = Math.max(10, this.state.t);
    const pts = curvePoints(this.state.I, tMax, 100, M_CU, Z_CU, F_CONST);
    let massMax = 1e-9;
    for (let i = 0; i < pts.length; i++) if (pts[i].massG > massMax) massMax = pts[i].massG;
    massMax *= 1.08;

    const elapsed = this._elapsedS(phase);
    const massNow = massDepositedGrams(this.state.I, elapsed, M_CU, Z_CU, F_CONST);
    const nAtT = molesDeposited(this.state.I, this.state.t, Z_CU, F_CONST);
    const massAtT = massDepositedGrams(this.state.I, this.state.t, M_CU, Z_CU, F_CONST);

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 14px system-ui,sans-serif';
    ctx.fillText('Copper deposited vs time — Faraday’s law', ox + 16, oy + 22);

    ctx.fillStyle = '#0a1122';
    ctx.fillRect(plotX, plotY, plotW, plotH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(plotX + 0.5, plotY + 0.5, plotW - 1, plotH - 1);

    function X(t) { return plotX + (t / tMax) * plotW; }
    function Y(m) { return plotY + plotH - (m / massMax) * plotH; }

    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const px = X(pts[i].t);
      const py = Y(pts[i].massG);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Marker at target t
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(X(this.state.t), plotY);
    ctx.lineTo(X(this.state.t), plotY + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Live animated elapsed-time marker
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.arc(X(elapsed), Y(massNow), 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('time t (s) →', plotX + plotW / 2, oy + H - 10);
    ctx.textAlign = 'left';
    ctx.save();
    ctx.translate(14, plotY + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('mass (g)', 0, 0);
    ctx.restore();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(
      'n = It/(zF) = ' + nAtT.toExponential(3) + ' mol   ·   m = nM = ' + massAtT.toFixed(4) + ' g   at t = ' + this.state.t + ' s',
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
