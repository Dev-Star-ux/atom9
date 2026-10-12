/** Lightning rod (Franklin rod) — rolling-sphere protection teaching canvas. */
import { createDualCanvas } from '../common/teachPlots.js';
import { strikingDistance, protectionRadius, curvePoints } from './physics.js';

export class LightningRodScene2D {
  constructor(host) {
    this.state = {
      h: 8,
      I: 10,
    };
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.h != null) this.state.h = p.h;
    if (p.I != null) this.state.I = p.I;
  }

  setPaused(v) { this._canvas.setPaused(v); }
  setActive(v) { this._active = !!v; }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _draw(ctx, W, H, phase) {
    if (!W || !H) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);

    const capH = 34;
    const readH = 28;
    this._drawCaption(ctx, W, capH);
    this._drawReadouts(ctx, W, capH, readH);

    const top = capH + readH;
    const schemH = Math.floor((H - top) * 0.7);
    ctx.save();
    ctx.translate(0, top);
    this._drawSchematic(ctx, W, schemH, phase);
    ctx.restore();
    this._drawCurve(ctx, 0, top + schemH + 4, W, H - top - schemH - 4);
  }

  /** Always-visible bold caption naming BOTH mechanisms — the module's core point. */
  _drawCaption(ctx, W, capH) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
    ctx.fillRect(0, 0, W, capH);
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, capH - 0.5);
    ctx.lineTo(W, capH - 0.5);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde68a';
    ctx.font = '700 16px system-ui,sans-serif';
    const msg = '1) Sharp tip concentrates the field  →  2) Grounded rod safely conducts the strike to earth';
    // Shrink slightly on very narrow viewports so the two-part message stays on one line.
    const fit = ctx.measureText(msg).width > W - 24;
    ctx.font = (fit ? '700 13px' : '700 16px') + ' system-ui,sans-serif';
    ctx.fillText(msg, W / 2, capH / 2 + 1);
    ctx.textAlign = 'left';
  }

  /** Prominent live numeric readouts: striking distance & protection radius. */
  _drawReadouts(ctx, W, y0, readH) {
    ctx.fillStyle = 'rgba(8, 12, 24, 0.92)';
    ctx.fillRect(0, y0, W, readH);
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.6)';
    ctx.beginPath();
    ctx.moveTo(0, y0 + readH - 0.5);
    ctx.lineTo(W, y0 + readH - 0.5);
    ctx.stroke();

    const rs = strikingDistance(this.state.I);
    const Rp = protectionRadius(this.state.h, rs);
    const midY = y0 + readH / 2 + 5;

    ctx.font = '700 14px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('striking distance  r_s = ' + rs.toFixed(1) + ' m', 12, midY);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#facc15';
    ctx.fillText('protection radius  R_p = ' + Rp.toFixed(1) + ' m', W - 12, midY);
    ctx.textAlign = 'left';
  }

  _drawSchematic(ctx, W, H, phase) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 0, W, H);

    const rs = strikingDistance(this.state.I);
    const Rp = protectionRadius(this.state.h, rs);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(
      'h = ' + this.state.h.toFixed(1) + ' m · I = ' + this.state.I.toFixed(1) + ' kA',
      16, 16
    );

    const groundY = H - 30;
    const pxPerM = Math.min((W - 40) / (2 * Math.max(rs, Rp, this.state.h) + 6), 8);
    const baseX = W / 2;

    function gx(xm) { return baseX + xm * pxPerM; }
    function gy(ym) { return groundY - ym * pxPerM; }

    // Ground line
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, groundY + 0.5);
    ctx.lineTo(W, groundY + 0.5);
    ctx.stroke();

    // Building silhouette (to the left of the rod base)
    const bW = Math.min(80, pxPerM * 6);
    const bH = Math.min(60, pxPerM * (this.state.h * 0.55));
    ctx.fillStyle = 'rgba(100, 116, 139, 0.55)';
    ctx.fillRect(baseX - bW - 4, groundY - bH, bW, bH);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
    ctx.strokeRect(baseX - bW - 3.5, groundY - bH + 0.5, bW - 1, bH - 1);

    // Rod, sticking up from the building peak
    const rodTopY = gy(this.state.h);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(baseX, groundY - bH);
    ctx.lineTo(baseX, rodTopY);
    ctx.stroke();
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(baseX, rodTopY, 3, 0, Math.PI * 2);
    ctx.fill();
    this._leaderLabel(ctx, baseX, rodTopY, baseX + 14, rodTopY - 16, 'grounded rod (h)', '#facc15');
    // Ground symbol at the rod's earthing point.
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.85)';
    ctx.lineWidth = 1.5;
    for (let gi = 0; gi < 3; gi++) {
      const gw = 10 - gi * 3;
      ctx.beginPath();
      ctx.moveTo(baseX - gw, groundY + 3 + gi * 4);
      ctx.lineTo(baseX + gw, groundY + 3 + gi * 4);
      ctx.stroke();
    }

    // Rolling sphere: dashed circle of radius rs, tangent to rod tip & ground.
    // Center sits directly above the rod tip at height (h + (rs - h)) = rs
    // when h<=rs (tangent to ground at height 0, tangent to tip at height h)
    // Simplify: center at (baseX, groundY - rs*pxPerM), radius rs*pxPerM,
    // horizontally offset so the sphere still touches the rod tip.
    const rsPx = rs * pxPerM;
    // Center directly above rod tip, offset so sphere is tangent to ground
    // and passes through the tip: centerY corresponds to ground - rs, and
    // horizontal offset dx solves dx^2 + (rs-h)^2 = rs^2 -> dx = Rp.
    const dxPx = Rp * pxPerM;
    const cx = baseX + dxPx;
    const cy = groundY - rsPx;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, rsPx, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // Leader-line callout for the rolling sphere itself (top edge of the circle).
    this._leaderLabel(ctx, cx, cy - rsPx, cx + 20, cy - rsPx - 14, 'rolling sphere (r_s)', '#38bdf8');

    // Protected zone on the ground
    ctx.fillStyle = 'rgba(250, 204, 21, 0.14)';
    ctx.beginPath();
    ctx.moveTo(baseX - Rp * pxPerM, groundY);
    ctx.lineTo(baseX, rodTopY);
    ctx.lineTo(baseX + Rp * pxPerM, groundY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.5)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(baseX - Rp * pxPerM, groundY - 0.5);
    ctx.lineTo(baseX + Rp * pxPerM, groundY - 0.5);
    ctx.stroke();
    ctx.setLineDash([]);
    // Leader-line callout for the protected zone boundary on the ground.
    this._leaderLabel(
      ctx, baseX + Rp * pxPerM, groundY, baseX + Rp * pxPerM + 8,
      Math.max(14, groundY - 18), 'protected zone (R_p)', '#facc15'
    );

    // Deterministic phase-animated lightning bolt: strike captured by the rod.
    const cyclePos = phase % 3.0;
    if (cyclePos < 0.5) {
      const t = cyclePos / 0.5;
      this._drawBolt(ctx, baseX, rodTopY, t);
    }
  }

  /** Small dot + leader line + text label — used so callouts don't rely on color alone. */
  _leaderLabel(ctx, fromX, fromY, toX, toY, text, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(fromX, fromY, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.textAlign = toX >= fromX ? 'left' : 'right';
    ctx.textBaseline = toY <= fromY ? 'bottom' : 'top';
    ctx.fillText(text, toX + (toX >= fromX ? 4 : -4), toY);
    ctx.restore();
  }

  _drawBolt(ctx, tipX, tipY, t) {
    // Jagged path from off-screen top down to the rod tip, deterministic zigzag.
    const startY = -10;
    const segs = 7;
    const pts = [];
    for (let i = 0; i <= segs; i++) {
      const f = i / segs;
      const y = startY + (tipY - startY) * f;
      const jag = Math.sin(i * 2.3) * 10 * (1 - f * 0.5);
      pts.push({ x: tipX + jag, y: y });
    }
    const drawUpTo = Math.max(1, Math.floor(t * segs));
    ctx.strokeStyle = 'rgba(224, 242, 254, ' + (0.9 * (1 - t * 0.3)) + ')';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let i = 0; i <= drawUpTo && i <= segs; i++) {
      if (i === 0) ctx.moveTo(pts[i].x, pts[i].y);
      else ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
    if (drawUpTo >= segs) {
      ctx.fillStyle = 'rgba(250, 204, 21, 0.8)';
      ctx.beginPath();
      ctx.arc(tipX, tipY, 6 * (1 - t), 0, Math.PI * 2);
      ctx.fill();
    }
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

    const IMin = 2;
    const IMax = 200;
    const pts = curvePoints(this.state.h, IMin, IMax, 100);
    const rs = strikingDistance(this.state.I);
    const Rp = protectionRadius(this.state.h, rs);

    let RpMax = 1e-6;
    for (let i = 0; i < pts.length; i++) if (pts[i].Rp > RpMax) RpMax = pts[i].Rp;
    RpMax = Math.max(RpMax, Rp) * 1.1;

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 14px system-ui,sans-serif';
    ctx.fillText('Protection radius R_p vs prospective stroke current I', ox + 16, oy + 22);

    ctx.fillStyle = '#0a1122';
    ctx.fillRect(plotX, plotY, plotW, plotH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(plotX + 0.5, plotY + 0.5, plotW - 1, plotH - 1);

    function X(I) { return plotX + ((I - IMin) / (IMax - IMin)) * plotW; }
    function Y(rp) { return plotY + plotH - (rp / RpMax) * plotH; }

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const px = X(pts[i].I);
      const py = Y(pts[i].Rp);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Operating point marker
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(X(this.state.I), Y(Rp), 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('stroke current I (kA) →', plotX + plotW / 2, oy + H - 10);
    ctx.textAlign = 'left';
    ctx.save();
    ctx.translate(14, plotY + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('R_p (m)', 0, 0);
    ctx.restore();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(
      'r_s ≈ ' + rs.toFixed(1) + ' m   ·   R_p ≈ ' + Rp.toFixed(1) + ' m (h=' + this.state.h.toFixed(1) + ' m)',
      plotX, oy + 40
    );
  }
}
