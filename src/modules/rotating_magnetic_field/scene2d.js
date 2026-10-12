/** Rotating magnetic field — 3-phase stator, rotor bar, B_rot trail. */
import { createDualCanvas } from '../common/teachPlots.js';
import {
  phaseComponents, resultantB, idealMagnitude, omegaFromFreq,
} from './physics.js';

export class RotatingMagneticFieldScene2D {
  constructor(host) {
    this.state = { freq: 50, B0: 1, showComponents: 1 };
    this._t = 0;
    this._trail = [];
    var self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.freq != null) this.state.freq = p.freq;
    if (p.B0 != null) this.state.B0 = p.B0;
    if (p.showComponents != null) this.state.showComponents = p.showComponents;
  }

  setPaused(v) { this._canvas.setPaused(v); }
  setActive(v) { this._active = !!v; }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _draw(ctx, W, H, phase) {
    if (!W || !H) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);

    var captionH = Math.min(68, Math.floor(H * 0.18));
    this._drawCaption(ctx, W, captionH);

    var schemH = Math.floor((H - captionH) * 0.70);
    this._drawSchematic(ctx, captionH, W, schemH, phase);
    this._drawReadout(ctx, 0, captionH + schemH + 4, W, H - captionH - schemH - 4);
  }

  _drawCaption(ctx, W, H) {
    ctx.fillStyle = 'rgba(20, 28, 50, 0.92)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(167,139,250,0.55)';
    ctx.beginPath();
    ctx.moveTo(0, H - 0.5);
    ctx.lineTo(W, H - 0.5);
    ctx.stroke();

    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c4b5fd';
    ctx.font = '700 15px system-ui,sans-serif';
    var line1 = 'LAB: Three-phase stator (induction-motor field) — rotating B';
    var line2 = 'Why: three coils 120° apart make a magnetic field that spins at supply frequency.';
    var line3 = 'Try: change f or B₀; toggle phase components On/Off — watch the rotor follow B_rot.';
    if (H >= 58) {
      ctx.fillText(line1, 14, H * 0.22);
      ctx.font = '600 12px system-ui,sans-serif';
      ctx.fillStyle = '#ddd6fe';
      ctx.fillText(line2, 14, H * 0.52);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(line3, 14, H * 0.78);
    } else {
      ctx.fillText(line1, 14, H / 2);
    }
    ctx.textBaseline = 'alphabetic';
  }

  _drawSuccessBanner(ctx, W, y, text) {
    var bw = Math.min(360, W - 24);
    var bx = W - bw - 12;
    ctx.fillStyle = 'rgba(16, 185, 129, 0.92)';
    ctx.fillRect(bx, y, bw, 26);
    ctx.strokeStyle = '#6ee7b7';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx + 0.5, y + 0.5, bw - 1, 25);
    ctx.fillStyle = '#ecfdf5';
    ctx.font = '700 11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + bw / 2, y + 13);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  _drawCoilWinding(ctx, cx, cy, R, ang, color, label) {
    // Arc winding on stator ring
    var a0 = ang - 0.35;
    var a1 = ang + 0.35;
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, R - 4, a0, a1);
    ctx.stroke();
    // Coil body bump
    var mx = cx + Math.cos(ang) * (R + 14);
    var my = cy + Math.sin(ang) * (R + 14);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(mx, my, 14, 8, ang, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, mx, my);
    ctx.textAlign = 'left';
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

    var freq = this.state.freq;
    var B0 = this.state.B0;
    var showComponents = this.state.showComponents;
    var omega = omegaFromFreq(freq);
    this._t += 0.02 * (freq / 50);
    var t = this._t;
    var res = resultantB(B0, omega, t);
    var comps = phaseComponents(B0, omega, t);
    var Brot = idealMagnitude(B0);
    var magOk = Math.abs(res.mag - Brot) / Math.max(Brot, 1e-6) < 0.12;

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.fillText('|B_rot| = ' + res.mag.toFixed(2) + ' T', 16, 20);
    ctx.fillStyle = '#a78bfa';
    ctx.fillText('ideal 1.5 B₀ = ' + Brot.toFixed(2) + ' T', 170, 20);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('B₀ = ' + B0.toFixed(2) + ' T · f = ' + freq.toFixed(0) + ' Hz', 16, 38);

    if (magOk) {
      this._drawSuccessBanner(ctx, W, 8, '|B| ≈ 1.5 B₀ — rotating magnetic field');
    }

    var cx = W * 0.40;
    var cy = H * 0.58;
    var R = Math.min(W, H) * 0.26;

    // Stator ring
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R - 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('stator', cx - R - 8, cy - R - 8);

    var axes = [
      { ang: 0, label: 'Phase A', short: 'A', color: '#f87171', val: comps.Ba },
      { ang: (120 * Math.PI) / 180, label: 'Phase B', short: 'B', color: '#34d399', val: comps.Bb },
      { ang: (-120 * Math.PI) / 180, label: 'Phase C', short: 'C', color: '#60a5fa', val: comps.Bc },
    ];

    var i;
    for (i = 0; i < axes.length; i++) {
      this._drawCoilWinding(ctx, cx, cy, R, axes[i].ang, axes[i].color, axes[i].short);
      ctx.fillStyle = axes[i].color;
      ctx.font = '700 11px system-ui,sans-serif';
      var lx = cx + Math.cos(axes[i].ang) * (R + 36);
      var ly = cy + Math.sin(axes[i].ang) * (R + 36);
      ctx.fillText(axes[i].label, lx - 22, ly);
    }

    // Component arrows
    if (showComponents >= 0.5) {
      for (i = 0; i < axes.length; i++) {
        var a = axes[i];
        var len = (a.val / Math.max(B0, 1e-6)) * R * 0.65;
        this._arrow(
          ctx, cx, cy,
          cx + Math.cos(a.ang) * len,
          cy + Math.sin(a.ang) * len,
          a.color, 2
        );
      }
    }

    // Resultant + trail of tip
    var rScale = R * 0.85 / Math.max(Brot, 1e-6);
    var rx = cx + res.Bx * rScale;
    var ry = cy + res.By * rScale;

    this._trail.push({ x: rx, y: ry });
    if (this._trail.length > 90) this._trail.shift();

    ctx.strokeStyle = 'rgba(232,121,249,0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (i = 0; i < this._trail.length; i++) {
      if (i === 0) ctx.moveTo(this._trail[i].x, this._trail[i].y);
      else ctx.lineTo(this._trail[i].x, this._trail[i].y);
    }
    ctx.stroke();

    // Ideal circle guide
    ctx.strokeStyle = 'rgba(167,139,250,0.25)';
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, Brot * rScale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    this._arrow(ctx, cx, cy, rx, ry, '#e879f9', 3.5);
    ctx.fillStyle = '#e879f9';
    ctx.font = '700 12px system-ui,sans-serif';
    ctx.fillText('B_rot', rx + 8, ry);

    // Rotor bar following B
    var rotorAng = Math.atan2(res.By, res.Bx);
    var half = 22;
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(rotorAng) * half, cy - Math.sin(rotorAng) * half);
    ctx.lineTo(cx + Math.cos(rotorAng) * half, cy + Math.sin(rotorAng) * half);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = '#fde047';
    ctx.font = '700 10px system-ui,sans-serif';
    ctx.fillText('rotor', cx - 14, cy + R + 28);

    // Legend readouts
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillStyle = '#f87171';
    ctx.fillText('B_a = ' + comps.Ba.toFixed(2) + ' T', W * 0.72, H * 0.40);
    ctx.fillStyle = '#34d399';
    ctx.fillText('B_b = ' + comps.Bb.toFixed(2) + ' T', W * 0.72, H * 0.50);
    ctx.fillStyle = '#60a5fa';
    ctx.fillText('B_c = ' + comps.Bc.toFixed(2) + ' T', W * 0.72, H * 0.60);
    ctx.fillStyle = '#e879f9';
    ctx.fillText('tip trail = |B| path', W * 0.72, H * 0.70);

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('Same rotating field that turns an induction-motor rotor.', 16, H - 8);
    ctx.restore();
  }

  _arrow(ctx, x0, y0, x1, y1, color, lw) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lw || 2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    var ang = Math.atan2(y1 - y0, x1 - x0);
    var ah = 8;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - ah * Math.cos(ang - 0.4), y1 - ah * Math.sin(ang - 0.4));
    ctx.lineTo(x1 - ah * Math.cos(ang + 0.4), y1 - ah * Math.sin(ang + 0.4));
    ctx.closePath();
    ctx.fill();
  }

  _drawReadout(ctx, ox, oy, W, H) {
    var freq = this.state.freq;
    var B0 = this.state.B0;
    var Brot = idealMagnitude(B0);
    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.fillText('Balanced 3-phase: |B| stays ≈ 1.5 B₀ while direction spins at f', ox + 16, oy + 22);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(
      'f = ' + freq.toFixed(0) + ' Hz   ·   B₀ = ' + B0.toFixed(2) +
      ' T   ·   |B_rot| = ' + Brot.toFixed(2) + ' T',
      ox + 16, oy + 48
    );
  }
}
