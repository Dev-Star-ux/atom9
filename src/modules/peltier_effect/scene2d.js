// Peltier effect — 2D cross-section of a real TEC-style thermoelectric
// cooler module: two ceramic plates sandwiching a row of alternating P/N
// semiconductor pillars, wired in series by zig-zag copper tabs, with an
// ΔT-vs-time chart underneath tracking the cold-face temperature.
import { createDualCanvas } from '../common/teachPlots.js';
import { stepDeltaT } from './physics.js';

const N_PILLARS = 8;
const COLD_COLOR = '#38bdf8';
const HOT_COLOR = '#f97316';
const COPPER = '#c2884b';
const N_LEG = '#5b6b85';
const P_LEG = '#8a5a2b';

export class Peltier2D {
  constructor(host) {
    this.state = { I: 1.5, T0: 293, thermalMass: 6 };
    this._dT = 0;
    this._history = [];
    this._t = 0;
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._step(phase);
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) {
    if (!p) return;
    Object.assign(this.state, p);
    if (p.reset) { this._dT = 0; this._history = []; this._t = 0; }
  }

  setPaused(v) { this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _step(phase) {
    if (!this._lastPhase) this._lastPhase = phase;
    let dt = phase - this._lastPhase;
    this._lastPhase = phase;
    if (dt <= 0 || dt > 0.2) dt = 0.016;
    const s = this.state;
    this._dT = stepDeltaT(this._dT, s.I, s.T0, s.thermalMass, dt);
    this._t += dt;
    this._history.push({ t: this._t, dT: this._dT });
    const tMin = this._t - 20;
    while (this._history.length && this._history[0].t < tMin) this._history.shift();
  }

  _draw(ctx, W, H, phase) {
    if (!W || !H) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);
    const s = this.state;
    const cooling = s.I >= 0;
    const Tc = s.T0 - this._dT;

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 15px system-ui,sans-serif';
    ctx.fillText('Peltier effect — inside a thermoelectric cooler (TEC) module', 16, 24);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText('Alternating P/N pillars, wired in series, carry heat from the cold ceramic plate to the hot one', 16, 42);

    const diagramTop = 92;
    const diagramH = Math.min(210, H * 0.38);
    this._drawModule(ctx, W, diagramTop, diagramH, cooling, Tc, phase);
    this._drawChart(ctx, W, H, diagramTop + diagramH + 78);
  }

  _drawModule(ctx, W, top, diagramH, cooling, Tc, phase) {
    const moduleW = Math.min(560, W * 0.76);
    const left = W / 2 - moduleW / 2;
    const plateH = 16;
    const tabH = 10;
    const pillarAreaTop = top + plateH + tabH;
    const pillarAreaBottom = top + diagramH - plateH - tabH;
    const pillarAreaH = Math.max(30, pillarAreaBottom - pillarAreaTop);
    const n = N_PILLARS;
    const gap = moduleW / n;
    const pillarW = gap * 0.56;

    const topIsCold = cooling;
    const topColor = topIsCold ? COLD_COLOR : HOT_COLOR;
    const bottomColor = topIsCold ? HOT_COLOR : COLD_COLOR;

    // Ceramic plates (top = ..., bottom = ...)
    ctx.fillStyle = topColor;
    ctx.fillRect(left, top, moduleW, plateH);
    ctx.strokeStyle = '#0b1220';
    ctx.strokeRect(left + 0.5, top + 0.5, moduleW - 1, plateH - 1);
    ctx.fillStyle = bottomColor;
    ctx.fillRect(left, top + diagramH - plateH, moduleW, plateH);
    ctx.strokeRect(left + 0.5, top + diagramH - plateH + 0.5, moduleW - 1, plateH - 1);

    // Pillars: alternating P/N semiconductor legs
    const pillarX = [];
    for (let i = 0; i < n; i++) {
      const cx = left + gap * i + gap / 2;
      const x = cx - pillarW / 2;
      pillarX.push(cx);
      const isN = i % 2 === 0;
      ctx.fillStyle = isN ? N_LEG : P_LEG;
      ctx.fillRect(x, pillarAreaTop, pillarW, pillarAreaH);
      ctx.strokeStyle = '#0b1220';
      ctx.strokeRect(x + 0.5, pillarAreaTop + 0.5, pillarW - 1, pillarAreaH - 1);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '700 11px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(isN ? 'N' : 'P', cx, pillarAreaTop + pillarAreaH / 2 + 4);
      ctx.textAlign = 'left';
    }

    // Zig-zag copper tabs wiring the pillars in series: top tabs bridge
    // pairs (0,1),(2,3),... just under the top plate; bottom tabs bridge
    // the offset pairs (1,2),(3,4),... just above the bottom plate.
    ctx.fillStyle = COPPER;
    for (let i = 0; i + 1 < n; i += 2) {
      const x0 = pillarX[i] - pillarW / 2;
      const x1 = pillarX[i + 1] + pillarW / 2;
      ctx.fillRect(x0, top + plateH, x1 - x0, tabH);
    }
    for (let i = 1; i + 1 < n; i += 2) {
      const x0 = pillarX[i] - pillarW / 2;
      const x1 = pillarX[i + 1] + pillarW / 2;
      ctx.fillRect(x0, pillarAreaBottom, x1 - x0, tabH);
    }
    // External leads at the two free ends of the series chain
    ctx.strokeStyle = COPPER;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pillarX[0], pillarAreaBottom + tabH / 2);
    ctx.lineTo(left - 18, pillarAreaBottom + tabH / 2);
    ctx.moveTo(pillarX[n - 1], pillarAreaBottom + tabH / 2);
    ctx.lineTo(left + moduleW + 18, pillarAreaBottom + tabH / 2);
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 12px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(cooling ? '−' : '+', left - 18, pillarAreaBottom + tabH / 2 - 8);
    ctx.fillText(cooling ? '+' : '−', left + moduleW + 18, pillarAreaBottom + tabH / 2 - 8);
    ctx.textAlign = 'left';

