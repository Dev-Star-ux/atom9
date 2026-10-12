/** Forced EM resonance — function generator + series RLC + ammeter. */
import { createDualCanvas } from '../common/teachPlots.js';
import {
  f0, currentAmp, qualityFactor, resonanceCurve, phaseAngle,
} from './physics.js';

export class ForcedEmResonanceScene2D {
  constructor(host) {
    this.state = { V: 10, R: 10, L: 0.05, C: 1e-6, f: 700 };
    var self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.V != null) this.state.V = p.V;
    if (p.R != null) this.state.R = p.R;
    if (p.L != null) this.state.L = p.L;
    if (p.C != null) this.state.C = p.C;
    if (p.f != null) this.state.f = p.f;
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

    var schemH = Math.floor((H - captionH) * 0.38);
    this._drawSchematic(ctx, captionH, W, schemH, phase);
    this._drawCurve(ctx, 0, captionH + schemH + 4, W, H - captionH - schemH - 4, phase);
  }

  _drawCaption(ctx, W, H) {
    ctx.fillStyle = 'rgba(15, 35, 40, 0.92)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(45,212,191,0.55)';
    ctx.beginPath();
    ctx.moveTo(0, H - 0.5);
    ctx.lineTo(W, H - 0.5);
    ctx.stroke();

    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#2dd4bf';
    ctx.font = '700 15px system-ui,sans-serif';
    var line1 = 'LAB: Series RLC on a function generator (forced resonance bench)';
    var line2 = 'Why: at f₀ the reactances cancel → impedance is just R → current peaks.';
    var line3 = 'Try: sweep drive f through f₀; lower R for a taller, sharper peak (higher Q).';
    if (H >= 58) {
      ctx.fillText(line1, 14, H * 0.22);
      ctx.font = '600 12px system-ui,sans-serif';
      ctx.fillStyle = '#5eead4';
      ctx.fillText(line2, 14, H * 0.52);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(line3, 14, H * 0.78);
    } else {
      ctx.fillText(line1, 14, H / 2);
    }
    ctx.textBaseline = 'alphabetic';
  }

  _drawSuccessBanner(ctx, W, y, text) {
    var bw = Math.min(220, W - 24);
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

    var V = this.state.V;
    var R = this.state.R;
    var L = this.state.L;
    var C = this.state.C;
    var f = this.state.f;
    var fres = f0(L, C);
    var w = 2 * Math.PI * f;
    var I = currentAmp(V, R, w, L, C);
    var Q = qualityFactor(L, C, R);
    var nearRes = Math.abs(f - fres) / Math.max(fres, 1) < 0.08;

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 12px system-ui,sans-serif';
    ctx.fillText(
      'f₀ = ' + fres.toFixed(0) + ' Hz   I = ' + I.toFixed(3) + ' A   Q = ' + Q.toFixed(1),
      16, 18
    );
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText(
      'f = ' + f.toFixed(0) + ' Hz · V = ' + V.toFixed(1) + ' V · R = ' + R.toFixed(0) + ' Ω',
      16, 36
    );
    ctx.fillStyle = '#5eead4';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.fillText('Peak taller when R is smaller (higher Q)', 16, 52);

    if (nearRes) {
      this._drawSuccessBanner(ctx, W, 8, '★ ON RESONANCE');
    }

    // Circuit loop
    var y = H * 0.72;
    var x0 = W * 0.06;
    var x1 = W * 0.94;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x0, y - 44);
    ctx.lineTo(x1, y - 44);
    ctx.lineTo(x1, y);
    ctx.stroke();

    // Function generator box + AC symbol
    var sx = x0 + (x1 - x0) * 0.14;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.fillRect(sx - 48, y - 70, 96, 36);
    ctx.strokeRect(sx - 48, y - 70, 96, 36);
    ctx.fillStyle = '#fbbf24';
    ctx.font = '700 10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('function generator', sx, y - 56);
    ctx.strokeStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(sx, y - 44, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    var i;
    for (i = 0; i <= 16; i++) {
      var tt = i / 16;
      var xx = sx - 8 + tt * 16;
      var yy = y - 44 - Math.sin(tt * Math.PI * 2) * 5;
      if (i === 0) ctx.moveTo(xx, yy);
      else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
    ctx.fillStyle = '#fde68a';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText(V.toFixed(1) + ' V · ' + f.toFixed(0) + ' Hz', sx, y - 78);

    // R zigzag
    var rx = x0 + (x1 - x0) * 0.36;
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rx - 24, y);
    for (i = 0; i < 5; i++) {
      ctx.lineTo(rx - 18 + i * 8, y + ((i % 2 === 0) ? -10 : 10));
    }
    ctx.lineTo(rx + 24, y);
    ctx.stroke();
    ctx.fillStyle = '#f87171';
    ctx.font = '700 11px system-ui,sans-serif';
    ctx.fillText('R', rx, y + 22);
    ctx.fillStyle = '#fca5a5';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText(R.toFixed(0) + ' Ω', rx, y + 36);

    // L coil
    var lx = x0 + (x1 - x0) * 0.54;
    ctx.strokeStyle = '#60a5fa';
    ctx.beginPath();
    for (i = 0; i < 4; i++) {
      ctx.arc(lx - 12 + i * 10, y, 6, Math.PI, 0, false);
    }
    ctx.stroke();
    ctx.fillStyle = '#60a5fa';
    ctx.font = '700 11px system-ui,sans-serif';
    ctx.fillText('L', lx, y + 22);
    ctx.fillStyle = '#93c5fd';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText(L.toFixed(3) + ' H', lx, y + 36);

    // C plates
    var cx = x0 + (x1 - x0) * 0.70;
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx - 8, y - 16);
    ctx.lineTo(cx - 8, y + 16);
    ctx.moveTo(cx + 8, y - 16);
    ctx.lineTo(cx + 8, y + 16);
    ctx.stroke();
    ctx.fillStyle = '#34d399';
    ctx.font = '700 11px system-ui,sans-serif';
    ctx.fillText('C', cx, y + 28);
    ctx.fillStyle = '#6ee7b7';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText((C * 1e6).toFixed(2) + ' µF', cx, y + 42);

    // Ammeter in series on return path
    var ax = x0 + (x1 - x0) * 0.88;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(ax, y - 44, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#2dd4bf';
    ctx.font = '700 11px system-ui,sans-serif';
    ctx.fillText('A', ax, y - 40);
    ctx.fillStyle = '#5eead4';
    ctx.font = '700 10px system-ui,sans-serif';
    ctx.fillText('ammeter', ax, y - 66);
    ctx.fillText(I.toFixed(3) + ' A', ax, y - 22);

    if (nearRes) {
      ctx.strokeStyle = 'rgba(45,212,191,' + (0.35 + 0.25 * Math.sin(phase * 8)).toFixed(3) + ')';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x0 + 20, y);
      ctx.lineTo(x1 - 20, y);
      ctx.stroke();
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('Tune the generator frequency through f₀ — ammeter reading peaks on resonance.', 16, H - 8);
    ctx.restore();
  }

  _drawCurve(ctx, ox, oy, W, H, phase) {
    var padL = 52;
    var padR = 16;
    var padT = 44;
    var padB = 36;
    var halfW = Math.floor(W * 0.55);
    var plotX = ox + padL;
    var plotY = oy + padT;
    var plotW = halfW - padL - padR;
    var plotH = H - padT - padB;

    var V = this.state.V;
    var R = this.state.R;
    var L = this.state.L;
    var C = this.state.C;
    var f = this.state.f;
    var fres = f0(L, C);
    var fMin = Math.max(50, fres * 0.2);
    var fMax = fres * 2.5;
    var pts = resonanceCurve(V, R, L, C, fMin, fMax, 100);
    var w = 2 * Math.PI * f;
    var Inow = currentAmp(V, R, w, L, C);

    var yMax = 0.01;
    var i;
    for (i = 0; i < pts.length; i++) {
      if (pts[i].I > yMax) yMax = pts[i].I;
    }
    yMax = Math.max(yMax * 1.1, Inow * 1.15, 0.01);

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.fillText('I vs f  (resonance curve)', ox + 16, oy + 18);

    ctx.fillStyle = '#0a1122';
    ctx.fillRect(plotX, plotY, plotW, plotH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(plotX + 0.5, plotY + 0.5, plotW - 1, plotH - 1);

    function X(ff) { return plotX + ((ff - fMin) / (fMax - fMin)) * plotW; }
    function Y(ii) { return plotY + plotH - Math.max(0, Math.min(1, ii / yMax)) * plotH; }

    ctx.strokeStyle = 'rgba(251,191,36,0.7)';
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(X(fres), plotY);
    ctx.lineTo(X(fres), plotY + plotH);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#fbbf24';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('f₀', X(fres) + 4, plotY + 12);

    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (i = 0; i < pts.length; i++) {
      var px = X(pts[i].f);
      var py = Y(pts[i].I);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    var fMark = Math.max(fMin, Math.min(fMax, f));
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.arc(X(fMark), Y(Inow), 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('f (Hz) →', plotX + plotW / 2, oy + H - 8);
    ctx.textAlign = 'left';
    ctx.save();
    ctx.translate(ox + 14, plotY + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('I (A)', 0, 0);
    ctx.restore();

    // Time domain
    var tx0 = ox + halfW + 10;
    var tw = W - halfW - 24;
    var ty0 = plotY;
    var th = plotH;
    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.fillText('v(t) & i(t)', tx0, oy + 18);

    ctx.fillStyle = '#0a1122';
    ctx.fillRect(tx0, ty0, tw, th);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(tx0 + 0.5, ty0 + 0.5, tw - 1, th - 1);

    var midY = ty0 + th / 2;
    var phi = phaseAngle(R, w, L, C);
    var Vamp = th * 0.32;
    var Iamp = th * 0.32 * Math.min(1, Inow / Math.max(yMax, 1e-6));
    var tAnim = phase * 0.5;

    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (i = 0; i <= 60; i++) {
      var t = i / 60;
      var x = tx0 + t * tw;
      var y = midY - Vamp * Math.sin(2 * Math.PI * t + tAnim);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.strokeStyle = '#2dd4bf';
    ctx.beginPath();
    for (i = 0; i <= 60; i++) {
      var t2 = i / 60;
      var x2 = tx0 + t2 * tw;
      var y2 = midY - Iamp * Math.sin(2 * Math.PI * t2 + tAnim - phi);
      if (i === 0) ctx.moveTo(x2, y2);
      else ctx.lineTo(x2, y2);
    }
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('v', tx0 + 6, ty0 + 14);
    ctx.fillStyle = '#2dd4bf';
    ctx.fillText('i', tx0 + 24, ty0 + 14);
  }
}
