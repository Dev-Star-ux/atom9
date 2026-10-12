/** NaI(Tl) MCA spectrum + detector schematic (2D teaching view). */
import { createDualCanvas } from '../common/teachPlots.js';
import { featuresForSource, getSource } from './physics.js';

export class NaiSpectrometer2D {
  constructor(host) {
    this.state = {
      sourceId: 'cs137',
      resolutionPct: 7,
      rate: 120,
      running: true,
      showLabels: true,
    };
    this.spec = null;
    this._pulse = 0;
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  setSpectrum(spec) { this.spec = spec; }

  setParams(p) {
    if (!p) return;
    if (p.sourceId != null) this.state.sourceId = p.sourceId;
    if (p.resolutionPct != null) this.state.resolutionPct = p.resolutionPct;
    if (p.rate != null) this.state.rate = p.rate;
    if (p.running != null) this.state.running = !!p.running;
    if (p.showLabels != null) this.state.showLabels = !!p.showLabels;
    if (p.flash) this._pulse = 1;
  }

  setPaused(v) { this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _draw(ctx, W, H, phase) {
    if (!W || !H) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);

    if (this._pulse > 0) this._pulse *= 0.92;

    const schemH = Math.min(118, Math.floor(H * 0.28));
    this._drawSchematic(ctx, W, schemH, phase);
    this._drawSpectrum(ctx, 0, schemH + 4, W, H - schemH - 4);
  }

  _drawSchematic(ctx, W, H, phase) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
    ctx.beginPath();
    ctx.moveTo(0, H - 0.5);
    ctx.lineTo(W, H - 0.5);
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.fillText('NaI(Tl) scintillation spectrometer', 16, 20);

    const src = getSource(this.state.sourceId);
    const y = H * 0.58;
    const blocks = [
      { x: 0.08, label: src.name, sub: 'γ source', color: '#fbbf24' },
      { x: 0.28, label: 'NaI(Tl)', sub: 'crystal', color: '#67e8f9' },
      { x: 0.48, label: 'PMT', sub: 'photons → e⁻', color: '#a78bfa' },
      { x: 0.68, label: 'MCA', sub: 'spectrum', color: '#34d399' },
    ];

    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const cx = W * b.x;
      const bw = Math.min(88, W * 0.14);
      const bh = 36;
      ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 1.5;
      roundRect(ctx, cx - bw / 2, y - bh / 2, bw, bh, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = b.color;
      ctx.font = '700 11px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.label, cx, y - 2);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px system-ui,sans-serif';
      ctx.fillText(b.sub, cx, y + 12);
      if (i < blocks.length - 1) {
        const nx = W * blocks[i + 1].x;
        const ax0 = cx + bw / 2 + 4;
        const ax1 = nx - bw / 2 - 4;
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ax0, y);
        ctx.lineTo(ax1, y);
        ctx.stroke();
        // arrow head
        ctx.beginPath();
        ctx.moveTo(ax1, y);
        ctx.lineTo(ax1 - 6, y - 4);
        ctx.lineTo(ax1 - 6, y + 4);
        ctx.closePath();
        ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
        ctx.fill();
      }
    }
    ctx.textAlign = 'left';

