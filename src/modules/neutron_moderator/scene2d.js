import { createDualCanvas } from '../common/teachPlots.js';
import { el } from '../common/ui.js';
import { MODERATORS, thermalCrossSection, collisionsToThermal } from './physics.js';

export class Moderator2D {
  constructor(host) {
    this.host = host;
    this.moderatorId = 'graphite';
    this._neutrons = [];
    this._active = true;
    this._hud = el('div', 'nm-hud', '');
    host.appendChild(this._hud);
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h) {
      self._draw(ctx, w, h);
    });
    this._spawn();
  }

  mod() {
    for (let i = 0; i < MODERATORS.length; i++) {
      if (MODERATORS[i].id === this.moderatorId) return MODERATORS[i];
    }
    return MODERATORS[0];
  }

  setParams(p) {
    if (!p) return;
    if (p.moderatorId != null) this.moderatorId = p.moderatorId;
    if (p.reset) this._spawn();
    this._updateHud();
  }

  _spawn() {
    this._neutrons = [];
    for (let i = 0; i < 8; i++) {
      this._neutrons.push({ x: 0.05, y: 0.2 + Math.random() * 0.6, E: 2000000, vx: 0.004 });
    }
  }

  setActive(v) { this._active = !!v; this._hud.style.display = v ? '' : 'none'; }
  resize() { this._canvas.resize(); }
  dispose() {
    this._canvas.dispose();
    if (this._hud.parentNode) this._hud.parentNode.removeChild(this._hud);
  }

  tick(dt) {
    const m = this.mod();
    for (let i = 0; i < this._neutrons.length; i++) {
      const n = this._neutrons[i];
      n.x += n.vx * dt * 60;
      if (n.x > 0.35 && n.x < 0.75 && Math.random() < dt * 4) {
        const r = collisionsToThermal(n.E, m);
        n.E = r.E;
      }
      if (n.x > 0.95) n.x = 0.05;
    }
  }

  _updateHud() {
    const m = this.mod();
    this._hud.textContent = m.name + ' moderator   ·   ~' + m.collisions + ' collisions → thermal';
  }

  _draw(ctx, w, h) {
    if (!this._active) return;
    ctx.fillStyle = '#070d18';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.fillText('Fast neutrons → moderator → thermal → fission', 14, 22);

    const modL = w * 0.32;
    const modR = w * 0.68;
    const midY = h * 0.5;
    ctx.fillStyle = 'rgba(51,65,85,0.6)';
    ctx.fillRect(modL, midY - 60, modR - modL, 120);
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText(this.mod().name, modL + 8, midY - 68);

    ctx.fillStyle = '#f87171';
    ctx.fillRect(w * 0.05, midY - 20, 40, 40);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('U fuel', w * 0.05, midY + 36);

    for (let i = 0; i < this._neutrons.length; i++) {
      const n = this._neutrons[i];
      const px = n.x * w;
      const py = n.y * h;
      const thermal = n.E < 1;
      ctx.beginPath();
      ctx.arc(px, py, thermal ? 4 : 3, 0, Math.PI * 2);
      ctx.fillStyle = thermal ? '#38bdf8' : '#fbbf24';
      ctx.fill();
    }

    const plotL = w * 0.08;
    const plotB = h - 32;
    const plotW = w * 0.84;
    const plotH = h * 0.22;
    ctx.strokeStyle = 'rgba(100,116,139,0.4)';
    ctx.strokeRect(plotL, plotB - plotH, plotW, plotH);
    ctx.fillStyle = '#64748b';
    ctx.font = '9px system-ui,sans-serif';
    ctx.fillText('σ_fission (arb.) vs neutron energy', plotL, plotB - plotH - 6);
    ctx.beginPath();
    for (let k = 0; k <= 60; k++) {
      const eV = Math.pow(10, -2 + (k / 60) * 7);
      const sig = thermalCrossSection(eV);
      const px = plotL + (k / 60) * plotW;
      const py = plotB - (sig / 600) * plotH * 0.9;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = '#4ade80';
    ctx.stroke();
    ctx.fillStyle = '#86efac';
    ctx.fillText('thermal peak', plotL + plotW * 0.12, plotB - plotH + 14);
  }
}
