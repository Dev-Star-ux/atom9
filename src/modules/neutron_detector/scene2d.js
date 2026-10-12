/** ³He / BF₃ neutron detector teaching canvas. */
import { createDualCanvas } from '../common/teachPlots.js';
import {
  getDetector,
  moderatedCountRate,
  moderatedEfficiency,
  pulseHeightSpectrum,
  energyLabel,
} from './physics.js';

export class NeutronDetector2D {
  constructor(host) {
    this.state = {
      detectorId: 'he3',
      energyLog10: -1.6,
      flux: 1,
      strength: 1,
      moderated: false,
      wallEffect: true,
    };
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.detectorId != null) this.state.detectorId = p.detectorId;
    if (p.energyLog10 != null) this.state.energyLog10 = p.energyLog10;
    if (p.flux != null) this.state.flux = p.flux;
    if (p.strength != null) this.state.strength = p.strength;
    if (p.moderated != null) this.state.moderated = !!p.moderated;
    if (p.wallEffect != null) this.state.wallEffect = !!p.wallEffect;
  }

  setPaused(v) { this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _draw(ctx, W, H, phase) {
    if (!W || !H) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);

    const topH = Math.min(130, Math.floor(H * 0.32));
    this._drawSchematic(ctx, W, topH, phase);
    this._drawEfficiency(ctx, 0, topH + 2, W * 0.55, H - topH - 4);
    this._drawPulse(ctx, W * 0.55, topH + 2, W * 0.45, H - topH - 4);
  }

  _drawSchematic(ctx, W, H, phase) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
    ctx.beginPath();
    ctx.moveTo(0, H - 0.5);
    ctx.lineTo(W, H - 0.5);
    ctx.stroke();

    const det = getDetector(this.state.detectorId);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.fillText('Neutron detection via capture → charged products', 16, 18);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(det.reaction + '   Q ≈ ' + det.QMeV + ' MeV   ·   products: ' + det.products, 16, 38);

    const y = H * 0.68;
    const blocks = [
      { x: 0.12, label: 'n beam', sub: energyLabel(this.state.energyLog10), color: '#a78bfa' },
      { x: 0.38, label: this.state.moderated ? 'Moderator' : '(no mod.)', sub: this.state.moderated ? 'thermalize' : 'fast path', color: this.state.moderated ? '#4ade80' : '#64748b' },
      { x: 0.62, label: det.name + ' tube', sub: 'proportional', color: '#38bdf8' },
      { x: 0.86, label: 'Pulse', sub: 'MCA / rate', color: '#fbbf24' },
    ];
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const cx = W * b.x;
      const bw = Math.min(88, W * 0.13);
      ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 1.5;
      roundRect(ctx, cx - bw / 2, y - 18, bw, 36, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = b.color;
      ctx.font = '700 11px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.label, cx, y - 2);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px system-ui,sans-serif';
      ctx.fillText(b.sub, cx, y + 12);
      if (i < blocks.length - 1) {
        const nx = W * blocks[i + 1].x;
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
        ctx.beginPath();
        ctx.moveTo(cx + bw / 2 + 2, y);
        ctx.lineTo(nx - bw / 2 - 2, y);
        ctx.stroke();
      }
    }
    ctx.textAlign = 'left';

    // neutron flash
    const t = (phase * 0.35) % 1;
    const x0 = W * 0.12 + 40;
    const x1 = W * 0.62 - 40;
    const gx = x0 + (x1 - x0) * t;
    ctx.fillStyle = 'rgba(167, 139, 250, 0.85)';
    ctx.beginPath();
    ctx.arc(gx, y, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('Neutrons themselves leave little ionization — detect the charged capture products', 16, H - 8);
  }

  _drawEfficiency(ctx, ox, oy, W, H) {
    const padL = 48;
    const padR = 14;
    const padT = 32;
    const padB = 36;
    const plotX = ox + padL;
    const plotY = oy + padT;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.fillText('Relative efficiency vs neutron energy', ox + 12, oy + 18);

    ctx.fillStyle = '#0a1122';
    ctx.fillRect(plotX, plotY, plotW, plotH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(plotX + 0.5, plotY + 0.5, plotW - 1, plotH - 1);

    const logMin = -2.5;
    const logMax = 6.5;
    function X(lg) { return plotX + ((lg - logMin) / (logMax - logMin)) * plotW; }
    function Y(eff) { return plotY + plotH - Math.min(1, eff) * plotH * 0.95; }

    // Thermal band
    ctx.fillStyle = 'rgba(74, 222, 128, 0.08)';
    ctx.fillRect(X(-2.2), plotY, X(-0.5) - X(-2.2), plotH);
    ctx.fillStyle = '#4ade80';
    ctx.font = '9px system-ui,sans-serif';
    ctx.fillText('thermal', X(-2.0), plotY + 12);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) {
      const lg = logMin + (i / 80) * (logMax - logMin);
      const e = moderatedEfficiency(lg, this.state.detectorId, this.state.moderated);
      const px = X(lg);
      const py = Y(e);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Operating point
    const e0 = moderatedEfficiency(this.state.energyLog10, this.state.detectorId, this.state.moderated);
    const rate = moderatedCountRate(this.state.flux, this.state.energyLog10, this.state.detectorId, this.state.strength, this.state.moderated);
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(X(this.state.energyLog10), Y(e0), 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('log₁₀(E / eV) →', plotX + plotW / 2, oy + H - 8);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fbbf24';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('rate ≈ ' + rate.toFixed(0) + ' (arb.)', plotX + 8, plotY + plotH - 8);
  }

  _drawPulse(ctx, ox, oy, W, H) {
    const padL = 40;
    const padR = 14;
    const padT = 32;
    const padB = 36;
    const plotX = ox + padL;
    const plotY = oy + padT;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const ph = pulseHeightSpectrum(this.state.detectorId, this.state.wallEffect);
    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.fillText('Pulse-height schematic', ox + 8, oy + 18);

    ctx.fillStyle = '#0a1122';
    ctx.fillRect(plotX, plotY, plotW, plotH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(plotX + 0.5, plotY + 0.5, plotW - 1, plotH - 1);

    let yMax = 0.01;
    for (let i = 0; i < ph.bins.length; i++) if (ph.bins[i] > yMax) yMax = ph.bins[i];
    const bw = plotW / ph.bins.length;
    ctx.fillStyle = 'rgba(251, 191, 36, 0.75)';
    for (let i = 0; i < ph.bins.length; i++) {
      const h = (ph.bins[i] / yMax) * plotH * 0.9;
      ctx.fillRect(plotX + i * bw, plotY + plotH - h, Math.max(1, bw * 0.9), h);
    }

    // Q marker
    const qx = plotX + (ph.Q / ph.eMax) * plotW;
    ctx.strokeStyle = '#4ade80';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(qx, plotY);
    ctx.lineTo(qx, plotY + plotH);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#4ade80';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('Q', qx + 4, plotY + 14);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('deposited E (MeV)', plotX + plotW / 2, oy + H - 8);
    ctx.textAlign = 'left';
    if (this.state.wallEffect) {
      ctx.fillStyle = '#f472b6';
      ctx.font = '10px system-ui,sans-serif';
      ctx.fillText('wall effect continuum', plotX + 6, plotY + 14);
    }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}
