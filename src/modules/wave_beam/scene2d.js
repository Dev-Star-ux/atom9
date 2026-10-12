// 2D wave packet — like physics-simulations.org: Re(ψ) + |ψ|² stacked.
import { createDualCanvas } from '../common/teachPlots.js';
import { el } from '../common/ui.js';
import { samplePacket, gaussianDk, sigmaMetres } from './physics.js';

function maxAbs(arr) {
  let m = 1e-12;
  for (let i = 0; i < arr.length; i++) {
    const a = Math.abs(arr[i]);
    if (a > m) m = a;
  }
  return m;
}

function maxOf(arr) {
  let m = 1e-12;
  for (let i = 0; i < arr.length; i++) if (arr[i] > m) m = arr[i];
  return m;
}

export class WaveBeam2D {
  constructor(host) {
    this.host = host;
    this.width = 40;
    this.momentum = 35;
    this.dispersion = 45;
    this.paused = false;
    this._active = true;
    this._t = 0;

    this._hud = el('div', 'wb-hud', '');
    host.appendChild(this._hud);

    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      if (!self.paused && self._active) self._t = phase;
      self._draw(ctx, w, h);
    });
    this._updateHud();
  }

  setParams(p) {
    if (!p) return;
    if (p.sigma != null) this.width = p.sigma;
    if (p.momentum != null) this.momentum = p.momentum;
    if (p.dispersion != null) this.dispersion = p.dispersion;
    // legacy wavelength → momentum map
    if (p.wavelength != null && p.momentum == null) {
      this.momentum = Math.max(5, Math.min(95, 100 - p.wavelength));
    }
    this._updateHud();
  }

  setPaused(v) {
    this.paused = !!v;
    this._canvas.setPaused(v);
  }

  setActive(v) { this._active = !!v; }

  resize() { this._canvas.resize(); }

  dispose() {
    this._canvas.dispose();
    if (this._hud.parentNode) this._hud.parentNode.removeChild(this._hud);
  }

  _updateHud() {
    const sm = sigmaMetres(this.width);
    const dk = gaussianDk(sm);
    this._hud.textContent =
      'Δx ∝ width   ·   ⟨p⟩ ∝ momentum   ·   spreads with dispersion   ·   Δk ≈ ' +
      dk.toExponential(2) + ' m⁻¹';
  }

  _draw(ctx, w, h) {
    if (!this._active) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, w, h);

    const L = 36;
    const R = w - 16;
    const topT = 44;
    const gap = 12;
    const mid = topT + (h - topT - 24 - gap) * 0.55;
    const botB = h - 22;
    if (R - L < 80) return;

    const mom = this.momentum / 100;
    const disp = this.dispersion / 100;
    const pack = samplePacket(this.width, mom, disp, this._t, 260, -120, 120);

    // —— Top: Re(ψ) ——
    this._frame(ctx, L, topT, R, mid, 'Re(ψ)');
    this._drawRe(ctx, L, topT, R, mid, pack);

    // —— Bottom: |ψ|² ——
    this._frame(ctx, L, mid + gap, R, botB, 'Probability density  |ψ|²');
    this._drawDens(ctx, L, mid + gap, R, botB, pack);

    ctx.fillStyle = '#64748b';
    ctx.font = '11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('x', (L + R) / 2, botB + 14);
  }

  _frame(ctx, L, T, R, B, title) {
    ctx.strokeStyle = 'rgba(148,163,184,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(L, T, R - L, B - T);
    const midY = (T + B) / 2;
    ctx.strokeStyle = 'rgba(100,116,139,0.35)';
    ctx.beginPath();
    ctx.moveTo(L + 4, midY);
    ctx.lineTo(R - 4, midY);
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, L + 10, T + 16);
  }

  _drawRe(ctx, L, T, R, B, pack) {
    const midY = (T + B) / 2;
    const half = (B - T) * 0.38;
    const ymax = maxAbs(pack.re) * 1.05;
    function X(x) {
      return L + (R - L) * (x - pack.xMin) / (pack.xMax - pack.xMin);
    }
    function Y(v) {
      return midY - half * (v / ymax);
    }

    // Soft envelope guide
    ctx.beginPath();
    for (let i = 0; i < pack.xs.length; i++) {
      const px = X(pack.xs[i]);
      const py = midY - half * (pack.amp[i] / ymax);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = 'rgba(148,163,184,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < pack.xs.length; i++) {
      const px = X(pack.xs[i]);
      const py = midY + half * (pack.amp[i] / ymax);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Re(ψ) cyan
    ctx.beginPath();
    for (let i = 0; i < pack.xs.length; i++) {
      const px = X(pack.xs[i]);
      const py = Y(pack.re[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.fillStyle = '#22d3ee';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Re(ψ)', R - 10, T + 16);
  }

  _drawDens(ctx, L, T, R, B, pack) {
    const base = B - 10;
    const top = T + 22;
    const ymax = maxOf(pack.dens) * 1.08;
    function X(x) {
      return L + (R - L) * (x - pack.xMin) / (pack.xMax - pack.xMin);
    }
    function Y(v) {
      return base - (base - top) * (v / ymax);
    }

    ctx.beginPath();
    ctx.moveTo(X(pack.xs[0]), base);
    for (let i = 0; i < pack.xs.length; i++) {
      ctx.lineTo(X(pack.xs[i]), Y(pack.dens[i]));
    }
    ctx.lineTo(X(pack.xs[pack.xs.length - 1]), base);
    ctx.closePath();
    ctx.fillStyle = 'rgba(168,85,247,0.28)';
    ctx.fill();

    ctx.beginPath();
    for (let i = 0; i < pack.xs.length; i++) {
      const px = X(pack.xs[i]);
      const py = Y(pack.dens[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.fillStyle = '#c084fc';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('|ψ|²', R - 10, T + 16);
  }
}
