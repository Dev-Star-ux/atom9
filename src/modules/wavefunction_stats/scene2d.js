// Wavefiz-inspired 2D: ψ / |ψ|² with Born-rule detection histogram.
// Layout keeps chips left, title center, pause/2D|3D clear of plot labels.
// https://ridiculousfish.com/wavefiz/
import { createDualCanvas } from '../common/teachPlots.js';
import { el } from '../common/ui.js';
import { wellCurves } from '../infinite_well/physics.js';
import { DEFAULT_A, HIST_BINS, histogram } from './physics.js';

export class WavefunctionStats2D {
  constructor(host) {
    this.host = host;
    this.n = 2;
    this.a = DEFAULT_A;
    this.hits = [];
    this.viewMode = 'density'; // 'psi' | 'density'
    this.paused = false;
    this._active = true;

    this._toolbar = el('div', 'dual-2d-toggles wfs-toggles');
    this._btnPsi = el('button', 'chip', 'ψ');
    this._btnDens = el('button', 'chip active', '|ψ|²');
    const self = this;
    this._btnPsi.onclick = function () { self._setView('psi'); };
    this._btnDens.onclick = function () { self._setView('density'); };
    this._toolbar.appendChild(this._btnPsi);
    this._toolbar.appendChild(this._btnDens);
    host.appendChild(this._toolbar);

    this._title = el('div', 'wfs-title', 'n = 2  ·  Infinite well');
    host.appendChild(this._title);

    this._canvas = createDualCanvas(host, function (ctx, w, h) {
      self._draw(ctx, w, h);
    });
  }

  _setView(mode) {
    this.viewMode = mode;
    this._btnPsi.className = 'chip' + (mode === 'psi' ? ' active' : '');
    this._btnDens.className = 'chip' + (mode === 'density' ? ' active' : '');
  }

  setParams(p) {
    if (!p) return;
    if (p.n != null) this.n = p.n;
    if (p.a != null) this.a = p.a;
    if (p.viewMode === 'psi' || p.viewMode === 'density') this._setView(p.viewMode);
    this._title.textContent = 'n = ' + this.n + '  ·  Infinite well';
  }

  setHits(hits) {
    this.hits = hits || [];
  }

  setPaused(v) {
    this.paused = !!v;
    this._canvas.setPaused(v);
  }

  setActive(v) {
    this._active = !!v;
    this._toolbar.style.display = v ? '' : 'none';
    this._title.style.display = v ? '' : 'none';
  }

  resize() { this._canvas.resize(); }

  dispose() {
    this._canvas.dispose();
    if (this._toolbar.parentNode) this._toolbar.parentNode.removeChild(this._toolbar);
    if (this._title.parentNode) this._title.parentNode.removeChild(this._title);
  }

  _draw(ctx, w, h) {
    if (!this._active) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, w, h);

    // Inset: left for toolbar, top for title, bottom/right for pause & 2D|3D
    const L = 148;
    const R = w - 18;
    const T = 56;
    const B = h - 36;
    if (R - L < 80 || B - T < 80) return;

    const a = this.a;
    const aNm = a * 1e9;
    const curves = wellCurves(this.n, a, 160);
    const hist = histogram(this.hits, a, HIST_BINS);

    // Potential “walls” (Wavefiz-style V markers)
    ctx.fillStyle = 'rgba(168,85,247,0.18)';
    ctx.fillRect(L - 10, T, 10, B - T);
    ctx.fillRect(R, T, 10, B - T);
    ctx.fillStyle = 'rgba(168,85,247,0.55)';
    ctx.fillRect(L - 10, T, 3, B - T);
    ctx.fillRect(R + 7, T, 3, B - T);

    // Zero axis
    const y0 = this.viewMode === 'psi' ? (T + B) / 2 : B;
    ctx.strokeStyle = 'rgba(148,163,184,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(L, y0);
    ctx.lineTo(R, y0);
    ctx.stroke();

