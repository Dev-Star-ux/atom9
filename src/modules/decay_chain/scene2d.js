import { createDualCanvas } from '../common/teachPlots.js';
import { el } from '../common/ui.js';
import { CHAIN, secularEquilibriumActivity } from './physics.js';

export class DecayChain2D {
  constructor(host) {
    this.host = host;
    this.tYears = 0;
    this._active = true;
    this._hud = el('div', 'dc-hud', '');
    host.appendChild(this._hud);
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h) {
      self._draw(ctx, w, h);
    });
    this._updateHud();
  }

  setParams(p) {
    if (!p) return;
    if (p.tYears != null) this.tYears = p.tYears;
    this._updateHud();
  }

  setActive(v) { this._active = !!v; this._hud.style.display = v ? '' : 'none'; }
  resize() { this._canvas.resize(); }
  dispose() {
    this._canvas.dispose();
    if (this._hud.parentNode) this._hud.parentNode.removeChild(this._hud);
  }

  _updateHud() {
    this._hud.textContent = 'U-238 series   ·   t = ' + this.tYears.toFixed(0) + ' y (teaching scale)';
  }

  _draw(ctx, w, h) {
    if (!this._active) return;
    ctx.fillStyle = '#070d18';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.fillText('U-238 decay chain — environmental radon & lead endpoint', 14, 22);

    const n = CHAIN.length;
    const stepX = (w - 80) / (n - 1);
    const y0 = h * 0.38;
    for (let i = 0; i < n; i++) {
      const x = 40 + i * stepX;
      const node = CHAIN[i];
      const col = node.mode === 'α' ? '#f87171' : node.mode === 'β⁻' ? '#4ade80' : node.mode === 'stable' ? '#94a3b8' : '#a78bfa';
      ctx.beginPath();
      ctx.arc(x, y0, 14, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '8px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(node.sym, x, y0 + 28);
      if (i < n - 1) {
        ctx.strokeStyle = 'rgba(148,163,184,0.45)';
        ctx.beginPath();
        ctx.moveTo(x + 16, y0);
        ctx.lineTo(x + stepX - 16, y0);
        ctx.stroke();
        ctx.fillStyle = '#64748b';
        ctx.font = '7px system-ui,sans-serif';
        ctx.fillText(CHAIN[i + 1].mode === 'stable' ? '' : node.mode, x + stepX / 2, y0 - 10);
      }
    }

    ctx.fillStyle = '#fbbf24';
    ctx.font = '600 10px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('²²²Rn — indoor air concern', 40 + 6 * stepX - 30, y0 - 36);

    const plotL = w * 0.08;
    const plotB = h - 28;
    const plotW = w * 0.84;
    const plotH = h * 0.28;
    ctx.strokeStyle = 'rgba(100,116,139,0.4)';
    ctx.strokeRect(plotL, plotB - plotH, plotW, plotH);
    ctx.fillStyle = '#64748b';
    ctx.font = '9px system-ui,sans-serif';
    ctx.fillText('relative activity vs time (teaching)', plotL, plotB - plotH - 6);
    ctx.beginPath();
    for (let k = 0; k <= 50; k++) {
      const ty = (k / 50) * 8000;
      const a = secularEquilibriumActivity(ty);
      const px = plotL + (k / 50) * plotW;
      const py = plotB - a * plotH * 0.85;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = '#38bdf8';
    ctx.stroke();
    const curX = plotL + (this.tYears / 8000) * plotW;
    ctx.strokeStyle = '#f472b6';
    ctx.beginPath();
    ctx.moveTo(curX, plotB - plotH);
    ctx.lineTo(curX, plotB);
    ctx.stroke();
  }
}
