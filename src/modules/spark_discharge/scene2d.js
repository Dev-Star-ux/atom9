/** Spark discharge — RC relaxation-oscillator schematic + Paschen curve teaching canvas. */
import { createDualCanvas } from '../common/teachPlots.js';
import {
  paschenVoltage,
  curvePoints,
  chargeTimeToBreakdown,
  sawtoothVoltage,
  sparkFrequency,
} from './physics.js';

export class SparkDischargeScene2D {
  constructor(host) {
    this.state = {
      pressureTorr: 1,
      spacingCm: 2,
      Vsupply: 600,
      R: 1e6,
      C: 1e-8,
    };
    this._t = 0;
    this._lastPhase = null;
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.pressureTorr != null) this.state.pressureTorr = p.pressureTorr;
    if (p.spacingCm != null) this.state.spacingCm = p.spacingCm;
    if (p.Vsupply != null) this.state.Vsupply = p.Vsupply;
    if (p.R != null) this.state.R = p.R;
    if (p.C != null) this.state.C = p.C;
  }

  setPaused(v) { this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _draw(ctx, W, H, phase) {
    if (!W || !H) return;
    // Advance a local synthetic time axis from the phase clock (seconds-ish, scaled for a readable trace).
    if (this._lastPhase == null) this._lastPhase = phase;
    const dPhase = Math.max(0, phase - this._lastPhase);
    this._lastPhase = phase;
    this._t += dPhase * this._timeScale();

    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);

    const captionH = Math.min(46, Math.max(34, Math.floor(H * 0.09)));
    this._drawCaption(ctx, W, captionH);

    const schemH = Math.floor((H - captionH) * 0.7);
    ctx.save();
    ctx.translate(0, captionH);
    this._drawSchematic(ctx, W, schemH, phase);
    ctx.restore();
    this._drawPaschen(ctx, 0, captionH + schemH + 4, W, H - captionH - schemH - 4);
  }

  /** Persistent bold top strip: plain-words cycle explanation + live cycle-time/frequency,
   *  or an unmistakable warning if V_supply can never reach breakdown. */
  _drawCaption(ctx, W, H) {
    const pd = this.state.pressureTorr * this.state.spacingCm;
    const Vb = paschenVoltage(pd);
    const period = chargeTimeToBreakdown(this.state.R, this.state.C, this.state.Vsupply, Vb);
    const freq = sparkFrequency(this.state.R, this.state.C, this.state.Vsupply, Vb);
    const tooLow = !(this.state.Vsupply > Vb);

    ctx.fillStyle = tooLow ? '#7f1d1d' : 'rgba(15, 23, 42, 0.96)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = tooLow ? '#f87171' : 'rgba(71, 85, 105, 0.6)';
    ctx.beginPath();
    ctx.moveTo(0, H - 0.5);
    ctx.lineTo(W, H - 0.5);
    ctx.stroke();

    ctx.textAlign = 'left';
    const midY = Math.round(H * 0.4);
    if (tooLow) {
      ctx.fillStyle = '#fecaca';
      ctx.font = '700 16px system-ui,sans-serif';
      ctx.fillText('⚠ V_supply too low — capacitor never reaches breakdown, no sparks will occur', 14, midY);
      ctx.fillStyle = '#fca5a5';
      ctx.font = '600 12px system-ui,sans-serif';
      ctx.fillText(
        'V_supply = ' + this.state.Vsupply.toFixed(0) + ' V  ≤  V_b ≈ ' +
        (Vb < 1e8 ? Vb.toFixed(0) + ' V' : '—') +
        ' — raise V_supply or lower V_b (reduce pressure × spacing)',
        14, midY + 18
      );
    } else {
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '700 16px system-ui,sans-serif';
      ctx.fillText('Capacitor charges toward V_supply through R → reaches V_b → SPARKS and resets → repeats', 14, midY);
      ctx.fillStyle = '#7dd3fc';
      ctx.font = '600 13px system-ui,sans-serif';
      ctx.fillText(
        'cycle time ≈ ' + (isFinite(period) ? (period * 1e3).toFixed(2) + ' ms' : '∞') +
        '   ·   frequency ≈ ' + (freq > 0 ? freq.toFixed(2) + ' Hz' : '0 Hz') +
        '   ·   V_b ≈ ' + (Vb < 1e8 ? Vb.toFixed(0) + ' V' : '—'),
        14, midY + 18
      );
    }
  }

  _timeScale() {
    // Scale synthetic time so the sawtooth period spans a few seconds of animation.
    const Vb = paschenVoltage(this.state.pressureTorr * this.state.spacingCm);
    const period = chargeTimeToBreakdown(this.state.R, this.state.C, this.state.Vsupply, Vb);
    if (!isFinite(period) || period <= 0) return 1;
    // Aim for ~2.2s of wall-clock animation per period, regardless of true RC scale.
    return period / 2.2;
  }

  _drawSchematic(ctx, W, H, phase) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
    ctx.beginPath();
    ctx.moveTo(0, H - 0.5);
    ctx.lineTo(W, H - 0.5);
    ctx.stroke();

    const pd = this.state.pressureTorr * this.state.spacingCm;
    const Vb = paschenVoltage(pd);
    const period = chargeTimeToBreakdown(this.state.R, this.state.C, this.state.Vsupply, Vb);
    const freq = sparkFrequency(this.state.R, this.state.C, this.state.Vsupply, Vb);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.fillText('Circuit schematic (live)', 16, 18);

    // Layout: split schematic (left ~55%) and live scope trace (right ~45%)
    const schemW = Math.floor(W * 0.52);
    const scopeX0 = schemW + 10;
    const scopeW = W - scopeX0 - 12;
    const midY = H * 0.62;

    // -- circuit: supply -> R (zigzag) -> node -> C (plates) & spark gap, back to supply --
    const xSupply = 26;
    const xNodeR0 = 60;
    const xNodeR1 = 150;
    const xNode = 180;
    const yTop = midY - 34;
    const yBot = midY + 34;

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    // supply symbol (battery)
    ctx.beginPath();
    ctx.moveTo(xSupply, yTop);
    ctx.lineTo(xSupply, yBot);
    ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.font = '700 11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('+', xSupply, yTop - 6);
    ctx.fillText('V_supply', xSupply, yBot + 16);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText(this.state.Vsupply.toFixed(0) + ' V', xSupply, yBot + 28);

    // top wire supply -> resistor
    ctx.beginPath();
    ctx.moveTo(xSupply, yTop);
    ctx.lineTo(xNodeR0, yTop);
    ctx.stroke();

    // resistor zigzag
    ctx.beginPath();
    ctx.moveTo(xNodeR0, yTop);
    const zig = 6;
    const nZig = 6;
    const zigW = (xNodeR1 - xNodeR0) / nZig;
    for (let i = 0; i < nZig; i++) {
      const x = xNodeR0 + zigW * (i + 0.5);
      const y = yTop + (i % 2 === 0 ? -zig : zig);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(xNodeR1, yTop);
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('R = ' + (this.state.R / 1e6).toFixed(2) + ' MΩ', (xNodeR0 + xNodeR1) / 2, yTop - 14);

    // wire resistor -> node
    ctx.strokeStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(xNodeR1, yTop);
    ctx.lineTo(xNode, yTop);
    ctx.stroke();
    // node down to bottom rail
    ctx.beginPath();
    ctx.moveTo(xNode, yTop);
    ctx.lineTo(xNode, yBot);
    ctx.stroke();
    // bottom wire node -> supply
    ctx.beginPath();
    ctx.moveTo(xNode, yBot);
    ctx.lineTo(xSupply, yBot);
    ctx.stroke();

    // capacitor plates (branch off node, drawn just right of node)
    const xCap = xNode + 34;
    ctx.beginPath();
    ctx.moveTo(xNode, (yTop + yBot) / 2);
    ctx.lineTo(xCap - 8, (yTop + yBot) / 2);
    ctx.stroke();
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(xCap - 8, (yTop + yBot) / 2 - 14);
    ctx.lineTo(xCap - 8, (yTop + yBot) / 2 + 14);
    ctx.moveTo(xCap, (yTop + yBot) / 2 - 14);
    ctx.lineTo(xCap, (yTop + yBot) / 2 + 14);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('C = ' + (this.state.C * 1e9).toFixed(1) + ' nF', xCap + 4, (yTop + yBot) / 2 - 20);

    // spark gap electrodes (further right, between top rail node and bottom rail)
    const xGap = xNode + 78;
    const gapGapPx = 8;
    ctx.beginPath();
    ctx.moveTo(xNode, yTop);
    ctx.lineTo(xGap, yTop);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(xGap, yTop);
    ctx.lineTo(xGap, (yTop + yBot) / 2 - gapGapPx);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(xGap, (yTop + yBot) / 2 + gapGapPx);
    ctx.lineTo(xGap, yBot);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(xGap, yBot);
    ctx.lineTo(xNode, yBot);
    ctx.stroke();

    // electrode tips
    const tipY1 = (yTop + yBot) / 2 - gapGapPx;
    const tipY2 = (yTop + yBot) / 2 + gapGapPx;

    // Determine if we're near a spark (tModPeriod near 0) — flash bright white/blue.
    let tMod = 0;
    if (isFinite(period) && period > 0) {
      tMod = this._t % period;
      if (tMod < 0) tMod += period;
    }
    const sparking = isFinite(period) && period > 0 && tMod < period * 0.045;

    ctx.fillStyle = sparking ? '#e0f2fe' : '#cbd5e1';
    ctx.beginPath();
    ctx.arc(xGap, tipY1, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(xGap, tipY2, 3, 0, Math.PI * 2);
    ctx.fill();

    if (sparking) {
      const bright = 1 - tMod / (period * 0.045);
      ctx.save();
      ctx.globalAlpha = Math.max(0.25, bright);
      const grad = ctx.createRadialGradient(xGap, (tipY1 + tipY2) / 2, 0, xGap, (tipY1 + tipY2) / 2, 22);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.4, '#7dd3fc');
      grad.addColorStop(1, 'rgba(125,211,252,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(xGap, (tipY1 + tipY2) / 2, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const midYGap = (tipY1 + tipY2) / 2;
      let x = xGap;
      let y = tipY1;
      ctx.moveTo(x, y);
      const jSteps = 4;
      for (let i = 1; i <= jSteps; i++) {
        const yy = tipY1 + ((tipY2 - tipY1) * i) / jSteps;
        const xx = xGap + (Math.random() - 0.5) * 6;
        ctx.lineTo(xx, yy);
      }
      ctx.lineTo(xGap, tipY2);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.restore();
    }

    ctx.fillStyle = sparking ? '#7dd3fc' : '#94a3b8';
    ctx.font = '10px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('spark gap', xGap + 8, (yTop + yBot) / 2 + 3);

    // -- scope-style trace of capacitor voltage (sawtooth) --
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(scopeX0 + 0.5, 46.5, scopeW - 1, H - 46 - 14);
    ctx.fillStyle = '#0a1122';
    ctx.fillRect(scopeX0 + 1, 47, scopeW - 2, H - 46 - 15);

    const scopeY0 = 47;
    const scopeH = H - 46 - 15;
    const windowSec = isFinite(period) && period > 0 ? period * 2.2 : 4;
    const nPts = 160;
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= nPts; i++) {
      const tSample = this._t - windowSec + (windowSec * i) / nPts;
      const v = sawtoothVoltage(Math.max(0, tSample), this.state.R, this.state.C, this.state.Vsupply, Vb);
      const px = scopeX0 + (scopeW * i) / nPts;
      const py = scopeY0 + scopeH - Math.min(1, v / Math.max(1, this.state.Vsupply)) * scopeH;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Vb reference line
    if (Vb < this.state.Vsupply * 3) {
      const pyVb = scopeY0 + scopeH - Math.min(1, Vb / Math.max(1, this.state.Vsupply)) * scopeH;
      ctx.strokeStyle = 'rgba(248, 113, 113, 0.6)';
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(scopeX0, pyVb);
      ctx.lineTo(scopeX0 + scopeW, pyVb);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#f87171';
      ctx.font = '600 10px system-ui,sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('V_b (spark threshold)', scopeX0 + scopeW - 4, pyVb - 4);
      ctx.textAlign = 'left';
    }

    // Explicit axis labels — time and voltage must read clearly, not just be implied.
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('V_C(t) — voltage (V) vs. time (s)', scopeX0 + 4, scopeY0 - 4);
    ctx.fillText(this.state.Vsupply.toFixed(0) + ' V', scopeX0 + 4, scopeY0 + 11);
    ctx.fillText('0 V', scopeX0 + 4, scopeY0 + scopeH - 4);
    ctx.textAlign = 'right';
    ctx.fillText('time →  (window ≈ ' + windowSec.toFixed(2) + ' s)', scopeX0 + scopeW - 4, scopeY0 + scopeH + 11);
    ctx.textAlign = 'left';
  }

  _drawPaschen(ctx, ox, oy, W, H) {
    const padL = 52;
    const padR = 20;
    const padT = 50;
    const padB = 42;
    const plotX = ox + padL;
    const plotY = oy + padT;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const pd = this.state.pressureTorr * this.state.spacingCm;
    const pdMax = Math.max(20, pd * 2.5);
    const pts = curvePoints(0.05, pdMax, 120);
    const Vb = paschenVoltage(pd);
    const period = chargeTimeToBreakdown(this.state.R, this.state.C, this.state.Vsupply, Vb);
    const freq = sparkFrequency(this.state.R, this.state.C, this.state.Vsupply, Vb);

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 14px system-ui,sans-serif';
    ctx.fillText('Paschen curve: breakdown voltage V_b vs p·d', ox + 16, oy + 22);

    ctx.fillStyle = '#0a1122';
    ctx.fillRect(plotX, plotY, plotW, plotH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(plotX + 0.5, plotY + 0.5, plotW - 1, plotH - 1);

    let vMax = 1;
    for (let i = 0; i < pts.length; i++) if (isFinite(pts[i].Vb) && pts[i].Vb < 1e8 && pts[i].Vb > vMax) vMax = pts[i].Vb;
    vMax = Math.max(vMax, Vb < 1e8 ? Vb : 0, this.state.Vsupply) * 1.15;

    function X(v) { return plotX + (v / pdMax) * plotW; }
    function Y(v) { return plotY + plotH - Math.min(1, v / vMax) * plotH; }

    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < pts.length; i++) {
      if (!isFinite(pts[i].Vb) || pts[i].Vb >= 1e8) continue;
      const px = X(pts[i].pd);
      const py = Y(pts[i].Vb);
      if (!started) { ctx.moveTo(px, py); started = true; }
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Vsupply reference line
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(plotX, Y(this.state.Vsupply));
    ctx.lineTo(plotX + plotW, Y(this.state.Vsupply));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('V_supply', plotX + 4, Y(this.state.Vsupply) - 4);

    // operating point marker
    if (Vb < 1e8) {
      ctx.fillStyle = this.state.Vsupply > Vb ? '#4ade80' : '#f87171';
      ctx.beginPath();
      ctx.arc(X(pd), Y(Vb), 6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('p·d (Torr·cm) →', plotX + plotW / 2, oy + H - 10);
    ctx.textAlign = 'left';
    ctx.save();
    ctx.translate(14, plotY + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('V_b (V)', 0, 0);
    ctx.restore();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(
      'p·d = ' + pd.toFixed(2) + ' Torr·cm · V_b ≈ ' + (Vb < 1e8 ? Vb.toFixed(0) + ' V' : '—') +
      '   ·   charge time ≈ ' + (isFinite(period) ? (period * 1e3).toFixed(2) + ' ms' : '∞') +
      '   ·   freq ≈ ' + (freq > 0 ? freq.toFixed(2) + ' Hz' : '0 Hz'),
      plotX, oy + 40
    );
  }
}
