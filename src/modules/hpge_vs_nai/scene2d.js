/** HPGe vs NaI overlay MCA spectra (2D teaching view). */
import { createDualCanvas } from '../common/teachPlots.js';
import { getSource, peakInfo, fwhmKeV } from './physics.js';

export class HpgeVsNai2D {
  constructor(host) {
    this.state = {
      sourceId: 'cs137',
      naiRes: 7,
      hpgeRes: 0.2,
      rate: 180,
      running: true,
      overlay: true,
    };
    this.specNai = null;
    this.specHpge = null;
    this._pulse = 0;
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  setSpectra(nai, hpge) {
    this.specNai = nai;
    this.specHpge = hpge;
  }

  setParams(p) {
    if (!p) return;
    if (p.sourceId != null) this.state.sourceId = p.sourceId;
    if (p.naiRes != null) this.state.naiRes = p.naiRes;
    if (p.hpgeRes != null) this.state.hpgeRes = p.hpgeRes;
    if (p.rate != null) this.state.rate = p.rate;
    if (p.running != null) this.state.running = !!p.running;
    if (p.overlay != null) this.state.overlay = !!p.overlay;
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

    const schemH = Math.min(110, Math.floor(H * 0.26));
    this._drawSchematic(ctx, W, schemH, phase);
    this._drawSpectra(ctx, 0, schemH + 4, W, H - schemH - 4);
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
    ctx.fillText('Same γ source → two detectors · compare energy resolution', 16, 18);

    const src = getSource(this.state.sourceId);
    const y = H * 0.58;
    const items = [
      { x: 0.1, label: src.name, sub: 'γ source', color: '#fbbf24' },
      { x: 0.38, label: 'NaI(Tl)', sub: '~7% @ 662', color: '#38bdf8' },
      { x: 0.68, label: 'HPGe', sub: '~0.2% · LN₂', color: '#4ade80' },
    ];
    for (let i = 0; i < items.length; i++) {
      const b = items[i];
      const cx = W * b.x;
      const bw = Math.min(100, W * 0.16);
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
    }
    ctx.textAlign = 'left';

    // split gamma paths
    if (this.state.running) {
      const t = (phase * 0.5) % 1;
      drawFlash(ctx, W * 0.1 + 50, y, W * 0.38 - 50, y, t, this._pulse, '#38bdf8');
      drawFlash(ctx, W * 0.1 + 50, y, W * 0.68 - 50, y, (t + 0.15) % 1, this._pulse, '#4ade80');
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('HPGe needs cryogenic cooling · NaI works at room temperature', 16, H - 8);
  }

  _drawSpectra(ctx, ox, oy, W, H) {
    const padL = 48;
    const padR = 16;
    const padT = 34;
    const padB = 40;
    const plotX = ox + padL;
    const plotY = oy + padT;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 14px system-ui,sans-serif';
    ctx.fillText('MCA spectra — NaI (cyan) vs HPGe (green)', ox + 16, oy + 20);

    const eMax = this.specNai ? this.specNai.eMax : 1600;
    let yMax = 8;
    [this.specNai, this.specHpge].forEach(function (spec) {
      if (!spec || !spec.bins) return;
      for (let i = 0; i < spec.bins.length; i++) if (spec.bins[i] > yMax) yMax = spec.bins[i];
    });
    yMax *= 1.12;

    ctx.fillStyle = '#0a1122';
    ctx.fillRect(plotX, plotY, plotW, plotH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(plotX + 0.5, plotY + 0.5, plotW - 1, plotH - 1);

    function xOf(E) { return plotX + (E / eMax) * plotW; }
    function yOf(c) { return plotY + plotH - (c / yMax) * plotH; }

    // NaI filled
    drawHist(ctx, this.specNai, plotX, plotY, plotW, plotH, yMax, 'rgba(56, 189, 248, 0.55)');
    // HPGe outline/fill
    drawHist(ctx, this.specHpge, plotX, plotY, plotW, plotH, yMax, 'rgba(74, 222, 128, 0.75)');

    const src = getSource(this.state.sourceId);
    const naiPeaks = peakInfo(src, this.state.naiRes);
    const hpgePeaks = peakInfo(src, this.state.hpgeRes);

    for (let i = 0; i < naiPeaks.length; i++) {
      const p = naiPeaks[i];
      marker(ctx, xOf(p.E), plotY, plotH, '#38bdf8', Math.round(p.E) + ' keV');
      fwhmBracket(ctx, xOf(p.E - p.fwhm / 2), xOf(p.E + p.fwhm / 2), plotY + plotH - 12, '#38bdf8');
    }
    for (let i = 0; i < hpgePeaks.length; i++) {
      const p = hpgePeaks[i];
      fwhmBracket(ctx, xOf(p.E - p.fwhm / 2), xOf(p.E + p.fwhm / 2), plotY + plotH - 22, '#4ade80');
    }

    // Legend + R callout
    const p0 = src.lines[0];
    const fN = fwhmKeV(p0.E, this.state.naiRes);
    const fH = fwhmKeV(p0.E, this.state.hpgeRes);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('NaI  R≈' + ((100 * fN) / p0.E).toFixed(1) + '%  FWHM=' + fN.toFixed(1) + ' keV', plotX, oy + 20);
    ctx.fillStyle = '#4ade80';
    ctx.fillText('HPGe R≈' + ((100 * fH) / p0.E).toFixed(2) + '%  FWHM=' + fH.toFixed(2) + ' keV', plotX + plotW * 0.42, oy + 20);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Energy (keV)', plotX + plotW / 2, oy + H - 8);
    ctx.textAlign = 'left';

    const step = eMax <= 800 ? 100 : 200;
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    for (let e = 0; e <= eMax; e += step) {
      const tx = xOf(e);
      ctx.strokeStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(tx, plotY + plotH);
      ctx.lineTo(tx, plotY + plotH + 4);
      ctx.stroke();
      ctx.fillText(String(e), tx, plotY + plotH + 14);
    }
    ctx.textAlign = 'left';

    const nN = this.specNai ? this.specNai.counts : 0;
    const nH = this.specHpge ? this.specHpge.counts : 0;
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('Events NaI ' + nN + ' · HPGe ' + nH, plotX + plotW - 160, plotY - 8);
  }
}

function drawHist(ctx, spec, plotX, plotY, plotW, plotH, yMax, color) {
  if (!spec || !spec.bins) return;
  const bins = spec.bins;
  const bw = plotW / bins.length;
  ctx.fillStyle = color;
  for (let i = 0; i < bins.length; i++) {
    const c = bins[i];
    if (c <= 0) continue;
    const h = (c / yMax) * plotH;
    ctx.fillRect(plotX + i * bw, plotY + plotH - h, Math.max(1, bw * 0.95), h);
  }
}

function marker(ctx, x, plotY, plotH, color, label) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(x, plotY + 4);
  ctx.lineTo(x, plotY + plotH);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = color;
  ctx.font = '9px system-ui,sans-serif';
  ctx.save();
  ctx.translate(x + 3, plotY + 40);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(label, 0, 0);
  ctx.restore();
}

function fwhmBracket(ctx, xa, xb, y, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(xa, y);
  ctx.lineTo(xb, y);
  ctx.moveTo(xa, y - 3);
  ctx.lineTo(xa, y + 3);
  ctx.moveTo(xb, y - 3);
  ctx.lineTo(xb, y + 3);
  ctx.stroke();
}

function drawFlash(ctx, x0, y0, x1, y1, t, pulse, color) {
  const gx = x0 + (x1 - x0) * t;
  const gy = y0 + (y1 - y0) * t;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.55 + pulse * 0.35;
  ctx.beginPath();
  ctx.arc(gx, gy, 3.5 + pulse * 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
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
