// QEntangle-style 2D quantum computer — one clear side-by-side layout.
// https://qentangle.tech/quantum-computers/
import { createDualCanvas } from '../common/teachPlots.js';
import {
  bloch,
  probs,
  stateLabel,
  formatAmp,
  GATE_HELP,
} from './physics.js';

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r || 10, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function fillPanel(ctx, x, y, w, h, accent) {
  ctx.fillStyle = 'rgba(12, 18, 32, 0.92)';
  rr(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = accent || 'rgba(71, 85, 105, 0.7)';
  ctx.lineWidth = 1.5;
  rr(ctx, x, y, w, h, 14);
  ctx.stroke();
}

export class QuantumComputer2D {
  constructor(host) {
    this.host = host;
    this.state = {
      mode: 'compare',
      gate: 'H',
      noise: 0.08,
      qubit: null,
      classical: [1, 0, 1, 1],
      hist: [0, 0],
      shots: 0,
      circuit: [],
      entangled: false,
      theta: 0,
      phi: 0,
      pulse: 0,
    };
    this.paused = false;
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      if (!self.paused) self.state.pulse = phase;
      self._draw(ctx, w, h);
    });
  }

  setParams(p) {
    if (!p) return;
    const keys = [
      'mode', 'gate', 'noise', 'qubit', 'classical', 'hist', 'shots',
      'circuit', 'entangled', 'theta', 'phi',
    ];
    for (let i = 0; i < keys.length; i++) {
      if (p[keys[i]] != null) this.state[keys[i]] = p[keys[i]];
    }
  }

  setPaused(v) { this.paused = !!v; this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  tick() {}
  dispose() { if (this._canvas) this._canvas.dispose(); }

  _draw(ctx, W, H) {
    if (!W || !H) return;

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#080c16');
    bg.addColorStop(1, '#0b1424');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const pad = 14;
    const statusH = 52;
    const captionH = 56;
    const midGap = 12;
    const bodyTop = pad + statusH + 10;
    const bodyH = H - bodyTop - captionH - pad;
    const leftW = Math.floor((W - pad * 2 - midGap) * 0.38);
    const rightW = W - pad * 2 - midGap - leftW;
    const leftX = pad;
    const rightX = pad + leftW + midGap;

    this._drawStatus(ctx, pad, pad, W - pad * 2, statusH);
    this._drawClassical(ctx, leftX, bodyTop, leftW, bodyH);
    if (this.state.mode === 'hardware') {
      this._drawHardware(ctx, rightX, bodyTop, rightW, bodyH);
    } else {
      this._drawQuantum(ctx, rightX, bodyTop, rightW, bodyH);
    }
    this._drawCaption(ctx, pad, H - captionH - pad + 4, W - pad * 2, captionH - 8);
  }

  _drawStatus(ctx, x, y, w, h) {
    fillPanel(ctx, x, y, w, h, 'rgba(56,189,248,0.25)');
    const q = this.state.qubit;
    const p = q ? probs(q) : { p0: 1, p1: 0 };
    const bits = (this.state.classical || []).join('');
    const colW = w / 3;

    this._statusCell(ctx, x, y, colW, h, 'Classical register', bits, '#fbbf24');
    this._statusCell(ctx, x + colW, y, colW, h, 'Quantum state', q ? stateLabel(q) : '|0⟩', '#22d3ee');
    this._statusCell(
      ctx, x + colW * 2, y, colW, h,
      'Measurement',
      'P(0)=' + p.p0.toFixed(2) + '  P(1)=' + p.p1.toFixed(2),
      '#a78bfa'
    );
  }

  _statusCell(ctx, x, y, w, h, label, value, color) {
    ctx.fillStyle = '#64748b';
    ctx.font = '11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + 18);
    ctx.fillStyle = color;
    ctx.font = '700 16px ui-monospace,Consolas,monospace';
    ctx.fillText(value, x + w / 2, y + 40);
    ctx.textAlign = 'left';
    // divider
    ctx.strokeStyle = 'rgba(51,65,85,0.8)';
    ctx.beginPath();
    ctx.moveTo(x + w, y + 10);
    ctx.lineTo(x + w, y + h - 10);
    ctx.stroke();
  }

  _drawClassical(ctx, x, y, w, h) {
    const focus = this.state.mode === 'compare';
    fillPanel(ctx, x, y, w, h, focus ? 'rgba(251,191,36,0.45)' : 'rgba(71,85,105,0.55)');

    ctx.fillStyle = '#fbbf24';
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.fillText('Normal computer', x + 16, y + 26);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('Bits · transistors · definite 0/1', x + 16, y + 44);

    const bits = this.state.classical || [1, 0, 1, 1];
    const laneTop = y + 64;
    const laneH = Math.min(48, (h - 100) / bits.length);

    for (let i = 0; i < bits.length; i++) {
      const ly = laneTop + i * laneH;
      ctx.strokeStyle = 'rgba(251,191,36,0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 20, ly + 14);
      ctx.lineTo(x + w - 56, ly + 14);
      ctx.stroke();

      const nGate = 3;
      for (let g = 0; g < nGate; g++) {
        const gx = x + 36 + g * ((w - 120) / nGate);
        ctx.fillStyle = bits[i] ? '#f59e0b' : '#1e293b';
        rr(ctx, gx, ly + 4, 28, 20, 4);
        ctx.fill();
        ctx.fillStyle = bits[i] ? '#0f172a' : '#64748b';
        ctx.font = '700 10px system-ui,sans-serif';
        ctx.fillText(g === 0 ? 'NOT' : g === 1 ? 'AND' : 'OR', gx + 4, ly + 18);
      }

      ctx.fillStyle = '#0f172a';
      rr(ctx, x + w - 44, ly + 2, 28, 24, 6);
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      ctx.font = '700 16px ui-monospace,Consolas,monospace';
      ctx.fillText(String(bits[i]), x + w - 34, ly + 20);
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('bit ∈ {0, 1}  —  every step is definite', x + 16, y + h - 16);
  }

  _drawQuantum(ctx, x, y, w, h) {
    const mode = this.state.mode;
    const accent = mode === 'gates' ? 'rgba(129,140,248,0.55)'
      : mode === 'qubit' ? 'rgba(34,211,238,0.55)'
      : 'rgba(56,189,248,0.4)';
    fillPanel(ctx, x, y, w, h, accent);

    ctx.fillStyle = '#22d3ee';
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.fillText('Quantum computer', x + 16, y + 26);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('Qubit · gates · amplitudes · shots', x + 16, y + 44);

    // Circuit strip
    const cirY = y + 56;
    this._drawCircuit(ctx, x + 14, cirY, w - 28, 40);

    // Three columns: Bloch | amps+cryo | histogram
    const contentTop = cirY + 52;
    const contentH = h - (contentTop - y) - 20;
    const c1 = Math.floor((w - 36) * 0.34);
    const c2 = Math.floor((w - 36) * 0.33);
    const c3 = (w - 36) - c1 - c2;
    const x1 = x + 14;
    const x2 = x1 + c1 + 6;
    const x3 = x2 + c2 + 6;

    this._drawBloch(ctx, x1, contentTop, c1, contentH, mode === 'qubit');
    this._drawAmpsAndCryo(ctx, x2, contentTop, c2, contentH);
    this._drawHist(ctx, x3, contentTop, c3, contentH);
  }

  _drawCircuit(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(15,23,42,0.9)';
    rr(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = this.state.mode === 'gates' ? 'rgba(129,140,248,0.7)' : 'rgba(51,65,85,0.9)';
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('circuit', x + 10, y + 14);

    ctx.strokeStyle = 'rgba(148,163,184,0.45)';
    ctx.beginPath();
    ctx.moveTo(x + 58, y + h / 2 + 4);
    ctx.lineTo(x + w - 12, y + h / 2 + 4);
    ctx.stroke();

    const circ = this.state.circuit || [];
    let gx = x + 64;
    if (!circ.length) {
      ctx.fillStyle = '#475569';
      ctx.font = '11px system-ui,sans-serif';
      ctx.fillText('Apply a gate from the panel →', gx, y + h / 2 + 8);
      return;
    }
    for (let i = 0; i < circ.length; i++) {
      const g = circ[i];
      const col = g === 'H' ? '#22d3ee' : g === 'X' ? '#fbbf24' : g === 'M' ? '#f87171'
        : g === 'CNOT' ? '#c084fc' : '#818cf8';
      const bw = g === 'CNOT' ? 44 : 28;
      ctx.fillStyle = col;
      rr(ctx, gx, y + 12, bw, 22, 5);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.font = '700 11px system-ui,sans-serif';
      ctx.fillText(g, gx + 6, y + 27);
      gx += bw + 8;
      if (gx > x + w - 40) break;
    }
  }

  _drawBloch(ctx, x, y, w, h, focus) {
    ctx.fillStyle = focus ? 'rgba(8,47,73,0.55)' : 'rgba(15,23,42,0.55)';
    rr(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('Bloch sphere', x + 10, y + 18);

    const cx = x + w / 2;
    const cy = y + h * 0.52;
    const R = Math.min(w, h) * 0.32;

    ctx.strokeStyle = 'rgba(148,163,184,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx, cy, R, R * 0.32, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(100,116,139,0.6)';
    ctx.beginPath();
    ctx.moveTo(cx, cy - R - 4);
    ctx.lineTo(cx, cy + R + 4);
    ctx.moveTo(cx - R - 4, cy);
    ctx.lineTo(cx + R + 4, cy);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('|0⟩', cx + 6, cy - R - 6);
    ctx.fillText('|1⟩', cx + 6, cy + R + 12);
    ctx.fillText('|+⟩', cx + R + 2, cy + 3);

    const q = this.state.qubit;
    if (!q) return;
    const b = bloch(q);
    const pulse = 1 + 0.03 * Math.sin(this.state.pulse * 2.5);
    const tipX = cx + b.x * R * pulse;
    const tipY = cy - b.z * R * pulse;
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.arc(tipX, tipY, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('θ=' + Math.round(this.state.theta || 0) + '°  φ=' + Math.round(this.state.phi || 0) + '°', x + 10, y + h - 10);
  }

  _drawAmpsAndCryo(ctx, x, y, w, h) {
    const mid = y + Math.floor(h * 0.55);
    // Amplitudes
    ctx.fillStyle = 'rgba(15,23,42,0.55)';
    rr(ctx, x, y, w, mid - y - 6, 10);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('Amplitudes', x + 10, y + 18);

    const q = this.state.qubit;
    if (q) {
      const p = probs(q);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '11px ui-monospace,Consolas,monospace';
      ctx.fillText('α ' + formatAmp(q[0]), x + 10, y + 40);
      ctx.fillText('β ' + formatAmp(q[1]), x + 10, y + 58);
      this._bar(ctx, x + 10, y + 72, w - 20, 14, p.p0, '#38bdf8', '|α|²');
      this._bar(ctx, x + 10, y + 98, w - 20, 14, p.p1, '#a78bfa', '|β|²');
    }

    // Mini cryostat
    const cy = mid;
    const ch = y + h - mid;
    ctx.fillStyle = 'rgba(15,23,42,0.55)';
    rr(ctx, x, cy, w, ch, 10);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('Hardware (cryostat)', x + 10, cy + 18);

    const cx = x + w / 2;
    const canY = cy + ch * 0.55;
    const canR = Math.min(28, w * 0.22);
    ctx.fillStyle = 'rgba(203,213,225,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, canY - 36, canR * 0.85, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(148,163,184,0.4)';
    rr(ctx, cx - canR, canY - 40, canR * 2, 52, 8);
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    rr(ctx, cx - 12, canY + 4, 24, 8, 2);
    ctx.fill();
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('qubit chip', cx - 22, canY + 28);
  }

  _drawHist(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(15,23,42,0.55)';
    rr(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('Shots histogram', x + 10, y + 18);

    const hist = this.state.hist || [0, 0];
    const total = Math.max(1, hist[0] + hist[1]);
    const labels = this.state.entangled ? ['00', '11'] : ['0', '1'];
    const vals = [hist[0] / total, hist[1] / total];
    const base = y + h - 28;
    const maxH = h - 70;
    const bw = Math.min(40, (w - 40) / 2 - 8);

    for (let i = 0; i < 2; i++) {
      const bh = Math.max(4, vals[i] * maxH);
      const bx = x + 18 + i * (bw + 18);
      ctx.fillStyle = i === 0 ? '#38bdf8' : '#a78bfa';
      rr(ctx, bx, base - bh, bw, bh, 6);
      ctx.fill();
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '11px system-ui,sans-serif';
      ctx.fillText('|' + labels[i] + '⟩', bx + 8, base + 16);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(Math.round(vals[i] * 100) + '%', bx + 6, base - bh - 6);
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText((this.state.shots || 0) + ' shots', x + 10, y + 36);
  }

  _bar(ctx, x, y, w, h, frac, color, label) {
    ctx.fillStyle = '#1e293b';
    rr(ctx, x, y, w, h, 4);
    ctx.fill();
    ctx.fillStyle = color;
    rr(ctx, x, y, Math.max(2, w * Math.max(0, Math.min(1, frac))), h, 4);
    ctx.fill();
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText(label + ' ' + frac.toFixed(2), x, y - 3);
  }

  _drawHardware(ctx, x, y, w, h) {
    fillPanel(ctx, x, y, w, h, 'rgba(56,189,248,0.45)');
    ctx.fillStyle = '#22d3ee';
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.fillText('Hardware — physical quantum computer', x + 16, y + 24);

    const steps = [
      { t: '01 Platform', d: 'Pick qubit type (superconducting chip here)', live: 'Chip selected' },
      { t: '02 Isolate', d: 'Cool & shield so the environment cannot “measure”', live: 'Cryostat cooling…' },
      { t: '03 Control', d: 'Microwave pulses implement gates on the chip', live: 'Sending gate pulses' },
      { t: '04 Compile', d: 'Map your circuit to native hardware gates', live: 'Compiling circuit' },
      { t: '05 Shots', d: 'Run many times → bitstring histogram', live: 'Collecting shots' },
      { t: '06 Correct', d: 'Error checks protect logical qubits', live: 'Syndrome check OK' },
    ];
    // Cycle active step every ~2.2s
    const stepIdx = Math.floor((this.state.pulse || 0) / 2.2) % steps.length;
    this.state.hwStep = stepIdx;

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('Watch the highlighted step — this is what real machines do', x + 16, y + 42);

    // Left: animated cryostat machine
    const leftW = Math.floor(w * 0.42);
    this._drawCryostatLive(ctx, x + 12, y + 54, leftW - 8, h - 70, stepIdx);

    // Right: vertical pipeline
    const px = x + leftW + 8;
    const pw = w - leftW - 24;
    const top = y + 54;
    const rowH = (h - 70) / steps.length;

    for (let i = 0; i < steps.length; i++) {
      const ry = top + i * rowH;
      const active = i === stepIdx;
      const done = i < stepIdx;
      ctx.fillStyle = active ? 'rgba(14,116,144,0.45)' : 'rgba(15,23,42,0.75)';
      rr(ctx, px, ry + 2, pw, rowH - 6, 8);
      ctx.fill();
      if (active) {
        ctx.strokeStyle = 'rgba(34,211,238,0.85)';
        ctx.lineWidth = 1.5;
        rr(ctx, px, ry + 2, pw, rowH - 6, 8);
        ctx.stroke();
      }
      // status dot
      ctx.fillStyle = active ? '#22d3ee' : done ? '#34d399' : '#334155';
      ctx.beginPath();
      ctx.arc(px + 14, ry + rowH / 2, active ? 5 : 4, 0, Math.PI * 2);
      ctx.fill();
      if (active) {
        ctx.strokeStyle = 'rgba(34,211,238,0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px + 14, ry + rowH / 2, 8 + 2 * Math.sin(this.state.pulse * 4), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = active ? '#e0f2fe' : '#e2e8f0';
      ctx.font = (active ? '700 ' : '') + '11px system-ui,sans-serif';
      ctx.fillText(steps[i].t, px + 28, ry + 16);
      ctx.fillStyle = active ? '#a5f3fc' : '#64748b';
      ctx.font = '10px system-ui,sans-serif';
      const line = active ? '▶ ' + steps[i].live : steps[i].d;
      ctx.fillText(line, px + 28, ry + 32);
    }
  }

  _drawCryostatLive(ctx, x, y, w, h, stepIdx) {
    ctx.fillStyle = 'rgba(15,23,42,0.7)';
    rr(ctx, x, y, w, h, 12);
    ctx.fill();

    const cx = x + w / 2;
    const cy = y + h * 0.55;
    const pulse = this.state.pulse || 0;

    // Cooling rings (isolate)
    if (stepIdx === 1 || stepIdx === 0) {
      for (let i = 0; i < 4; i++) {
        const r = 28 + i * 14 + (pulse * 8) % 14;
        ctx.strokeStyle = 'rgba(56,189,248,' + (0.35 - i * 0.07) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy - 10, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Can
    ctx.fillStyle = 'rgba(203,213,225,0.28)';
    rr(ctx, cx - 36, cy - 70, 72, 110, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(148,163,184,0.55)';
    ctx.stroke();

    // Chip glow (control / platform)
    const glow = 0.35 + 0.35 * Math.abs(Math.sin(pulse * (stepIdx === 2 ? 5 : 2)));
    ctx.fillStyle = 'rgba(251,191,36,' + glow + ')';
    rr(ctx, cx - 16, cy - 8, 32, 14, 3);
    ctx.fill();
    ctx.fillStyle = '#fde68a';
    ctx.font = '9px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('qubit', cx, cy + 2);
    ctx.textAlign = 'left';

    // Pulse waves into chip (control)
    if (stepIdx === 2 || stepIdx === 3) {
      for (let i = 0; i < 5; i++) {
        const px = x + 12 + ((pulse * 40 + i * 18) % (w - 24));
        ctx.strokeStyle = 'rgba(167,139,250,0.55)';
        ctx.beginPath();
        ctx.moveTo(px, cy - 50);
        ctx.quadraticCurveTo(px + 8, cy - 30, px, cy - 10);
        ctx.stroke();
      }
      ctx.fillStyle = '#c4b5fd';
      ctx.font = '10px system-ui,sans-serif';
      ctx.fillText('microwave pulse', x + 10, y + 22);
    }

    // Shot sparks (measure)
    if (stepIdx === 4) {
      for (let i = 0; i < 6; i++) {
        const ang = pulse * 2 + i;
        ctx.fillStyle = i % 2 ? '#38bdf8' : '#a78bfa';
        ctx.beginPath();
        ctx.arc(cx + Math.cos(ang) * 40, cy + 40 + Math.sin(ang * 1.3) * 8, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#67e8f9';
      ctx.font = '10px system-ui,sans-serif';
      ctx.fillText('readout → classical bits', x + 10, y + h - 14);
    }

    // Error correction checkmarks
    if (stepIdx === 5) {
      ctx.fillStyle = '#34d399';
      ctx.font = '11px system-ui,sans-serif';
      ctx.fillText('✓ syndrome OK', x + 14, y + 24);
      ctx.fillText('✓ logical qubit held', x + 14, y + 40);
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('dilution fridge · ~10 mK', x + 10, y + h - 14);
  }

  _drawCaption(ctx, x, y, w, h) {
    fillPanel(ctx, x, y, w, h, 'rgba(51,65,85,0.5)');
    const mode = this.state.mode;
    const gate = this.state.gate;
    const hwNames = [
      'Platform — choose the physical qubit',
      'Isolate — cryostat keeps noise out',
      'Control — pulses = quantum gates',
      'Compile — circuit → hardware gates',
      'Shots — many runs build the histogram',
      'Correct — detect errors without reading the answer',
    ];
    let title = '';
    let body = '';
    if (mode === 'compare') {
      title = 'Classical vs quantum';
      body = 'Left: definite bits. Right: amplitudes α, β. Same information, different rules.';
    } else if (mode === 'qubit') {
      title = 'Single qubit';
      body = '|ψ⟩ = α|0⟩ + β|1⟩. Drag polar angle / phase in the panel — watch the Bloch arrow move.';
    } else if (mode === 'gates') {
      title = 'Gate: ' + gate;
      body = (GATE_HELP()[gate] || '') + '  Apply gate, then Measure or Run shots.';
    } else {
      const si = typeof this.state.hwStep === 'number' ? this.state.hwStep : 0;
      title = 'Hardware working · step ' + (si + 1) + '/6';
      body = hwNames[si] || 'Physical machine behind the abstract gates.';
    }
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 12px system-ui,sans-serif';
    ctx.fillText(title, x + 16, y + 20);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(body, x + 16, y + 40);
  }
}

function wrap(ctx, text, x, y, maxW, lineH) {
  const words = String(text).split(' ');
  let line = '';
  let yy = y;
  for (let i = 0; i < words.length; i++) {
    const test = line + words[i] + ' ';
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = words[i] + ' ';
      yy += lineH;
    } else line = test;
  }
  ctx.fillText(line, x, yy);
}
