/** Electrospray / electrospinning teaching canvas. */
import { createDualCanvas } from '../common/teachPlots.js';
import {
  onsetVoltageKV,
  rayleighCharge,
  regime,
} from './physics.js';

export class ElectrosprayScene2D {
  constructor(host) {
    this.state = {
      voltageKV: 50,
      flowRateMlH: 1.0,
      surfaceTensionMNm: 72,
      viscosityMode: 'low',
      nozzleDistanceMm: 100,
      dropletRadiusUm: 5,
    };
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.voltageKV != null) this.state.voltageKV = p.voltageKV;
    if (p.flowRateMlH != null) this.state.flowRateMlH = p.flowRateMlH;
    if (p.surfaceTensionMNm != null) this.state.surfaceTensionMNm = p.surfaceTensionMNm;
    if (p.viscosityMode != null) this.state.viscosityMode = p.viscosityMode;
    if (p.nozzleDistanceMm != null) this.state.nozzleDistanceMm = p.nozzleDistanceMm;
    if (p.dropletRadiusUm != null) this.state.dropletRadiusUm = p.dropletRadiusUm;
  }

  setPaused(v) { this._canvas.setPaused(v); }
  setActive(v) { this._active = !!v; }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _draw(ctx, W, H, phase) {
    if (!W || !H) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);

    const captionH = 32;
    this._drawCaption(ctx, W, captionH);

    // Keep the Rayleigh chart small and fixed so the schematic — the main,
    // easy-to-read figure — gets most of the space.
    const remH = H - captionH;
    const curveH = Math.floor(remH * 0.3);
    const schemH = remH - curveH - 4;
    this._drawSchematic(ctx, W, schemH, phase, captionH);
    this._drawRayleighPlot(ctx, 0, captionH + schemH + 4, W, curveH);
  }

  /** Bold, plain-language regime caption — always visible at the top. */
  _drawCaption(ctx, W, H) {
    const onset = onsetVoltageKV(this.state.surfaceTensionMNm, 0.5, this.state.nozzleDistanceMm);
    const mode = regime(this.state.voltageKV, onset, this.state.viscosityMode);
    let text, color;
    if (mode === 'dripping') {
      text = 'Below onset voltage: liquid just drips from the nozzle';
      color = '#38bdf8';
    } else if (mode === 'spray') {
      text = 'Electrospray: charged droplets repel each other and fan out';
      color = '#f472b6';
    } else {
      text = 'Electrospinning: the jet whips rapidly into one continuous fiber';
      color = '#a78bfa';
    }
    ctx.fillStyle = 'rgba(15, 23, 42, 0.98)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, H - 1);
    ctx.lineTo(W, H - 1);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = '700 17px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, W / 2, H / 2 + 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  _drawSchematic(ctx, W, H, phase, yOffset) {
    ctx.save();
    ctx.translate(0, yOffset);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
    ctx.beginPath();
    ctx.moveTo(0, H - 0.5);
    ctx.lineTo(W, H - 0.5);
    ctx.stroke();

    const onset = onsetVoltageKV(this.state.surfaceTensionMNm, 0.5, this.state.nozzleDistanceMm);
    const mode = regime(this.state.voltageKV, onset, this.state.viscosityMode);

    const cx = W * 0.5;
    const nozzleY = 40;
    const nozzleHalfW = 16;
    const nozzleLen = 34;
    const collectorY = H - 30;

    // Field lines (vertical, nozzle to collector)
    ctx.strokeStyle = 'rgba(244, 114, 182, 0.25)';
    ctx.lineWidth = 1;
    const nLines = 9;
    for (let i = 0; i < nLines; i++) {
      const fx = cx - W * 0.32 + (i / (nLines - 1)) * (W * 0.64);
      ctx.beginPath();
      ctx.moveTo(fx, nozzleY + nozzleLen + 10);
      ctx.lineTo(fx, collectorY);
      ctx.stroke();
    }

    // Reservoir + nozzle body
    ctx.fillStyle = '#475569';
    ctx.fillRect(cx - nozzleHalfW - 10, nozzleY - 26, (nozzleHalfW + 10) * 2, 20);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(cx - nozzleHalfW, nozzleY, nozzleHalfW * 2, nozzleLen);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('+HV nozzle', cx, nozzleY - 32);

    const tipY = nozzleY + nozzleLen;

    // Meniscus / Taylor cone or drip
    if (mode === 'dripping') {
      ctx.fillStyle = '#38bdf8';
      const t = (phase * 0.25) % 1;
      const dripY = tipY + 6 + t * (collectorY - tipY - 16);
      const r = 5 * (1 - 0.3 * t);
      ctx.beginPath();
      ctx.arc(cx, tipY + 8, 7, 0, Math.PI * 2);
      ctx.fill();
      if (t > 0.02) {
        ctx.globalAlpha = Math.max(0, 1 - t);
        ctx.beginPath();
        ctx.arc(cx, dripY, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    } else {
      // Taylor cone
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(cx - 10, tipY);
      ctx.lineTo(cx + 10, tipY);
      ctx.lineTo(cx, tipY + 22);
      ctx.closePath();
      ctx.fill();

      // Small label pointing at the Taylor cone — short, no second line.
      const calloutX = cx + Math.min(W * 0.22, 84);
      const calloutY = tipY + 4;
      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(calloutX - 4, calloutY);
      ctx.lineTo(cx + 11, tipY + 6);
      ctx.stroke();
      ctx.fillStyle = '#7dd3fc';
      ctx.beginPath();
      ctx.arc(cx + 11, tipY + 6, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.textAlign = 'left';
      ctx.font = '700 12px system-ui,sans-serif';
      ctx.fillText('Taylor cone', calloutX, calloutY);
      ctx.textAlign = 'center';

      if (mode === 'spray') {
        this._drawSprayCone(ctx, cx, tipY + 22, collectorY, W, phase);
      } else {
        this._drawWhippingJet(ctx, cx, tipY + 22, collectorY, W, phase);
      }
    }

    // Collector plate
    ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 1.5;
    ctx.fillRect(cx - W * 0.36, collectorY, W * 0.72, 14);
    ctx.strokeRect(cx - W * 0.36 + 0.5, collectorY + 0.5, W * 0.72 - 1, 13);
    ctx.fillStyle = '#f472b6';
    ctx.font = '700 12px system-ui,sans-serif';
    ctx.fillText('grounded collector', cx, collectorY - 6);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  _drawSprayCone(ctx, cx, y0, collectorY, W, phase) {
    // Discrete, visibly separating droplets — exaggerated repulsion spread
    // so the "fan out" motion reads clearly at a glance (vs. the fiber's
    // single unbroken thread in _drawWhippingJet).
    const n = 22;
    const spreadMax = W * 0.36;
    for (let i = 0; i < n; i++) {
      const seed = i / n;
      const t = (phase * 0.45 + seed) % 1;
      const y = y0 + t * (collectorY - y0);
      const spread = spreadMax * Math.pow(t, 1.4);
      const side = (i % 2 === 0 ? 1 : -1) * (0.35 + 0.65 * ((i * 37) % 10) / 10);
      const x = cx + side * spread;
      const alpha = 0.9 * (1 - 0.25 * t);
      ctx.fillStyle = '#f472b6';
      ctx.globalAlpha = Math.max(0.2, alpha);
      const r = 2.6 * (1 - 0.3 * t) + 0.8;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // scattered landing dots on collector
    ctx.fillStyle = 'rgba(244, 114, 182, 0.5)';
    for (let i = 0; i < 14; i++) {
      const side = ((i * 53) % 100) / 100 - 0.5;
      const x = cx + side * spreadMax * 2;
      ctx.beginPath();
      ctx.arc(x, collectorY - 2, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawWhippingJet(ctx, cx, y0, collectorY, W, phase) {
    // One continuous unbroken thread — thicker + glow-outlined so it reads
    // as a single fiber rather than discrete droplets.
    ctx.save();
    ctx.strokeStyle = 'rgba(244, 114, 182, 0.35)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    const stepsGlow = 60;
    for (let i = 0; i <= stepsGlow; i++) {
      const u = i / stepsGlow;
      const y = y0 + u * (collectorY - y0);
      const amp = W * 0.02 + W * 0.22 * u * u;
      const freq = 6 + u * 10;
      const x = cx + amp * Math.sin(freq * u + phase * 3);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = '#fbcfe8';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    const steps = 60;
    const amp0 = W * 0.02;
    const ampGrow = W * 0.22;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const y = y0 + u * (collectorY - y0);
      const amp = amp0 + ampGrow * u * u;
      const freq = 6 + u * 10;
      const x = cx + amp * Math.sin(freq * u + phase * 3);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // tangled fiber mat on the collector
    ctx.strokeStyle = 'rgba(244, 114, 182, 0.4)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      const baseX = cx + (k - 1.5) * W * 0.05;
      for (let i = 0; i <= 12; i++) {
        const u = i / 12;
        const x = baseX + Math.sin(u * 8 + k * 1.3) * W * 0.05;
        const y = collectorY - 2 - u * 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  _drawRayleighPlot(ctx, ox, oy, W, H) {
    const padL = 40;
    const padR = 14;
    const padT = 22;
    const padB = 16;
    const plotX = ox + padL;
    const plotY = oy + padT;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const gammaNPerM = Math.max(0.1, this.state.surfaceTensionMNm) * 1e-3;
    const rMaxUm = 20;
    const N = 80;
    const pts = [];
    let qMax = 1e-18;
    for (let i = 0; i <= N; i++) {
      const rUm = (i / N) * rMaxUm;
      const q = rayleighCharge(rUm * 1e-6, gammaNPerM);
      pts.push({ r: rUm, q: q });
      if (q > qMax) qMax = q;
    }

    const R = this.state.dropletRadiusUm;
    const qR = rayleighCharge(R * 1e-6, gammaNPerM);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.fillText('Rayleigh charge limit vs droplet radius', ox + 12, oy + 14);

    ctx.fillStyle = '#0a1122';
    ctx.fillRect(plotX, plotY, plotW, plotH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(plotX + 0.5, plotY + 0.5, plotW - 1, plotH - 1);

    const qMaxPlot = qMax * 1.1;
    function X(r) { return plotX + (r / rMaxUm) * plotW; }
    function Y(q) { return plotY + plotH - (q / qMaxPlot) * plotH; }

    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const px = X(pts[i].r);
      const py = Y(pts[i].q);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(X(Math.min(R, rMaxUm)), Y(Math.min(qR, qMaxPlot)), 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('droplet radius →', plotX + plotW / 2, oy + H - 3);
    ctx.textAlign = 'left';
  }
}
