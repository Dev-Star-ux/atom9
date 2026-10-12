import { createDualCanvas } from '../common/teachPlots.js';
import { el } from '../common/ui.js';
import { TRACERS, activityAt, remainingFraction } from './physics.js';

export class Pet2D {
  constructor(host) {
    this.host = host;
    this.tracerId = 'f18';
    this.tMin = 0;
    this._active = true;
    this._pairs = [];
    this._hud = el('div', 'pet-hud', '');
    host.appendChild(this._hud);
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h) {
      self._draw(ctx, w, h);
    });
    this._last = performance.now();
    this._tick = this._tick.bind(this);
    requestAnimationFrame(this._tick);
  }

  tracer() {
    for (let i = 0; i < TRACERS.length; i++) {
      if (TRACERS[i].id === this.tracerId) return TRACERS[i];
    }
    return TRACERS[0];
  }

  setParams(p) {
    if (!p) return;
    if (p.tracerId != null) this.tracerId = p.tracerId;
    if (p.tMin != null) this.tMin = p.tMin;
    this._updateHud();
  }

  setPaused(v) { this.paused = !!v; this._canvas.setPaused(v); }
  setActive(v) { this._active = !!v; this._hud.style.display = v ? '' : 'none'; }
  resize() { this._canvas.resize(); }
  dispose() {
    this._canvas.dispose();
    if (this._hud.parentNode) this._hud.parentNode.removeChild(this._hud);
  }

  _updateHud() {
    const tr = this.tracer();
    const frac = remainingFraction(this.tMin, tr.halfLifeMin);
    this._hud.textContent = tr.name + '   ·   T½=' + tr.halfLifeMin + ' min   ·   remaining ' + (frac * 100).toFixed(0) + '%';
  }

  _tick(now) {
    if (!this.paused && this._active && Math.random() < 0.04) {
      const angle = Math.random() * Math.PI * 2;
      this._pairs.push({ x: 0.45 + Math.random() * 0.1, y: 0.42 + Math.random() * 0.08, a: angle, life: 1 });
    }
    for (let i = this._pairs.length - 1; i >= 0; i--) {
      this._pairs[i].life -= 0.02;
      if (this._pairs[i].life <= 0) this._pairs.splice(i, 1);
    }
    this._last = now;
    requestAnimationFrame(this._tick);
  }

  _draw(ctx, w, h) {
    if (!this._active) return;
    const tr = this.tracer();
    ctx.fillStyle = '#070d18';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.fillText('PET tracer — β⁺ decay → 511 keV γ coincidence', 14, 22);

    const cx = w * 0.48;
    const cy = h * 0.42;
    ctx.strokeStyle = 'rgba(148,163,184,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 70, 100, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('patient', cx, cy + 120);

    const frac = remainingFraction(this.tMin, tr.halfLifeMin);
    ctx.fillStyle = 'rgba(244,114,182,' + (0.15 + frac * 0.35) + ')';
    ctx.beginPath();
    ctx.arc(cx - 20, cy - 10, 22 * frac + 8, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < this._pairs.length; i++) {
      const p = this._pairs[i];
      const px = p.x * w;
      const py = p.y * h;
      const len = 40;
      ctx.strokeStyle = 'rgba(167,139,250,0.7)';
      ctx.beginPath();
      ctx.moveTo(px - Math.cos(p.a) * len, py - Math.sin(p.a) * len);
      ctx.lineTo(px + Math.cos(p.a) * len, py + Math.sin(p.a) * len);
      ctx.stroke();
    }

    ctx.strokeStyle = '#38bdf8';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, 130, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('PET ring', cx, cy - 140);

    const plotL = w * 0.08;
    const plotB = h - 28;
    const plotW = w * 0.84;
    const plotH = h * 0.24;
    ctx.strokeStyle = 'rgba(100,116,139,0.4)';
    ctx.strokeRect(plotL, plotB - plotH, plotW, plotH);
    ctx.fillStyle = '#64748b';
    ctx.font = '9px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('A(t) / A₀', plotL, plotB - plotH - 6);
    ctx.beginPath();
    for (let k = 0; k <= 50; k++) {
      const tm = (k / 50) * tr.halfLifeMin * 3;
      const a = activityAt(tm, tr.halfLifeMin, 1);
      const px = plotL + (k / 50) * plotW;
      const py = plotB - a * plotH * 0.9;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = '#4ade80';
    ctx.stroke();
    const curX = plotL + (this.tMin / (tr.halfLifeMin * 3)) * plotW;
    ctx.strokeStyle = '#f472b6';
    ctx.beginPath();
    ctx.moveTo(curX, plotB - plotH);
    ctx.lineTo(curX, plotB);
    ctx.stroke();
  }
}
