import { createDualCanvas } from '../common/teachPlots.js';
import {
  diodeCurrent, thermalVoltage, rectifiedHalfWave, rectifiedFullWave, acSample,
  depletionWidthFrac, carrierState,
} from './physics.js';

const N_HOLES = 9;
const N_ELECTRONS = 9;

export class PnJunction2D {
  constructor(host) {
    this.state = {
      view: 'junction',
      Vf: 0.6,
      Is: 1e-12,
      n: 1.5,
      T: 300,
      amp: 5,
      freq: 1,
      mode: 'half',
      smooth: false,
      loadR: 1000,
    };
    this._cap = 0; // smoothing-capacitor voltage memory
    this._trail = [];
    this._holes = [];
    this._electrons = [];
    for (let i = 0; i < N_HOLES; i++) {
      this._holes.push({ seed: i / N_HOLES, lane: (((i * 0.618) % 1) - 0.5) });
    }
    for (let i = 0; i < N_ELECTRONS; i++) {
      this._electrons.push({ seed: i / N_ELECTRONS, lane: (((i * 0.437 + 0.2) % 1) - 0.5) });
    }
    this._flashes = [];
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) {
    if (!p) return;
    Object.assign(this.state, p);
    if (p.reset) { this._cap = 0; this._trail = []; this._flashes = []; }
  }

  setPaused(v) { this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _draw(ctx, W, H, phase) {
    if (!W || !H) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);
    if (this.state.view === 'junction') this._drawJunction(ctx, W, H, phase);
    else if (this.state.view === 'iv') this._drawIV(ctx, W, H);
    else this._drawRectifier(ctx, W, H, phase);
  }

