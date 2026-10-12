// 2D de Broglie — MatterWaveX-style: traveling wave + λ(v) / λ(E) plotter.
// https://matterwavex.com/de-broglie-wavelength-plotter/
import { createDualCanvas } from '../common/teachPlots.js';
import { el } from '../common/ui.js';
import {
  PARTICLES,
  wavelengthPmAt,
  wavePeriodUnits,
  formatWavelength,
  lambdaCurve,
  keEVFromVelocity,
  momentum,
} from './physics.js';

export class DeBroglie2D {
  constructor(host) {
    this.host = host;
    this.particleKey = 'electron';
    this.velocity = 2e6;
    this.axis = 'velocity'; // 'velocity' | 'energy'
    this.relativistic = false;
    this.paused = false;
    this._active = true;
    this._phase = 0;
    this._fitPts = null; // optional AI overlay points
    this._fitModel = null;

    this._hud = el('div', 'db-hud', '');
    host.appendChild(this._hud);

    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      if (!self.paused && self._active) self._phase = phase;
      self._draw(ctx, w, h);
    });
    this._updateHud();
  }

  setParams(p) {
    if (!p) return;
    if (p.particleKey != null) this.particleKey = p.particleKey;
    if (p.velocity != null) this.velocity = p.velocity;
    if (p.axis != null) this.axis = p.axis;
    if (p.relativistic != null) this.relativistic = !!p.relativistic;
    if (p.fitPts !== undefined) this._fitPts = p.fitPts;
    if (p.fitModel !== undefined) this._fitModel = p.fitModel;
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

  _part() {
    return PARTICLES[this.particleKey] || PARTICLES.electron;
  }

  _updateHud() {
    const part = this._part();
    const lamPm = wavelengthPmAt(part.mass, this.velocity, this.relativistic);
    const p = momentum(part.mass, this.velocity);
    const ke = keEVFromVelocity(part.mass, this.velocity);
    this._hud.textContent =
      part.name + '   ·   λ = ' + formatWavelength(lamPm) +
      '   ·   p = ' + p.toExponential(2) + ' kg·m/s' +
      '   ·   KE ≈ ' + (ke >= 1000 ? (ke / 1000).toFixed(2) + ' keV' : ke.toFixed(2) + ' eV') +
      (this.relativistic ? '   ·   rel.' : '   ·   non-rel.');
  }

  _draw(ctx, w, h) {
    if (!this._active) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, w, h);

    const topH = Math.floor(h * 0.48);
    this._drawWave(ctx, w, topH);
    this._drawPlot(ctx, 0, topH, w, h - topH);
  }

  _drawWave(ctx, w, h) {
    const part = this._part();
    const lamPm = wavelengthPmAt(part.mass, this.velocity, this.relativistic);
    const period = wavePeriodUnits(lamPm) * 28;
    const midY = h * 0.55;
    const amp = Math.min(42, h * 0.22);
    const L = 36;
    const R = w - 28;

    // Panel chrome
    ctx.fillStyle = 'rgba(15,23,42,0.55)';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(16, 40, w - 32, h - 52, 12);
    else ctx.rect(16, 40, w - 32, h - 52);
    ctx.fill();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Matter wave  ·  λ = h / p', 28, 28);

    // Envelope guide
    ctx.strokeStyle = 'rgba(148,163,184,0.25)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(L, midY - amp);
    ctx.lineTo(R, midY - amp);
    ctx.moveTo(L, midY + amp);
    ctx.lineTo(R, midY + amp);
    ctx.moveTo(L, midY);
    ctx.lineTo(R, midY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Sinusoid + soft fill
    const phase = this._phase * (0.8 + Math.min(3, this.velocity / 3e6));
    const waveCol = part.color || '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(L, midY);
    for (let x = L; x <= R; x++) {
      const y = midY + amp * Math.sin((2 * Math.PI * (x - L) / period) - phase);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(R, midY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(56,189,248,0.12)';
    ctx.fill();

    ctx.beginPath();
    for (let x = L; x <= R; x++) {
      const y = midY + amp * Math.sin((2 * Math.PI * (x - L) / period) - phase);
      if (x === L) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = waveCol;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // λ bracket between two crests
    const crest0 = L + (phase / (2 * Math.PI)) * period;
    let x1 = crest0;
    while (x1 < L + 20) x1 += period;
    const x2 = x1 + period;
    if (x2 < R - 10) {
      const by = midY - amp - 10;
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x1, by + 8);
      ctx.lineTo(x1, by);
      ctx.lineTo(x2, by);
      ctx.lineTo(x2, by + 8);
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      ctx.font = '600 11px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('λ = ' + formatWavelength(lamPm), (x1 + x2) / 2, by - 4);
    }

    // Particle riding the wave
    const px = L + ((R - L) * (0.5 + 0.35 * Math.sin(this._phase * 0.45)));
    const py = midY + amp * Math.sin((2 * Math.PI * (px - L) / period) - phase);
    ctx.beginPath();
    ctx.arc(px, py, 9, 0, Math.PI * 2);
    ctx.fillStyle = part.color || '#f472b6';
    ctx.shadowColor = part.color || '#f472b6';
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0a1122';
    ctx.font = '700 9px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(part.label, px, py);
    ctx.textBaseline = 'alphabetic';

    // Motion arrow
    ctx.strokeStyle = '#fbbf24';
    ctx.fillStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(R - 70, midY + amp + 18);
    ctx.lineTo(R - 20, midY + amp + 18);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(R - 20, midY + amp + 18);
    ctx.lineTo(R - 28, midY + amp + 13);
    ctx.lineTo(R - 28, midY + amp + 23);
    ctx.closePath();
    ctx.fill();
    ctx.font = '600 10px system-ui,sans-serif';
    ctx.fillText('v', R - 45, midY + amp + 32);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(part.name + '  ·  m = ' + part.mass.toExponential(2) + ' kg', 28, h - 10);
  }

  _drawPlot(ctx, x0, y0, w, h) {
    ctx.fillStyle = '#070a12';
    ctx.fillRect(x0, y0, w, h);

    const padL = 52;
    const padR = 18;
    const padT = 28;
    const padB = 28;
    const L = x0 + padL;
    const R = x0 + w - padR;
    const T = y0 + padT;
    const B = y0 + h - padB;

    const part = this._part();
    const curve = lambdaCurve(part.mass, this.axis, this.relativistic, 72);
    let ymax = 1e-12;
    let ymin = Infinity;
    for (let i = 0; i < curve.length; i++) {
      if (curve[i].lamPm > ymax) ymax = curve[i].lamPm;
      if (curve[i].lamPm < ymin) ymin = curve[i].lamPm;
    }
    ymin = Math.max(ymin * 0.8, ymax * 1e-4);
    const xmin = curve[0].x;
    const xmax = curve[curve.length - 1].x;

    function X(x) {
      return L + (R - L) * (x - xmin) / (xmax - xmin || 1);
    }
    function Y(lam) {
      // log-y like MatterWaveX for wide dynamic range
      const a = Math.log(Math.max(lam, ymin));
      const a0 = Math.log(ymin);
      const a1 = Math.log(ymax * 1.15);
      return B - (B - T) * (a - a0) / (a1 - a0 || 1);
    }

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.textAlign = 'left';
    const title = this.axis === 'energy'
      ? 'de Broglie λ vs kinetic energy  (MatterWaveX-style)'
      : 'de Broglie λ vs velocity  (MatterWaveX-style)';
    ctx.fillText(title, L, y0 + 16);

    // Axes
    ctx.strokeStyle = 'rgba(148,163,184,0.35)';
    ctx.beginPath();
    ctx.moveTo(L, T);
    ctx.lineTo(L, B);
    ctx.lineTo(R, B);
    ctx.stroke();

    // Curve fill + stroke
    ctx.beginPath();
    ctx.moveTo(X(curve[0].x), B);
    for (let i = 0; i < curve.length; i++) ctx.lineTo(X(curve[i].x), Y(curve[i].lamPm));
    ctx.lineTo(X(curve[curve.length - 1].x), B);
    ctx.closePath();
    ctx.fillStyle = 'rgba(56,189,248,0.16)';
    ctx.fill();

    ctx.beginPath();
    for (let i = 0; i < curve.length; i++) {
      const px = X(curve[i].x);
      const py = Y(curve[i].lamPm);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = part.color || '#22d3ee';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Current operating point
    const lamNow = wavelengthPmAt(part.mass, this.velocity, this.relativistic);
    const xNow = this.axis === 'energy'
      ? keEVFromVelocity(part.mass, this.velocity)
      : this.velocity / 1e6;
    const cx = X(Math.min(xmax, Math.max(xmin, xNow)));
    const cy = Y(lamNow);
    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(52,211,153,0.45)';
    ctx.beginPath();
    ctx.moveTo(cx, T);
    ctx.lineTo(cx, B);
    ctx.stroke();

    // AI overlay
    if (this._fitPts && this._fitPts.length) {
      ctx.fillStyle = '#f472b6';
      for (let i = 0; i < this._fitPts.length; i++) {
        const d = this._fitPts[i];
        const xx = this.axis === 'energy'
          ? keEVFromVelocity(part.mass, d.v)
          : d.v / 1e6;
        ctx.beginPath();
        ctx.arc(X(xx), Y(d.lam * 1e12), 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.axis === 'energy' ? 'KE (eV)' : 'v (×10⁶ m/s)', (L + R) / 2, y0 + h - 6);
    ctx.save();
    ctx.translate(x0 + 14, (T + B) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('λ (log)', 0, 0);
    ctx.restore();
  }
}
