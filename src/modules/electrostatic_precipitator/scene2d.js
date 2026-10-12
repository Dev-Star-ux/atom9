/** Electrostatic precipitator teaching canvas — simple duct view, no chart. */
import { createDualCanvas } from '../common/teachPlots.js';
import {
  driftVelocity,
  gasFlow,
  collectionEfficiency,
} from './physics.js';

const N_PARTICLES = 26;

export class PrecipitatorScene2D {
  constructor(host) {
    this.state = {
      voltageKV: 40,
      particleRadiusUm: 2,
      gasVelocityMs: 1.5,
      plateSpacingCm: 20,
      plateAreaM2: 4,
      ductCrossSectionM2: 0.5,
      fieldOn: true,
    };
    this._piles = null; // top/bottom accumulation, indexed along duct length
    this._collected = 0; // cumulative count of particles that reached a plate
    this._wasReached = new Array(N_PARTICLES).fill(false);
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.voltageKV != null) this.state.voltageKV = p.voltageKV;
    if (p.particleRadiusUm != null) this.state.particleRadiusUm = p.particleRadiusUm;
    if (p.gasVelocityMs != null) this.state.gasVelocityMs = p.gasVelocityMs;
    if (p.plateSpacingCm != null) this.state.plateSpacingCm = p.plateSpacingCm;
    if (p.plateAreaM2 != null) this.state.plateAreaM2 = p.plateAreaM2;
    if (p.ductCrossSectionM2 != null) this.state.ductCrossSectionM2 = p.ductCrossSectionM2;
    if (p.fieldOn != null) this.state.fieldOn = p.fieldOn;
  }

  /** Clears the collected count and any accumulated dust piles — wired to
   *  the viewport's "Reset" button. */
  reset() {
    this._collected = 0;
    this._piles = null;
    this._wasReached.fill(false);
  }

  setPaused(v) { this._canvas.setPaused(v); }
  setActive(v) { this._active = !!v; }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _draw(ctx, W, H, phase) {
    if (!W || !H) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);
    this._drawDuct(ctx, W, H, phase);
  }

  /** Bold caption + live efficiency and particle counters — the whole
   *  story in one glance, no chart needed. */
  _drawCaption(ctx, W, eta, fieldOn) {
    const capH = 52;
    ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
    ctx.fillRect(0, 0, W, capH);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, capH + 0.5);
    ctx.lineTo(W, capH + 0.5);
    ctx.stroke();

    // Everything left-aligned so nothing sits under the floating 2D/3D
    // toggle buttons at the top-right of the viewport.
    ctx.fillStyle = fieldOn ? '#f1f5f9' : '#94a3b8';
    ctx.font = '700 15px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(fieldOn ? 'Corona charges dust → field pulls it to the plates' : 'Field OFF — dust just drifts through, uncollected', 14, 20);

    ctx.font = '600 12px system-ui,sans-serif';
    ctx.fillStyle = '#7dd3fc';
    ctx.fillText('particles: ' + N_PARTICLES, 14, 40);
    const w1 = ctx.measureText('particles: ' + N_PARTICLES).width;
    ctx.fillStyle = '#4ade80';
    ctx.fillText('collected: ' + Math.floor(this._collected), 14 + w1 + 16, 40);
    const w2 = ctx.measureText('collected: ' + Math.floor(this._collected)).width;
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.fillStyle = eta > 0.9 ? '#4ade80' : eta > 0.5 ? '#facc15' : '#f87171';
    ctx.fillText('η ≈ ' + (100 * eta).toFixed(1) + '%', 14 + w1 + w2 + 32, 40);
    return capH;
  }

  _drawDuct(ctx, W, H, phase) {
    const s = this.state;
    const fieldOn = s.fieldOn !== false;
    const w = fieldOn ? driftVelocity(s.voltageKV, s.plateSpacingCm, s.particleRadiusUm) : 0;
    const Q = gasFlow(s.gasVelocityMs, s.ductCrossSectionM2);
    const eta = fieldOn ? collectionEfficiency(w, s.plateAreaM2, Q) : 0;

    const capH = this._drawCaption(ctx, W, eta, fieldOn);

    const padTop = capH + 26;
    const padBot = 22;
    const padSide = 24;
    const ductTop = padTop;
    const ductBot = H - padBot;
    const ductH = ductBot - ductTop;
    const ductL = padSide;
    const ductR = W - padSide;
    const ductW = ductR - ductL;
    const midY = (ductTop + ductBot) / 2;
    const plateThick = 10;

    // Grounded collector plates (top & bottom)
    ctx.fillStyle = '#475569';
    ctx.fillRect(ductL, ductTop - plateThick, ductW, plateThick);
    ctx.fillRect(ductL, ductBot, ductW, plateThick);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.strokeRect(ductL + 0.5, ductTop - plateThick + 0.5, ductW - 1, plateThick - 1);
    ctx.strokeRect(ductL + 0.5, ductBot + 0.5, ductW - 1, plateThick - 1);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.fillText('collector plate (grounded)', ductL + 4, ductTop - plateThick - 4);

    // Duct interior
    ctx.fillStyle = 'rgba(2, 6, 23, 0.6)';
    ctx.fillRect(ductL, ductTop, ductW, ductH);

    // Corona wire down the center, with glow/spark animation
    const wireX0 = ductL + 6;
    const wireX1 = ductR - 6;
    const glow = fieldOn ? 0.55 + 0.45 * Math.sin(phase * 6) : 0;
    const grad = ctx.createLinearGradient(0, midY - 18, 0, midY + 18);
    grad.addColorStop(0, 'rgba(251, 191, 36, 0)');
    grad.addColorStop(0.5, 'rgba(251, 191, 36, ' + (0.28 * glow).toFixed(3) + ')');
    grad.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(wireX0, midY - 18, wireX1 - wireX0, 36);

    ctx.strokeStyle = fieldOn ? '#fbbf24' : '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(wireX0, midY);
    ctx.lineTo(wireX1, midY);
    ctx.stroke();

    if (fieldOn) {
      // Small sparks along the wire
      const nSpark = 8;
      for (let i = 0; i < nSpark; i++) {
        const t = (phase * 1.3 + i / nSpark) % 1;
        const x = wireX0 + (wireX1 - wireX0) * ((i + 0.5) / nSpark);
        const len = 5 + 7 * Math.sin((t + i) * Math.PI * 2) * 0.5 + 6;
        const dir = i % 2 === 0 ? -1 : 1;
        ctx.strokeStyle = 'rgba(253, 224, 71, ' + (0.5 * glow).toFixed(2) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, midY);
        ctx.lineTo(x + (Math.random() - 0.5) * 3, midY + dir * (4 + (len % 6)));
        ctx.stroke();
      }
    }
    ctx.fillStyle = fieldOn ? '#fde68a' : '#64748b';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.fillText('corona wire (HV)', wireX0, midY - 22);

    // Dust particles: enter left, drift with gas flow rightward, curve toward nearer plate.
    if (!this._piles || this._piles.n !== 40) {
      this._piles = { n: 40, top: new Array(40).fill(0), bot: new Array(40).fill(0) };
    }
    const piles = this._piles;
    const speedScale = 0.06 + s.gasVelocityMs * 0.05;
    const driftScale = fieldOn ? Math.min(1, w * 40) : 0;

    for (let i = 0; i < N_PARTICLES; i++) {
      const seed = i * 0.6180339887;
      const startLane = ((seed * 997) % 1) * 2 - 1; // -1..1 initial offset from centerline
      const t = (phase * speedScale + seed) % 1;
      const x = ductL + ductW * t;
      const towardSign = startLane >= 0 ? 1 : -1;
      const curve = towardSign * driftScale * Math.pow(t, 1.3) * (ductH / 2 - 6);
      const y = midY + startLane * (ductH / 2 - 10) * (1 - 0.55 * t) + curve;
      const yClamped = Math.min(ductBot - 3, Math.max(ductTop + 3, y));
      const reachedPlate = fieldOn && (yClamped <= ductTop + 4 || yClamped >= ductBot - 4);

      if (reachedPlate) {
        if (!this._wasReached[i]) {
          this._collected += 1;
          this._wasReached[i] = true;
        }
        const bin = Math.min(piles.n - 1, Math.max(0, Math.floor(((x - ductL) / ductW) * piles.n)));
        if (yClamped <= ductTop + 4) piles.top[bin] = Math.min(plateThick + 10, piles.top[bin] + 0.02);
        else piles.bot[bin] = Math.min(plateThick + 10, piles.bot[bin] + 0.02);
        continue;
      }
      this._wasReached[i] = false;

      const density = 1 - 0.6 * t;
      const chargeT = 0.09;
      const charged = fieldOn && t >= chargeT;
      const justCharged = charged && t < chargeT + 0.025;
      if (justCharged) {
        ctx.fillStyle = 'rgba(253, 224, 71, 0.95)';
        ctx.beginPath();
        ctx.arc(x, yClamped, 4.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (charged) {
        ctx.fillStyle = 'rgba(56, 189, 248, ' + Math.max(0.35, density).toFixed(2) + ')';
        ctx.beginPath();
        ctx.arc(x, yClamped, 2.6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(148, 163, 184, ' + Math.max(0.15, density).toFixed(2) + ')';
        ctx.beginPath();
        ctx.arc(x, yClamped, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw accumulated dust piles along plates
    ctx.fillStyle = 'rgba(120, 113, 108, 0.85)';
    for (let b = 0; b < piles.n; b++) {
      const bx = ductL + (b / piles.n) * ductW;
      const bw = ductW / piles.n + 0.5;
      if (piles.top[b] > 0) ctx.fillRect(bx, ductTop - piles.top[b], bw, piles.top[b]);
      if (piles.bot[b] > 0) ctx.fillRect(bx, ductBot, bw, piles.bot[b]);
    }

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('dirty gas in →', ductL, ductBot + plateThick + 16);
    ctx.textAlign = 'right';
    ctx.fillText('→ clean gas out', ductR, ductBot + plateThick + 16);
    ctx.textAlign = 'left';
  }
}
