/** PET 511 keV coincidence teaching canvas. */
import { createDualCanvas } from '../common/teachPlots.js';
import { rates, annihilationFlash } from './physics.js';

export class PetCoincidence2D {
  constructor(host) {
    this.state = {
      activityMBq: 40,
      windowNs: 12,
      geometry: 0.012,
    };
    this._events = [];
    this._t = 0;
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.activityMBq != null) this.state.activityMBq = p.activityMBq;
    if (p.windowNs != null) this.state.windowNs = p.windowNs;
    if (p.geometry != null) this.state.geometry = p.geometry;
  }

  setPaused(v) { this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _draw(ctx, W, H, phase) {
    if (!W || !H) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);

    const r = rates(this.state.activityMBq, this.state.windowNs, this.state.geometry);
    const schemH = Math.min(220, Math.floor(H * 0.48));
    this._drawRing(ctx, W, schemH, phase, r);
    this._drawRates(ctx, 0, schemH + 4, W, H - schemH - 4, r);
  }

  _drawRing(ctx, W, H, phase, r) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
    ctx.beginPath();
    ctx.moveTo(0, H - 0.5);
    ctx.lineTo(W, H - 0.5);
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 14px system-ui,sans-serif';
    ctx.fillText('PET coincidence — β⁺ annihilation → two 511 keV γ back-to-back', 16, 22);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText('Medicine link: FDG (¹⁸F) maps glucose uptake · coincidence localizes the LOR', 16, 42);

    const cx = W * 0.5;
    const cy = H * 0.58;
    const R = Math.min(W * 0.28, H * 0.32);

    // Ring
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();

    // Two detectors facing
    const flash = annihilationFlash(phase);
    const ang = flash.angle;
    const d1x = cx + Math.cos(ang) * R;
    const d1y = cy + Math.sin(ang) * R;
    const d2x = cx + Math.cos(ang + Math.PI) * R;
    const d2y = cy + Math.sin(ang + Math.PI) * R;

    drawDet(ctx, d1x, d1y, ang, '#38bdf8');
    drawDet(ctx, d2x, d2y, ang + Math.PI, '#38bdf8');

    // Patient / source center
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('e⁺e⁻', cx, cy + 22);
    ctx.textAlign = 'left';

    if (flash.active) {
      const glow = 1 - flash.t / 0.35;
      // Two opposite gammas
      ctx.strokeStyle = 'rgba(74, 222, 128,' + (0.4 + glow * 0.5) + ')';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(d1x, d1y);
      ctx.moveTo(cx, cy);
      ctx.lineTo(d2x, d2y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(74, 222, 128,' + glow + ')';
      ctx.beginPath();
      ctx.arc(cx, cy, 4 + glow * 8, 0, Math.PI * 2);
      ctx.fill();

      // Coincidence window badge
      ctx.fillStyle = 'rgba(74, 222, 128, 0.9)';
      ctx.font = '700 11px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TRUE COINCIDENCE', cx, cy - R - 16);
      ctx.textAlign = 'left';
    }

    // Random illustration occasionally
    if ((phase * 0.7) % 1 > 0.82) {
      const ra = ang + 0.7;
      ctx.strokeStyle = 'rgba(248, 113, 113, 0.55)';
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ra) * 20, cy + Math.sin(ra) * 20);
      ctx.lineTo(cx + Math.cos(ra) * R, cy + Math.sin(ra) * R);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#f87171';
      ctx.font = '10px system-ui,sans-serif';
      ctx.fillText('random?', cx + R * 0.55, cy - R * 0.55);
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('Window τ = ' + this.state.windowNs + ' ns · Activity = ' + this.state.activityMBq + ' MBq', 16, H - 10);
  }

  _drawRates(ctx, ox, oy, W, H, r) {
    const pad = 20;
    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 14px system-ui,sans-serif';
    ctx.fillText('Coincidence rates (teaching model)', ox + 16, oy + 22);

    const kinds = [
      { key: 'trueRate', label: 'True', color: '#4ade80', v: r.trueRate },
      { key: 'scatterRate', label: 'Scatter', color: '#fbbf24', v: r.scatterRate },
      { key: 'randomRate', label: 'Random', color: '#f87171', v: r.randomRate },
    ];
    let maxV = 1;
    for (let i = 0; i < kinds.length; i++) if (kinds[i].v > maxV) maxV = kinds[i].v;

    const barTop = oy + 40;
    const barH = H - 70;
    const gap = W / (kinds.length + 1);
    for (let i = 0; i < kinds.length; i++) {
      const k = kinds[i];
      const bx = ox + gap * (i + 1);
      const bh = (k.v / maxV) * barH * 0.85;
      ctx.fillStyle = '#0a1122';
      ctx.fillRect(bx - 36, barTop, 72, barH);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(bx - 36.5, barTop + 0.5, 71, barH - 1);
      ctx.fillStyle = k.color;
      ctx.fillRect(bx - 28, barTop + barH - 8 - bh, 56, bh);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '700 12px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(k.label, bx, barTop + barH + 16);
      ctx.fillStyle = k.color;
      ctx.font = '11px system-ui,sans-serif';
      ctx.fillText(k.v.toFixed(0) + ' /s', bx, barTop + barH - bh - 14);
    }
    ctx.textAlign = 'left';

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText(
      'True fraction ≈ ' + (100 * r.trueFrac).toFixed(1) + '% of prompts · wider window → more randoms',
      ox + pad, oy + H - 10
    );
  }
}

function drawDet(ctx, x, y, ang, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang + Math.PI / 2);
  ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.rect(-14, -10, 28, 20);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
