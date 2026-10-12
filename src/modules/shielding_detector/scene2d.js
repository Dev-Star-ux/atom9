/** Shielding + detector attenuation teaching canvas. */
import { createDualCanvas } from '../common/teachPlots.js';
import {
  getMaterial,
  getRadKind,
  transmission,
  countRate,
  curvePoints,
  hvlCm,
  muCm,
} from './physics.js';

export class ShieldingDetector2D {
  constructor(host) {
    this.state = {
      materialId: 'lead',
      radId: 'gamma',
      thicknessCm: 2,
      I0: 1000,
    };
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.materialId != null) this.state.materialId = p.materialId;
    if (p.radId != null) this.state.radId = p.radId;
    if (p.thicknessCm != null) this.state.thicknessCm = p.thicknessCm;
    if (p.I0 != null) this.state.I0 = p.I0;
  }

  setPaused(v) { this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _draw(ctx, W, H, phase) {
    if (!W || !H) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);

    const schemH = Math.min(140, Math.floor(H * 0.32));
    this._drawBeam(ctx, W, schemH, phase);
    this._drawCurve(ctx, 0, schemH + 4, W, H - schemH - 4);
  }

  _drawBeam(ctx, W, H, phase) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
    ctx.beginPath();
    ctx.moveTo(0, H - 0.5);
    ctx.lineTo(W, H - 0.5);
    ctx.stroke();

    const mat = getMaterial(this.state.materialId);
    const rad = getRadKind(this.state.radId);
    const T = transmission(this.state.materialId, this.state.radId, this.state.thicknessCm);
    const rate = countRate(this.state.I0, this.state.materialId, this.state.radId, this.state.thicknessCm);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.fillText('Source → shield → detector   ·   I/I₀ = e^(−μx)', 16, 18);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(
      rad.label + ' through ' + mat.name + ' · μ ≈ ' + muCm(this.state.materialId, this.state.radId).toFixed(3) +
      ' cm⁻¹ · T = ' + (100 * T).toFixed(2) + '% · rate ≈ ' + rate.toFixed(1) + ' /s',
      16, 38
    );

    const y = H * 0.65;
    const xSrc = W * 0.1;
    const xSh0 = W * 0.38;
    const shW = Math.min(120, 28 + this.state.thicknessCm * 12);
    const xDet = W * 0.82;

    // Source
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(xSrc, y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(rad.name + ' source', xSrc, y + 28);

    // Shield slab
    ctx.fillStyle = mat.color;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(xSh0, y - 40, shW, 80);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = mat.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(xSh0 + 0.5, y - 40.5, shW - 1, 79);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 11px system-ui,sans-serif';
    ctx.fillText(mat.name, xSh0 + shW / 2, y - 8);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText(this.state.thicknessCm.toFixed(1) + ' cm', xSh0 + shW / 2, y + 10);

    // Detector
    ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    roundRect(ctx, xDet - 36, y - 22, 72, 44, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#38bdf8';
    ctx.font = '700 11px system-ui,sans-serif';
    ctx.fillText('Detector', xDet, y + 4);
    ctx.textAlign = 'left';

    // Beam particles
    const nFlash = 5;
    for (let i = 0; i < nFlash; i++) {
      const t = (phase * 0.4 + i / nFlash) % 1;
      let x;
      let alpha;
      if (t < 0.45) {
        x = xSrc + 14 + (xSh0 - xSrc - 14) * (t / 0.45);
        alpha = 0.85;
      } else if (t < 0.7) {
        x = xSh0 + shW * ((t - 0.45) / 0.25);
        alpha = 0.85 * Math.pow(T, 0.5) * (1 - (t - 0.45) / 0.25 * (1 - T));
      } else {
        // Deterministic transmission: only first ~T·nFlash particles continue
        if (i / nFlash > T) continue;
        x = xSh0 + shW + (xDet - 36 - xSh0 - shW) * ((t - 0.7) / 0.3);
        alpha = 0.3 + 0.55 * T;
      }
      ctx.fillStyle = rad.id === 'neutron' ? '#a78bfa' : rad.id === 'alpha' ? '#f87171' : '#67e8f9';
      ctx.globalAlpha = Math.max(0.1, alpha);
      ctx.beginPath();
      ctx.arc(x, y + Math.sin(i * 1.7) * 6, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('Ties to Lab Canvas: same exponential attenuation law', 16, H - 8);
  }

  _drawCurve(ctx, ox, oy, W, H) {
    const padL = 52;
    const padR = 20;
    const padT = 36;
    const padB = 42;
    const plotX = ox + padL;
    const plotY = oy + padT;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const xMax = Math.max(8, this.state.thicknessCm * 2.5);
    const pts = curvePoints(this.state.materialId, this.state.radId, xMax, 100);
    const T = transmission(this.state.materialId, this.state.radId, this.state.thicknessCm);
    const hvl = hvlCm(this.state.materialId, this.state.radId);

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 14px system-ui,sans-serif';
    ctx.fillText('Transmission & count rate vs thickness', ox + 16, oy + 22);

    ctx.fillStyle = '#0a1122';
    ctx.fillRect(plotX, plotY, plotW, plotH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(plotX + 0.5, plotY + 0.5, plotW - 1, plotH - 1);

    function X(x) { return plotX + (x / xMax) * plotW; }
    function Y(t) { return plotY + plotH - t * plotH; }

    // HVL marker
    if (isFinite(hvl) && hvl < xMax) {
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(X(hvl), plotY);
      ctx.lineTo(X(hvl), plotY + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#fbbf24';
      ctx.font = '10px system-ui,sans-serif';
      ctx.fillText('HVL ' + hvl.toFixed(2) + ' cm', X(hvl) + 4, plotY + 14);
    }

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const px = X(pts[i].x);
      const py = Y(pts[i].T);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Operating point
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(X(this.state.thicknessCm), Y(T), 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('thickness x (cm) →', plotX + plotW / 2, oy + H - 10);
    ctx.textAlign = 'left';
    ctx.save();
    ctx.translate(14, plotY + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('I / I₀', 0, 0);
    ctx.restore();

    const rate = countRate(this.state.I0, this.state.materialId, this.state.radId, this.state.thicknessCm);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(
      'I/I₀ = ' + T.toExponential(2) + '   ·   count rate ≈ ' + rate.toFixed(1) + ' /s (I₀=' + this.state.I0 + ')',
      plotX, oy + 20
    );
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