    function X(x) {
      return L + (R - L) * (x / a);
    }

    if (this.viewMode === 'psi') {
      let ymax = 1e-12;
      for (let i = 0; i < curves.psis.length; i++) {
        const v = Math.abs(curves.psis[i]);
        if (v > ymax) ymax = v;
      }
      ymax *= 1.15;
      function Ypsi(v) {
        return y0 - (B - T) * 0.42 * (v / ymax);
      }

      // Energy guide (thin red — Wavefiz E line feel)
      ctx.strokeStyle = 'rgba(248,113,113,0.55)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(L, T + 18);
      ctx.lineTo(R, T + 18);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      for (let i = 0; i < curves.xs.length; i++) {
        const px = X(curves.xs[i]);
        const py = Ypsi(curves.psis[i]);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.4;
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.font = '600 12px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ψₙ(x)', (L + R) / 2, T + 16);
      ctx.fillStyle = 'rgba(248,113,113,0.9)';
      ctx.font = '600 11px system-ui,sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('Eₙ', R - 6, T + 14);
    } else {
      let tMax = 1e-12;
      for (let i = 0; i < curves.probs.length; i++) {
        if (curves.probs[i] > tMax) tMax = curves.probs[i];
      }
      let hMax = 1;
      for (let i = 0; i < hist.length; i++) if (hist[i] > hMax) hMax = hist[i];

      function Yd(v) {
        return B - (B - T - 8) * (v / (tMax * 1.08));
      }

      // Theory fill
      ctx.beginPath();
      ctx.moveTo(X(0), B);
      for (let i = 0; i < curves.xs.length; i++) {
        ctx.lineTo(X(curves.xs[i]), Yd(curves.probs[i]));
      }
      ctx.lineTo(X(a), B);
      ctx.closePath();
      ctx.fillStyle = 'rgba(56,189,248,0.22)';
      ctx.fill();

      ctx.beginPath();
      for (let i = 0; i < curves.xs.length; i++) {
        const px = X(curves.xs[i]);
        const py = Yd(curves.probs[i]);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.4;
      ctx.stroke();

      // Detection histogram (amber) — height tracks theory once enough hits
      const binW = a / HIST_BINS;
      for (let i = 0; i < HIST_BINS; i++) {
        if (hist[i] <= 0) continue;
        const x0 = i * binW;
        const x1 = (i + 1) * binW;
        let top;
        if (this.hits.length >= 30) {
          const dens = (hist[i] / this.hits.length) / binW;
          top = Yd(dens);
        } else {
          top = B - (B - T - 8) * (hist[i] / hMax) * 0.9;
        }
        if (top > B - 2) top = B - 2;
        ctx.fillStyle = 'rgba(251,191,36,0.55)';
        ctx.fillRect(X(x0) + 1, top, Math.max(2, X(x1) - X(x0) - 2), B - top);
      }

      // Recent hit ticks
      const recent = this.hits.slice(-12);
      for (let i = 0; i < recent.length; i++) {
        const px = X(recent[i]);
        ctx.fillStyle = 'rgba(251,191,36,0.9)';
        ctx.beginPath();
        ctx.arc(px, B - 4, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#38bdf8';
      ctx.font = '600 12px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('|ψₙ|²  theory', (L + R) / 2 - 50, T + 16);
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('detections', (L + R) / 2 + 70, T + 16);
    }

    // Corner labels — clear of overlays
    ctx.fillStyle = '#c4b5fd';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('V=∞', L + 4, T + 14);
    ctx.textAlign = 'right';
    ctx.fillText('V=∞', R - 4, T + 14);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('0', L, B + 16);
    ctx.textAlign = 'center';
    ctx.fillText('x (nm)', (L + R) / 2, B + 16);
    ctx.textAlign = 'right';
    ctx.fillText(aNm.toFixed(1), R, B + 16);

    ctx.fillStyle = '#64748b';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('N = ' + this.hits.length, L + 4, B - 8);
  }
}
