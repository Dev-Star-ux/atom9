/** AC power factor — motor load, wattmeter, phasors, power triangle. */
import { createDualCanvas } from '../common/teachPlots.js';
import {
  realPower, reactivePower, apparentPower, powerFactor, degToRad,
} from './physics.js';

var GOOD_PF_DEG = 25;

export class AcPowerFactorScene2D {
  constructor(host) {
    this.state = { Vrms: 120, Irms: 10, phiDeg: 36 };
    var self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.Vrms != null) this.state.Vrms = p.Vrms;
    if (p.Irms != null) this.state.Irms = p.Irms;
    if (p.phiDeg != null) this.state.phiDeg = p.phiDeg;
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

    var schemH = Math.floor((H - captionH) * 0.66);
    this._drawSchematic(ctx, captionH, W, schemH, phase);
    this._drawTriangle(ctx, 0, captionH + schemH + 4, W, H - captionH - schemH - 4);
  }

  _drawCaption(ctx, W, H) {
    ctx.fillStyle = 'rgba(25, 30, 50, 0.92)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(96,165,250,0.55)';
    ctx.beginPath();
    ctx.moveTo(0, H - 0.5);
    ctx.lineTo(W, H - 0.5);
    ctx.stroke();

    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#60a5fa';
    ctx.font = '700 15px system-ui,sans-serif';
    var line1 = 'LAB: AC motor on the mains — lagging power factor (wattmeter bench)';
    var line2 = 'Why: induction motors make current LAG voltage → less real power for the same VA.';
    var line3 = 'Try: lower φ toward 0° for good PF; raise φ to see poor lagging PF.';
    if (H >= 58) {
      ctx.fillText(line1, 14, H * 0.22);
      ctx.font = '600 12px system-ui,sans-serif';
      ctx.fillStyle = '#93c5fd';
      ctx.fillText(line2, 14, H * 0.52);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(line3, 14, H * 0.78);
    } else {
      ctx.fillText(line1, 14, H / 2);
    }
    ctx.textBaseline = 'alphabetic';
  }

  _drawSuccessBanner(ctx, W, y, text, good) {
    var bw = Math.min(340, W - 24);
    var bx = W - bw - 12;
    ctx.fillStyle = good ? 'rgba(16, 185, 129, 0.92)' : 'rgba(245, 158, 11, 0.92)';
    ctx.fillRect(bx, y, bw, 26);
    ctx.strokeStyle = good ? '#6ee7b7' : '#fcd34d';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx + 0.5, y + 0.5, bw - 1, 25);
    ctx.fillStyle = good ? '#ecfdf5' : '#1c1917';
    ctx.font = '700 11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + bw / 2, y + 13);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  _drawMotorIcon(ctx, x, y) {
    ctx.strokeStyle = '#94a3b8';
    ctx.fillStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Shaft
    ctx.fillStyle = '#64748b';
    ctx.fillRect(x + 18, y - 4, 16, 8);
    // Rotor bar
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 10, y);
    ctx.lineTo(x + 10, y);
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('motor', x, y + 38);
    ctx.textAlign = 'left';
  }

  _drawAcSource(ctx, x, y) {
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    var i;
    for (i = 0; i <= 16; i++) {
      var t = i / 16;
      var xx = x - 10 + t * 20;
      var yy = y - Math.sin(t * Math.PI * 2) * 6;
      if (i === 0) ctx.moveTo(xx, yy);
      else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.font = '700 10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AC source', x, y + 30);
    ctx.textAlign = 'left';
  }

  _drawWattmeter(ctx, x, y, P) {
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 1.5;
    ctx.fillRect(x, y, 88, 48);
    ctx.strokeRect(x, y, 88, 48);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('wattmeter', x + 8, y + 14);
    ctx.fillStyle = '#34d399';
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.fillText(P.toFixed(0) + ' W', x + 8, y + 36);
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

    var Vrms = this.state.Vrms;
    var Irms = this.state.Irms;
    var phiDeg = this.state.phiDeg;
    var phi = degToRad(phiDeg);
    var pf = powerFactor(Vrms, Irms, phi);
    var P = realPower(Vrms, Irms, phi);
    var good = phiDeg <= GOOD_PF_DEG;

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.fillText('cosφ = ' + pf.toFixed(3), 16, 20);
    ctx.fillStyle = '#34d399';
    ctx.fillText('P = ' + P.toFixed(0) + ' W', 140, 20);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('φ = ' + phiDeg.toFixed(0) + '° lag', 260, 20);

    if (good) {
      this._drawSuccessBanner(ctx, W, 8, 'GOOD POWER FACTOR (cosφ ≈ 1)', true);
    } else {
      this._drawSuccessBanner(ctx, W, 8, 'POOR PF — motor lagging', false);
    }

    // Apparatus strip: AC → wattmeter → motor
    var ay = H * 0.28;
    this._drawAcSource(ctx, W * 0.10, ay);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(W * 0.10 + 18, ay);
    ctx.lineTo(W * 0.22, ay);
    ctx.stroke();
    this._drawWattmeter(ctx, W * 0.22, ay - 24, P);
    ctx.beginPath();
    ctx.moveTo(W * 0.22 + 88, ay);
    ctx.lineTo(W * 0.42, ay);
    ctx.stroke();
    this._drawMotorIcon(ctx, W * 0.48, ay);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText(
      'Vrms = ' + Vrms.toFixed(0) + ' V · Irms = ' + Irms.toFixed(1) + ' A  (lag only)',
      W * 0.58, ay + 6
    );

    // Phasor meter
    var px = W * 0.22;
    var py = H * 0.68;
    var scale = Math.min(W, H) * 0.11;
    var Vlen = scale * 1.4;
    var Ilen = scale * 1.1;

    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.fillRect(px - scale * 1.8, py - scale * 1.7, scale * 3.8, scale * 3.4);
    ctx.strokeRect(px - scale * 1.8, py - scale * 1.7, scale * 3.8, scale * 3.4);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('phasor meter', px, py - scale * 1.5);
    ctx.textAlign = 'left';

    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(px - scale * 1.5, py);
    ctx.lineTo(px + scale * 1.6, py);
    ctx.moveTo(px, py + scale * 1.2);
    ctx.lineTo(px, py - scale * 1.4);
    ctx.stroke();

    this._arrow(ctx, px, py, px + Vlen, py, '#60a5fa', 2.5);
    ctx.fillStyle = '#60a5fa';
    ctx.font = '700 12px system-ui,sans-serif';
    ctx.fillText('V', px + Vlen + 6, py - 4);

    var ix = px + Ilen * Math.cos(-phi);
    var iy = py - Ilen * Math.sin(-phi);
    this._arrow(ctx, px, py, ix, iy, '#f472b6', 2.5);
    ctx.fillStyle = '#f472b6';
    ctx.fillText('I (lags)', ix + 6, iy);

    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px, py, 26, 0, -phi, true);
    ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('φ', px + 30, py - 6);

    // Time domain
    var tx0 = W * 0.48;
    var tw = W * 0.46;
    var ty0 = H * 0.42;
    var th = H * 0.48;
    ctx.fillStyle = '#0a1122';
    ctx.fillRect(tx0, ty0, tw, th);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(tx0 + 0.5, ty0 + 0.5, tw - 1, th - 1);

    var midY = ty0 + th / 2;
    ctx.strokeStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(tx0, midY);
    ctx.lineTo(tx0 + tw, midY);
    ctx.stroke();

    var omega = 2 * Math.PI;
    var tAnim = phase * 0.4;
    var Vamp = th * 0.35;
    var Iamp = th * 0.28;
    var j;

    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (j = 0; j <= 80; j++) {
      var t = j / 80;
      var x = tx0 + t * tw;
      var y = midY - Vamp * Math.sin(omega * t + tAnim);
      if (j === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.strokeStyle = '#f472b6';
    ctx.beginPath();
    for (j = 0; j <= 80; j++) {
      var t2 = j / 80;
      var x2 = tx0 + t2 * tw;
      var y2 = midY - Iamp * Math.sin(omega * t2 + tAnim - phi);
      if (j === 0) ctx.moveTo(x2, y2);
      else ctx.lineTo(x2, y2);
    }
    ctx.stroke();

    ctx.fillStyle = '#60a5fa';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('v(t)', tx0 + 8, ty0 + 16);
    ctx.fillStyle = '#f472b6';
    ctx.fillText('i(t) lags by φ', tx0 + 48, ty0 + 16);

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('This slider is lag-only (motor-like). Smaller φ → better power factor.', 16, H - 8);
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

  _drawTriangle(ctx, ox, oy, W, H) {
    var Vrms = this.state.Vrms;
    var Irms = this.state.Irms;
    var phiDeg = this.state.phiDeg;
    var phi = degToRad(phiDeg);
    var P = realPower(Vrms, Irms, phi);
    var Q = reactivePower(Vrms, Irms, phi);
    var S = apparentPower(Vrms, Irms);

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.fillText('Power triangle: S² = P² + Q²', ox + 16, oy + 18);

    var cx = ox + W * 0.35;
    var cy = oy + H * 0.78;
    var scale = Math.min(W * 0.25, H * 0.55) / Math.max(S, 1);

    var Px = P * scale;
    var Qy = Q * scale;

    ctx.strokeStyle = '#34d399';
    ctx.fillStyle = 'rgba(52,211,153,0.15)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Px, cy);
    ctx.lineTo(cx + Px, cy - Qy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#34d399';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText('P = ' + P.toFixed(0) + ' W', cx + Px / 2 - 20, cy + 16);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('Q = ' + Q.toFixed(0) + ' VAR', cx + Px + 8, cy - Qy / 2);
    ctx.fillStyle = '#60a5fa';
    ctx.fillText('S = ' + S.toFixed(0) + ' VA', cx + Px / 2 - 10, cy - Qy - 8);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(
      'Vrms=' + Vrms.toFixed(0) + ' V  Irms=' + Irms.toFixed(1) +
      ' A  φ=' + phiDeg.toFixed(0) + '° lag  cosφ=' + powerFactor(Vrms, Irms, phi).toFixed(3),
      ox + W * 0.55, oy + H * 0.45
    );
  }
}
