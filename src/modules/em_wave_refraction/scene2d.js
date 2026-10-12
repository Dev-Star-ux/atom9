/** EM wave refraction — wavefronts at dielectric interface + Snell plot. */
import { createDualCanvas } from '../common/teachPlots.js';
import {
  degToRad, radToDeg, snellTheta2, criticalAngle, reflectance, snellResidual, theta2VsTheta1,
} from './physics.js';

export class EmWaveRefractionScene2D {
  constructor(host) {
    this.state = { n1: 1.0, n2: 1.5, theta1: 30 };
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.n1 != null) this.state.n1 = p.n1;
    if (p.n2 != null) this.state.n2 = p.n2;
    if (p.theta1 != null) this.state.theta1 = p.theta1;
  }

  setPaused(v) { this._canvas.setPaused(v); }
  setActive(v) { this._active = !!v; }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _draw(ctx, W, H, phase) {
    if (!W || !H) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);

    const captionH = Math.min(52, Math.floor(H * 0.14));
    this._drawCaption(ctx, W, captionH);

    const schemH = Math.floor((H - captionH) * 0.68);
    this._drawSchematic(ctx, captionH, W, schemH, phase);
    this._drawCurve(ctx, 0, captionH + schemH + 4, W, H - captionH - schemH - 4);
  }

  _drawCaption(ctx, W, H) {
    const n1 = this.state.n1;
    const n2 = this.state.n2;
    const th1 = degToRad(this.state.theta1);
    const th2 = snellTheta2(n1, n2, th1);
    const tir = th2 == null;
    const resid = tir ? NaN : snellResidual(n1, n2, th1, th2);
    const snellOk = !tir && !isNaN(resid) && Math.abs(resid) < 1e-6;

    if (tir) {
      ctx.fillStyle = 'rgba(127, 29, 29, 0.96)';
    } else if (snellOk) {
      ctx.fillStyle = 'rgba(22, 101, 52, 0.95)';
    } else {
      ctx.fillStyle = 'rgba(120, 53, 15, 0.92)';
    }
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = tir ? '#f87171' : (snellOk ? '#4ade80' : '#fbbf24');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, H - 0.5);
    ctx.lineTo(W, H - 0.5);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 16px system-ui,sans-serif';
    var line1;
    if (tir) line1 = 'TOTAL INTERNAL REFLECTION — no refracted ray (θ₁ past critical)';
    else if (snellOk) line1 = 'REFRACTION OK — Snell satisfied, both reflection + refraction';
    else line1 = 'Adjust n₁, n₂, θ₁ — watch θ₂ and the Snell check';
    ctx.fillText(line1, 14, H * 0.38);
    ctx.fillStyle = tir ? '#fecaca' : '#bbf7d0';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.fillText(
      'Dielectric interface lab  ·  turn Index n₁ / n₂ and Incidence θ₁',
      14, H * 0.72
    );
    ctx.textBaseline = 'alphabetic';
  }

  _drawSchematic(ctx, top, W, H, phase) {
    ctx.save();
    ctx.translate(0, top);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 0, W, H);

    const n1 = this.state.n1;
    const n2 = this.state.n2;
    const th1 = degToRad(this.state.theta1);
    const th2 = snellTheta2(n1, n2, th1);
    const R = reflectance(n1, n2, th1);
    const resid = th2 == null ? NaN : snellResidual(n1, n2, th1, th2);
    const crit = criticalAngle(n1, n2);
    const airGlass = Math.abs(n1 - 1.0) < 0.08 && Math.abs(n2 - 1.5) < 0.12;

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 14px system-ui,sans-serif';
    ctx.fillText('Dielectric interface — incident / reflected / refracted rays', 16, 18);

    ctx.font = '700 13px system-ui,sans-serif';
    ctx.fillStyle = '#67e8f9';
    ctx.fillText('θ₁ = ' + this.state.theta1.toFixed(1) + '°', 16, 40);
    ctx.fillStyle = '#34d399';
    const th2txt = th2 == null ? 'TIR' : radToDeg(th2).toFixed(1) + '°';
    ctx.fillText('θ₂ = ' + th2txt, 130, 40);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(
      'Snell check ≈ 0 means OK: ' + (isNaN(resid) ? '—' : resid.toExponential(2)),
      240, 40
    );
    ctx.fillStyle = '#a78bfa';
    ctx.fillText('R ≈ ' + (R * 100).toFixed(0) + '%', 520, 40);

    const midY = H * 0.55;
    ctx.fillStyle = 'rgba(56,189,248,0.08)';
    ctx.fillRect(0, 70, W, midY - 70);
    ctx.fillStyle = 'rgba(52,211,153,0.10)';
    ctx.fillRect(0, midY, W, H - midY);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(W, midY);
    ctx.stroke();

    ctx.fillStyle = '#67e8f9';
    ctx.font = '700 12px system-ui,sans-serif';
    ctx.fillText('Medium 1 (n₁) = ' + n1.toFixed(2), 16, 92);
    ctx.fillStyle = '#34d399';
    ctx.fillText('Medium 2 (n₂) = ' + n2.toFixed(2), 16, midY + 22);
    if (airGlass) {
      ctx.fillStyle = '#fde68a';
      ctx.font = '600 11px system-ui,sans-serif';
      ctx.fillText('suggested: air → glass', 200, 92);
    }

    const ix = W * 0.45;
    const iy = midY;

    ctx.strokeStyle = 'rgba(148,163,184,0.5)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(ix, midY - 90);
    ctx.lineTo(ix, midY + 90);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('normal', ix + 6, midY - 94);

    const L = Math.min(W, H) * 0.32;
    const ix0 = ix - Math.sin(th1) * L;
    const iy0 = iy - Math.cos(th1) * L;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(ix0, iy0);
    ctx.lineTo(ix, iy);
    ctx.stroke();
    this._arrow(ctx, ix0, iy0, ix, iy, '#38bdf8');
    ctx.fillStyle = '#7dd3fc';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('incident', ix0 - 10, iy0 - 8);

    const rx1 = ix + Math.sin(th1) * L * 0.9;
    const ry1 = iy - Math.cos(th1) * L * 0.9;
    ctx.strokeStyle = 'rgba(167,139,250,' + (0.35 + 0.55 * R).toFixed(3) + ')';
    ctx.beginPath();
    ctx.moveTo(ix, iy);
    ctx.lineTo(rx1, ry1);
    ctx.stroke();
    this._arrow(ctx, ix, iy, rx1, ry1, '#a78bfa');
    ctx.fillStyle = '#c4b5fd';
    ctx.fillText('reflected', rx1 - 10, ry1 - 8);

    if (th2 != null) {
      const tx1 = ix + Math.sin(th2) * L;
      const ty1 = iy + Math.cos(th2) * L;
      ctx.strokeStyle = '#34d399';
      ctx.beginPath();
      ctx.moveTo(ix, iy);
      ctx.lineTo(tx1, ty1);
      ctx.stroke();
      this._arrow(ctx, ix, iy, tx1, ty1, '#34d399');
      ctx.fillStyle = '#6ee7b7';
      ctx.fillText('refracted', tx1 - 10, ty1 + 16);
    } else {
      // Big TIR banner in schematic
      ctx.fillStyle = 'rgba(185, 28, 28, 0.85)';
      ctx.fillRect(ix + 16, midY + 28, 260, 44);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.strokeRect(ix + 16, midY + 28, 260, 44);
      ctx.fillStyle = '#fef2f2';
      ctx.font = '800 14px system-ui,sans-serif';
      ctx.fillText('TOTAL INTERNAL REFLECTION', ix + 28, midY + 48);
      if (crit != null) {
        ctx.font = '600 12px system-ui,sans-serif';
        ctx.fillStyle = '#fde68a';
        ctx.fillText('θ_c = ' + radToDeg(crit).toFixed(1) + '° — lower θ₁ or raise n₂', ix + 28, midY + 66);
      }
    }

    const nFront = 5;
    for (let i = 0; i < nFront; i++) {
      const t = ((phase * 0.12 + i / nFront) % 1);
      const px = ix0 + (ix - ix0) * t;
      const py = iy0 + (iy - iy0) * t;
      const dx = ix - ix0;
      const dy = iy - iy0;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / len * 10;
      const ny = dx / len * 10;
      ctx.strokeStyle = 'rgba(56,189,248,' + (0.3 + 0.5 * (1 - t)).toFixed(3) + ')';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px - nx, py - ny);
      ctx.lineTo(px + nx, py + ny);
      ctx.stroke();
    }

    // Angle arcs with θ₁ / θ₂ labels
    const arcR = 36;
    ctx.strokeStyle = 'rgba(56,189,248,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ix, iy, arcR, -Math.PI / 2, -Math.PI / 2 + th1, false);
    ctx.stroke();
    ctx.fillStyle = '#7dd3fc';
    ctx.font = '700 12px system-ui,sans-serif';
    const a1 = -Math.PI / 2 + th1 * 0.5;
    ctx.fillText('θ₁', ix + Math.cos(a1) * (arcR + 10) - 6, iy + Math.sin(a1) * (arcR + 10) + 4);

    if (th2 != null) {
      ctx.strokeStyle = 'rgba(52,211,153,0.85)';
      ctx.beginPath();
      ctx.arc(ix, iy, arcR, Math.PI / 2 - th2, Math.PI / 2, false);
      ctx.stroke();
      ctx.fillStyle = '#6ee7b7';
      const a2 = Math.PI / 2 - th2 * 0.5;
      ctx.fillText('θ₂', ix + Math.cos(a2) * (arcR + 10) - 6, iy + Math.sin(a2) * (arcR + 10) + 4);
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('Good look: green refracted ray + Snell check near 0. Red banner = TIR.', 16, H - 8);
    ctx.restore();
  }

  _arrow(ctx, x0, y0, x1, y1, color) {
    const ang = Math.atan2(y1 - y0, x1 - x0);
    const s = 8;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - s * Math.cos(ang - 0.4), y1 - s * Math.sin(ang - 0.4));
    ctx.lineTo(x1 - s * Math.cos(ang + 0.4), y1 - s * Math.sin(ang + 0.4));
    ctx.closePath();
    ctx.fill();
  }

  _drawCurve(ctx, ox, oy, W, H) {
    const padL = 52;
    const padR = 20;
    const padT = 48;
    const padB = 40;
    const plotX = ox + padL;
    const plotY = oy + padT;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const pts = theta2VsTheta1(this.state.n1, this.state.n2, 90);
    const th1 = this.state.theta1;
    const th2 = snellTheta2(this.state.n1, this.state.n2, degToRad(th1));
    const crit = criticalAngle(this.state.n1, this.state.n2);

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '700 14px system-ui,sans-serif';
    ctx.fillText('θ₂ vs θ₁ (Snell) — mark critical angle; missing = TIR', ox + 16, oy + 22);

    ctx.fillStyle = '#0a1122';
    ctx.fillRect(plotX, plotY, plotW, plotH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(plotX + 0.5, plotY + 0.5, plotW - 1, plotH - 1);

    function X(deg) { return plotX + (deg / 90) * plotW; }
    function Y(deg) { return plotY + plotH - (deg / 90) * plotH; }

    ctx.strokeStyle = 'rgba(100,116,139,0.4)';
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(X(0), Y(0));
    ctx.lineTo(X(90), Y(90));
    ctx.stroke();
    ctx.setLineDash([]);

    // Critical angle marker
    if (crit != null) {
      const cDeg = radToDeg(crit);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(X(cDeg), plotY);
      ctx.lineTo(X(cDeg), plotY + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#fbbf24';
      ctx.font = '700 11px system-ui,sans-serif';
      ctx.fillText('θ_c = ' + cDeg.toFixed(1) + '°', X(cDeg) + 4, plotY + 14);
    }

    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < pts.length; i++) {
      if (pts[i].theta2Deg == null) {
        started = false;
        continue;
      }
      const px = X(pts[i].theta1Deg);
      const py = Y(pts[i].theta2Deg);
      if (!started) { ctx.moveTo(px, py); started = true; }
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    if (th2 != null) {
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(X(th1), Y(radToDeg(th2)), 6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#f87171';
      ctx.beginPath();
      ctx.arc(X(th1), plotY + 10, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '700 11px system-ui,sans-serif';
      ctx.fillText('TIR', X(th1) + 8, plotY + 14);
    }

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('θ₁ (degrees) →', plotX + plotW / 2, oy + H - 10);
    ctx.textAlign = 'left';
    ctx.save();
    ctx.translate(14, plotY + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('θ₂ (degrees)', 0, 0);
    ctx.restore();
  }
}