    // traveling gamma flash
    if (this.state.running) {
      const t = (phase * 0.55) % 1;
      const x0 = W * 0.08 + 44;
      const x1 = W * 0.28 - 44;
      const gx = x0 + (x1 - x0) * t;
      const glow = 0.35 + 0.45 * this._pulse;
      ctx.fillStyle = 'rgba(251, 191, 36,' + (0.55 + glow * 0.4) + ')';
      ctx.beginPath();
      ctx.arc(gx, y, 4 + this._pulse * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('γ → scintillation light → photoelectrons → pulse height ∝ E_deposit', 16, H - 10);
  }

  _drawSpectrum(ctx, ox, oy, W, H) {
    const padL = 52;
    const padR = 18;
    const padT = 36;
    const padB = 42;
    const plotX = ox + padL;
    const plotY = oy + padT;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 14px system-ui,sans-serif';
    ctx.fillText('Pulse-height spectrum (MCA)', ox + 16, oy + 22);

    const spec = this.spec;
    const eMax = spec ? spec.eMax : 1600;
    const bins = spec ? spec.bins : null;
    let yMax = 8;
    if (bins) {
      for (let i = 0; i < bins.length; i++) if (bins[i] > yMax) yMax = bins[i];
    }
    yMax *= 1.12;

    // plot frame
    ctx.fillStyle = '#0a1122';
    ctx.fillRect(plotX, plotY, plotW, plotH);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(plotX + 0.5, plotY + 0.5, plotW - 1, plotH - 1);

    // grid
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.55)';
    ctx.setLineDash([3, 4]);
    for (let g = 1; g < 4; g++) {
      const gy = plotY + (plotH * g) / 4;
      ctx.beginPath();
      ctx.moveTo(plotX, gy);
      ctx.lineTo(plotX + plotW, gy);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    function xOf(E) {
      return plotX + (E / eMax) * plotW;
    }
    function yOf(c) {
      return plotY + plotH - (c / yMax) * plotH;
    }

    // histogram
    if (bins && bins.length) {
      const bw = plotW / bins.length;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.75)';
      for (let i = 0; i < bins.length; i++) {
        const c = bins[i];
        if (c <= 0) continue;
        const h = (c / yMax) * plotH;
        ctx.fillRect(plotX + i * bw, plotY + plotH - h, Math.max(1, bw * 0.95), h);
      }
    }

    const src = getSource(this.state.sourceId);
    const feat = featuresForSource(src, this.state.resolutionPct);

    if (this.state.showLabels && feat.peaks.length) {
      // Compton continuum band for first line
      const edge = feat.comptonEdge;
      const x0 = xOf(0);
      const xE = xOf(edge);
      ctx.fillStyle = 'rgba(251, 146, 60, 0.08)';
      ctx.fillRect(x0, plotY, Math.max(0, xE - x0), plotH);

      this._marker(ctx, xOf(feat.backscatter), plotY, plotH, '#f472b6', 'Backscatter');
      this._marker(ctx, xOf(edge), plotY, plotH, '#fb923c', 'Compton edge');
      for (let i = 0; i < feat.peaks.length; i++) {
        const p = feat.peaks[i];
        this._marker(ctx, xOf(p.E), plotY, plotH, '#4ade80', 'Photopeak ' + Math.round(p.E));
        // FWHM bracket near peak base
        const half = p.fwhm / 2;
        const xa = xOf(p.E - half);
        const xb = xOf(p.E + half);
        const yb = plotY + plotH - 10;
        ctx.strokeStyle = 'rgba(74, 222, 128, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(xa, yb);
        ctx.lineTo(xb, yb);
        ctx.moveTo(xa, yb - 4);
        ctx.lineTo(xa, yb + 4);
        ctx.moveTo(xb, yb - 4);
        ctx.lineTo(xb, yb + 4);
        ctx.stroke();
        ctx.fillStyle = 'rgba(74, 222, 128, 0.9)';
        ctx.font = '9px system-ui,sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FWHM', (xa + xb) / 2, yb - 6);
        ctx.textAlign = 'left';
      }

      // continuum label
      ctx.fillStyle = 'rgba(251, 146, 60, 0.95)';
      ctx.font = '10px system-ui,sans-serif';
      ctx.fillText('Compton continuum', xOf(edge * 0.35), plotY + 16);
    }

    // axes labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('Counts', ox + 8, oy + padT + 12);
    ctx.textAlign = 'center';
    ctx.fillText('Deposited energy (keV)', plotX + plotW / 2, oy + H - 10);
    ctx.textAlign = 'left';

    // tick marks on energy axis
    const ticks = [];
    const step = eMax <= 200 ? 25 : eMax <= 800 ? 100 : 200;
    for (let e = 0; e <= eMax; e += step) ticks.push(e);
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < ticks.length; i++) {
      const tx = xOf(ticks[i]);
      ctx.strokeStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(tx, plotY + plotH);
      ctx.lineTo(tx, plotY + plotH + 5);
      ctx.stroke();
      ctx.fillText(String(ticks[i]), tx, plotY + plotH + 16);
    }
    ctx.textAlign = 'left';

    // live counts
    const n = spec ? spec.counts : 0;
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('Events: ' + n.toLocaleString(), plotX + plotW - 110, oy + 22);
  }

  _marker(ctx, x, plotY, plotH, color, label) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(x, plotY + 4);
    ctx.lineTo(x, plotY + plotH);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    ctx.font = '9px system-ui,sans-serif';
    ctx.save();
    ctx.translate(x + 3, plotY + 28);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(label, 0, 0);
    ctx.restore();
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
