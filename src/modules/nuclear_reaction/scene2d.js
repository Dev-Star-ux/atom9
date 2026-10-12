// 2D nuclear reaction diagram — projectile hits target → products + energy readout.
import { createDualCanvas } from '../common/teachPlots.js';
import { getSpecies, labelOf } from './physics.js';

export class Reaction2D {
  constructor(host) {
    this.host = host;
    this.projectile = 'n';
    this.target = 'U-235';
    this.energyMeV = 2;
    this.analysis = null;
    this.selectedIndex = 0;
    this._phase = 0;
    this._flash = 0;
    this.paused = false;
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h) {
      if (!self.paused) {
        self._phase += 0.016;
        if (self._flash > 0) self._flash -= 0.02;
      }
      self._draw(ctx, w, h);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.projectile != null) this.projectile = p.projectile;
    if (p.target != null) this.target = p.target;
    if (p.energyMeV != null) this.energyMeV = p.energyMeV;
    if (p.analyses != null) this.analyses = p.analyses;
    if (p.selectedIndex != null) this.selectedIndex = p.selectedIndex;
    if (p.fire) this._flash = 1;
    this.analysis = (this.analyses && this.analyses[this.selectedIndex]) || null;
  }

  setPaused(v) { this.paused = !!v; this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _draw(ctx, w, h) {
    ctx.fillStyle = '#070d18';
    ctx.fillRect(0, 0, w, h);

    // Title strip
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 14px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Nuclear reaction diagram', 18, 26);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(
      labelOf(this.projectile) + '  +  ' + labelOf(this.target) +
      '    ·    E_lab = ' + formatE(this.energyMeV),
      18, 46
    );

    const midY = h * 0.48;
    const leftX = w * 0.18;
    const rightX = w * 0.72;
    const centerX = w * 0.42;

    // Beam path
    ctx.strokeStyle = 'rgba(148,163,184,0.25)';
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(40, midY);
    ctx.lineTo(w - 40, midY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Incoming projectile motion
    const tCycle = (this._phase % 2.4) / 2.4;
    const approach = Math.min(1, tCycle / 0.45);
    const projX = 50 + (centerX - 70) * approach;
    this._drawParticle(ctx, this.projectile, projX, midY, 1.15);

    // Target
    this._drawParticle(ctx, this.target, centerX, midY, 1.55);

    // Interaction flash
    if (this._flash > 0 || tCycle > 0.42 && tCycle < 0.55) {
      const a = this._flash > 0 ? this._flash : (0.55 - tCycle) / 0.13;
      ctx.beginPath();
      ctx.arc(centerX, midY, 28 + (1 - a) * 40, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(251,191,36,' + (0.15 + 0.55 * a) + ')';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Products flying out
    const open = this.analysis && this.analysis.open;
    const products = (this.analysis && this.analysis.products) || [];
    if (tCycle > 0.48 && products.length) {
      const fly = Math.min(1, (tCycle - 0.48) / 0.5);
      const n = products.length;
      for (let i = 0; i < n; i++) {
        const ang = -Math.PI / 2.6 + (Math.PI * 1.15) * (n === 1 ? 0.5 : i / (n - 1));
        const dist = 40 + fly * (rightX - centerX - 20);
        const px = centerX + Math.cos(ang) * dist * 0.95;
        const py = midY + Math.sin(ang) * dist * 0.55;
        this._drawParticle(ctx, products[i].id, px, py, 1.05);
      }
    } else if (!products.length) {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No curated channel for this pair — try another target/projectile', w * 0.72, midY);
    }

    // Status panel
    const boxY = h - 118;
    roundRect(ctx, 16, boxY, w - 32, 100, 12);
    ctx.fillStyle = 'rgba(15,23,42,0.92)';
    ctx.fill();
    ctx.strokeStyle = open ? 'rgba(74,222,128,0.45)' : 'rgba(248,113,113,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (!this.analysis) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px system-ui,sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Select a projectile and target to see possible reactions.', 32, boxY + 36);
      return;
    }

    const a = this.analysis;
    const r = a.reaction;
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(r.title + (open ? '  ·  OPEN' : '  ·  CLOSED (below threshold)'), 32, boxY + 24);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px system-ui,sans-serif';
    const prodStr = products.map(function (p) { return p.label; }).join('  +  ');
    ctx.fillText(
      labelOf(this.projectile) + ' + ' + labelOf(this.target) + '  →  ' + prodStr,
      32, boxY + 46
    );
    ctx.fillText(
      'Q = ' + a.Q.toFixed(2) + ' MeV   ·   E_th ≈ ' + a.Eth.toFixed(2) + ' MeV   ·   E_avail ≈ ' +
      a.energyAvailable.toFixed(2) + ' MeV',
      32, boxY + 68
    );
    const cons = a.conservation;
    ctx.fillStyle = cons.zOk && cons.aOk ? '#86efac' : '#fca5a5';
    ctx.fillText(
      'Conservation:  Z ' + cons.ZIn + '→' + cons.ZOut + (cons.zOk ? ' ✓' : ' ✗') +
      '    A ' + cons.AIn + '→' + cons.AOut + (cons.aOk ? ' ✓' : ' ✗') +
      '    type: ' + r.type,
      32, boxY + 90
    );
  }

  _drawParticle(ctx, id, x, y, scale) {
    const s = getSpecies(id) || { label: id, color: '#94a3b8', A: 1 };
    const R = (10 + Math.min(18, Math.sqrt(Math.max(1, s.A)))) * (scale || 1);
    ctx.beginPath();
    ctx.arc(x, y, R, 0, Math.PI * 2);
    ctx.fillStyle = s.color || '#94a3b8';
    ctx.globalAlpha = 0.92;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 ' + Math.max(10, Math.min(14, R)) + 'px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.label || id, x, y + 0.5);
    ctx.textBaseline = 'alphabetic';
  }
}

function formatE(e) {
  if (e < 0.001) return (e * 1e6).toFixed(1) + ' eV';
  if (e < 1) return (e * 1000).toFixed(1) + ' keV';
  return e.toFixed(2) + ' MeV';
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
