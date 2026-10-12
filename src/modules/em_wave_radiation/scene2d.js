/** EM wave radiation — oscillating dipole, expanding fronts, figure-8 pattern. */
import { createDualCanvas } from '../common/teachPlots.js';
import {
  wavelength, farFieldDistance, patternSamples, waveFrontRadii, patternSinTheta,
} from './physics.js';

export class EmWaveRadiationScene2D {
  constructor(host) {
    this.state = {
      frequency: 1e8,
      amplitude: 0.8,
      showNearFar: 1,
    };
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.frequency != null) this.state.frequency = p.frequency;
    if (p.amplitude != null) this.state.amplitude = p.amplitude;
    if (p.showNearFar != null) this.state.showNearFar = p.showNearFar;
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

    const schemH = Math.floor((H - captionH) * 0.7);
    this._drawSchematic(ctx, captionH, W, schemH, phase);
    this._drawPattern(ctx, 0, captionH + schemH + 4, W, H - captionH - schemH - 4);
  }

  _drawCaption(ctx, W, H) {
    const radiating = this.state.amplitude > 0.05;
    ctx.fillStyle = radiating ? 'rgba(22, 101, 52, 0.95)' : 'rgba(120, 53, 15, 0.92)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = radiating ? '#4ade80' : '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, H - 0.5);
    ctx.lineTo(W, H - 0.5);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 16px system-ui,sans-serif';
    const line1 = radiating
      ? 'RADIATING — max broadside, nulls on axis'
      : 'Raise amplitude — short dipole needs accelerating charge to radiate';
    ctx.fillText(line1, 14, H * 0.38);
    ctx.fillStyle = radiating ? '#bbf7d0' : '#fde68a';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.fillText(
      'Lab setup: short dipole antenna on RF feed  ·  turn Frequency & Amplitude',
      14, H * 0.72
    );
    ctx.textBaseline = 'alphabetic';
  }

  _drawSchematic(ctx, top, W, H, phase) {
    ctx.save();
    ctx.translate(0, top);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
    ctx.beginPath();
    ctx.moveTo(0, H - 0.5);
    ctx.lineTo(W, H - 0.5);
    ctx.stroke();

    const f = this.state.frequency;
    const amp = this.state.amplitude;
    const lam = wavelength(f);
    const rff = farFieldDistance(f);
    const fMHz = f / 1e6;
    const osc = Math.sin(phase * 2.2);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 14px system-ui,sans-serif';
    ctx.fillText('Short dipole antenna lab — RF feed drives ±q oscillation', 16, 20);

    ctx.font = '700 13px system-ui,sans-serif';
    ctx.fillStyle = '#67e8f9';
    ctx.fillText(
      'f = ' + fMHz.toFixed(0) + ' MHz   ·   λ = ' + lam.toFixed(2) + ' m   ·   r_far ≈ 2λ = ' + rff.toFixed(2) + ' m',
      16, 42
    );

    const cx = W * 0.36;
    const cy = H * 0.58;
    const maxR = Math.min(W * 0.28, H * 0.36);

    if (this.state.showNearFar > 0.5) {
      const rNear = maxR * 0.35;
      ctx.strokeStyle = 'rgba(251,191,36,0.55)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, rNear, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#fbbf24';
      ctx.font = '10px system-ui,sans-serif';
      ctx.fillText('near | far', cx + rNear + 6, cy - 4);
    }

    const fronts = waveFrontRadii(phase, 6, amp);
    let rPrev = null;
    for (let i = 0; i < fronts.length; i++) {
      const fr = fronts[i];
      const R = fr.radius * maxR;
      ctx.beginPath();
      for (let j = 0; j <= 64; j++) {
        const th = (j / 64) * Math.PI * 2;
        const theta = th - Math.PI / 2;
        const pat = 0.25 + 0.75 * patternSinTheta(theta);
        const rr = R * pat;
        const x = cx + Math.cos(th) * rr;
        const y = cy + Math.sin(th) * rr;
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(56,189,248,' + (0.15 + 0.55 * fr.alpha).toFixed(3) + ')';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // λ ruler between consecutive wavefronts (along broadside, +x)
      if (rPrev != null && fr.alpha > 0.25) {
        const yR = cy - maxR * 0.55;
        const x0 = cx + rPrev;
        const x1 = cx + R;
        if (x1 - x0 > 18) {
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x0, yR);
          ctx.lineTo(x1, yR);
          ctx.moveTo(x0, yR - 4);
          ctx.lineTo(x0, yR + 4);
          ctx.moveTo(x1, yR - 4);
          ctx.lineTo(x1, yR + 4);
          ctx.stroke();
          ctx.fillStyle = '#fde68a';
          ctx.font = '700 11px system-ui,sans-serif';
          ctx.fillText('λ', (x0 + x1) / 2 - 4, yR - 8);
        }
      }
      rPrev = R;
    }

    // Short dipole antenna
    const half = 28 + 18 * amp;
    const stretch = 1 + 0.12 * osc * amp;
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy - half * stretch);
    ctx.lineTo(cx, cy + half * stretch);
    ctx.stroke();

    // RF feed gap + coax stub
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 5, cy - 6, 10, 12);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 5, cy - 6, 10, 12);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 6);
    ctx.lineTo(cx, cy + 36);
    ctx.stroke();
    ctx.fillStyle = '#38bdf8';
    ctx.font = '700 11px system-ui,sans-serif';
    ctx.fillText('RF feed', cx - 22, cy + 52);

    ctx.fillStyle = osc > 0 ? '#f87171' : '#60a5fa';
    ctx.beginPath();
    ctx.arc(cx, cy - half * stretch + 4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = osc > 0 ? '#60a5fa' : '#f87171';
    ctx.beginPath();
    ctx.arc(cx, cy + half * stretch - 4, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 12px system-ui,sans-serif';
    ctx.fillText('short dipole antenna', cx - 58, cy - half * stretch - 14);

    // Null callouts on axis
    ctx.fillStyle = '#f87171';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.fillText('no radiation along the wire', cx - 70, cy - half * stretch - 30);
    ctx.beginPath();
    ctx.moveTo(cx, cy - half * stretch - 8);
    ctx.lineTo(cx, cy - half * stretch - 22);
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const sx = W * 0.70;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('What to turn:', sx, H * 0.32);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('Frequency → changes λ', sx, H * 0.32 + 18);
    ctx.fillText('Amplitude → stronger waves', sx, H * 0.32 + 36);
    ctx.fillStyle = '#4ade80';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.fillText('Good: bright lobes left/right', sx, H * 0.32 + 58);
    ctx.fillText('(broadside), dark on wire axis', sx, H * 0.32 + 74);

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('Figure-8 pattern: energy flows broadside — none along the dipole wire.', 16, H - 8);
    ctx.restore();
  }

  _drawPattern(ctx, ox, oy, W, H) {
    const padL = 52;
    const padR = 20;
    const padT = 48;
    const padB = 36;
    const plotX = ox + padL;
    const plotY = oy + padT;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '700 14px system-ui,sans-serif';
    ctx.fillText('where energy goes (figure-8)', ox + 16, oy + 22);

    ctx.fillStyle = '#0a1122';
    ctx.fillRect(plotX, plotY, plotW, plotH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(plotX + 0.5, plotY + 0.5, plotW - 1, plotH - 1);

    const cx = plotX + plotW * 0.35;
    const cy = plotY + plotH / 2;
    const R = Math.min(plotW * 0.28, plotH * 0.42);

    ctx.strokeStyle = 'rgba(100,116,139,0.5)';
    ctx.beginPath();
    ctx.moveTo(cx - R - 10, cy);
    ctx.lineTo(cx + R + 10, cy);
    ctx.moveTo(cx, cy - R - 10);
    ctx.lineTo(cx, cy + R + 10);
    ctx.stroke();

    const pts = patternSamples(96);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const th = pts[i].theta;
      const r = pts[i].r * R;
      const x = cx + r * Math.sin(th);
      const y = cy - r * Math.cos(th);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let i = pts.length - 1; i >= 0; i--) {
      const th = -pts[i].theta;
      const r = pts[i].r * R;
      const x = cx + r * Math.sin(th);
      const y = cy - r * Math.cos(th);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = 'rgba(56,189,248,0.12)';
    ctx.fill();

    // Null markers on axis
    ctx.fillStyle = '#f87171';
    ctx.beginPath();
    ctx.arc(cx, cy - R - 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy + R + 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.fillText('null — no radiation along the wire', cx - 90, cy - R - 14);
    ctx.fillText('null', cx - 14, cy + R + 16);

    ctx.fillStyle = '#4ade80';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('θ=90° max (broadside)', cx + R + 8, cy + 4);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('polar angle θ (dipole axis vertical)', plotX + plotW * 0.35, oy + H - 10);
    ctx.textAlign = 'left';

    const lx = plotX + plotW * 0.62;
    const ly = plotY + 16;
    const lw = plotW * 0.34;
    const lh = plotH - 32;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(lx, ly, lw, lh);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(lx, ly, lw, lh);
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const th = (i / 60) * Math.PI;
      const px = lx + (i / 60) * lw;
      const py = ly + lh - patternSinTheta(th) * lh * 0.9 - lh * 0.05;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('|sin θ| vs θ', lx + 6, ly + 14);
    ctx.fillText('0', lx + 2, ly + lh + 12);
    ctx.fillText('π', lx + lw - 10, ly + lh + 12);
    ctx.fillText('intensity', lx - 2, ly - 4);
  }
}
