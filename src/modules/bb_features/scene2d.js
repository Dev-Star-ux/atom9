// Full-viewport 2D blackbody / RJ / Planck spectrum views.
// Clearer Wien peak + visible band + colour swatch (physics-simulations / Lookang style).
import { createDualCanvas, drawSpectrumView } from '../common/teachPlots.js';
import { el } from '../common/ui.js';
import { wienPeakNm, blackbodyRgb, lamGrid } from './physics.js';

function buildPlanckSeries(T, hScale) {
  hScale = hScale != null ? hScale : 1;
  const H = 6.62607015e-34 * hScale;
  const C = 2.99792458e8;
  const K = 1.380649e-23;
  const lams = lamGrid(220);
  const planck = [];
  for (let i = 0; i < lams.length; i++) {
    const lam = lams[i];
    let u = 0;
    if (lam > 0 && T > 0) {
      const x = (H * C) / (lam * K * T);
      if (x < 700 && x > 1e-8) u = (8 * Math.PI * H * C) / (lam * lam * lam * lam * lam) / (Math.exp(x) - 1);
    }
    planck.push({ nm: lam * 1e9, u: u });
  }
  return planck;
}

function buildRJSeries(T) {
  const C = 2.99792458e8;
  const K = 1.380649e-23;
  const lams = lamGrid(220);
  const rj = [];
  for (let i = 0; i < lams.length; i++) {
    const lam = lams[i];
    const u = lam > 0 && T > 0 ? (8 * Math.PI * K * T) / (lam * lam * lam * lam) : 0;
    rj.push({ nm: lam * 1e9, u: u });
  }
  return rj;
}

/** mode: 'planck' | 'rj-compare' | 'cursor' | 'planck-rj' */
export class Spectrum2D {
  constructor(host, opts) {
    this.host = host;
    this.mode = (opts && opts.mode) || 'planck';
    this.state = { temp: 5000, T: 5000, hScale: 1, cursor: 600 };
    this.paused = false;
    this._active = true;

    this._hud = el('div', 'bb-hud', '');
    host.appendChild(this._hud);

    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h) {
      self._draw(ctx, w, h);
    });
    this._updateHud();
  }

  setParams(p) {
    if (!p) return;
    if (p.temp != null) this.state.temp = p.temp;
    if (p.T != null) {
      this.state.T = p.T;
      this.state.temp = p.T;
    }
    if (p.hScale != null) this.state.hScale = p.hScale;
    if (p.cursor != null) this.state.cursor = p.cursor;
    this._updateHud();
  }

  setPaused(v) {
    this.paused = !!v;
    this._canvas.setPaused(v);
  }

  setActive(v) {
    this._active = !!v;
    this._hud.style.display = v ? '' : 'none';
  }

  resize() { this._canvas.resize(); }
  tick() {}

  _updateHud() {
    const T = this.state.temp || this.state.T || 5000;
    const peak = wienPeakNm(T);
    this._hud.textContent =
      'T = ' + Math.round(T) + ' K   ·   λ_max ≈ ' + Math.round(peak) +
      ' nm (Wien)   ·   hotter → peak shifts left, glow brightens';
  }

  _draw(ctx, w, h) {
    if (!this._active) return;
    const T = this.state.temp || this.state.T || 5000;
    const planck = buildPlanckSeries(T, this.state.hScale);
    const rj = buildRJSeries(T);
    const peak = wienPeakNm(T);
    const showRj = this.mode === 'rj-compare' || this.mode === 'planck-rj';
    const isFeatures = this.mode === 'planck';

    // Ghost reference curves for features mode (shape compare, scaled to fit)
    const refs = [];
    if (isFeatures) {
      let mainMax = 1e-30;
      for (let i = 0; i < planck.length; i++) if (planck[i].u > mainMax) mainMax = planck[i].u;
      const ghostTs = [3000, 5800];
      const ghostCols = ['rgba(148,163,184,0.55)', 'rgba(56,189,248,0.55)'];
      for (let g = 0; g < ghostTs.length; g++) {
        if (Math.abs(ghostTs[g] - T) < 150) continue;
        const raw = buildPlanckSeries(ghostTs[g], 1);
        let gMax = 1e-30;
        for (let i = 0; i < raw.length; i++) if (raw[i].u > gMax) gMax = raw[i].u;
        const ser = [];
        for (let i = 0; i < raw.length; i++) {
          ser.push({ nm: raw[i].nm, u: (raw[i].u / gMax) * mainMax * 0.55 });
        }
        ser.color = ghostCols[g];
        refs.push(ser);
      }
    }

    drawSpectrumView(ctx, w, h, {
      planck: planck,
      rj: rj,
      peakNm: peak,
      cursorNm: this.mode === 'cursor' ? this.state.cursor : null,
      showRj: showRj,
      showVisible: true,
      nmMin: 100,
      nmMax: isFeatures ? 2600 : 3000,
      starColor: isFeatures || this.mode === 'cursor' ? blackbodyRgb(T) : null,
      tempLabel: 'T = ' + Math.round(T) + ' K',
      refCurves: refs,
      curveColor: '#fbbf24',
      title: this.mode === 'rj-compare'
        ? 'Rayleigh–Jeans vs Planck (UV catastrophe)'
        : this.mode === 'cursor'
          ? 'Spectral density u(λ) — λ cursor'
          : this.mode === 'planck-rj'
            ? 'Planck law vs classical RJ'
            : 'Blackbody spectrum — Planck & Wien',
      band: this.mode === 'cursor' ? [Math.max(100, this.state.cursor - 80), this.state.cursor + 80] : null,
    });

    // Legend for ghost curves
    if (isFeatures && refs.length) {
      ctx.font = '600 10px system-ui,sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(148,163,184,0.8)';
      ctx.fillText('3000 K', 58, h - 12);
      ctx.fillStyle = 'rgba(56,189,248,0.9)';
      ctx.fillText('5800 K (≈Sun)', 120, h - 12);
    }
  }

  dispose() {
    this._canvas.dispose();
    if (this._hud.parentNode) this._hud.parentNode.removeChild(this._hud);
  }
}
