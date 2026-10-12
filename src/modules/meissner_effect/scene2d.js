/** Meissner effect teaching canvas — levitating magnet + field-expulsion profile. */
import { createDualCanvas } from '../common/teachPlots.js';
import {
  isSuperconducting,
  fieldInside,
  levitationForceEstimate,
  fieldProfilePoints,
} from './physics.js';

export class MeissnerScene2D {
  constructor(host) {
    this.state = {
      tempK: 70,
      tcK: 92,
      B0mT: 20,
      lambdaNm: 150,
      heightMm: 5,
    };
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.tempK != null) this.state.tempK = p.tempK;
    if (p.tcK != null) this.state.tcK = p.tcK;
    if (p.B0mT != null) this.state.B0mT = p.B0mT;
    if (p.lambdaNm != null) this.state.lambdaNm = p.lambdaNm;
    if (p.heightMm != null) this.state.heightMm = p.heightMm;
  }

  setPaused(v) { this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _draw(ctx, W, H, phase) {
    if (!W || !H) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);

    const capH = Math.min(56, Math.max(44, Math.floor(H * 0.16)));
    this._drawCaption(ctx, W, capH);

    const schemH = Math.floor((H - capH) * 0.7);
    ctx.save();
    ctx.translate(0, capH);
    this._drawSchematic(ctx, W, schemH, phase);
    ctx.restore();
    this._drawCurve(ctx, 0, capH + schemH + 4, W, H - capH - schemH - 4);
  }

  /** Persistent bold caption strip: plain-language state, contrasted with the
   *  common "it's just zero resistance" misconception. */
  _drawCaption(ctx, W, H) {
    const sc = isSuperconducting(this.state.tempK, this.state.tcK);
    ctx.fillStyle = sc ? 'rgba(8,47,73,0.95)' : 'rgba(53,38,12,0.92)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = sc ? 'rgba(34,211,238,0.5)' : 'rgba(251,191,36,0.4)';
    ctx.beginPath();
    ctx.moveTo(0, H - 0.5);
    ctx.lineTo(W, H - 0.5);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = sc ? '#67e8f9' : '#fbbf24';
    ctx.font = '700 16px system-ui,sans-serif';
    ctx.fillText(
      sc
        ? 'SUPERCONDUCTING (T < T_c): field is ACTIVELY EXPELLED — more than just zero resistance!'
        : 'NORMAL STATE (T ≥ T_c): field passes straight through — no levitation',
      14, 21
    );
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '13px system-ui,sans-serif';
    ctx.fillText(
      sc
        ? 'A merely zero-resistance conductor would still let a steady field pass unchanged — real superconductors push it out.'
        : 'Above T_c the sample behaves like an ordinary conductor: the magnet’s field penetrates freely and it rests flat.',
      14, 40
    );
  }

  _drawSchematic(ctx, W, H, phase) {
    const sc = isSuperconducting(this.state.tempK, this.state.tcK);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
    ctx.beginPath();
    ctx.moveTo(0, H - 0.5);
    ctx.lineTo(W, H - 0.5);
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 14px system-ui,sans-serif';
    ctx.fillText('Meissner effect — flux expulsion below T_c', 16, 18);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(
      sc
        ? 'Field lines below bow AROUND the puck — this is active expulsion, not merely "zero resistance."'
        : 'Field lines below pass straight through — an ordinary (non-Meissner) conductor would look identical.',
      16, 38
    );

    const cx = W / 2;
    const puckY = H * 0.82;
    const puckW = Math.min(180, W * 0.42);
    const puckH = 26;

    // gap between magnet bottom and puck top: animated hover when SC, resting (~0) when normal
    const baseGap = sc ? 18 + this.state.heightMm * 4.5 : 4;
    const bob = sc ? Math.sin(phase * 1.6) * 3.5 : 0;
    const gap = Math.max(4, baseGap + bob);

    const puckTopY = puckY - puckH / 2;
    const magnetH = 16;
    const magnetW = Math.min(90, puckW * 0.55);
    const magnetBottomY = puckTopY - gap;
    const magnetTopY = magnetBottomY - magnetH;

    // Field lines from the magnet (poles at top/bottom of the small bar magnet)
    this._drawFieldLines(ctx, cx, magnetTopY, magnetBottomY, magnetW, puckTopY, puckW, sc);

    // Puck (superconductor)
    const glow = sc ? 0.55 : 0.15;
    if (sc) {
      const grd = ctx.createRadialGradient(cx, puckY, 4, cx, puckY, puckW * 0.75);
      grd.addColorStop(0, 'rgba(34,211,238,0.35)');
      grd.addColorStop(1, 'rgba(34,211,238,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(cx - puckW, puckY - puckH * 2, puckW * 2, puckH * 4);
    }
    ctx.fillStyle = sc ? 'rgba(30, 64, 90, 0.95)' : 'rgba(51, 65, 85, 0.9)';
    roundRect(ctx, cx - puckW / 2, puckTopY, puckW, puckH, 6);
    ctx.fill();
    ctx.strokeStyle = sc ? 'rgba(34,211,238,' + glow + ')' : 'rgba(148,163,184,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // London penetration depth marker directly on the puck cross-section —
    // the thin amber band is where screening currents flow; field is ~zero below it.
    if (sc) {
      const bandH = Math.max(4, Math.min(9, puckH * 0.34));
      ctx.fillStyle = 'rgba(251,191,36,0.55)';
      ctx.fillRect(cx - puckW / 2 + 2, puckTopY + 1, puckW - 4, bandH);
      ctx.strokeStyle = 'rgba(251,191,36,0.9)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx + puckW / 2, puckTopY + bandH / 2);
      ctx.lineTo(cx + puckW / 2 + 22, puckTopY + bandH / 2);
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      ctx.font = '600 12px system-ui,sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('λ_L screening layer', cx + puckW / 2 + 26, puckTopY + bandH / 2 + 4);
      ctx.textAlign = 'center';
    }

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(sc ? 'superconducting puck' : 'normal-state puck', cx, puckY + puckH / 2 + 16);

    // Bar magnet (N red / S blue)
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(cx - magnetW / 2, magnetTopY, magnetW, magnetH / 2);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(cx - magnetW / 2, magnetTopY + magnetH / 2, magnetW, magnetH / 2);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - magnetW / 2 + 0.5, magnetTopY + 0.5, magnetW - 1, magnetH - 1);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 10px system-ui,sans-serif';
    ctx.fillText('N', cx, magnetTopY + magnetH * 0.28 + 3);
    ctx.fillText('S', cx, magnetTopY + magnetH * 0.78 + 3);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(
      sc ? 'magnet levitates — gap ≈ ' + this.state.heightMm.toFixed(1) + ' mm (bobbing)' : 'no levitation — magnet rests on puck',
      cx, magnetTopY - 8
    );
    ctx.textAlign = 'left';
  }

  _drawFieldLines(ctx, cx, magTopY, magBotY, magnetW, puckTopY, puckW, sc) {
    const n = 5;
    ctx.lineWidth = 1.4;
    for (let i = 0; i < n; i++) {
      const t = (i / (n - 1)) - 0.5; // -0.5..0.5
      const x0 = cx + t * magnetW * 1.4;
      ctx.strokeStyle = 'rgba(167, 139, 250, 0.55)';
      ctx.beginPath();
      ctx.moveTo(x0, magBotY);
      if (sc) {
        // bow outward and around — excluded from the puck interior
        const spread = magnetW * 0.9 + Math.abs(t) * 40;
        const xEnd = cx + (t >= 0 ? 1 : -1) * (magnetW / 2 + spread);
        const midY = (magBotY + puckTopY) / 2;
        ctx.quadraticCurveTo(x0 + (t >= 0 ? spread * 0.6 : -spread * 0.6), midY, xEnd, puckTopY + 4);
      } else {
        // straight through, unaffected by the (normal) puck
        ctx.lineTo(x0, puckTopY + 30);
      }
      ctx.stroke();
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

    const sc = isSuperconducting(this.state.tempK, this.state.tcK);
    const xMax = Math.max(20, this.state.lambdaNm * 3);
    const pts = fieldProfilePoints(this.state.B0mT, this.state.lambdaNm, sc, xMax, 100);
    const force = levitationForceEstimate(this.state.B0mT, this.state.heightMm, sc);

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 14px system-ui,sans-serif';
    ctx.fillText('Field inside the sample B(x)', ox + 16, oy + 22);

    ctx.fillStyle = '#0a1122';
    ctx.fillRect(plotX, plotY, plotW, plotH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(plotX + 0.5, plotY + 0.5, plotW - 1, plotH - 1);

    const Bmax = Math.max(1e-6, this.state.B0mT);
    function X(x) { return plotX + (x / xMax) * plotW; }
    function Y(b) { return plotY + plotH - (b / Bmax) * plotH; }

    // lambda_L marker (B0/e point) only meaningful when superconducting
    if (sc && this.state.lambdaNm < xMax) {
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(X(this.state.lambdaNm), plotY);
      ctx.lineTo(X(this.state.lambdaNm), plotY + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#fbbf24';
      ctx.font = '600 12px system-ui,sans-serif';
      ctx.fillText('λ_L: B → B₀/e ≈ ' + (this.state.B0mT / Math.E).toFixed(2) + ' mT', X(this.state.lambdaNm) + 4, plotY + 14);
    }

    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const px = X(pts[i].depthNm);
      const py = Y(pts[i].B);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('depth x (nm) →', plotX + plotW / 2, oy + H - 10);
    ctx.textAlign = 'left';
    ctx.save();
    ctx.translate(14, plotY + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('B (mT)', 0, 0);
    ctx.restore();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(
      (sc ? 'Superconducting (T<T_c)' : 'Normal (T≥T_c)') +
      '   ·   levitation force ≈ ' + force.toFixed(2) + ' (arb. units)',
      plotX, oy + 40
    );
  }
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}
