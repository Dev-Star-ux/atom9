// 2D fusion — tokamak plasma chamber, D–T pairs, barrier vs KE plot.
import { createDualCanvas } from '../common/teachPlots.js';
import { el } from '../common/ui.js';
import {
  fusionProbability, BARRIER_KEV, Q_VALUE_MEV, keVFromTempMK, statusFusion, plainFusion,
} from './physics.js';

const PAIRS = 4;

export class Fusion2D {
  constructor(host) {
    this.host = host;
    this.tempMK = 150;
    this.confinement = 70;
    this.paused = false;
    this._active = true;
    this._phase = 0;
    this._totalEnergy = 0;
    this._fusions = 0;
    this._bounces = 0;
    this._pairs = [];
    for (let i = 0; i < PAIRS; i++) {
      this._pairs.push({ offset: i / PAIRS, flash: 0, fused: false, products: null });
    }
    this._hud = el('div', 'nfu-hud', '');
    host.appendChild(this._hud);
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      if (!self.paused && self._active) {
        self._phase = phase;
        self._step(0.04);
      }
      self._draw(ctx, w, h);
    });
    this._updateHud();
  }

  setParams(p) {
    if (!p) return;
    if (p.tempMK != null) this.tempMK = p.tempMK;
    if (p.confinement != null) this.confinement = p.confinement;
    if (p.resetPulse) this.resetPulse();
    this._updateHud();
  }

  resetPulse() {
    for (let i = 0; i < this._pairs.length; i++) {
      this._pairs[i].flash = 0;
      this._pairs[i].fused = false;
      this._pairs[i].products = null;
      this._pairs[i].gate = false;
    }
  }

  setPaused(v) { this.paused = !!v; this._canvas.setPaused(v); }
  setActive(v) { this._active = !!v; this._hud.style.display = v ? '' : 'none'; }
  resize() { this._canvas.resize(); }
  dispose() {
    this._canvas.dispose();
    if (this._hud.parentNode) this._hud.parentNode.removeChild(this._hud);
  }

  _p() { return fusionProbability(this.tempMK, this.confinement); }

  _updateHud() {
    const p = this._p();
    const keV = keVFromTempMK(this.tempMK);
    this._hud.textContent =
      'T ≈ ' + Math.round(this.tempMK) + ' MK (~' + keV.toFixed(1) + ' keV)' +
      '   ·   P_fuse ≈ ' + (p * 100).toFixed(0) + '%' +
      '   ·   fusions ' + this._fusions + '   bounces ' + this._bounces +
      '   ·   E_out ≈ ' + this._totalEnergy.toFixed(1) + ' MeV   ·   ' + statusFusion(p);
  }

  _step(dt) {
    const cycleLen = 2.8;
    const p = this._p();
    for (let i = 0; i < this._pairs.length; i++) {
      const pair = this._pairs[i];
      const cycle = ((this._phase + pair.offset * cycleLen) % cycleLen) / cycleLen;
      pair.flash = Math.max(0, pair.flash - dt);
      if (pair.products) {
        pair.products.t += dt;
        if (pair.products.t > 1.0) pair.products = null;
      }
      if (cycle > 0.46 && cycle < 0.5 && !pair.gate) {
        pair.gate = true;
        if (Math.random() < p) {
          pair.flash = 0.75;
          pair.fused = true;
          pair.products = { t: 0 };
          this._fusions++;
          this._totalEnergy += Q_VALUE_MEV;
        } else {
          pair.fused = false;
          this._bounces++;
        }
      }
      if (cycle < 0.06) pair.gate = false;
    }
    this._updateHud();
  }

  _draw(ctx, w, h) {
    if (!this._active) return;
    const topH = Math.floor(h * 0.54);
    this._drawPlasma(ctx, w, topH);
    this._drawBarrier(ctx, 0, topH, w, h - topH);
  }

  _drawPlasma(ctx, w, h) {
    const g = ctx.createRadialGradient(w / 2, h * 0.55, 20, w / 2, h * 0.55, w * 0.45);
    const heat = Math.min(1, this.tempMK / 500);
    g.addColorStop(0, 'rgba(251,113,133,' + (0.12 + heat * 0.2) + ')');
    g.addColorStop(0.5, 'rgba(88,28,135,' + (0.08 + heat * 0.12) + ')');
    g.addColorStop(1, 'rgba(7,13,24,0)');
    ctx.fillStyle = '#070d18';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const p = this._p();
    const statusCol = p < 0.12 ? '#f87171' : p < 0.45 ? '#fbbf24' : '#4ade80';
    ctx.strokeStyle = 'rgba(56,189,248,0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.58, w * 0.38, h * 0.32, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#64748b';
    ctx.font = '600 10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('tokamak plasma (teaching view)', w / 2, h * 0.58 - h * 0.32 - 8);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('²H + ³H → ⁴He + n + 17.6 MeV', 14, 22);
    ctx.fillStyle = statusCol;
    ctx.font = '700 11px system-ui,sans-serif';
    ctx.fillText(statusFusion(p).toUpperCase() + '  ·  ' + plainFusion(p), 14, 40);

    const lanes = [0.28, 0.42, 0.58, 0.72];
    for (let i = 0; i < PAIRS; i++) {
      this._drawPair(ctx, w, h, lanes[i], this._pairs[i], i);
    }

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui,sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('released ≈ ' + this._totalEnergy.toFixed(1) + ' MeV', w - 14, h - 10);
  }

  _drawPair(ctx, w, h, laneY, pair, idx) {
    const cycleLen = 2.8;
    const cycle = ((this._phase + pair.offset * cycleLen) % cycleLen) / cycleLen;
    const midY = h * laneY;
    const fused = pair.flash > 0;

    let dx, tx;
    if (fused) {
      dx = w / 2 - 6;
      tx = w / 2 + 6;
    } else if (cycle <= 0.5) {
      const u = cycle / 0.5;
      dx = w * 0.12 + u * (w * 0.38 - 40);
      tx = w * 0.88 - u * (w * 0.38 - 40);
    } else {
      const u = (cycle - 0.5) / 0.5;
      dx = w / 2 - 24 - u * (w * 0.38 - 40);
      tx = w / 2 + 24 + u * (w * 0.38 - 40);
    }

    const gap = Math.abs(tx - dx);
    if (!fused && gap < 70) {
      ctx.strokeStyle = 'rgba(248,113,113,' + (1 - gap / 70) * 0.75 + ')';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(dx + 16, midY);
      ctx.lineTo(tx - 16, midY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    drawNucleus(ctx, dx, midY, 12, '#38bdf8', 'D');
    drawNucleus(ctx, tx, midY, 13, '#a78bfa', 'T');

    if (fused) {
      const a = pair.flash;
      ctx.beginPath();
      ctx.arc(w / 2, midY, 10 + (0.75 - a) * 40, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(251,191,36,' + (a * 1.1) + ')';
      ctx.fill();
    }

    if (pair.products) {
      const t = pair.products.t;
      drawNucleus(ctx, w / 2 + t * 55, midY - 8, 11, '#fbbf24', 'He');
      ctx.beginPath();
      ctx.arc(w / 2 - t * 70, midY + 10, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
      ctx.fillStyle = '#7dd3fc';
      ctx.font = '700 9px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('n', w / 2 - t * 70, midY + 24);
    }
  }

  _drawBarrier(ctx, x0, y0, w, h) {
    ctx.fillStyle = '#0a1220';
    ctx.fillRect(x0, y0, w, h);
    const L = x0 + 52;
    const R = x0 + w - 20;
    const T = y0 + 32;
    const B = y0 + h - 24;

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Coulomb barrier vs thermal KE — why stars/tokamaks need extreme T', L, y0 + 18);

    ctx.strokeStyle = 'rgba(148,163,184,0.45)';
    ctx.beginPath();
    ctx.moveTo(L, T);
    ctx.lineTo(L, B);
    ctx.lineTo(R, B);
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i <= 90; i++) {
      const u = i / 90;
      const r = 0.12 + u * 2.9;
      let V;
      if (r < 0.5) V = -BARRIER_KEV * 0.4 + (0.5 - r) * 180;
      else V = BARRIER_KEV / r;
      const px = L + u * (R - L);
      const py = B - Math.min(1.08, Math.max(-0.12, V / (BARRIER_KEV * 1.75))) * (B - T);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    const keV = keVFromTempMK(this.tempMK);
    const keY = B - Math.min(1, keV / (BARRIER_KEV * 1.75)) * (B - T);
    ctx.fillStyle = 'rgba(52,211,153,0.12)';
    ctx.fillRect(L, keY, R - L, B - keY);
    ctx.strokeStyle = '#4ade80';
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(L, keY);
    ctx.lineTo(R, keY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#4ade80';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('⟨KE⟩ ≈ ' + keV.toFixed(1) + ' keV from T', L + 6, keY - 6);

    const p = this._p();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('Fusion when KE meets/overcomes barrier (or tunnels) · P ≈ ' + Math.round(p * 100) + '%', L + 6, B - 6);
  }
}

function drawNucleus(ctx, x, y, r, color, label) {
  const grd = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
  grd.addColorStop(0, '#ffffff');
  grd.addColorStop(0.35, color);
  grd.addColorStop(1, color);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = grd;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = '#0f172a';
  ctx.font = '700 11px system-ui,sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x, y + 4);
}
