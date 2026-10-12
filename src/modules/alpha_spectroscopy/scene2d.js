/** Si α spectroscopy MCA + vacuum/air schematic. */
import { createDualCanvas } from '../common/teachPlots.js';
import { getSource, peakInfo, airShiftMeV, fwhmMeV } from './physics.js';

export class AlphaSpectroscopy2D {
  constructor(host) {
    this.state = {
      sourceId: 'am241',
      airMm: 0,
      vacuum: true,
      rate: 120,
      running: true,
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
    if (p.airMm != null) this.state.airMm = p.airMm;
    if (p.vacuum != null) this.state.vacuum = !!p.vacuum;
    if (p.rate != null) this.state.rate = p.rate;
    if (p.running != null) this.state.running = !!p.running;
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

    const schemH = Math.min(115, Math.floor(H * 0.28));
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

    const air = this.state.vacuum ? 0 : this.state.airMm;
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.fillText('Si charged-particle detector · α spectroscopy', 16, 18);
    ctx.fillStyle = air > 0 ? '#fbbf24' : '#4ade80';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText(air > 0 ? ('Air path ≈ ' + air.toFixed(1) + ' mm — energy loss + straggling') : 'Vacuum — sharp α lines', 16, 36);

    const src = getSource(this.state.sourceId);
    const y = H * 0.62;
    const xSrc = W * 0.14;
    const xDet = W * 0.72;

    // Chamber
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    roundRect(ctx, W * 0.05, H * 0.42, W * 0.9, H * 0.48, 8);
    ctx.stroke();
    if (air > 0) {
      ctx.fillStyle = 'rgba(251, 191, 36, 0.08)';
      ctx.fillRect(W * 0.05, H * 0.42, W * 0.9, H * 0.48);
    }

    // Source
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(xSrc, y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(src.name, xSrc, y + 28);

    // Detector
    ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = 1.5;
    roundRect(ctx, xDet - 40, y - 22, 80, 44, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#67e8f9';
    ctx.font = '700 11px system-ui,sans-serif';
    ctx.fillText('Si detector', xDet, y - 2);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('MCA', xDet, y + 12);
    ctx.textAlign = 'left';

    // Alpha flash
    if (this.state.running) {
      const t = (phase * 0.45) % 1;
      const gx = xSrc + (xDet - 40 - xSrc) * t;
      ctx.fillStyle = 'rgba(248, 113, 113,' + (0.5 + this._pulse * 0.4) + ')';
      ctx.beginPath();
      ctx.arc(gx, y, 4 + this._pulse * 2, 0, Math.PI * 2);
      ctx.fill();
      // trail smear in air
      if (air > 0) {
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(xSrc + 12, y);
        ctx.lineTo(gx, y);
        ctx.stroke();
      }
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('α particles lose energy in air → peaks shift down & broaden', 16, H - 8);
  }

  _drawSpectrum(ctx, ox, oy, W, H) {
    const padL = 52;
    const padR = 16;
    const padT = 34;
    const padB = 42;
    const plotX = ox + padL;
    const plotY = oy + padT;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const air = this.state.vacuum ? 0 : this.state.airMm;
    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 14px system-ui,sans-serif';
    ctx.fillText('α pulse-height spectrum (MeV)', ox + 16, oy + 20);

    const spec = this.spec;
    const eMin = spec ? spec.eMin : 4.5;
    const eMax = spec ? spec.eMax : 6.5;
    let yMax = 8;
    if (spec && spec.bins) {
      for (let i = 0; i < spec.bins.length; i++) if (spec.bins[i] > yMax) yMax = spec.bins[i];
    }
    yMax *= 1.12;

    ctx.fillStyle = '#0a1122';
    ctx.fillRect(plotX, plotY, plotW, plotH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(plotX + 0.5, plotY + 0.5, plotW - 1, plotH - 1);

    function xOf(E) { return plotX + ((E - eMin) / (eMax - eMin)) * plotW; }

    if (spec && spec.bins) {
      const bw = plotW / spec.bins.length;
      ctx.fillStyle = air > 0 ? 'rgba(251, 191, 36, 0.7)' : 'rgba(248, 113, 113, 0.8)';
      for (let i = 0; i < spec.bins.length; i++) {
        const c = spec.bins[i];
        if (c <= 0) continue;
        const h = (c / yMax) * plotH;
        ctx.fillRect(plotX + i * bw, plotY + plotH - h, Math.max(1, bw * 0.95), h);
      }
    }

    const src = getSource(this.state.sourceId);
    const peaks = peakInfo(src, air);
    for (let i = 0; i < peaks.length; i++) {
      const p = peaks[i];
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.7)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(xOf(p.E), plotY);
      ctx.lineTo(xOf(p.E), plotY + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#4ade80';
      ctx.font = '9px system-ui,sans-serif';
      ctx.save();
      ctx.translate(xOf(p.E) + 3, plotY + 36);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(p.label + ' (vac)', 0, 0);
      ctx.restore();

      if (air > 0) {
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(xOf(p.Eobs), plotY);
        ctx.lineTo(xOf(p.Eobs), plotY + plotH);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    const fwhm = fwhmMeV(air);
    const shift = airShiftMeV(air);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText(
      'ΔE ≈ −' + shift.toFixed(3) + ' MeV · FWHM ≈ ' + (fwhm * 1000).toFixed(0) + ' keV' +
      (air <= 0 ? ' (vacuum)' : ' (with air)'),
      plotX, oy + 20
    );

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Energy (MeV)', plotX + plotW / 2, oy + H - 8);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    for (let e = Math.ceil(eMin * 10) / 10; e <= eMax; e += 0.2) {
      const tx = xOf(e);
      ctx.strokeStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(tx, plotY + plotH);
      ctx.lineTo(tx, plotY + plotH + 4);
      ctx.stroke();
      ctx.fillText(e.toFixed(1), tx, plotY + plotH + 14);
    }
    ctx.textAlign = 'left';

    const n = spec ? spec.counts : 0;
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('Events: ' + n, plotX + plotW - 90, plotY - 8);
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
