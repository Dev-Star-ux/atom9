// ESR / EPR — 2D spectrum vs magnetic field B.
import { createDualCanvas } from '../common/teachPlots.js';
import { el } from '../common/ui.js';
import { eprSpectrum, peakPositions, resonanceFieldMT, G_FREE } from './physics.js';

export class EsrEpr2D {
  constructor(host) {
    this.host = host;
    this.g = G_FREE;
    this.A = 2.5;
    this.hyperfineN = 1;
    this.linewidth = 0.35;
    this.freqGHz = 9.5;
    this.lineShape = 'lorentz';
    this.paused = false;
    this._active = true;
    this._fitEstimate = null;

    this._hud = el('div', 'epr-hud', '');
    host.appendChild(this._hud);

    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h) {
      self._draw(ctx, w, h);
    });
    this._updateHud();
  }

  setParams(p) {
    if (!p) return;
    if (p.g != null) this.g = p.g;
    if (p.A != null) this.A = p.A;
    if (p.hyperfineN != null) this.hyperfineN = p.hyperfineN;
    if (p.linewidth != null) this.linewidth = p.linewidth;
    if (p.freqGHz != null) this.freqGHz = p.freqGHz;
    if (p.lineShape != null) this.lineShape = p.lineShape;
    if (p.fitEstimate != null) this._fitEstimate = p.fitEstimate;
    this._updateHud();
  }

  setPaused(v) {
    this.paused = !!v;
    this._canvas.setPaused(v);
  }

  setActive(v) {
    this._active = !!v;
    this._hud.style.display = v ? '' : 'none';
  }

  resize() { this._canvas.resize(); }

  dispose() {
    this._canvas.dispose();
    if (this._hud.parentNode) this._hud.parentNode.removeChild(this._hud);
  }

  _updateHud() {
    const B0 = resonanceFieldMT(this.g, this.freqGHz);
    const nLines = Math.pow(2, Math.max(0, Math.min(3, Math.floor(this.hyperfineN || 0))));
    this._hud.textContent =
      'g = ' + this.g.toFixed(4) + '   ·   A = ' + this.A.toFixed(2) + ' mT' +
      '   ·   ν = ' + this.freqGHz.toFixed(2) + ' GHz' +
      '   ·   B₀ = ' + B0.toFixed(2) + ' mT' +
      '   ·   lines = ' + nLines +
      (this._fitEstimate != null ? '   ·   AI ĝ = ' + this._fitEstimate.toFixed(4) : '');
  }

  _draw(ctx, w, h) {
    if (!this._active) return;
    ctx.fillStyle = '#05070d';
    ctx.fillRect(0, 0, w, h);

    const padL = 52;
    const padR = 20;
    const padT = 36;
    const padB = 40;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const B0 = resonanceFieldMT(this.g, this.freqGHz);
    const span = Math.max(8, this.A * 4 + 6);
    const Bmin = B0 - span;
    const Bmax = B0 + span;
    const spec = eprSpectrum(Bmin, Bmax, 240, this.g, this.A, this.hyperfineN, this.linewidth, this.freqGHz, this.lineShape);
    const peaks = peakPositions(this.g, this.A, this.hyperfineN, this.freqGHz);

    ctx.fillStyle = 'rgba(15,23,42,0.55)';
    ctx.fillRect(8, 8, w - 16, h - 16);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 14px system-ui,sans-serif';
    ctx.fillText('EPR spectrum — absorption vs B', 16, 26);

    // Axes
    ctx.strokeStyle = 'rgba(51,65,85,0.85)';
    ctx.lineWidth = 1;
    const x0 = padL;
    const y0 = padT + plotH;
    ctx.beginPath();
    ctx.moveTo(x0, padT);
    ctx.lineTo(x0, y0);
    ctx.lineTo(x0 + plotW, y0);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('B (mT)', x0 + plotW * 0.5 - 18, h - 10);
    ctx.fillText('signal (a.u.)', 10, padT + 8);

    // Grid + ticks
    for (let k = 0; k <= 4; k++) {
      const B = Bmin + (Bmax - Bmin) * k / 4;
      const px = x0 + (k / 4) * plotW;
      ctx.strokeStyle = 'rgba(30,41,59,0.65)';
      ctx.beginPath();
      ctx.moveTo(px, padT);
      ctx.lineTo(px, y0);
      ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.fillText(B.toFixed(1), px - 12, y0 + 16);
    }

    // Spectrum curve
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let i = 0; i < spec.xs.length; i++) {
      const px = x0 + ((spec.xs[i] - Bmin) / (Bmax - Bmin)) * plotW;
      const py = y0 - spec.ys[i] * plotH * 0.88;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Peak markers
    ctx.strokeStyle = 'rgba(52,211,153,0.75)';
    ctx.setLineDash([3, 3]);
    for (let j = 0; j < peaks.length; j++) {
      const px = x0 + ((peaks[j] - Bmin) / (Bmax - Bmin)) * plotW;
      ctx.beginPath();
      ctx.moveTo(px, padT);
      ctx.lineTo(px, y0);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // B0 centre
    const cx = x0 + ((B0 - Bmin) / (Bmax - Bmin)) * plotW;
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, padT);
    ctx.lineTo(cx, y0);
    ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.font = '600 10px system-ui,sans-serif';
    ctx.fillText('B₀', cx + 4, padT + 12);

    // Resonance condition box
    ctx.fillStyle = 'rgba(30,58,95,0.55)';
    ctx.fillRect(w - 248, 14, 232, 72);
    ctx.strokeStyle = 'rgba(56,189,248,0.35)';
    ctx.strokeRect(w - 248, 14, 232, 72);
    ctx.fillStyle = '#a5f3fc';
    ctx.font = '600 11px ui-monospace,Consolas,monospace';
    ctx.fillText('hν = g μ_B B', w - 236, 34);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('ΔB_hf = A · m_I', w - 236, 52);
    ctx.fillText('2ⁿ lines (n equiv. I=½)', w - 236, 68);
  }
}
