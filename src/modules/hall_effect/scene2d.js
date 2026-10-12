// Hall effect — 2D lab-apparatus schematic: a semiconductor slab held
// between two magnet pole pieces (N above, S below), current-supply leads
// on the two short ends, and Hall-voltage sense leads on the two long
// edges running to a digital voltmeter. A secondary V_H-vs-B chart sits
// below the apparatus.
//
// Physics note: for a fixed current direction and fixed B, the Lorentz
// force F = q*v_drift x B pushes BOTH electrons and holes toward the SAME
// physical edge (q and v_drift flip sign together, so q*v_drift does not).
// What flips between n-type and p-type is the SIGN of the charge that
// piles up there — so both carrier clouds drift toward the same edge here,
// while the +/- edge labels and the voltmeter sign flip. See physics.js.
import { createDualCanvas } from '../common/teachPlots.js';
import { hallVoltage, hallVoltageSigned } from './physics.js';

// Real Hall voltages are microvolts — invisible at literal scale. Amplify
// the visual pile-up so the deflection reads clearly; the readout itself
// still shows the true (tiny) value.
const VISUAL_AMP = 2e6;

function arrowTo(ctx, x0, y0, x1, y1, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width || 2;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const ah = 6;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - ah * Math.cos(ang - 0.4), y1 - ah * Math.sin(ang - 0.4));
  ctx.lineTo(x1 - ah * Math.cos(ang + 0.4), y1 - ah * Math.sin(ang + 0.4));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function polyline(ctx, pts, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width || 2;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
  }
  ctx.closePath();
}

