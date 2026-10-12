import { createDualCanvas } from '../common/teachPlots.js';
import { el } from '../common/ui.js';
import { countRateBq, poissonSample, SOURCES } from './physics.js';

export class Geiger2D {
  constructor(host) {
    this.host = host;
    this.sourceId = 'cs137';
    this.distance = 0.5;
    this.shieldMm = 0;
    this.shieldMat = 'none';
    this._counts = [];
    this._total = 0;
    this._window = 0;
    this._active = true;
    this._hud = el('div', 'gc-hud', '');
    host.appendChild(this._hud);
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h) {
      self._draw(ctx, w, h);
    });
  }

  source() {
    for (let i = 0; i < SOURCES.length; i++) {
      if (SOURCES[i].id === this.sourceId) return SOURCES[i];
    }
    return SOURCES[0];
  }

  setParams(p) {
    if (!p) return;
    if (p.sourceId != null) this.sourceId = p.sourceId;
    if (p.distance != null) this.distance = p.distance;
    if (p.shieldMm != null) this.shieldMm = p.shieldMm;
    if (p.shieldMat != null) this.shieldMat = p.shieldMat;
    this._updateHud();
  }

  tick(dt) {
    const src = this.source();
    const rate = countRateBq(src.activity, this.distance, this.shieldMm, this.shieldMat);
    const n = poissonSample(rate / 1000, dt);
    this._total += n;
    this._window += n;
    this._counts.push({ t: performance.now(), n: n });
    if (this._counts.length > 80) this._counts.shift();
  }

  setActive(v) { this._active = !!v; this._hud.style.display = v ? '' : 'none'; }
  resize() { this._canvas.resize(); }
  dispose() {
    this._canvas.dispose();
    if (this._hud.parentNode) this._hud.parentNode.removeChild(this._hud);
  }

  _updateHud() {
    const src = this.source();
    const rate = countRateBq(src.activity, this.distance, this.shieldMm, this.shieldMat);
    this._hud.textContent = src.name + '   ·   rate ≈ ' + rate.toFixed(0) + ' cps   ·   d=' + this.distance.toFixed(2) + ' m';
  }

  _draw(ctx, w, h) {
    if (!this._active) return;
    ctx.fillStyle = '#070d18';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.fillText('Geiger counter — distance & shielding', 14, 22);

    const srcX = w * 0.18;
    const detX = w * 0.72;
    const midY = h * 0.48;
    const dPx = (detX - srcX) * (0.3 + this.distance);

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(srcX, midY, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('source', srcX - 18, midY + 28);

    const detPos = srcX + Math.min(dPx, w * 0.55);
    ctx.fillStyle = '#334155';
    ctx.fillRect(detPos - 8, midY - 40, 16, 80);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(detPos - 14, midY - 48, 28, 12);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('GM tube', detPos - 22, midY + 52);

    if (this.shieldMm > 0) {
      ctx.fillStyle = this.shieldMat === 'lead' ? '#64748b' : '#94a3b8';
      const sw = 6 + this.shieldMm * 0.15;
      ctx.fillRect(detPos - sw - 20, midY - 30, sw, 60);
      ctx.fillStyle = '#64748b';
      ctx.font = '9px system-ui,sans-serif';
      ctx.fillText(this.shieldMat, detPos - sw - 24, midY + 44);
    }

    ctx.strokeStyle = 'rgba(56,189,248,0.25)';
    for (let r = 1; r <= 3; r++) {
      ctx.beginPath();
      ctx.arc(srcX, midY, r * 40 * this.distance, 0, Math.PI * 2);
      ctx.stroke();
    }

    const plotL = w * 0.08;
    const plotB = h - 28;
    const plotW = w * 0.84;
    const plotH = h * 0.22;
    ctx.strokeStyle = 'rgba(100,116,139,0.4)';
    ctx.strokeRect(plotL, plotB - plotH, plotW, plotH);
    ctx.fillStyle = '#64748b';
    ctx.font = '9px system-ui,sans-serif';
    ctx.fillText('counts per tick (Poisson)', plotL, plotB - plotH - 6);
    const maxN = Math.max(3, ...this._counts.map(function (c) { return c.n; }));
    ctx.beginPath();
    for (let i = 0; i < this._counts.length; i++) {
      const px = plotL + (i / Math.max(1, this._counts.length - 1)) * plotW;
      const py = plotB - (this._counts[i].n / maxN) * plotH * 0.9;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = '#4ade80';
    ctx.stroke();
  }
}
