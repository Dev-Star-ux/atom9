// 2D PWR schematic — Dalton NRS style diagram + power matching chart.
import { createDualCanvas } from '../common/teachPlots.js';
import { el } from '../common/ui.js';
import { P_RATED_MW, T_NOMINAL_C, T_MAX_C } from './physics.js';

export class NuclearReactor2D {
  constructor(host) {
    this.host = host;
    this.rodInsertion = 0.35;
    this.coolantFlow = 70;
    this.demandMw = 250;
    this.powerMw = 200;
    this.electricMw = 60;
    this.tempC = T_NOMINAL_C;
    this.trip = false;
    this.paused = false;
    this._active = true;
    this._history = [];
    this._t = 0;

    this._hud = el('div', 'nr-hud', '');
    host.appendChild(this._hud);

    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      if (!self.paused && self._active) {
        self._t = phase;
        self._history.push({ t: phase, e: self.electricMw, d: self.demandMw });
        if (self._history.length > 180) self._history.shift();
      }
      self._draw(ctx, w, h);
    });
    this._updateHud();
  }

  setParams(p) {
    if (!p) return;
    if (p.rodInsertion != null) this.rodInsertion = p.rodInsertion;
    if (p.coolantFlow != null) this.coolantFlow = p.coolantFlow;
    if (p.demandMw != null) this.demandMw = p.demandMw;
    if (p.powerMw != null) this.powerMw = p.powerMw;
    if (p.electricMw != null) this.electricMw = p.electricMw;
    if (p.tempC != null) this.tempC = p.tempC;
    if (p.trip != null) this.trip = !!p.trip;
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
    this._hud.textContent =
      'P_th ≈ ' + Math.round(this.powerMw) + ' MW   ·   P_e ≈ ' + Math.round(this.electricMw) +
      ' MW   ·   demand ' + Math.round(this.demandMw) + ' MW   ·   T ≈ ' +
      Math.round(this.tempC) + ' °C' + (this.trip ? '   ·   TRIP' : '');
  }

  _draw(ctx, w, h) {
    if (!this._active) return;
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    const topH = Math.floor(h * 0.58);
    this._drawSchematic(ctx, w, topH);
    this._drawChart(ctx, 0, topH, w, h - topH);
  }

  _drawSchematic(ctx, w, h) {
    const L = 24;
    const T = 42;
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Pressurised Water Reactor (PWR) — plant schematic', L, 26);

    // Vessel
    const vx = L + 70;
    const vy = T + 40;
    const vw = 90;
    const vh = h - T - 70;
    this._roundRect(ctx, vx, vy, vw, vh, 18, '#e2e8f0', '#64748b');
    // Core
    const coreH = vh * 0.42;
    const coreY = vy + vh * 0.35;
    const glow = ctx.createLinearGradient(vx, coreY, vx, coreY + coreH);
    glow.addColorStop(0, this.trip ? '#f87171' : '#fbbf24');
    glow.addColorStop(1, this.trip ? '#991b1b' : '#f59e0b');
    ctx.fillStyle = glow;
    ctx.fillRect(vx + 18, coreY, vw - 36, coreH);
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('core', vx + vw / 2, coreY + coreH / 2 + 4);

    // Control rods
    const rodIn = this.rodInsertion;
    const rodTop = vy + 8 + rodIn * (coreY - vy - 20);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const rx = vx + 28 + i * 12;
      ctx.beginPath();
      ctx.moveTo(rx, rodTop);
      ctx.lineTo(rx, rodTop + 48);
      ctx.stroke();
    }
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('rods ' + Math.round(rodIn * 100) + '%', vx + vw / 2, vy - 6);

    // Steam generator
    const sx = vx + 200;
    const sy = vy + 20;
    const sw = 70;
    const sh = vh - 40;
    this._roundRect(ctx, sx, sy, sw, sh, 14, '#f1f5f9', '#94a3b8');
    ctx.fillStyle = '#334155';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.fillText('steam', sx + sw / 2, sy + sh / 2 - 6);
    ctx.fillText('gen.', sx + sw / 2, sy + sh / 2 + 10);

    // Turbine
    const tx = sx + 150;
    const ty = sy + sh * 0.25;
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + 90, ty + 20);
    ctx.lineTo(tx + 90, ty + 70);
    ctx.lineTo(tx, ty + 90);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e0f2fe';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.fillText('turbine', tx + 45, ty + 50);

    // Generator box
    this._roundRect(ctx, tx + 100, ty + 20, 54, 50, 8, '#dbeafe', '#0284c7');
    ctx.fillStyle = '#0c4a6e';
    ctx.fillText('gen', tx + 127, ty + 48);

    // Condenser
    this._roundRect(ctx, tx + 20, ty + 110, 100, 36, 8, '#e0f2fe', '#38bdf8');
    ctx.fillStyle = '#0369a1';
    ctx.font = '600 10px system-ui,sans-serif';
    ctx.fillText('condenser', tx + 70, ty + 132);

    // Pipes primary
    const flow = this.coolantFlow / 100;
    ctx.strokeStyle = 'rgba(245,158,11,' + (0.35 + flow * 0.55) + ')';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(vx + vw, coreY + 10);
    ctx.lineTo(sx, sy + 30);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(56,189,248,' + (0.35 + flow * 0.55) + ')';
    ctx.beginPath();
    ctx.moveTo(sx, sy + sh - 30);
    ctx.lineTo(vx + vw, coreY + coreH - 10);
    ctx.stroke();

    // Secondary steam
    ctx.strokeStyle = 'rgba(226,232,240,0.95)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx + sw, sy + 40);
    ctx.lineTo(tx, ty + 30);
    ctx.stroke();

    // Pump
    ctx.beginPath();
    ctx.arc(vx + vw + 50, coreY + coreH + 8, 12, 0, Math.PI * 2);
    ctx.fillStyle = flow > 0.2 ? '#0ea5e9' : '#94a3b8';
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = '9px system-ui,sans-serif';
    ctx.fillText('pump', vx + vw + 50, coreY + coreH + 28);

    // Temp bar
    const barX = w - 36;
    const barY = T + 10;
    const barH = h - T - 40;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(barX - 8, barY, 16, barH);
    const tf = Math.max(0, Math.min(1, (this.tempC - 80) / (T_MAX_C - 80)));
    ctx.fillStyle = this.tempC > T_MAX_C - 20 ? '#ef4444' : '#f59e0b';
    ctx.fillRect(barX - 8, barY + barH * (1 - tf), 16, barH * tf);
    ctx.fillStyle = '#64748b';
    ctx.font = '9px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('T', barX, barY - 4);
    ctx.fillText(Math.round(this.tempC) + '°', barX, barY + barH + 14);
  }

  _drawChart(ctx, x0, y0, w, h) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x0, y0, w, h);

    const padL = 48;
    const padR = 16;
    const padT = 26;
    const padB = 24;
    const L = x0 + padL;
    const R = x0 + w - padR;
    const T = y0 + padT;
    const B = y0 + h - padB;

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Electric power vs grid demand (Dalton-style matching)', L, y0 + 16);

    ctx.strokeStyle = 'rgba(148,163,184,0.35)';
    ctx.beginPath();
    ctx.moveTo(L, T);
    ctx.lineTo(L, B);
    ctx.lineTo(R, B);
    ctx.stroke();

    const ymax = Math.max(P_RATED_MW * 0.45, this.demandMw * 1.2, this.electricMw * 1.2, 100);
    function X(i, n) { return L + (R - L) * i / Math.max(1, n - 1); }
    function Y(v) { return B - (B - T) * (v / ymax); }

    const hist = this._history;
    if (hist.length > 1) {
      // Demand
      ctx.beginPath();
      for (let i = 0; i < hist.length; i++) {
        const px = X(i, hist.length);
        const py = Y(hist[i].d);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Electric
      ctx.beginPath();
      for (let i = 0; i < hist.length; i++) {
        const px = X(i, hist.length);
        const py = Y(hist[i].e);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }

    ctx.fillStyle = '#fbbf24';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('demand', R - 70, T + 12);
    ctx.fillStyle = '#4ade80';
    ctx.fillText('P_electric', R - 70, T + 26);
  }

  _roundRect(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}
