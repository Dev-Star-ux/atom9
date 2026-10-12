import { createDualCanvas } from '../common/teachPlots.js';
import {
  OrbitSim,
  ORBIT_R_MAX,
  rfVoltagePhase,
  physicalRadius,
  findParticle,
  energyAtRadius,
  joulesToEV,
} from './physics.js';

// Abstract orbit units map onto this many metres at full radius — matches
// the "energy at r = 0.5 m" reference used in the module's info panel.
const PHYS_R_MAX_M = 0.5;
const RF_HISTORY_LEN = 220;

export class Cyclotron2D {
  constructor(host) {
    this.state = { particleId: 'proton', B: 1.5, ratio: 1.0, dee: 1.0 };
    this.sim = new OrbitSim();
    this._trail = [];
    this._rfHistory = [];
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._step(phase);
      self._draw(ctx, w, h);
    });
  }

  setParams(p) {
    if (!p) return;
    Object.assign(this.state, p);
    this.sim.setParams(p);
    if (p.reset) {
      this._trail = [];
      this._rfHistory = [];
    }
  }

  // Only the abstract sim state (theta/r/crossing/extracted) is exchanged
  // between the 2D and 3D views — each view keeps its own trail geometry.
  getSnapshot() {
    return { sim: this.sim.snapshot() };
  }

  applySnapshot(snap) {
    if (!snap || !snap.sim) return;
    this.sim.applySnapshot(snap.sim);
    this._trail = [];
    this._rfHistory = [];
  }

  setPaused(v) { this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _step(phase) {
    if (!this._lastPhase) this._lastPhase = phase;
    let dt = phase - this._lastPhase;
    this._lastPhase = phase;
    if (dt <= 0 || dt > 0.2) dt = 0.016;

    const res = this.sim.step(dt, ORBIT_R_MAX);
    if (res) {
      this._trail.push({ x: res.x, y: res.y });
      if (this._trail.length > 900) this._trail.shift();
    }
    this._rfHistory.push(this.state.dee * rfVoltagePhase(this.sim.theta, this.state.ratio));
    if (this._rfHistory.length > RF_HISTORY_LEN) this._rfHistory.shift();
  }

  _kineticEnergyEV() {
    const p = findParticle(this.state.particleId);
    const rM = physicalRadius(this.sim.r, PHYS_R_MAX_M);
    const E = energyAtRadius(p.q, this.state.B, rM, p.m);
    return joulesToEV(E);
  }

  _draw(ctx, W, H) {
    if (!W || !H) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 15px system-ui,sans-serif';
    ctx.fillText('Cyclotron — resonant acceleration in a spiral orbit', 16, 26);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText('f = qB / 2πm is independent of speed, so a fixed-frequency dee voltage stays in step as the orbit grows', 16, 46);

    const cx = W / 2, cy = H * 0.56;
    const scale = Math.min(W, H * 1.3) / 380;
    const deeR = 160 * scale;

    ctx.save();
    ctx.translate(cx, cy);

    // Magnetic field indicator: a light grid of "×" marks = B into the page,
    // filling the chamber behind the dees.
    ctx.fillStyle = 'rgba(148,163,184,0.45)';
    ctx.font = (10 * Math.max(0.7, scale)) + 'px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const step = 34 * Math.max(0.55, scale);
    for (let gy = -deeR; gy <= deeR; gy += step) {
      for (let gx = -deeR; gx <= deeR; gx += step) {
        if (Math.hypot(gx, gy) > deeR - 6 * scale) continue;
        ctx.fillText('×', gx, gy);
      }
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // dees (two D-shaped electrodes with a gap) — glow strength follows the
    // instantaneous RF phase so learners can see the field alternate.
    const rf = rfVoltagePhase(this.sim.theta, this.state.ratio);
    const glow1 = Math.max(0, rf) * 0.16;
    const glow2 = Math.max(0, -rf) * 0.16;
    ctx.fillStyle = `rgba(56,189,248,${0.10 + glow1})`;
    ctx.beginPath(); ctx.arc(0, 0, deeR, -Math.PI / 2 + 0.06, Math.PI / 2 - 0.06); ctx.lineTo(0, 0); ctx.fill();
    ctx.fillStyle = `rgba(249,115,22,${0.10 + glow2})`;
    ctx.beginPath(); ctx.arc(0, 0, deeR, Math.PI / 2 + 0.06, 3 * Math.PI / 2 - 0.06); ctx.lineTo(0, 0); ctx.fill();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, deeR, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#475569';
    ctx.beginPath(); ctx.moveTo(0, -deeR); ctx.lineTo(0, deeR); ctx.stroke();

    // spiral trail
    ctx.strokeStyle = '#facc15'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    this._trail.forEach((p, i) => {
      const px = p.x * scale, py = p.y * scale;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // particle
    const px = this.sim.r * Math.cos(this.sim.theta) * scale, py = this.sim.r * Math.sin(this.sim.theta) * scale;
    ctx.fillStyle = this.sim.extracted ? '#f87171' : '#4ade80';
    ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();

    // extracted beam line shooting off toward the edge
    if (this.sim.extracted) {
      const ux = Math.cos(this.sim.theta), uy = Math.sin(this.sim.theta);
      ctx.strokeStyle = 'rgba(248,113,113,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo((this.sim.r + 40) * ux * scale, (this.sim.r + 40) * uy * scale);
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = '#38bdf8'; ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('D1', cx - 30, cy - deeR * 0.55);
    ctx.fillStyle = '#f97316';
    ctx.fillText('D2', cx - 30, cy + deeR * 0.6);
    ctx.fillStyle = 'rgba(148,163,184,0.7)';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('B into page (×)', cx + deeR * 0.4, cy - deeR - 8);

    // --- Inset: RF dee voltage vs time, with a marker at the current phase ---
    this._drawRfInset(ctx, 16, H - 140, 168, 84);

    // --- Live readouts ---
    const keV = this._kineticEnergyEV() / 1000;
    ctx.fillStyle = '#fde68a';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('KE ≈ ' + (keV >= 1 ? keV.toFixed(2) + ' keV' : (keV * 1000).toFixed(1) + ' eV'), W - 16, H - 128);
    ctx.textAlign = 'left';

    ctx.fillStyle = this.sim.extracted ? '#f87171' : '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(
      this.sim.extracted
        ? 'Beam reached the dee edge — extracted (this is how the beam is pulled out for use).'
        : 'RF/cyclotron frequency ratio = ' + this.state.ratio.toFixed(2) + '  ·  crossings = ' + this.sim.crossing,
      16, H - 16
    );
  }

  _drawRfInset(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(10,17,34,0.82)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('RF dee voltage', x + 6, y + 12);

    const midY = y + h * 0.6;
    ctx.strokeStyle = '#334155';
    ctx.beginPath(); ctx.moveTo(x + 4, midY); ctx.lineTo(x + w - 4, midY); ctx.stroke();

    const hist = this._rfHistory;
    if (hist.length > 1) {
      const plotW = w - 8;
      const amp = h * 0.36;
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i < hist.length; i++) {
        const px = x + 4 + (i / (RF_HISTORY_LEN - 1)) * plotW;
        const py = midY - hist[i] * amp;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // marker at current phase (rightmost sample)
      const last = hist[hist.length - 1];
      const mx = x + 4 + ((hist.length - 1) / (RF_HISTORY_LEN - 1)) * plotW;
      const my = midY - last * amp;
      ctx.fillStyle = last > 0 ? '#38bdf8' : '#f97316';
      ctx.beginPath(); ctx.arc(mx, my, 3.2, 0, Math.PI * 2); ctx.fill();
    }
  }
}
