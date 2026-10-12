// NMR / MRI — 2D Bloch sphere + FID trace.
import { createDualCanvas } from '../common/teachPlots.js';
import { el } from '../common/ui.js';
import { larmorMHz, magTransverse, fidSignal } from './physics.js';

export class NmrMri2D {
  constructor(host) {
    this.host = host;
    this.M = { x: 0, y: 0, z: 1 };
    this.M0 = 1;
    this.B0 = 1.5;
    this.T1 = 1.0;
    this.T2 = 0.5;
    this.time = 0;
    this.fidHistory = [];
    this.paused = false;
    this._active = true;
    this._fitPts = null;

    this._hud = el('div', 'nmr-hud', '');
    host.appendChild(this._hud);

    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h) {
      self._draw(ctx, w, h);
    });
    this._updateHud();
  }

  setParams(p) {
    if (!p) return;
    if (p.M) this.M = { x: p.M.x, y: p.M.y, z: p.M.z };
    if (p.M0 != null) this.M0 = p.M0;
    if (p.B0 != null) this.B0 = p.B0;
    if (p.T1 != null) this.T1 = p.T1;
    if (p.T2 != null) this.T2 = p.T2;
    if (p.time != null) this.time = p.time;
    if (p.fidHistory) this.fidHistory = p.fidHistory.slice();
    if (p.fitPts !== undefined) this._fitPts = p.fitPts;
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
    const f = larmorMHz(this.B0);
    const mt = magTransverse(this.M);
    this._hud.textContent =
      'B₀ = ' + this.B0.toFixed(2) + ' T   ·   f_L = ' + f.toFixed(1) + ' MHz' +
      '   ·   M⊥ = ' + mt.toFixed(3) + '   ·   M_z = ' + this.M.z.toFixed(3) +
      '   ·   T1 = ' + this.T1.toFixed(2) + ' s   ·   T2 = ' + this.T2.toFixed(2) + ' s' +
      '   ·   t = ' + this.time.toFixed(2) + ' s';
  }

  _draw(ctx, w, h) {
    if (!this._active) return;
    ctx.fillStyle = '#05070d';
    ctx.fillRect(0, 0, w, h);

    const topH = Math.floor(h * 0.52);
    this._drawBloch(ctx, w, topH);
    this._drawFid(ctx, 0, topH + 4, w, h - topH - 4);
  }

  _drawBloch(ctx, w, h) {
    const cx = w * 0.38;
    const cy = h * 0.52;
    const R = Math.min(w * 0.28, h * 0.38);

    ctx.fillStyle = 'rgba(15,23,42,0.55)';
    ctx.fillRect(8, 8, w - 16, h - 12);

    ctx.strokeStyle = 'rgba(56,189,248,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();

    // Equator + meridian hints
    ctx.strokeStyle = 'rgba(148,163,184,0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, R, R * 0.32, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - R);
    ctx.lineTo(cx, cy + R);
    ctx.stroke();

    // Axes
    ctx.fillStyle = '#64748b';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.fillText('M_x', cx + R + 8, cy + 4);
    ctx.fillText('M_z', cx - 8, cy - R - 6);
    ctx.fillText('M_y (into page)', cx - 52, cy + R + 16);

    // B0 arrow
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - R - 28, cy);
    ctx.lineTo(cx - R - 28, cy - R * 0.75);
    ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(cx - R - 28, cy - R * 0.75 - 6);
    ctx.lineTo(cx - R - 34, cy - R * 0.75 + 4);
    ctx.lineTo(cx - R - 22, cy - R * 0.75 + 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillText('B₀', cx - R - 38, cy + 18);

    // M vector — project (x,z) on side view; y shown as depth shading
    const mx = this.M.x;
    const my = this.M.y;
    const mz = this.M.z;
    const depth = 0.55 + 0.45 * Math.abs(my);
    const px = cx + mx * R * depth;
    const py = cy - mz * R * depth;

    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();

    // RF coil hint
    ctx.strokeStyle = 'rgba(167,139,250,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx + R * 0.55, cy + R * 0.15, R * 0.55, R * 0.18, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#a78bfa';
    ctx.font = '600 10px system-ui,sans-serif';
    ctx.fillText('RF coil (B₁)', cx + R * 0.2, cy + R * 0.55);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.fillText('Bloch sphere (side view)', 16, 24);

    // Legend
    const sig = fidSignal(this.M);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('|M| = ' + Math.sqrt(mx * mx + my * my + mz * mz).toFixed(3), 16, h - 12);
    ctx.fillText('FID ∝ M⊥ = ' + sig.toFixed(3), 140, h - 12);
  }

  _drawFid(ctx, x0, y0, w, h) {
    if (h < 40) return;
    const padL = 44;
    const padR = 16;
    const padT = 22;
    const padB = 28;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    ctx.fillStyle = 'rgba(10,17,34,0.65)';
    ctx.fillRect(x0 + 8, y0, w - 16, h - 4);

    ctx.fillStyle = '#7dd3fc';
    ctx.font = '700 12px system-ui,sans-serif';
    ctx.fillText('FID — free induction decay', x0 + 16, y0 + 16);

    const hist = this.fidHistory || [];
    const tMax = Math.max(2.5, this.T2 * 4, hist.length ? hist[hist.length - 1].t + 0.2 : 2.5);

    ctx.strokeStyle = 'rgba(51,65,85,0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0 + padL, y0 + padT + plotH);
    ctx.lineTo(x0 + padL + plotW, y0 + padT + plotH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x0 + padL, y0 + padT);
    ctx.lineTo(x0 + padL, y0 + padT + plotH);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('t (s)', x0 + padL + plotW * 0.5 - 10, y0 + padT + plotH + 22);
    ctx.fillText('signal', x0 + 8, y0 + padT + 12);

    if (hist.length > 1) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < hist.length; i++) {
        const pt = hist[i];
        const px = x0 + padL + (pt.t / tMax) * plotW;
        const py = y0 + padT + plotH - pt.s * plotH * 0.92;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Envelope
      ctx.strokeStyle = 'rgba(52,211,153,0.65)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (let i = 0; i < hist.length; i++) {
        const pt = hist[i];
        const env = Math.exp(-pt.t / Math.max(0.05, this.T2));
        const px = x0 + padL + (pt.t / tMax) * plotW;
        const py = y0 + padT + plotH - env * plotH * 0.92;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.fillStyle = '#64748b';
      ctx.font = '11px system-ui,sans-serif';
      ctx.fillText('Apply a 90° RF pulse to tip M into the transverse plane and start the FID.', x0 + padL, y0 + padT + plotH * 0.45);
    }

    if (this._fitPts && this._fitPts.length) {
      ctx.fillStyle = '#f472b6';
      for (let j = 0; j < this._fitPts.length; j++) {
        const d = this._fitPts[j];
        const px = x0 + padL + (d.t / tMax) * plotW;
        const py = y0 + padT + plotH - d.s * plotH * 0.92;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
