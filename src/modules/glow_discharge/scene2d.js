/** Glow discharge tube — Paschen's law teaching canvas. */
import { createDualCanvas } from '../common/teachPlots.js';
import {
  paschenVoltage,
  isGlowing,
  curvePoints,
  A_DEFAULT,
  B_DEFAULT,
  GAMMA_DEFAULT,
} from './physics.js';

export class GlowDischargeScene2D {
  constructor(host) {
    this.state = {
      pressureTorr: 1,
      spacingCm: 5,
      V: 400,
    };
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.pressureTorr != null) this.state.pressureTorr = p.pressureTorr;
    if (p.spacingCm != null) this.state.spacingCm = p.spacingCm;
    if (p.V != null) this.state.V = p.V;
  }

  setPaused(v) { this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _pd() { return this.state.pressureTorr * this.state.spacingCm; }

  _draw(ctx, W, H, phase) {
    if (!W || !H) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);

    const captionH = 34;
    const readoutH = 24;
    const topH = captionH + readoutH;
    this._drawCaption(ctx, W, captionH);
    this._drawReadout(ctx, 0, captionH, W, readoutH);

    const schemH = Math.floor((H - topH) * 0.7);
    this._drawTube(ctx, W, schemH, phase, topH);
    this._drawCurve(ctx, 0, topH + schemH + 4, W, H - topH - schemH - 4);
  }

  /** Bold plain-language caption stating which regime we're in. */
  _drawCaption(ctx, W, H) {
    const pd = this._pd();
    const glowing = isGlowing(this.state.V, pd, A_DEFAULT, B_DEFAULT, GAMMA_DEFAULT);
    ctx.fillStyle = glowing ? 'rgba(74, 222, 128, 0.16)' : 'rgba(248, 113, 113, 0.14)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.5)';
    ctx.beginPath();
    ctx.moveTo(0, H - 0.5);
    ctx.lineTo(W, H - 0.5);
    ctx.stroke();

    ctx.font = '700 16px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = glowing ? '#4ade80' : '#f87171';
    const msg = glowing
      ? 'Above breakdown (V > V_b): self-sustained glow ignites'
      : 'Below breakdown (V < V_b): no current flows';
    ctx.fillText(msg, 16, H / 2 + 1);
    ctx.textBaseline = 'alphabetic';
  }

  /** Legible p·d -> V_b readout, separate from the caption and the plot. */
  _drawReadout(ctx, ox, oy, W, H) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.fillRect(ox, oy, W, H);
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.5)';
    ctx.beginPath();
    ctx.moveTo(ox, oy + H - 0.5);
    ctx.lineTo(ox + W, oy + H - 0.5);
    ctx.stroke();

    const pd = this._pd();
    const Vb = paschenVoltage(pd, A_DEFAULT, B_DEFAULT, GAMMA_DEFAULT);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '700 14px system-ui,sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('p·d = ' + pd.toFixed(2) + ' Torr·cm', ox + 16, oy + H / 2 + 1);
    ctx.fillStyle = '#a78bfa';
    ctx.fillText('  →  V_b = ' + (isFinite(Vb) && Vb < 1e8 ? Vb.toFixed(0) + ' V' : '—'),
      ox + 16 + ctx.measureText('p·d = ' + pd.toFixed(2) + ' Torr·cm').width, oy + H / 2 + 1);
    ctx.font = '13px system-ui,sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';
    ctx.fillText('applied V = ' + this.state.V.toFixed(0) + ' V', ox + W - 16, oy + H / 2 + 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  _drawTube(ctx, W, H, phase, offsetY) {
    ctx.save();
    ctx.translate(0, offsetY);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
    ctx.beginPath();
    ctx.moveTo(0, H - 0.5);
    ctx.lineTo(W, H - 0.5);
    ctx.stroke();

    const pd = this._pd();
    const glowing = isGlowing(this.state.V, pd, A_DEFAULT, B_DEFAULT, GAMMA_DEFAULT);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.fillText('Glow discharge tube · Paschen\'s law', 16, 18);

    const tubeX0 = 60;
    const tubeX1 = W - 60;
    const tubeY0 = H * 0.42;
    const tubeY1 = H * 0.8;
    const tubeW = tubeX1 - tubeX0;
    const tubeH = tubeY1 - tubeY0;

    // Glass envelope
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
    ctx.lineWidth = 2;
    ctx.strokeRect(tubeX0 + 0.5, tubeY0 + 0.5, tubeW - 1, tubeH - 1);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.fillRect(tubeX0, tubeY0, tubeW, tubeH);

    if (glowing) {
      const shimmer = 0.85 + 0.15 * Math.sin(phase * 6);
      // Band fractions of tube width, cathode (left) -> anode (right).
      const bands = [
        { name: 'Cathode glow', frac: 0.05, color: '#fca5a5', alpha: 0.55 },
        { name: 'Cathode dark space', frac: 0.08, color: '#1e293b', alpha: 0.0 },
        { name: 'Negative glow', frac: 0.16, color: '#c084fc', alpha: 0.7 },
        { name: 'Faraday dark space', frac: 0.09, color: '#1e293b', alpha: 0.0 },
        { name: 'Positive column', frac: 0.62, color: '#f472b6', alpha: 0.38 },
      ];
      let x = tubeX0;
      for (let i = 0; i < bands.length; i++) {
        const bw = tubeW * bands[i].frac;
        if (bands[i].alpha > 0) {
          ctx.globalAlpha = bands[i].alpha * shimmer;
          ctx.fillStyle = bands[i].color;
          ctx.fillRect(x, tubeY0 + 2, bw, tubeH - 4);
          ctx.globalAlpha = 1;
        }
        // Leader-line callout above the tube — always shown, even for narrow bands,
        // staggered across two rows so adjacent labels don't overlap.
        const midX = x + bw / 2;
        const row = i % 2;
        const labelY = 26 + row * 14;
        ctx.save();
        ctx.strokeStyle = 'rgba(226, 232, 240, 0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(midX, tubeY0);
        ctx.lineTo(midX, labelY + 4);
        ctx.stroke();
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '600 12px system-ui,sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(bands[i].name, midX, labelY);
        ctx.restore();
        x += bw;
      }
      // Subtle flicker particles inside positive column
      const pcX0 = tubeX0 + tubeW * (1 - 0.62);
      for (let i = 0; i < 12; i++) {
        const t = (phase * 0.3 + i / 12) % 1;
        const px = pcX0 + t * (tubeX1 - pcX0 - 8);
        const py = tubeY0 + 6 + ((i * 37) % (tubeH - 12));
        ctx.globalAlpha = 0.35 + 0.25 * Math.sin(phase * 4 + i);
        ctx.fillStyle = '#fca5a5';
        ctx.beginPath();
        ctx.arc(px, py, 1.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    } else {
      ctx.fillStyle = '#64748b';
      ctx.font = '600 12px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Below breakdown — no discharge (V < V_b)', tubeX0 + tubeW / 2, tubeY0 + tubeH / 2 + 4);
      ctx.textAlign = 'left';
    }

    // Electrodes
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(tubeX0 - 10, tubeY0 - 6, 10, tubeH + 12);
    ctx.fillRect(tubeX1, tubeY0 - 6, 10, tubeH + 12);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 12px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Cathode (−)', tubeX0 - 5, tubeY0 - 12);
    ctx.fillText('Anode (+)', tubeX1 + 5, tubeY0 - 12);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#64748b';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText('DC supply across a low-pressure gas tube — structure appears only above V_b', 16, H - 8);
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

    const pd = this._pd();
    const pdMax = Math.max(20, pd * 2.5);
    const pdMin = 0.05;
    const pts = curvePoints(pdMin, pdMax, 120, A_DEFAULT, B_DEFAULT, GAMMA_DEFAULT);
    const Vb = paschenVoltage(pd, A_DEFAULT, B_DEFAULT, GAMMA_DEFAULT);

    let vMax = this.state.V;
    for (let i = 0; i < pts.length; i++) if (isFinite(pts[i].Vb) && pts[i].Vb < 1e6 && pts[i].Vb > vMax) vMax = pts[i].Vb;
    vMax = Math.max(vMax * 1.15, 100);

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 14px system-ui,sans-serif';
    ctx.fillText('Paschen curve: V_b vs p·d', ox + 16, oy + 22);

    ctx.fillStyle = '#0a1122';
    ctx.fillRect(plotX, plotY, plotW, plotH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(plotX + 0.5, plotY + 0.5, plotW - 1, plotH - 1);

    function X(v) { return plotX + (v / pdMax) * plotW; }
    function Y(v) { return plotY + plotH - Math.min(1, v / vMax) * plotH; }

    // Applied-voltage horizontal line
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.6)';
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(plotX, Y(this.state.V));
    ctx.lineTo(plotX + plotW, Y(this.state.V));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#a78bfa';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText('applied V = ' + this.state.V.toFixed(0) + ' V', plotX + 6, Y(this.state.V) - 4);

    // Paschen curve
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < pts.length; i++) {
      if (!isFinite(pts[i].Vb) || pts[i].Vb > vMax * 1.5) { started = false; continue; }
      const px = X(pts[i].pd);
      const py = Y(pts[i].Vb);
      if (!started) { ctx.moveTo(px, py); started = true; }
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Operating point
    const glowing = isGlowing(this.state.V, pd, A_DEFAULT, B_DEFAULT, GAMMA_DEFAULT);
    ctx.fillStyle = glowing ? '#4ade80' : '#f87171';
    ctx.beginPath();
    ctx.arc(X(pd), Y(Math.min(Vb, vMax)), 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('p·d (Torr·cm) →', plotX + plotW / 2, oy + H - 10);
    ctx.textAlign = 'left';
    ctx.save();
    ctx.translate(16, plotY + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('V_b (V)', 0, 0);
    ctx.restore();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(
      'V_b(p·d=' + pd.toFixed(2) + ') ≈ ' + Vb.toFixed(0) + ' V   ·   ' +
      (glowing ? 'GLOWING (V > V_b)' : 'no discharge (V ≤ V_b)'),
      plotX, oy + 40
    );
  }
}
