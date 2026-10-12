/** Faraday disc dynamo — spinning disc, axial B, radial EMF, ε vs ω plot. */
import { createDualCanvas } from '../common/teachPlots.js';
import { emf, current, emfVsOmega } from './physics.js';

export class FaradayDiscScene2D {
  constructor(host) {
    this.state = { B: 0.5, omega: 50, R: 0.1, Rload: 10 };
    this._angle = 0;
    var self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.B != null) this.state.B = p.B;
    if (p.omega != null) this.state.omega = p.omega;
    if (p.R != null) this.state.R = p.R;
    if (p.Rload != null) this.state.Rload = p.Rload;
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

    var schemH = Math.floor((H - captionH) * 0.62);
    this._drawSchematic(ctx, captionH, W, schemH, phase);
    this._drawCurve(ctx, 0, captionH + schemH + 4, W, H - captionH - schemH - 4);
  }

  _drawCaption(ctx, W, H) {
    ctx.fillStyle = 'rgba(30, 25, 20, 0.92)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(251,191,36,0.55)';
    ctx.beginPath();
    ctx.moveTo(0, H - 0.5);
    ctx.lineTo(W, H - 0.5);
    ctx.stroke();

    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fbbf24';
    ctx.font = '700 15px system-ui,sans-serif';
    var line1 = 'LAB: Faraday disc (homopolar generator) — spinning metal disc in axial B';
    var line2 = 'Why: spin makes a radial voltage ε = ½ B ω R² between hub and rim.';
    var line3 = 'Try: raise ω or R or B — watch ε and I through the load resistor.';
    if (H >= 58) {
      ctx.fillText(line1, 14, H * 0.22);
      ctx.font = '600 12px system-ui,sans-serif';
      ctx.fillStyle = '#fde68a';
      ctx.fillText(line2, 14, H * 0.52);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(line3, 14, H * 0.78);
    } else {
      ctx.fillText(line1, 14, H / 2);
    }
    ctx.textBaseline = 'alphabetic';
  }

  _drawSuccessBanner(ctx, W, y, text) {
    var bw = Math.min(320, W - 24);
    var bx = W - bw - 12;
    ctx.fillStyle = 'rgba(16, 185, 129, 0.92)';
    ctx.fillRect(bx, y, bw, 26);
    ctx.strokeStyle = '#6ee7b7';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx + 0.5, y + 0.5, bw - 1, 25);
    ctx.fillStyle = '#ecfdf5';
    ctx.font = '700 12px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + bw / 2, y + 13);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  _drawResistor(ctx, x, y, w) {
    // Zigzag resistor symbol
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    var segs = 6;
    var i;
    for (i = 0; i < segs; i++) {
      var xx = x + ((i + 1) / (segs + 1)) * w;
      var yy = y + ((i % 2 === 0) ? -10 : 10);
      ctx.lineTo(xx, yy);
    }
    ctx.lineTo(x + w, y);
    ctx.stroke();
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

    var B = this.state.B;
    var omega = this.state.omega;
    var R = this.state.R;
    var Rload = this.state.Rload;
    var eps = emf(B, omega, R);
    var I = current(B, omega, R, Rload);
    this._angle += omega * 0.002;

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.fillText('ε = ' + eps.toFixed(4) + ' V', 16, 20);
    ctx.fillStyle = '#67e8f9';
    ctx.fillText('I = ' + I.toFixed(4) + ' A', 170, 20);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText(
      'B = ' + B.toFixed(2) + ' T · ω = ' + omega.toFixed(0) +
      ' rad/s · R = ' + R.toFixed(2) + ' m · R_load = ' + Rload.toFixed(0) + ' Ω',
      16, 38
    );

    this._drawSuccessBanner(
      ctx, W, 8,
      'GENERATING  ε=' + eps.toFixed(3) + ' V  I=' + I.toFixed(3) + ' A'
    );

    var cx = W * 0.32;
    var cy = H * 0.58;
    var discR = Math.min(W, H) * 0.18 * (0.7 + R / 0.3);

    // B into page marks
    var i;
    for (i = 0; i < 8; i++) {
      var a = (i / 8) * Math.PI * 2 + 0.2;
      var rr = discR * 0.55;
      var bx = cx + Math.cos(a) * rr;
      var by = cy + Math.sin(a) * rr;
      ctx.strokeStyle = 'rgba(167,139,250,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bx - 4, by - 4);
      ctx.lineTo(bx + 4, by + 4);
      ctx.moveTo(bx + 4, by - 4);
      ctx.lineTo(bx - 4, by + 4);
      ctx.stroke();
    }
    ctx.fillStyle = '#a78bfa';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('B ⊗ into page', cx - discR - 8, cy - discR - 10);

    // Disc
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.arc(cx, cy, discR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Spokes
    ctx.strokeStyle = 'rgba(226,232,240,0.5)';
    ctx.lineWidth = 1;
    for (i = 0; i < 6; i++) {
      var sa = this._angle + (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sa) * discR, cy + Math.sin(sa) * discR);
      ctx.stroke();
    }

    // Hub brush
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fdba74';
    ctx.font = '700 10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('hub brush', cx, cy + discR + 18);

    // Rim brush
    var rimX = cx + discR;
    ctx.fillStyle = '#f97316';
    ctx.fillRect(rimX - 4, cy - 12, 12, 24);
    ctx.fillStyle = '#fdba74';
    ctx.fillText('rim brush', rimX + 36, cy + 4);

    // Radial current
    ctx.strokeStyle = '#22d3ee';
    ctx.fillStyle = '#22d3ee';
    ctx.lineWidth = 2;
    for (i = 0; i < 4; i++) {
      var ra = this._angle * 0.3 + (i / 4) * Math.PI * 2;
      var r0 = 12;
      var r1 = discR - 8;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ra) * r0, cy + Math.sin(ra) * r0);
      ctx.lineTo(cx + Math.cos(ra) * r1, cy + Math.sin(ra) * r1);
      ctx.stroke();
    }
    ctx.font = '11px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('I radial', cx - 18, cy - discR - 24);

    // Load circuit on the right: wires + R_load zigzag + meters
    var loadX = W * 0.58;
    var loadY = cy;
    var loadW = 70;

    // Wire from hub up and across
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - discR - 36);
    ctx.lineTo(loadX + loadW / 2, cy - discR - 36);
    ctx.lineTo(loadX + loadW / 2, loadY - 28);
    ctx.stroke();
    // Wire from rim across
    ctx.beginPath();
    ctx.moveTo(rimX + 8, cy);
    ctx.lineTo(loadX + loadW / 2, cy);
    ctx.lineTo(loadX + loadW / 2, loadY + 28);
    ctx.stroke();

    // Resistor between the two vertical stubs
    this._drawResistor(ctx, loadX, loadY, loadW);
    ctx.fillStyle = '#f97316';
    ctx.font = '700 12px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('R_load  (load)', loadX + loadW / 2, loadY + 28);
    ctx.fillStyle = '#fdba74';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText(Rload.toFixed(0) + ' Ω', loadX + loadW / 2, loadY + 44);

    // Meter box
    var mx = W * 0.78;
    var my = cy - 50;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.fillRect(mx, my, 110, 100);
    ctx.strokeRect(mx, my, 110, 100);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('voltmeter', mx + 10, my + 18);
    ctx.fillStyle = '#fbbf24';
    ctx.font = '700 15px system-ui,sans-serif';
    ctx.fillText(eps.toFixed(3) + ' V', mx + 10, my + 42);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('ammeter', mx + 10, my + 64);
    ctx.fillStyle = '#67e8f9';
    ctx.font = '700 15px system-ui,sans-serif';
    ctx.fillText(I.toFixed(3) + ' A', mx + 10, my + 88);

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('Hub brush ↔ rim brush through the load closes the circuit (classic Faraday disk).', 16, H - 8);
    ctx.restore();
  }

  _drawCurve(ctx, ox, oy, W, H) {
    var padL = 52;
    var padR = 20;
    var padT = 48;
    var padB = 40;
    var plotX = ox + padL;
    var plotY = oy + padT;
    var plotW = W - padL - padR;
    var plotH = H - padT - padB;

    var B = this.state.B;
    var omega = this.state.omega;
    var R = this.state.R;
    var omegaMax = 200;
    var pts = emfVsOmega(B, R, omegaMax, 80);
    var eps = emf(B, omega, R);

    var yMax = 0.01;
    var i;
    for (i = 0; i < pts.length; i++) {
      if (pts[i].emf > yMax) yMax = pts[i].emf;
    }
    yMax = Math.max(yMax * 1.15, eps * 1.2, 0.001);

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.fillText('EMF ε vs angular speed ω', ox + 16, oy + 20);

    ctx.fillStyle = '#0a1122';
    ctx.fillRect(plotX, plotY, plotW, plotH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(plotX + 0.5, plotY + 0.5, plotW - 1, plotH - 1);

    function X(w) { return plotX + (w / omegaMax) * plotW; }
    function Y(e) { return plotY + plotH - Math.max(0, Math.min(1, e / yMax)) * plotH; }

    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (i = 0; i < pts.length; i++) {
      var px = X(pts[i].omega);
      var py = Y(pts[i].emf);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.fillStyle = '#67e8f9';
    ctx.beginPath();
    ctx.arc(X(omega), Y(eps), 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ω (rad/s) →', plotX + plotW / 2, oy + H - 10);
    ctx.textAlign = 'left';
    ctx.save();
    ctx.translate(14, plotY + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('ε (V)', 0, 0);
    ctx.restore();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText('ε = ½ B ω R² = ' + eps.toFixed(4) + ' V', plotX, oy + 38);
  }
}
