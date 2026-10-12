import { createDualCanvas } from '../common/teachPlots.js';
import { Plot, CANVAS_COLORS } from '../common/canvasPlot.js';
import {
  DEFAULT_OMEGA,
  phasor,
  resultant,
  magnitude,
  phase,
  sampleWave,
} from './physics.js';

export class ComplexPhasor2D {
  constructor(host) {
    this.host = host;
    this.phi1 = 0;
    this.phi2 = 1.2;
    this.omega = DEFAULT_OMEGA;
    this.paused = false;
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._phase = phase;
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.phi1 != null) this.phi1 = p.phi1;
    if (p.phi2 != null) this.phi2 = p.phi2;
    if (p.omega != null) this.omega = p.omega;
  }

  setPaused(v) { this.paused = !!v; this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _drawPhasorDiagram(ctx, cx, cy, R, sum, z1, z2) {
    ctx.strokeStyle = 'rgba(51,65,85,0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(100,116,139,0.45)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(cx - R - 12, cy);
    ctx.lineTo(cx + R + 12, cy);
    ctx.moveTo(cx, cy - R - 12);
    ctx.lineTo(cx, cy + R + 12);
    ctx.stroke();
    ctx.setLineDash([]);

    const drawVec = function (z, col, label) {
      const x = cx + z.re * R;
      const y = cy - z.im * R;
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.fillStyle = col;
      ctx.font = '600 10px system-ui,sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(label, x + 8, y - 4);
    };

    drawVec(z1, '#38bdf8', 'e^{iφ₁}');
    drawVec(z2, '#f472b6', 'e^{iφ₂}');

    const sx = cx + sum.re * R;
    const sy = cy - sum.im * R;
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(sx, sy);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sx, sy, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#fbbf24';
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.fillText('sum', sx + 8, sy + 4);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('|z|=' + magnitude(sum).toFixed(2) + '  arg=' + phase(sum).toFixed(2), cx, cy + R + 22);
  }

  _draw(ctx, w, h, animPhase) {
    ctx.fillStyle = '#05070d';
    ctx.fillRect(0, 0, w, h);

    const z1 = phasor(this.phi1);
    const z2 = phasor(this.phi2);
    const sum = resultant(this.phi1, this.phi2);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Complex phasor addition', 14, 20);

    const leftW = Math.floor(w * 0.42);
    const gap = 12;
    const top = 36;
    const panelH = h - top - 14;

    ctx.strokeStyle = 'rgba(51,65,85,0.7)';
    ctx.strokeRect(10, top, leftW, panelH);
    ctx.fillStyle = '#64748b';
    ctx.font = '600 10px system-ui,sans-serif';
    ctx.fillText('Complex plane', 18, top + 14);

    const cx = 10 + leftW / 2;
    const cy = top + panelH / 2 + 8;
    const R = Math.min(leftW, panelH) * 0.32;
    this._drawPhasorDiagram(ctx, cx, cy, R, sum, z1, z2);

    const rx = 10 + leftW + gap;
    const rw = w - rx - 10;
    ctx.strokeStyle = 'rgba(51,65,85,0.7)';
    ctx.strokeRect(rx, top, rw, panelH);
    ctx.fillStyle = '#64748b';
    ctx.fillText('Resultant wave Re[(z₁+z₂)e^{iωt}]', rx + 8, top + 14);

    const tNow = animPhase * 0.8;
    const wave = sampleWave(sum, this.omega, 140, (Math.PI * 4) / this.omega);
    let yMax = 1e-9;
    for (let i = 0; i < wave.ys.length; i++) {
      if (Math.abs(wave.ys[i]) > yMax) yMax = Math.abs(wave.ys[i]);
    }
    yMax = Math.max(yMax, 0.2) * 1.2;

    const pad = [rx + 44, top + 32, rx + rw - 12, top + panelH - 24];
    const plot = new Plot(ctx, pad, [wave.xs[0], wave.xs[wave.xs.length - 1]], [-yMax, yMax], CANVAS_COLORS);
    plot.axes('t', 'Re ψ(t)', [], function () { return ''; });
    plot.curve(wave.xs, wave.ys, '#22d3ee', 2);

    const yNow = magnitude(sum) * Math.cos(this.omega * tNow + phase(sum));
    plot.vline(tNow, '#fbbf24', [3, 3]);
    ctx.beginPath();
    ctx.arc(plot.X(tNow), plot.Y(yNow), 5, 0, Math.PI * 2);
    ctx.fillStyle = '#fbbf24';
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ω = ' + this.omega.toFixed(1), rx + 12, top + panelH - 6);
  }
}
