// Hydrogen energy-level diagram (2D teaching view) — fully offline.
import { createDualCanvas } from '../common/teachPlots.js';
import {
  energyLevelEV,
  hydrogenSeries,
  hydrogenWavelengthNm,
  transitionEnergyEV,
  wavelengthToCss,
  SERIES,
} from './physics.js';

export class HydrogenSpectrum2D {
  constructor(host) {
    this.state = { series: 'balmer', n1: 2, n2: 3, pulse: 0 };
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.series != null) this.state.series = p.series;
    if (p.n1 != null) this.state.n1 = p.n1;
    if (p.n2 != null) this.state.n2 = p.n2;
    if (p.pulse != null) this.state.pulse = p.pulse;
  }

  setPaused(v) { this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  tick() {}

  _yForN(n, top, bot) {
    // Map energy (−13.6 … 0) to vertical position (ground near bottom).
    const E = energyLevelEV(n);
    const eMin = energyLevelEV(1);
    const eMax = 0;
    const t = (E - eMin) / (eMax - eMin);
    return bot - t * (bot - top);
  }

  _draw(ctx, W, H) {
    if (!W || !H) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);

    const n1 = this.state.n1;
    const n2 = Math.max(n1 + 1, this.state.n2);
    const lam = hydrogenWavelengthNm(n1, n2);
    const dE = transitionEnergyEV(n1, n2);
    const series = hydrogenSeries(n1, 7);

    // Layout (oPhysics m1-style: energy ladder + spectrum strip)
    const left = 70;
    const right = W - 36;
    const top = 56;
    const bot = H * 0.58;
    const specTop = bot + 36;
    const specBot = H - 28;

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 16px system-ui,sans-serif';
    ctx.fillText('Hydrogen Atom: Energy Levels', 20, 28);
    ctx.fillStyle = '#8092b4';
    ctx.font = '12px system-ui,sans-serif';
    const seriesName = (SERIES.find(function (s) { return s[1] === n1; }) || ['', n1])[0];
    ctx.fillText(
      'Series: ' + seriesName + ' (n₁=' + n1 + ')  ·  transition n₂=' + n2 + ' → n₁=' + n1 +
      (lam > 0 ? '  ·  λ = ' + lam.toFixed(1) + ' nm  ·  ΔE = ' + dE.toFixed(2) + ' eV' : ''),
      20,
      46
    );

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(left - 18, top);
    ctx.lineTo(left - 18, bot);
    ctx.stroke();
    ctx.fillStyle = '#8092b4';
    ctx.font = '11px system-ui,sans-serif';
    ctx.save();
    ctx.translate(18, (top + bot) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Energy (eV)', 0, 0);
    ctx.restore();

    for (let n = 1; n <= 7; n++) {
      const y = this._yForN(n, top, bot);
      const active = n === n1 || n === n2;
      ctx.strokeStyle = active ? '#38bdf8' : '#475569';
      ctx.lineWidth = active ? 2.6 : 1.2;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right - 90, y);
      ctx.stroke();

      ctx.fillStyle = active ? '#7dd3fc' : '#94a3b8';
      ctx.font = (active ? '700 ' : '600 ') + '12px system-ui,sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('n = ' + n, left - 52, y + 4);
      ctx.fillStyle = '#64748b';
      ctx.font = '11px system-ui,sans-serif';
      ctx.fillText(energyLevelEV(n).toFixed(2) + ' eV', right - 84, y + 4);
    }
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(left, top - 6);
    ctx.lineTo(right - 90, top - 6);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('ionization (E=0)', left, top - 12);

    // All series transitions as faint arrows, selected bold
    const arrowX0 = left + 40;
    const arrowSpan = (right - 90 - left - 80) / Math.max(1, series.length);
    for (let i = 0; i < series.length; i++) {
      const nUpper = n1 + 1 + i;
      const nm = series[i][0];
      const lbl = series[i][2];
      const col = wavelengthToCss(nm);
      const yU = this._yForN(nUpper, top, bot);
      const yL = this._yForN(n1, top, bot);
      const x = arrowX0 + i * arrowSpan;
      const selected = nUpper === n2;
      ctx.strokeStyle = col;
      ctx.lineWidth = selected ? 3.2 : 1.4;
      ctx.globalAlpha = selected ? 1 : 0.35;
      ctx.beginPath();
      ctx.moveTo(x, yU);
      ctx.lineTo(x, yL);
      ctx.stroke();
      // Arrow head
      ctx.beginPath();
      ctx.moveTo(x, yL);
      ctx.lineTo(x - 5, yL - 10);
      ctx.lineTo(x + 5, yL - 10);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
      ctx.globalAlpha = 1;

      if (selected || i < 4) {
        ctx.fillStyle = selected ? '#eaf0fb' : '#64748b';
        ctx.font = (selected ? '700 ' : '') + '10px system-ui,sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(lbl, x, yU - 8);
      }
    }

    const pulse = this.state.pulse || 0;
    const yU = this._yForN(n2, top, bot);
    const yL = this._yForN(n1, top, bot);
    const selIdx = Math.max(0, n2 - n1 - 1);
    const xSel = arrowX0 + selIdx * arrowSpan;
    const py = yU + (yL - yU) * Math.min(1, pulse);
    if (lam > 0 && pulse < 0.95) {
      ctx.beginPath();
      ctx.arc(xSel, py, 6, 0, Math.PI * 2);
      ctx.fillStyle = wavelengthToCss(lam);
      ctx.fill();
      ctx.strokeStyle = '#eaf0fb';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.fillStyle = '#0b1220';
    ctx.fillRect(left, specTop, right - left, specBot - specTop);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(left, specTop, right - left, specBot - specTop);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Emission spectrum (λ)', left, specTop - 8);

    const nmMin = 380;
    const nmMax = 750;
    // Soft continuum guide for Balmer visibility
    for (let x = left; x < right; x++) {
      const nm = nmMin + (nmMax - nmMin) * (x - left) / (right - left);
      ctx.fillStyle = wavelengthToCss(nm);
      ctx.globalAlpha = 0.08;
      ctx.fillRect(x, specTop, 1, specBot - specTop);
    }
    ctx.globalAlpha = 1;

    for (let i = 0; i < series.length; i++) {
      const nm = series[i][0];
      const int = series[i][1];
      const lbl = series[i][2];
      if (nm < nmMin || nm > nmMax) continue;
      const x = left + (nm - nmMin) / (nmMax - nmMin) * (right - left);
      const selected = (n1 + 1 + i) === n2;
      const h = (specBot - specTop) * (0.35 + 0.55 * int);
      ctx.fillStyle = wavelengthToCss(nm);
      ctx.globalAlpha = selected ? 1 : 0.55;
      ctx.fillRect(x - (selected ? 2.5 : 1.5), specBot - h, selected ? 5 : 3, h);
      ctx.globalAlpha = 1;
      ctx.fillStyle = selected ? '#e2e8f0' : '#94a3b8';
      ctx.font = (selected ? '700 ' : '') + '10px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(lbl, x, specTop + 12);
      ctx.fillText(nm.toFixed(0), x, specBot + 14);
    }

    // Axis ticks
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    for (let nm = 400; nm <= 700; nm += 100) {
      const x = left + (nm - nmMin) / (nmMax - nmMin) * (right - left);
      ctx.fillText(String(nm) + ' nm', x, H - 8);
    }
  }

  dispose() { this._canvas.dispose(); }
}
