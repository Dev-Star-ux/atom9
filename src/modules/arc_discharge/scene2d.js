/** Electric arc discharge teaching canvas: electrode gap + falling V–I curve. */
import { createDualCanvas } from '../common/teachPlots.js';
import { arcVoltage, arcPower, curvePoints, A0, B0, C0, D0 } from './physics.js';

export class ArcDischargeScene2D {
  constructor(host) {
    this.state = {
      I: 50,
      L: 0.5,
    };
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.I != null) this.state.I = p.I;
    if (p.L != null) this.state.L = p.L;
  }

  setPaused(v) { this._canvas.setPaused(v); }
  setActive(v) { this._active = !!v; }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _draw(ctx, W, H, phase) {
    if (!W || !H) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);

    const capH = this._drawCaption(ctx, W);
    const bodyH = H - capH;
    const schemH = Math.floor(bodyH * 0.7);
    ctx.save();
    ctx.translate(0, capH);
    this._drawArc(ctx, W, schemH, phase);
    ctx.restore();
    this._drawCurve(ctx, 0, capH + schemH + 4, W, bodyH - schemH - 4);
  }

  /** Bold persistent caption strip stating the counterintuitive fact plainly. */
  _drawCaption(ctx, W) {
    const I = this.state.I;
    const L = this.state.L;
    const V = arcVoltage(I, L, A0, B0, C0, D0);
    const capH = 40;

    ctx.fillStyle = 'rgba(127, 29, 29, 0.35)';
    ctx.fillRect(0, 0, W, capH);
    ctx.strokeStyle = 'rgba(248, 113, 113, 0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, capH - 0.5);
    ctx.lineTo(W, capH - 0.5);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#fecaca';
    ctx.font = '700 16px system-ui,sans-serif';
    ctx.fillText(
      'As current I rises, arc voltage V FALLS (negative differential resistance) — opposite to a normal resistor!',
      14, capH / 2 - 8
    );
    ctx.fillStyle = '#fde68a';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.fillText(
      'Right now: I = ' + I.toFixed(0) + ' A → V ≈ ' + V.toFixed(1) + ' V',
      14, capH / 2 + 12
    );
    return capH;
  }

  _drawArc(ctx, W, H, phase) {
    ctx.fillStyle = 'rgba(15, 12, 8, 0.92)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
    ctx.beginPath();
    ctx.moveTo(0, H - 0.5);
    ctx.lineTo(W, H - 0.5);
    ctx.stroke();

    const I = this.state.I;
    const L = this.state.L;
    const V = arcVoltage(I, L, A0, B0, C0, D0);
    const P = arcPower(V, I);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.fillText('Electrode gap · sustained thermal-ionization channel', 16, 16);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(
      'I = ' + I.toFixed(0) + ' A · L = ' + L.toFixed(2) + ' cm · V ≈ ' + V.toFixed(1) + ' V',
      16, 34
    );
    ctx.fillStyle = '#fbbf24';
    ctx.font = '700 14px system-ui,sans-serif';
    ctx.fillText(
      'Power P = V × I ≈ ' + (P / 1000).toFixed(2) + ' kW  (this is why arcs are hot & bright)',
      16, 52
    );

    const midY = H * 0.62;
    // Gap span scales mildly with L so bigger gaps visibly separate the tips.
    const gapPx = Math.min(W * 0.55, 60 + L * 70);
    const cx = W / 2;
    const xL = cx - gapPx / 2;
    const xR = cx + gapPx / 2;

    // Electrode rods (angled tips pointing at each other), simple carbon/metal rod look.
    this._drawElectrode(ctx, xL, midY, +1);
    this._drawElectrode(ctx, xR, midY, -1);

    // Arc channel brightness/thickness scale with current and power.
    const bright = Math.min(1, 0.25 + I / 220);
    const thickness = Math.min(14, 2 + I / 26);

    this._drawArcChannel(ctx, xL + 14, xR - 14, midY, bright, thickness, phase, I);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Negative differential resistance: raising I lowers V (over this range).', 16, H - 8);
  }

  _drawElectrode(ctx, xTip, y, dir) {
    // dir = +1 means rod body extends to the left of the tip (rod on left side); -1 to the right.
    const rodLen = 64;
    const rodW = 20;
    const x0 = xTip - dir * rodLen;
    ctx.fillStyle = '#71717a';
    ctx.beginPath();
    ctx.moveTo(x0, y - rodW / 2);
    ctx.lineTo(xTip - dir * 10, y - rodW / 2);
    ctx.lineTo(xTip, y);
    ctx.lineTo(xTip - dir * 10, y + rodW / 2);
    ctx.lineTo(x0, y + rodW / 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#3f3f46';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Hot tip glow
    const grd = ctx.createRadialGradient(xTip, y, 1, xTip, y, 16);
    grd.addColorStop(0, 'rgba(255, 220, 150, 0.9)');
    grd.addColorStop(1, 'rgba(255, 140, 40, 0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(xTip, y, 16, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawArcChannel(ctx, x0, x1, y, bright, thickness, phase, I) {
    const nSeg = 20;
    const pts = [];
    for (let i = 0; i <= nSeg; i++) {
      const t = i / nSeg;
      const x = x0 + (x1 - x0) * t;
      // Deterministic smooth flicker: sum of a few phase-driven sinusoids at
      // different spatial/temporal frequencies (not per-frame randomness).
      const jitter =
        Math.sin(phase * 9 + t * 14) * 5 +
        Math.sin(phase * 23 + t * 7 + 1.3) * 3 +
        Math.sin(phase * 5.5 - t * 19 + 2.1) * 2.5;
      const envelope = Math.sin(Math.PI * t); // pin ends at electrodes
      pts.push({ x: x, y: y + jitter * envelope * (0.5 + I / 300) });
    }

    // Outer glow (orange/blue fringe)
    ctx.save();
    ctx.globalAlpha = bright * 0.5;
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = thickness * 2.4;
    ctx.lineCap = 'round';
    this._strokePath(ctx, pts);

    ctx.globalAlpha = bright * 0.7;
    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = thickness * 1.5;
    this._strokePath(ctx, pts);

    // White-hot core
    ctx.globalAlpha = Math.min(1, bright + 0.25);
    ctx.strokeStyle = '#fffdf2';
    ctx.lineWidth = Math.max(1.5, thickness * 0.5);
    this._strokePath(ctx, pts);
    ctx.restore();
  }

  _strokePath(ctx, pts) {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      if (i === 0) ctx.moveTo(pts[i].x, pts[i].y);
      else ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
  }

  _drawCurve(ctx, ox, oy, W, H) {
    const padL = 52;
    const padR = 20;
    const padT = 50;
    const padB = 42;
    const plotX = ox + padL;
    const plotY = oy + padT;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const I = this.state.I;
    const L = this.state.L;
    const IMax = 320;
    const pts = curvePoints(L, 2, IMax, 100, A0, B0, C0, D0);
    const V = arcVoltage(I, L, A0, B0, C0, D0);
    const P = arcPower(V, I);

    let vMax = 1;
    for (let i = 0; i < pts.length; i++) if (pts[i].V > vMax) vMax = pts[i].V;
    vMax *= 1.1;

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 14px system-ui,sans-serif';
    ctx.fillText('Falling V–I arc characteristic (gap L = ' + L.toFixed(2) + ' cm)', ox + 16, oy + 22);

    ctx.fillStyle = '#0a1122';
    ctx.fillRect(plotX, plotY, plotW, plotH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(plotX + 0.5, plotY + 0.5, plotW - 1, plotH - 1);

    function X(i) { return plotX + (i / IMax) * plotW; }
    function Y(v) { return plotY + plotH - (v / vMax) * plotH; }

    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const px = X(pts[i].I);
      const py = Y(pts[i].V);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Operating point
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(X(I), Y(V), 6, 0, Math.PI * 2);
    ctx.fill();

    // Explicit annotation calling out the falling slope, away from the
    // operating point so it stays legible regardless of I.
    const annI = Math.max(30, Math.min(IMax - 60, I < IMax * 0.5 ? IMax * 0.7 : IMax * 0.2));
    const ax0 = X(annI);
    const ay0 = Y(arcVoltage(annI, L, A0, B0, C0, D0));
    const ax1 = X(Math.min(IMax, annI + 55));
    const ay1 = Y(arcVoltage(Math.min(IMax, annI + 55), L, A0, B0, C0, D0));
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(ax0, ay0 - 22);
    ctx.lineTo(ax1, ay1 - 6);
    ctx.stroke();
    // Arrowhead
    const ang = Math.atan2(ay1 - 6 - (ay0 - 22), ax1 - ax0);
    ctx.beginPath();
    ctx.moveTo(ax1, ay1 - 6);
    ctx.lineTo(ax1 - 8 * Math.cos(ang - 0.4), ay1 - 6 - 8 * Math.sin(ang - 0.4));
    ctx.lineTo(ax1 - 8 * Math.cos(ang + 0.4), ay1 - 6 - 8 * Math.sin(ang + 0.4));
    ctx.closePath();
    ctx.fillStyle = '#f87171';
    ctx.fill();
    ctx.fillStyle = '#f87171';
    ctx.font = '700 12px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('dV/dI < 0 here', ax0, ay0 - 26);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('arc current I (A) →', plotX + plotW / 2, oy + H - 10);
    ctx.textAlign = 'left';
    ctx.save();
    ctx.translate(14, plotY + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('arc voltage V', 0, 0);
    ctx.restore();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(
      'V ≈ ' + V.toFixed(1) + ' V   ·   P = VI ≈ ' + (P / 1000).toFixed(2) + ' kW   ·   dV/dI < 0 (negative differential resistance)',
      plotX, oy + 40
    );
  }
}
