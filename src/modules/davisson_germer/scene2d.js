// 2D Davisson–Germer — apparatus + I(θ) like Simulations4All / PhET.
// https://simulations4all.com/simulations/davisson-germer-electron-diffraction
import { createDualCanvas } from '../common/teachPlots.js';
import { el } from '../common/ui.js';
import {
  NI_SPACING_PM,
  davissonPeakAngleDeg,
  davissonIntensity,
  electronWavelengthPm,
  intensityCurve,
} from './physics.js';

export class DavissonGermer2D {
  constructor(host) {
    this.host = host;
    this.voltage = 54;
    this.angle = 50;
    this.paused = false;
    this._active = true;
    this._particles = [];
    this._emit = 0;

    this._hud = el('div', 'dg-hud', '');
    host.appendChild(this._hud);

    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      if (!self.paused && self._active) self._step(0.04);
      self._draw(ctx, w, h);
    });
    this._updateHud();
  }

  setParams(p) {
    if (!p) return;
    if (p.voltage != null) this.voltage = p.voltage;
    if (p.angle != null) this.angle = p.angle;
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
    const lam = electronWavelengthPm(this.voltage);
    const peak = davissonPeakAngleDeg(this.voltage, NI_SPACING_PM);
    const I = davissonIntensity(this.angle, this.voltage, NI_SPACING_PM);
    this._hud.textContent =
      'V = ' + Math.round(this.voltage) + ' V   ·   λ ≈ ' + lam.toFixed(1) +
      ' pm   ·   peak ≈ ' + (peak != null ? peak.toFixed(1) + '°' : '—') +
      '   ·   I(θ) = ' + I.toFixed(2);
  }

  _step(dt) {
    const I = davissonIntensity(this.angle, this.voltage, NI_SPACING_PM);
    this._emit += dt * (2 + I * 6);
    while (this._emit >= 1 && this._particles.length < 40) {
      this._emit -= 1;
      this._particles.push({
        t: 0,
        scatter: Math.random() < Math.min(0.95, 0.25 + I * 0.5),
        y0: (Math.random() - 0.5) * 0.12,
      });
    }
    const next = [];
    for (let i = 0; i < this._particles.length; i++) {
      const p = this._particles[i];
      p.t += dt;
      if (p.t < 1.6) next.push(p);
    }
    this._particles = next;
  }

  _draw(ctx, w, h) {
    if (!this._active) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, w, h);

    const topH = Math.floor(h * 0.58);
    this._drawApparatus(ctx, w, topH);
    this._drawIntensity(ctx, 0, topH, w, h - topH);
  }

  _drawApparatus(ctx, w, h) {
    const L = 36;
    const R = w - 20;
    const T = 48;
    const B = h - 12;
    const cx = L + (R - L) * 0.42;
    const cy = (T + B) / 2;
    const rad = (this.angle * Math.PI) / 180;
    const I = davissonIntensity(this.angle, this.voltage, NI_SPACING_PM);
    const peak = davissonPeakAngleDeg(this.voltage, NI_SPACING_PM);

    // Vacuum chamber
    const chamberGrad = ctx.createLinearGradient(L, T, R, B);
    chamberGrad.addColorStop(0, 'rgba(30,58,95,0.22)');
    chamberGrad.addColorStop(0.55, 'rgba(15,23,42,0.12)');
    chamberGrad.addColorStop(1, 'rgba(30,41,59,0.28)');
    ctx.fillStyle = chamberGrad;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(L, T, R - L, B - T, 14);
    else ctx.rect(L, T, R - L, B - T);
    ctx.fill();
    ctx.strokeStyle = 'rgba(148,163,184,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Electron gun
    const gunX = L + 28;
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(gunX, cy - 18, 44, 36, 6);
    else ctx.rect(gunX, cy - 18, 44, 36);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = 'rgba(56,189,248,0.55)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(gunX + 44, cy - 10);
    ctx.lineTo(gunX + 58, cy);
    ctx.lineTo(gunX + 44, cy + 10);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('gun', gunX + 22, cy - 26);

    // Incident beam guide
    ctx.strokeStyle = 'rgba(56,189,248,0.5)';
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(gunX + 58, cy);
    ctx.lineTo(cx - 18, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Soft beam glow
    const beamGlow = ctx.createLinearGradient(gunX + 58, cy, cx - 18, cy);
    beamGlow.addColorStop(0, 'rgba(56,189,248,0.18)');
    beamGlow.addColorStop(1, 'rgba(56,189,248,0)');
    ctx.strokeStyle = beamGlow;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(gunX + 58, cy);
    ctx.lineTo(cx - 18, cy);
    ctx.stroke();
    ctx.lineWidth = 1;

    // Ni crystal (atom rows — surface grating)
    for (let i = -4; i <= 4; i++) {
      ctx.fillStyle = 'rgba(100,116,139,0.55)';
      ctx.fillRect(cx - 24, cy + i * 9 - 1.5, 48, 3);
      for (let j = -2; j <= 2; j++) {
        ctx.beginPath();
        ctx.arc(cx + j * 9, cy + i * 9, 3.1, 0, Math.PI * 2);
        ctx.fillStyle = '#94a3b8';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + j * 9 - 0.6, cy + i * 9 - 0.6, 1.1, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(226,232,240,0.7)';
        ctx.fill();
      }
    }
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.fillText('Ni crystal', cx, B - 6);

    // Detector arc
    const rArc = Math.min((R - cx) * 0.72, (B - T) * 0.42);
    ctx.strokeStyle = 'rgba(100,116,139,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, rArc, -Math.PI * 0.05, Math.PI * 0.55);
    ctx.stroke();

    // Peak angle tick
    if (peak != null) {
      const pr = (peak * Math.PI) / 180;
      ctx.strokeStyle = 'rgba(251,191,36,0.7)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + rArc * Math.cos(pr), cy + rArc * Math.sin(pr));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#fbbf24';
      ctx.font = '600 10px system-ui,sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('peak', cx + rArc * Math.cos(pr) + 4, cy + rArc * Math.sin(pr));
    }

    // Detector
    const dx = cx + rArc * Math.cos(rad);
    const dy = cy + rArc * Math.sin(rad);
    ctx.fillStyle = I > 0.55 ? '#4ade80' : '#64748b';
    ctx.save();
    ctx.translate(dx, dy);
    ctx.rotate(rad);
    ctx.fillRect(-6, -16, 12, 32);
    ctx.restore();
    ctx.fillStyle = I > 0.55 ? '#4ade80' : '#94a3b8';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('detector', dx, dy + 28);
    ctx.fillText(Math.round(this.angle) + '°', dx, dy - 22);

    // Scattered ray
    ctx.strokeStyle = I > 0.55 ? 'rgba(167,139,250,0.85)' : 'rgba(167,139,250,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + 10, cy);
    ctx.lineTo(dx, dy);
    ctx.stroke();

    // Particles
    for (let i = 0; i < this._particles.length; i++) {
      const p = this._particles[i];
      let px;
      let py;
      if (p.t < 0.45) {
        const u = p.t / 0.45;
        px = gunX + 58 + (cx - 18 - gunX - 58) * u;
        py = cy + p.y0 * 40;
        ctx.fillStyle = '#38bdf8';
      } else if (p.scatter) {
        const u = (p.t - 0.45) / 1.0;
        px = cx + (dx - cx) * u;
        py = cy + (dy - cy) * u + p.y0 * 20 * (1 - u);
        ctx.fillStyle = '#a78bfa';
      } else {
        const u = (p.t - 0.45) / 1.0;
        const a2 = rad * 0.3 + p.y0 * 2;
        px = cx + rArc * 0.7 * u * Math.cos(a2);
        py = cy + rArc * 0.7 * u * Math.sin(a2);
        ctx.fillStyle = 'rgba(56,189,248,0.45)';
      }
      ctx.beginPath();
      ctx.arc(px, py, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('1927 · Davisson–Germer', L + 10, T + 16);
  }

  _drawIntensity(ctx, x0, y0, w, h) {
    ctx.fillStyle = '#070a12';
    ctx.fillRect(x0, y0, w, h);

    const padL = 44;
    const padR = 16;
    const padT = 26;
    const padB = 26;
    const L = x0 + padL;
    const R = x0 + w - padR;
    const T = y0 + padT;
    const B = y0 + h - padB;

    const curve = intensityCurve(this.voltage);
    let ymax = 1e-6;
    for (let i = 0; i < curve.length; i++) if (curve[i].I > ymax) ymax = curve[i].I;
    ymax *= 1.12;
    const peak = davissonPeakAngleDeg(this.voltage, NI_SPACING_PM);

    function X(th) { return L + (R - L) * (th - 20) / 60; }
    function Y(I) { return B - (B - T) * (I / ymax); }

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Intensity I(θ)  —  diffraction peak', L, y0 + 16);

    ctx.strokeStyle = 'rgba(148,163,184,0.3)';
    ctx.beginPath();
    ctx.moveTo(L, T);
    ctx.lineTo(L, B);
    ctx.lineTo(R, B);
    ctx.stroke();

    // Fill under curve
    ctx.beginPath();
    ctx.moveTo(X(curve[0].theta), B);
    for (let i = 0; i < curve.length; i++) ctx.lineTo(X(curve[i].theta), Y(curve[i].I));
    ctx.lineTo(X(curve[curve.length - 1].theta), B);
    ctx.closePath();
    ctx.fillStyle = 'rgba(167,139,250,0.2)';
    ctx.fill();

    ctx.beginPath();
    for (let i = 0; i < curve.length; i++) {
      const px = X(curve[i].theta);
      const py = Y(curve[i].I);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    if (peak != null) {
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(X(peak), T);
      ctx.lineTo(X(peak), B);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#fbbf24';
      ctx.font = '600 10px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('θ_peak', X(peak), T + 12);
    }

    const I = davissonIntensity(this.angle, this.voltage, NI_SPACING_PM);
    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.arc(X(this.angle), Y(I), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(52,211,153,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(X(this.angle), T);
    ctx.lineTo(X(this.angle), B);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('θ (degrees)', (L + R) / 2, y0 + h - 6);
  }
}