export class Hall2D {
  constructor(host) {
    this.state = { I: 1.0, B: 0.5, n: 8.5e28, t: 0.0005, carrier: 'n' };
    this._carriers = [];
    for (let i = 0; i < 28; i++) {
      this._carriers.push({ x: Math.random(), y: Math.random() });
    }
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) { self._draw(ctx, w, h, phase); });
  }

  setParams(p) { if (p) Object.assign(this.state, p); }
  setPaused(v) { this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _draw(ctx, W, H) {
    if (!W || !H) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);
    const s = this.state;
    const isN = s.carrier === 'n';
    const vh = hallVoltage(s.I, s.B, s.n, s.t);
    const vhSigned = hallVoltageSigned(s.I, s.B, s.n, s.t, s.carrier);

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 15px system-ui,sans-serif';
    ctx.fillText('Hall effect apparatus — sample between N/S pole pieces', 16, 24);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(
      'V_H = IB/(net)  ·  deflection & meter reading are exaggerated (~10⁶×) for visibility — real V_H is microvolts',
      16, 42
    );

    // ---- Apparatus geometry ----
    const apTop = 56;
    const apBottom = Math.min(H * 0.60, H - 150);
    const apH = Math.max(80, apBottom - apTop);

    const slabW = Math.max(160, Math.min(360, W * 0.40));
    const slabH = Math.max(36, Math.min(78, apH * 0.30));
    const slabCx = W * 0.47;
    const slabCy = apTop + apH * 0.52;
    const x0 = slabCx - slabW / 2;
    const y0 = slabCy - slabH / 2;

    const poleW = slabW * 0.86;
    const poleH = Math.max(14, Math.min(24, apH * 0.16));
    const gap = 16;
    const nY = y0 - gap - poleH;
    const sY = y0 + slabH + gap;
    const poleX = slabCx - poleW / 2;

    // N pole (top)
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(poleX, nY, poleW, poleH);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(poleX + 0.5, nY + 0.5, poleW - 1, poleH - 1);
    ctx.fillStyle = '#fca5a5';
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', slabCx, nY + poleH / 2 + 4);

    // S pole (bottom)
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(poleX, sY, poleW, poleH);
    ctx.strokeStyle = '#3b82f6';
    ctx.strokeRect(poleX + 0.5, sY + 0.5, poleW - 1, poleH - 1);
    ctx.fillStyle = '#93c5fd';
    ctx.fillText('S', slabCx, sY + poleH / 2 + 4);
    ctx.textAlign = 'left';

    // Field arrows threading N -> slab -> S
    const nArrows = 5;
    for (let i = 0; i < nArrows; i++) {
      const fx = poleX + poleW * ((i + 0.5) / nArrows);
      arrowTo(ctx, fx, nY + poleH + 2, fx, y0 - 3, 'rgba(226,232,240,0.55)', 1.4);
      arrowTo(ctx, fx, y0 + slabH + 3, fx, sY - 2, 'rgba(226,232,240,0.55)', 1.4);
    }
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('B (N → S) through sample', poleX, nY - 6);

    // Slab (semiconductor sample)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x0, y0, slabW, slabH);
    ctx.strokeStyle = '#64748b';
    ctx.strokeRect(x0 + 0.5, y0 + 0.5, slabW - 1, slabH - 1);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10.5px system-ui,sans-serif';
    ctx.fillText('semiconductor sample', x0 + 6, y0 + slabH - 6);

    // Current source box (left)
    const srcW = 74, srcH = 46;
    const srcX = x0 - 120, srcY = slabCy - srcH / 2;
    ctx.fillStyle = '#111827';
    roundRect(ctx, srcX, srcY, srcW, srcH, 8);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    roundRect(ctx, srcX + 0.5, srcY + 0.5, srcW - 1, srcH - 1, 8);
    ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.font = '700 11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('I source', srcX + srcW / 2, srcY + 17);
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(s.I.toFixed(2) + ' A', srcX + srcW / 2, srcY + 33);
    ctx.textAlign = 'left';

    // Current leads: left edge direct; right edge routes under the S pole
    // back to the source, so the loop reads as a complete circuit.
    arrowTo(ctx, srcX + srcW, slabCy, x0 - 2, slabCy, '#f59e0b', 2.2);
    const underY = sY + poleH + 16;
    polyline(ctx, [
      [x0 + slabW, slabCy],
      [x0 + slabW + 16, slabCy],
      [x0 + slabW + 16, underY],
      [srcX + srcW / 2, underY],
      [srcX + srcW / 2, srcY + srcH],
    ], '#f59e0b', 2.2);
    ctx.fillStyle = '#f59e0b';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('I', (x0 + srcX + srcW) / 2 - 4, slabCy - 8);

    // Voltmeter box (right), fed by Hall sense leads on the long edges
    const vmW = 96, vmH = 54;
    const vmX = x0 + slabW + 46, vmY = slabCy - vmH / 2;
    ctx.fillStyle = '#0b1220';
    roundRect(ctx, vmX, vmY, vmW, vmH, 8);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    roundRect(ctx, vmX + 0.5, vmY + 0.5, vmW - 1, vmH - 1, 8);
    ctx.stroke();
    ctx.fillStyle = '#67e8f9';
    ctx.font = '700 11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Voltmeter', vmX + vmW / 2, vmY + 16);
    ctx.fillStyle = vhSigned >= 0 ? '#f87171' : '#38bdf8';
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.fillText((vhSigned >= 0 ? '+' : '') + (vhSigned * 1e6).toFixed(3) + ' µV', vmX + vmW / 2, vmY + 36);
    ctx.textAlign = 'left';

    const senseX = slabCx - slabW * 0.18;
    polyline(ctx, [
      [senseX, y0],
      [senseX, nY - 8],
      [vmX + vmW * 0.3, nY - 8],
      [vmX + vmW * 0.3, vmY],
    ], '#67e8f9', 1.8);
    polyline(ctx, [
      [senseX, y0 + slabH],
      [senseX, sY + poleH + 8],
      [vmX + vmW * 0.3, sY + poleH + 8],
      [vmX + vmW * 0.3, vmY + vmH],
    ], '#67e8f9', 1.8);

    // ---- Carriers ----
    // Drift direction: electrons (n) drift opposite to conventional current
    // (right -> left); holes (p) drift with it (left -> right).
    const driftDir = isN ? -1 : 1;
    // Pile-up edge is the SAME for both carrier types (see file header) —
    // always biased toward the top edge here. Magnitude only depends on
    // |V_H|, not on carrier sign.
    const pileBias = -0.5 * Math.min(1, Math.abs(vh) * VISUAL_AMP);
    ctx.fillStyle = isN ? '#38bdf8' : '#f87171';
    for (const c of this._carriers) {
      c.x += driftDir * 0.0026;
      if (c.x > 1) c.x -= 1;
      if (c.x < 0) c.x += 1;
      const py = 0.18 + 0.64 * Math.max(0, Math.min(1, c.y + pileBias));
      const px = x0 + 6 + c.x * (slabW - 12);
      const cy = y0 + py * slabH;
      ctx.beginPath();
      ctx.arc(px, cy, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Edge +/- labels: same physical edge accumulates carriers for both
    // types, but the charge sign there flips with carrier type — this is
    // the whole pedagogical point.
    const topSign = isN ? '-' : '+';
    const botSign = isN ? '+' : '-';
    const lblX = x0 + slabW * 0.90;
    ctx.font = '700 15px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = topSign === '+' ? '#f87171' : '#38bdf8';
    ctx.fillText(topSign, lblX, y0 - 4);
    ctx.fillStyle = botSign === '+' ? '#f87171' : '#38bdf8';
    ctx.fillText(botSign, lblX, y0 + slabH + 18);
    ctx.textAlign = 'left';

    // Current-direction caption
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText(
      isN
        ? 'n-type: electrons drift right→left; both carrier types pile toward the same edge, but electrons make it negative'
        : 'p-type: holes drift left→right; both carrier types pile toward the same edge, but holes make it positive',
      x0 - 4, apBottom + 2
    );

    // ---- Vh vs B chart ----
    const padL = 56, padR = 24, cTop = Math.max(apBottom + 22, H * 0.72), cH = H - cTop - 30, cW = W - padL - padR;
    if (cH < 40) return;
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.fillText('Signed Hall voltage vs magnetic field', padL, cTop - 8);
    ctx.fillStyle = '#0a1122';
    ctx.fillRect(padL, cTop, cW, cH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(padL + 0.5, cTop + 0.5, cW - 1, cH - 1);
    const Bmax = 3;
    function X(b) { return padL + (b / Bmax) * cW; }
    const vhMax = Math.abs(hallVoltage(s.I, Bmax, s.n, s.t)) * 1.2 || 1e-9;
    function Y(v) { return cTop + cH / 2 - (v / vhMax) * (cH / 2); }
    ctx.strokeStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(padL, Y(0));
    ctx.lineTo(padL + cW, Y(0));
    ctx.stroke();
    ctx.strokeStyle = isN ? '#38bdf8' : '#f87171';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const b = (i / 100) * Bmax;
      const v = hallVoltageSigned(s.I, b, s.n, s.t, s.carrier);
      const px = X(b), py = Y(v);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(X(s.B), Y(vhSigned), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('B (T) →', padL + cW / 2 - 20, cTop + cH + 16);
  }
}
