/** Wheatstone bridge teaching canvas: diamond circuit + Vg vs Rx plot. */
import { createDualCanvas } from '../common/teachPlots.js';
import { balanceCondition, solvedRx, bridgeVoltage, isBalanced, sweepVg } from './physics.js';

export class WheatstoneScene2D {
  constructor(host) {
    this.state = { R1: 100, R2: 100, R3: 150, Rx: 150, V: 6 };
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.R1 != null) this.state.R1 = p.R1;
    if (p.R2 != null) this.state.R2 = p.R2;
    if (p.R3 != null) this.state.R3 = p.R3;
    if (p.Rx != null) this.state.Rx = p.Rx;
    if (p.V != null) this.state.V = p.V;
  }

  setPaused(v) { this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _draw(ctx, W, H, phase) {
    if (!W || !H) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);

    const captionH = 34;
    this._drawCaption(ctx, W, captionH);
    const remH = H - captionH;
    const schemH = Math.floor(remH * 0.7);
    this._drawBridge(ctx, W, schemH, phase, captionH);
    this._drawPlot(ctx, 0, captionH + schemH + 4, W, remH - schemH - 4);
  }

  /** Persistent bold banner stating in plain words whether the bridge is balanced. */
  _drawCaption(ctx, W, H) {
    const s = this.state;
    const bal = isBalanced(s.R1, s.R2, s.R3, s.Rx, 0.01);
    const rxSolved = solvedRx(s.R1, s.R2, s.R3);

    ctx.fillStyle = bal ? 'rgba(22, 101, 52, 0.95)' : 'rgba(120, 40, 30, 0.92)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = bal ? '#4ade80' : '#f87171';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, H - 1);
    ctx.lineTo(W, H - 1);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 17px system-ui,sans-serif';
    const msg = bal
      ? 'BALANCED: R1·Rx = R2·R3 — galvanometer reads zero!'
      : 'OFF BALANCE: adjust Rx toward ' + (isFinite(rxSolved) ? rxSolved.toFixed(1) : '—') + ' Ω to null the galvanometer';
    ctx.fillText(msg, 14, H / 2 + 6);
  }

  _drawBridge(ctx, W, H, phase, yOffset) {
    const s = this.state;
    ctx.save();
    ctx.translate(0, yOffset);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
    ctx.beginPath();
    ctx.moveTo(0, H - 0.5);
    ctx.lineTo(W, H - 0.5);
    ctx.stroke();

    const Vg = bridgeVoltage(s.R1, s.R2, s.R3, s.Rx, s.V);
    const bal = isBalanced(s.R1, s.R2, s.R3, s.Rx, 0.01);
    const rxSolved = solvedRx(s.R1, s.R2, s.R3);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.fillText('Wheatstone bridge   ·   R1·Rx = R2·R3 at balance', 16, 16);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.fillText(
      'Rx for balance ≈ ' + (isFinite(rxSolved) ? rxSolved.toFixed(1) : '—') + ' Ω',
      16, 34
    );

    const cx = W * 0.42;
    const cy = H * 0.58;
    const half = Math.min(W * 0.22, H * 0.34);
    const T = { x: cx, y: cy - half };
    const B = { x: cx, y: cy + half };
    const L = { x: cx - half, y: cy };
    const R = { x: cx + half, y: cy };

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(T.x, T.y); ctx.lineTo(B.x, B.y);
    ctx.moveTo(L.x, L.y); ctx.lineTo(R.x, R.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Arms (4 resistor zigzags): R1 = T-L, R2 = T-R, R3 = L-B, Rx = R-B
    this._resistorArm(ctx, T, L, 'R1', s.R1);
    this._resistorArm(ctx, T, R, 'R2', s.R2);
    this._resistorArm(ctx, L, B, 'R3', s.R3);
    this._resistorArm(ctx, R, B, 'Rx', s.Rx);

    // Battery symbol on vertical diagonal (T-B)
    this._batterySymbol(ctx, T, B, s.V);

    // Galvanometer on horizontal diagonal (L-R)
    this._galvanometer(ctx, L, R, Vg, phase, bal);

    // Node labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('+', T.x, T.y - 10);
    ctx.fillText('−', B.x, B.y + 18);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  _resistorArm(ctx, a, b, label, value) {
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len; const uy = dy / len;
    const nx = -uy; const ny = ux;
    const zigLen = Math.min(len * 0.55, 60);
    const zigStart = { x: mx - ux * zigLen / 2, y: my - uy * zigLen / 2 };
    const teeth = 6;
    const amp = 8;

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(zigStart.x, zigStart.y);
    ctx.stroke();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(zigStart.x, zigStart.y);
    for (let i = 1; i <= teeth; i++) {
      const t = i / teeth;
      const side = i % 2 === 1 ? 1 : -1;
      const px = zigStart.x + ux * zigLen * t + nx * amp * side;
      const py = zigStart.y + uy * zigLen * t + ny * amp * side;
      ctx.lineTo(px, py);
    }
    ctx.stroke();

    const zigEnd = { x: zigStart.x + ux * zigLen, y: zigStart.y + uy * zigLen };
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(zigEnd.x, zigEnd.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 14px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, mx + nx * 20, my + ny * 20);
    ctx.fillStyle = '#7dd3fc';
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.fillText(value.toFixed(0) + ' Ω', mx + nx * 36, my + ny * 36);
    ctx.textAlign = 'left';
  }

  _batterySymbol(ctx, T, B, V) {
    const mx = (T.x + B.x) / 2;
    const my = (T.y + B.y) / 2;
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mx - 14, my - 6);
    ctx.lineTo(mx + 14, my - 6);
    ctx.moveTo(mx - 8, my + 6);
    ctx.lineTo(mx + 8, my + 6);
    ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Battery ' + V.toFixed(1) + ' V', mx + 20, my + 4);
  }

  _galvanometer(ctx, L, R, Vg, phase, bal) {
    const cx = (L.x + R.x) / 2;
    const cy = (L.y + R.y) / 2;
    const rad = 18;
    ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
    ctx.strokeStyle = bal ? '#4ade80' : '#f87171';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('G', cx, cy + 4);
    ctx.textAlign = 'left';

    // Needle deflection: proportional to Vg, clamped, with a gentle phase wiggle.
    // Direction of swing (left/right) directly encodes the sign of Vg.
    const maxDeflect = Math.PI / 3.2;
    const scale = 40; // V -> rad scaling for a visible swing
    let ang = Math.max(-maxDeflect, Math.min(maxDeflect, Vg * scale));
    ang += Math.sin(phase * 1.6) * (bal ? 0.03 : 0.015);
    const needleColor = bal ? '#4ade80' : (Vg > 0 ? '#f87171' : '#60a5fa');

    // Numeric Vg readout directly beside the needle, plus the sign/direction.
    ctx.fillStyle = needleColor;
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.textAlign = 'center';
    const dirArrow = bal ? '0' : (Vg > 0 ? '◀' : '▶');
    ctx.fillText('Vg = ' + (Vg * 1000).toFixed(2) + ' mV ' + dirArrow, cx, cy - rad - 10);

    const needleLen = rad - 3;
    const nx = cx + Math.sin(ang) * needleLen;
    const ny = cy - Math.cos(ang) * needleLen;
    ctx.strokeStyle = needleColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.stroke();
    ctx.textAlign = 'left';
  }

  _drawPlot(ctx, ox, oy, W, H) {
    const padL = 56;
    const padR = 20;
    const padT = 48;
    const padB = 40;
    const plotX = ox + padL;
    const plotY = oy + padT;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    if (plotW <= 4 || plotH <= 4) return;

    const s = this.state;
    const rxBal = solvedRx(s.R1, s.R2, s.R3);
    const center = isFinite(rxBal) && rxBal > 0 ? rxBal : s.Rx;
    let rxMin = Math.max(1, Math.min(s.Rx, center) * 0.4);
    let rxMax = Math.max(s.Rx, center) * 1.8 + 10;
    if (rxMax - rxMin < 20) rxMax = rxMin + 20;

    const pts = sweepVg(s.R1, s.R2, s.R3, s.V, rxMin, rxMax, 100);
    let vMax = 1e-6;
    for (let i = 0; i < pts.length; i++) vMax = Math.max(vMax, Math.abs(pts[i].vg));
    vMax *= 1.15;

    const Vg = bridgeVoltage(s.R1, s.R2, s.R3, s.Rx, s.V);
    const bal = isBalanced(s.R1, s.R2, s.R3, s.Rx, 0.01);

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 14px system-ui,sans-serif';
    ctx.fillText('Bridge voltage Vg vs Rx', ox + 16, oy + 22);

    ctx.fillStyle = '#0a1122';
    ctx.fillRect(plotX, plotY, plotW, plotH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(plotX + 0.5, plotY + 0.5, plotW - 1, plotH - 1);

    function X(rx) { return plotX + ((rx - rxMin) / (rxMax - rxMin)) * plotW; }
    function Y(v) { return plotY + plotH / 2 - (v / vMax) * (plotH / 2); }

    // Zero line (balance crossing)
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(plotX, Y(0));
    ctx.lineTo(plotX + plotW, Y(0));
    ctx.stroke();
    ctx.setLineDash([]);

    // Balance marker (where Vg curve crosses zero)
    if (isFinite(rxBal) && rxBal >= rxMin && rxBal <= rxMax) {
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.55)';
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(X(rxBal), plotY);
      ctx.lineTo(X(rxBal), plotY + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#4ade80';
      ctx.font = '10px system-ui,sans-serif';
      ctx.fillText('balance Rx=' + rxBal.toFixed(1), X(rxBal) + 4, plotY + 14);
    }

    // Vg vs Rx curve
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const px = X(pts[i].rx);
      const py = Y(pts[i].vg);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Current Rx marker (vertical line) + operating point
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(X(s.Rx), plotY);
    ctx.lineTo(X(s.Rx), plotY + plotH);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = bal ? '#4ade80' : '#fbbf24';
    ctx.beginPath();
    ctx.arc(X(s.Rx), Y(Vg), 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Rx (Ω) →', plotX + plotW / 2, oy + H - 8);
    ctx.textAlign = 'left';
    ctx.save();
    ctx.translate(14, plotY + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Vg (V)', 0, 0);
    ctx.restore();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(
      'Vg = ' + Vg.toFixed(4) + ' V   ·   ' + (bal ? 'balanced' : 'imbalance ' + balanceCondition(s.R1, s.R2, s.R3, s.Rx).toFixed(0) + ' Ω²'),
      plotX, oy + 40
    );
  }
}