    // Moving charge carriers inside each pillar, travelling from the cold
    // face to the hot face (direction flips with the plate swap above).
    const dirDown = topIsCold; // true: cold(top) -> hot(bottom)
    const speed = 0.35 + Math.min(1, Math.abs(this.state.I) / 3) * 0.9;
    for (let i = 0; i < n; i++) {
      const cx = pillarX[i];
      for (let k = 0; k < 2; k++) {
        const seed = (i * 0.37 + k * 0.5) % 1;
        const tt = (phase * speed + seed) % 1;
        const yFrac = dirDown ? tt : 1 - tt;
        const y = pillarAreaTop + yFrac * pillarAreaH;
        const fade = Math.min(1, Math.min(tt, 1 - tt) * 6);
        ctx.fillStyle = 'rgba(251,191,36,' + (0.35 + 0.55 * fade).toFixed(2) + ')';
        ctx.beginPath();
        ctx.arc(cx, y, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Plate labels
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.textAlign = 'center';
    const topLabel = (topIsCold ? 'cold ceramic plate' : 'hot ceramic plate') +
      (topIsCold ? '  ' + Tc.toFixed(1) + ' K (' + (Tc - 273).toFixed(1) + ' °C)' : '');
    ctx.fillText(topLabel, W / 2, top - 10);
    const bottomLabel = (topIsCold ? 'hot ceramic plate' : 'cold ceramic plate') +
      (!topIsCold ? '  ' + Tc.toFixed(1) + ' K (' + (Tc - 273).toFixed(1) + ' °C)' : '');
    ctx.fillText(bottomLabel, W / 2, top + diagramH + 20);
    ctx.textAlign = 'left';

    // Current / polarity readout
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText(
      'I = ' + this.state.I.toFixed(2) + ' A  ·  ' + (cooling ? 'polarity: cooling (top face)' : 'polarity reversed: heating (top face)') +
      '  ·  dots show heat/charge carried cold→hot inside each pillar',
      left, top + diagramH + 40
    );
  }

  _drawChart(ctx, W, H, cTop) {
    const padL = 56, padR = 24, cH = Math.max(60, H - cTop - 30), cW = W - padL - padR;
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.fillText('Cold-face ΔT vs time (approach to equilibrium)', padL, cTop - 8);
    ctx.fillStyle = '#0a1122';
    ctx.fillRect(padL, cTop, cW, cH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(padL + 0.5, cTop + 0.5, cW - 1, cH - 1);
    if (this._history.length > 1) {
      const tEnd = this._history[this._history.length - 1].t;
      const tStart = tEnd - 20;
      function X(t) { return padL + ((t - tStart) / 20) * cW; }
      function Y(dT) { return cTop + cH - ((dT + 15) / 75) * cH; }
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 2;
      ctx.beginPath();
      this._history.forEach((p, i) => {
        const px = X(p.t), py = Y(p.dT);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('time (s) →', padL + cW / 2 - 24, cTop + cH + 16);
  }
}