  // ---- Junction cross-section: doping, depletion region, carrier motion ----
  _drawJunction(ctx, W, H, phase) {
    const s = this.state;
    const Vbias = s.Vf;
    const df = depletionWidthFrac(Vbias);
    const cs = carrierState(Vbias);

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 15px system-ui,sans-serif';
    ctx.fillText('P-N junction cross-section', 16, 26);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(
      'bias = ' + Vbias.toFixed(2) + ' V   ·   depletion width ≈ ' + Math.round(df * 100) + '% of max   ·   ' +
      (cs.diffusing ? 'forward: majority carriers diffuse across and recombine' : 'reverse/near-zero: junction blocks current, only tiny leakage'),
      16, 46
    );

    const padL = 40, padR = 40, top = 86;
    const barH = Math.min(170, H * 0.36);
    const barY = top;
    const barX0 = padL, barX1 = W - padR;
    const barW = barX1 - barX0;
    const midX = barX0 + barW * 0.5;
    const maxDepHalf = barW * 0.16;
    const depHalf = Math.max(6, maxDepHalf * df);
    const depL = midX - depHalf;
    const depR = midX + depHalf;

    // --- crystal bar background ---
    ctx.fillStyle = 'rgba(127,29,29,0.28)';
    ctx.fillRect(barX0, barY, depL - barX0, barH);
    ctx.fillStyle = 'rgba(30,58,138,0.28)';
    ctx.fillRect(depR, barY, barX1 - depR, barH);
    ctx.fillStyle = 'rgba(148,163,184,0.16)';
    ctx.fillRect(depL, barY, depR - depL, barH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(barX0 + 0.5, barY + 0.5, barW - 1, barH - 1);
    ctx.save();
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = 'rgba(226,232,240,0.5)';
    ctx.beginPath(); ctx.moveTo(depL, barY); ctx.lineTo(depL, barY + barH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(depR, barY); ctx.lineTo(depR, barY + barH); ctx.stroke();
    ctx.restore();

    // --- fixed dopant ions: faint scatter across each region, bold where exposed inside the depletion band ---
    ctx.font = '11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    const rows = 5;
    for (let r = 0; r < rows; r++) {
      const y = barY + barH * ((r + 0.5) / rows);
      // acceptor ions (−) across the P side
      for (let x = barX0 + 14; x < depR + 6; x += 22) {
        if (x > depL - 4 && x < depR + 4) {
          if (x >= barX0 && x < midX) { ctx.fillStyle = 'rgba(248,113,113,0.85)'; ctx.fillText('−', x, y); }
        } else if (x < depL) {
          ctx.fillStyle = 'rgba(248,113,113,0.28)';
          ctx.fillText('−', x, y);
        }
      }
      // donor ions (+) across the N side
      for (let x = depL - 6; x < barX1 - 14; x += 22) {
        if (x >= depL - 4 && x <= depR + 4) {
          if (x >= midX) { ctx.fillStyle = 'rgba(96,165,250,0.9)'; ctx.fillText('+', x, y); }
        } else if (x > depR) {
          ctx.fillStyle = 'rgba(96,165,250,0.28)';
          ctx.fillText('+', x, y);
        }
      }
    }
    ctx.textAlign = 'left';

    // --- mobile carriers ---
    const speed = 0.28 + cs.strength * 0.9;
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < this._holes.length; i++) {
      const hd = this._holes[i];
      const y = barY + barH * (0.5 + hd.lane * 0.82);
      let x;
      if (cs.diffusing) {
        // diffuse rightward from the P edge, across the junction, and recombine just inside N
        const t = ((phase * speed) + hd.seed) % 1;
        const start = barX0 + 16;
        const end = midX + depHalf * 0.6 + 14;
        x = start + (end - start) * t;
        if (t > 0.95) this._spawnFlash(midX + depHalf * 0.6, y);
      } else {
        // pulled away from the junction; small jitter near the outer edge
        const t = Math.sin(phase * 0.6 + hd.seed * 6.28);
        x = barX0 + 16 + Math.max(0, (depL - barX0 - 30)) * 0.55 + t * 5;
      }
      if (x < depR + 20) {
        ctx.fillStyle = '#f87171';
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#450a0a';
        ctx.fillText('+', x, y + 4);
      }
    }
    for (let i = 0; i < this._electrons.length; i++) {
      const ed = this._electrons[i];
      const y = barY + barH * (0.5 + ed.lane * 0.82);
      let x;
      if (cs.diffusing) {
        const t = ((phase * speed) + ed.seed) % 1;
        const start = barX1 - 16;
        const end = midX - depHalf * 0.6 - 14;
        x = start - (start - end) * t;
        if (t > 0.95) this._spawnFlash(midX - depHalf * 0.6, y);
      } else {
        const t = Math.sin(phase * 0.6 + ed.seed * 6.28 + 1.7);
        x = barX1 - 16 - Math.max(0, (barX1 - depR - 30)) * 0.55 + t * 5;
      }
      if (x > depL - 20) {
        ctx.fillStyle = '#60a5fa';
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0b1a3a';
        ctx.fillText('−', x, y + 4);
      }
    }
    ctx.textAlign = 'left';

    // rare minority-carrier leakage trickle when blocked
    if (!cs.diffusing) {
      const lt = (phase * 0.15) % 1;
      const ly = barY + barH * 0.5;
      const lx = midX - depHalf + (2 * depHalf) * lt;
      ctx.fillStyle = 'rgba(250,204,21,0.75)';
      ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI * 2); ctx.fill();
    }

    // recombination flashes
    this._drawFlashes(ctx);

    // region labels
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.fillStyle = '#fca5a5';
    ctx.fillText('P region (holes, acceptor ions)', barX0 + 6, barY + barH + 20);
    ctx.fillStyle = '#93c5fd';
    ctx.textAlign = 'right';
    ctx.fillText('N region (electrons, donor ions)', barX1 - 6, barY + barH + 20);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('depletion region', midX, barY - 10);
    ctx.textAlign = 'left';

    // current-direction indicator — drawn as its own row below the region
    // labels so it never competes with the title/subtitle or the bar itself.
    const arrowY = barY + barH + 46;
    ctx.textAlign = 'center';
    if (cs.diffusing) {
      ctx.strokeStyle = '#4ade80';
      ctx.fillStyle = '#4ade80';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(midX - 70, arrowY); ctx.lineTo(midX + 60, arrowY); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(midX + 60, arrowY - 5); ctx.lineTo(midX + 70, arrowY); ctx.lineTo(midX + 60, arrowY + 5);
      ctx.closePath(); ctx.fill();
      ctx.font = '12px system-ui,sans-serif';
      ctx.fillText('conventional current (P → N)', midX - 5, arrowY - 10);
    } else {
      ctx.fillStyle = '#fbbf24';
      ctx.font = '12px system-ui,sans-serif';
      ctx.fillText('current ≈ 0 (only a tiny reverse leakage/drift current)', midX, arrowY - 2);
    }
    ctx.textAlign = 'left';

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText(
      cs.diffusing
        ? 'Forward bias pushes holes and electrons together — they cross the narrow junction and recombine (flashes), sustaining current.'
        : 'Reverse (or weak) bias pulls carriers away from the junction, widening the depletion region and blocking diffusion current.',
      16, H - 12
    );
  }

  _spawnFlash(x, y) {
    // Avoid spawning duplicates every frame — only add a fresh flash occasionally.
    if (this._flashes.length && Math.random() > 0.15) return;
    this._flashes.push({ x, y, life: 1 });
  }

