/** GM dead-time + energy-response teaching canvas. */
import { createDualCanvas } from '../common/teachPlots.js';
import {
  observedRate,
  lostFraction,
  plateauRate,
  regionName,
  pulseHeight,
  DEMO_LINES,
} from './physics.js';

export class GmDeadTime2D {
  constructor(host) {
    this.state = {
      view: 'deadtime', // deadtime | energy | plateau
      trueRate: 8000,
      deadTimeUs: 100,
      voltage: 1000,
      sourceStrength: 1,
    };
    this._pulses = [];
    this._t = 0;
    this._nextTrue = 0;
    this._deadUntil = 0;
    this._obsCount = 0;
    this._trueCount = 0;
    this._windowS = 2;
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._sim(phase);
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.view != null) this.state.view = p.view;
    if (p.trueRate != null) this.state.trueRate = p.trueRate;
    if (p.deadTimeUs != null) this.state.deadTimeUs = p.deadTimeUs;
    if (p.voltage != null) this.state.voltage = p.voltage;
    if (p.sourceStrength != null) this.state.sourceStrength = p.sourceStrength;
    if (p.reset) this._resetSim();
  }

  _resetSim() {
    this._pulses = [];
    this._t = 0;
    this._nextTrue = 0;
    this._deadUntil = 0;
    this._obsCount = 0;
    this._trueCount = 0;
  }

  setPaused(v) { this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _sim(phase) {
    // Advance a teaching clock tied to animation phase delta ~16ms
    if (!this._lastPhase) this._lastPhase = phase;
    let dt = phase - this._lastPhase;
    this._lastPhase = phase;
    if (dt <= 0 || dt > 0.2) dt = 0.016;
    if (this.state.view !== 'deadtime') return;

    const m = this.state.trueRate;
    const tau = this.state.deadTimeUs * 1e-6;
    this._t += dt;

    // Schedule true events as Poisson-ish using exponential waits
    while (this._nextTrue <= this._t + 0.001) {
      this._trueCount++;
      const tEvent = this._nextTrue;
      const counted = tEvent >= this._deadUntil;
      if (counted) {
        this._obsCount++;
        this._deadUntil = tEvent + tau;
        this._pulses.push({ t: tEvent, h: 1, counted: true });
      } else {
        this._pulses.push({ t: tEvent, h: 0.35, counted: false });
      }
      // next wait
      const u = Math.random() || 1e-12;
      const wait = m > 0 ? -Math.log(u) / m : 1;
      this._nextTrue += wait;
    }

    // prune old pulses
    const t0 = this._t - this._windowS;
    while (this._pulses.length && this._pulses[0].t < t0) this._pulses.shift();
  }

  _draw(ctx, W, H) {
    if (!W || !H) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);

    if (this.state.view === 'deadtime') this._drawDeadTime(ctx, W, H);
    else if (this.state.view === 'energy') this._drawEnergy(ctx, W, H);
    else this._drawPlateau(ctx, W, H);
  }

  _drawDeadTime(ctx, W, H) {
    const m = this.state.trueRate;
    const tauUs = this.state.deadTimeUs;
    const n = observedRate(m, tauUs);
    const lost = lostFraction(m, tauUs);

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 15px system-ui,sans-serif';
    ctx.fillText('Dead time — missed counts at high rate', 16, 26);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(
      'True m = ' + Math.round(m) + ' s⁻¹   ·   τ = ' + tauUs + ' µs   ·   Observed n = m/(1+mτ) = ' +
      n.toFixed(0) + ' s⁻¹   ·   Lost ' + (100 * lost).toFixed(1) + '%',
      16, 46
    );

    // Pulse trace
    const padL = 48;
    const padR = 20;
    const top = 64;
    const midH = Math.min(160, H * 0.38);
    const plotW = W - padL - padR;
    const t0 = this._t - this._windowS;
    const t1 = this._t;

    ctx.fillStyle = '#0a1122';
    ctx.fillRect(padL, top, plotW, midH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(padL + 0.5, top + 0.5, plotW - 1, midH - 1);

    // Dead windows as red bands
    const tau = tauUs * 1e-6;
    ctx.fillStyle = 'rgba(248, 113, 113, 0.12)';
    for (let i = 0; i < this._pulses.length; i++) {
      const p = this._pulses[i];
      if (!p.counted) continue;
      const x0 = padL + ((p.t - t0) / this._windowS) * plotW;
      const x1 = padL + ((p.t + tau - t0) / this._windowS) * plotW;
      if (x1 < padL || x0 > padL + plotW) continue;
      ctx.fillRect(Math.max(padL, x0), top, Math.min(padL + plotW, x1) - Math.max(padL, x0), midH);
    }

    // Pulses
    for (let i = 0; i < this._pulses.length; i++) {
      const p = this._pulses[i];
      const x = padL + ((p.t - t0) / this._windowS) * plotW;
      if (x < padL || x > padL + plotW) continue;
      const h = p.h * (midH * 0.72);
      ctx.strokeStyle = p.counted ? '#4ade80' : '#f87171';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, top + midH - 8);
      ctx.lineTo(x, top + midH - 8 - h);
      ctx.stroke();
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('time →  (last ' + this._windowS + ' s)', padL, top + midH + 16);
    ctx.fillStyle = '#4ade80';
    ctx.fillText('■ counted', padL + plotW - 160, top + midH + 16);
    ctx.fillStyle = '#f87171';
    ctx.fillText('■ lost (in τ)', padL + plotW - 80, top + midH + 16);

    // Rate curves: n vs m for several τ
    const cTop = top + midH + 36;
    const cH = H - cTop - 28;
    const cW = plotW;
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.fillText('Observed rate vs true rate (non-paralyzable)', padL, cTop - 6);

    ctx.fillStyle = '#0a1122';
    ctx.fillRect(padL, cTop, cW, cH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(padL + 0.5, cTop + 0.5, cW - 1, cH - 1);

    const mMax = 20000;
    const nMax = 12000;
    function X(mv) { return padL + (mv / mMax) * cW; }
    function Y(nv) { return cTop + cH - (nv / nMax) * cH; }

    // Ideal n=m
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(X(0), Y(0));
    ctx.lineTo(X(Math.min(mMax, nMax)), Y(Math.min(mMax, nMax)));
    ctx.stroke();
    ctx.setLineDash([]);

    // Curve for current τ
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) {
      const mv = (i / 80) * mMax;
      const nv = observedRate(mv, tauUs);
      const px = X(mv);
      const py = Y(nv);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Operating point
    const ox = X(m);
    const oy = Y(n);
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(ox, oy, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('true m →', padL + cW / 2 - 20, cTop + cH + 18);
    ctx.save();
    ctx.translate(14, cTop + cH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('observed n', 0, 0);
    ctx.restore();
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('you are here', ox + 8, oy - 6);
  }

  _drawEnergy(ctx, W, H) {
    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 15px system-ui,sans-serif';
    ctx.fillText('Energy response — GM does not measure E', 16, 26);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(
      'In the Geiger region every avalanche saturates → same pulse height. Contrast with a proportional counter (height ∝ E).',
      16, 46
    );

    const modes = [
      { id: 'geiger', title: 'GM tube (Geiger region)', y0: 64 },
      { id: 'proportional', title: 'Proportional counter', y0: H * 0.52 },
    ];

    for (let mi = 0; mi < modes.length; mi++) {
      const mode = modes[mi];
      const y0 = mode.y0;
      const boxH = Math.min(160, H * 0.38);
      const padL = 48;
      const padR = 24;
      const plotW = W - padL - padR;

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '600 13px system-ui,sans-serif';
      ctx.fillText(mode.title, padL, y0 - 6);

      ctx.fillStyle = '#0a1122';
      ctx.fillRect(padL, y0, plotW, boxH);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(padL + 0.5, y0 + 0.5, plotW - 1, boxH - 1);

      const n = DEMO_LINES.length;
      const gap = plotW / (n + 1);
      for (let i = 0; i < n; i++) {
        const line = DEMO_LINES[i];
        const hNorm = pulseHeight(line.E, mode.id);
        // deterministic for draw (no random flicker): use mean
        const h = mode.id === 'geiger' ? 0.92 : Math.min(1.2, line.E / 500);
        const bx = padL + gap * (i + 1);
        const bw = Math.min(56, gap * 0.45);
        const bh = h * (boxH * 0.7);
        ctx.fillStyle = mode.id === 'geiger' ? '#a78bfa' : '#34d399';
        ctx.fillRect(bx - bw / 2, y0 + boxH - 18 - bh, bw, bh);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '11px system-ui,sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(line.name, bx, y0 + boxH - 4);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px system-ui,sans-serif';
        ctx.fillText('H≈' + hNorm.toFixed(2), bx, y0 + 14);
        ctx.textAlign = 'left';
      }

      ctx.fillStyle = '#64748b';
      ctx.font = '10px system-ui,sans-serif';
      ctx.fillText('pulse height', 8, y0 + boxH / 2);
    }

    ctx.fillStyle = '#fbbf24';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText('Takeaway: a GM counter counts events — it does not build an energy spectrum (unlike NaI).', 16, H - 14);
  }

  _drawPlateau(ctx, W, H) {
    const V = this.state.voltage;
    const S = this.state.sourceStrength;
    const rate = plateauRate(V, S);
    const region = regionName(V);

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 15px system-ui,sans-serif';
    ctx.fillText('Geiger plateau — count rate vs high voltage', 16, 26);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(
      'Operate on the flat plateau. Too low → incomplete counts. Too high → continuous discharge.',
      16, 46
    );

    const padL = 56;
    const padR = 24;
    const top = 70;
    const plotH = H - top - 40;
    const plotW = W - padL - padR;
    const Vmin = 300;
    const Vmax = 1500;
    const Rmax = 180 * S;

    ctx.fillStyle = '#0a1122';
    ctx.fillRect(padL, top, plotW, plotH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(padL + 0.5, top + 0.5, plotW - 1, plotH - 1);

    function X(v) { return padL + ((v - Vmin) / (Vmax - Vmin)) * plotW; }
    function Y(r) { return top + plotH - (r / Rmax) * plotH; }

    // Region bands
    const bands = [
      { a: 400, b: 700, c: 'rgba(56,189,248,0.08)', lab: 'Prop.' },
      { a: 700, b: 900, c: 'rgba(251,191,36,0.08)', lab: 'Limited' },
      { a: 900, b: 1200, c: 'rgba(74,222,128,0.10)', lab: 'Geiger plateau' },
      { a: 1200, b: 1500, c: 'rgba(248,113,113,0.10)', lab: 'Continuous' },
    ];
    for (let i = 0; i < bands.length; i++) {
      const b = bands[i];
      const x0 = X(b.a);
      const x1 = X(b.b);
      ctx.fillStyle = b.c;
      ctx.fillRect(x0, top, x1 - x0, plotH);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.lab, (x0 + x1) / 2, top + 14);
      ctx.textAlign = 'left';
    }

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const v = Vmin + (i / 100) * (Vmax - Vmin);
      const r = plateauRate(v, S);
      const px = X(v);
      const py = Y(r);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Operating point
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(X(V), Y(rate), 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(
      'HV = ' + Math.round(V) + ' V   ·   rate ≈ ' + rate.toFixed(0) + ' (arb.)   ·   region: ' + region,
      padL, top + plotH + 24
    );
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('voltage (V) →', padL + plotW / 2 - 30, top + plotH + 38);
  }
}