  _drawFlashes(ctx) {
    for (let i = this._flashes.length - 1; i >= 0; i--) {
      const f = this._flashes[i];
      f.life -= 0.06;
      if (f.life <= 0) { this._flashes.splice(i, 1); continue; }
      ctx.fillStyle = 'rgba(255,255,255,' + (f.life * 0.8).toFixed(2) + ')';
      ctx.beginPath();
      ctx.arc(f.x, f.y, 3 + (1 - f.life) * 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---- I-V curve ----
  _drawIV(ctx, W, H) {
    const s = this.state;
    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 15px system-ui,sans-serif';
    ctx.fillText('Diode I–V curve (Shockley equation)', 16, 26);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText('I = Is·(e^(V/nVt) − 1)   ·   Vt = kT/q ≈ ' + (1000 * thermalVoltage(s.T)).toFixed(1) + ' mV at ' + s.T + ' K', 16, 46);

    const padL = 56, padR = 24, top = 66, bot = H - 40;
    const plotW = W - padL - padR, plotH = bot - top;
    const Vmin = -2, Vmax = 0.9, Imax = 40; // mA
    function X(v) { return padL + ((v - Vmin) / (Vmax - Vmin)) * plotW; }
    function Y(i) { return bot - (i / Imax) * plotH; }

    ctx.fillStyle = '#0a1122';
    ctx.fillRect(padL, top, plotW, plotH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(padL + 0.5, top + 0.5, plotW - 1, plotH - 1);

    // axes
    ctx.strokeStyle = '#475569';
    ctx.beginPath(); ctx.moveTo(X(0), top); ctx.lineTo(X(0), bot); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(padL, Y(0)); ctx.lineTo(padL + plotW, Y(0)); ctx.stroke();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= 200; i++) {
      const v = Vmin + (i / 200) * (Vmax - Vmin);
      const mA = 1000 * diodeCurrent(v, s.Is, s.n, s.T);
      const py = Y(Math.max(-2, Math.min(Imax, mA)));
      const px = X(v);
      if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // operating point
    const mA = 1000 * diodeCurrent(s.Vf, s.Is, s.n, s.T);
    const ox = X(s.Vf), oy = Y(Math.max(-2, Math.min(Imax, mA)));
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(ox, oy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.font = '12px system-ui,sans-serif';
    const labelY = Math.max(top + 14, Math.min(bot - 44, oy - 8));
    const labelX = Math.min(ox + 10, padL + plotW - 150);
    ctx.fillText('bias ' + s.Vf.toFixed(2) + ' V → ' + mA.toFixed(2) + ' mA', labelX, labelY);

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('reverse ←  V (volts)  → forward', padL + plotW / 2 - 70, bot + 18);
    ctx.save();
    ctx.translate(16, top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('I (mA)', 0, 0);
    ctx.restore();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('Reverse bias: only a tiny leakage current flows. Forward bias above the ~0.6 V knee: current rises exponentially.', 16, H - 12);
  }

  // ---- rectifier waveform ----
  _drawRectifier(ctx, W, H, phase) {
    const s = this.state;
    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 15px system-ui,sans-serif';
    ctx.fillText((s.mode === 'half' ? 'Half-wave' : 'Full-wave') + ' rectifier — AC to pulsating DC', 16, 26);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText('Amplitude ' + s.amp.toFixed(1) + ' V · f = ' + s.freq.toFixed(1) + ' Hz' + (s.smooth ? ' · smoothing capacitor ON' : ''), 16, 46);

    const padL = 48, padR = 20, top = 64, bot = H - 34;
    const plotW = W - padL - padR, plotH = bot - top;
    const winS = 2 / Math.max(0.2, s.freq); // show ~2 periods
    const Vmax = s.amp * 1.25;

    ctx.fillStyle = '#0a1122';
    ctx.fillRect(padL, top, plotW, plotH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(padL + 0.5, top + 0.5, plotW - 1, plotH - 1);

    function X(t) { return padL + (t / winS) * plotW; }
    function Y(v) { return top + plotH - ((v + Vmax) / (2 * Vmax)) * plotH; }
    ctx.strokeStyle = '#475569';
    ctx.beginPath(); ctx.moveTo(padL, Y(0)); ctx.lineTo(padL + plotW, Y(0)); ctx.stroke();

    // input sine (faint)
    ctx.strokeStyle = 'rgba(148,163,184,0.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i <= 240; i++) {
      const t = (i / 240) * winS;
      const v = acSample(s.amp, s.freq, t + phase * 0.15);
      const px = X(t), py = Y(v);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // output (rectified, optionally smoothed) — recompute cap decay along the trace for a clean static-looking curve
    let cap = 0;
    const RC = s.smooth ? (s.loadR * 47e-6) : 0; // 47 µF smoothing cap
    const dt = winS / 240;
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let i = 0; i <= 240; i++) {
      const t = (i / 240) * winS;
      const vin = acSample(s.amp, s.freq, t + phase * 0.15);
      const raw = s.mode === 'half' ? rectifiedHalfWave(vin) : rectifiedFullWave(vin);
      if (s.smooth) {
        if (raw > cap) cap = raw;
        else cap = cap * Math.exp(-dt / Math.max(1e-6, RC));
      } else {
        cap = raw;
      }
      const px = X(t), py = Y(cap);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.fillStyle = '#94a3b8'; ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('— input AC', padL + plotW - 150, top + 14);
    ctx.fillStyle = '#4ade80';
    ctx.fillText('— rectified output', padL + plotW - 150, top + 28);
    ctx.fillStyle = '#64748b';
    ctx.fillText('time →', padL + plotW / 2 - 20, bot + 18);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText(
      s.mode === 'half'
        ? 'Diode conducts only on the positive half-cycle — the negative half is blocked.'
        : 'A bridge of four diodes folds both half-cycles the same way, so both halves contribute current.',
      16, H - 12
    );
  }
}
