// Polytechnique-style free packet: φ(p) on top, ψ(x) / |ψ|² / detections below.
// https://www.quantum-physics.polytechnique.fr/freeWavepacket.php
import { createDualCanvas } from '../common/teachPlots.js';
import { el } from '../common/ui.js';
import {
  VIEW_MODES,
  sigmaM,
  samplePsiComplex,
  samplePhiP,
  deltaX,
  deltaP,
  xpProduct,
  hslPhase,
  HBAR,
} from './physics.js';

function maxOf(arr) {
  let m = 1e-12;
  for (let i = 0; i < arr.length; i++) if (arr[i] > m) m = arr[i];
  return m;
}

function drawPhaseWheel(ctx, cx, cy, r) {
  const segs = 48;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, a0, a1);
    ctx.closePath();
    ctx.fillStyle = hslPhase(i / segs, 52);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.38, 0, Math.PI * 2);
  ctx.fillStyle = '#05060a';
  ctx.fill();
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 9px system-ui,sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('phase', cx, cy + 3);
}

function panelFrame(ctx, L, T, R, B, title) {
  ctx.strokeStyle = 'rgba(148,163,184,0.22)';
  ctx.lineWidth = 1;
  ctx.strokeRect(L, T, R - L, B - T);
  // axes
  const midY = (T + B) / 2;
  const midX = (L + R) / 2;
  ctx.strokeStyle = 'rgba(148,163,184,0.45)';
  ctx.beginPath();
  ctx.moveTo(L, midY);
  ctx.lineTo(R, midY);
  ctx.moveTo(midX, T);
  ctx.lineTo(midX, B);
  ctx.stroke();
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '600 12px system-ui,sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(title, L + 8, T + 16);
}

export class WaveParticleProbability2D {
  constructor(host) {
    this.host = host;
    this.mode = 'wave';
    this.sigma = 50;
    this.hits = [];
    this.showRe = false;
    this.paused = false;
    this._phase = 0;

    this._toolbar = el('div', 'dual-2d-toggles wpp-toggles');
    this._chips = {};
    const self = this;
    for (let i = 0; i < VIEW_MODES.length; i++) {
      const m = VIEW_MODES[i];
      const label = m === 'wave' ? 'ψ(x)' : (m === 'probability' ? '|ψ|²' : 'Detections');
      const b = el('button', 'chip' + (m === this.mode ? ' active' : ''), label);
      b.onclick = function () { self._setMode(m, true); };
      this._chips[m] = b;
      this._toolbar.appendChild(b);
    }
    this._reBtn = el('button', 'chip', 'Show Re ψ');
    this._reBtn.onclick = function () {
      self.showRe = !self.showRe;
      self._reBtn.className = 'chip' + (self.showRe ? ' active' : '');
    };
    this._toolbar.appendChild(this._reBtn);
    host.appendChild(this._toolbar);

    this._hud = el('div', 'wpp-hud', '');
    host.appendChild(this._hud);

    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      if (!self.paused) self._phase = phase;
      self._draw(ctx, w, h);
    });
  }

  _setMode(m, fromUser) {
    const changed = this.mode !== m;
    this.mode = m;
    for (let i = 0; i < VIEW_MODES.length; i++) {
      const id = VIEW_MODES[i];
      this._chips[id].className = 'chip' + (id === m ? ' active' : '');
    }
    // Only notify parent on real user/chip changes — setParams must not re-enter _refresh
    if (changed && fromUser && typeof this.onModeChange === 'function') {
      this.onModeChange(m);
    }
  }

  setParams(p) {
    if (!p) return;
    if (p.sigma != null) this.sigma = p.sigma;
    if (p.mode && VIEW_MODES.indexOf(p.mode) >= 0) this._setMode(p.mode, false);
    this._updateHud();
  }

  setHits(hits) {
    this.hits = hits || [];
    this._updateHud();
  }

  setPaused(v) {
    this.paused = !!v;
    this._canvas.setPaused(v);
  }

  resize() { this._canvas.resize(); }

  dispose() {
    this._canvas.dispose();
    if (this._toolbar.parentNode) this._toolbar.parentNode.removeChild(this._toolbar);
    if (this._hud.parentNode) this._hud.parentNode.removeChild(this._hud);
  }

  _updateHud() {
    const sm = sigmaM(this.sigma);
    const dx = deltaX(sm);
    const dp = deltaP(sm);
    const prod = xpProduct(sm);
    const dxA = dx * 1e10;
    const dpPlot = dp / (HBAR / 1e-10);
    this._hud.textContent =
      'Δx ≈ ' + dxA.toFixed(2) + ' Å   ·   Δp ≈ ' + dpPlot.toFixed(2) + ' ħ/Å   ·   Δx Δp ≈ ' +
      (prod / HBAR).toFixed(2) + ' ħ   ·   N = ' + this.hits.length;
  }

  _draw(ctx, w, h) {
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, w, h);

    // Leave room: left toolbar, top HUD, right pause
    const L = 128;
    const R = w - 16;
    const topT = 48;
    const gap = 10;
    const mid = topT + (h - topT - 28 - gap) * 0.38;
    const botB = h - 28;
    if (R - L < 100 || botB - topT < 100) return;

    const sm = sigmaM(this.sigma);
    const psi = samplePsiComplex(sm, this._phase, 180);
    const phi = samplePhiP(sm, 140);

    // —— Top: momentum φ(p) ——
    const pL = L;
    const pT = topT;
    const pR = R;
    const pB = mid;
    panelFrame(ctx, pL, pT, pR, pB, 'φ(p)  —  momentum');
    this._drawPhi(ctx, pL, pT, pR, pB, phi);

    // —— Bottom: position ——
    const xL = L;
    const xT = mid + gap;
    const xR = R;
    const xB = botB;
    let title = 'ψ(x,t)  —  position';
    if (this.mode === 'probability') title = '|ψ(x)|²  —  probability';
    if (this.mode === 'detections') title = 'Detections  →  build |ψ|²';
    panelFrame(ctx, xL, xT, xR, xB, title);
    this._drawPsi(ctx, xL, xT, xR, xB, psi);

    // Phase wheel (Polytechnique) — inside top panel, clear of title
    drawPhaseWheel(ctx, pL + 36, pT + 52, 22);

    // Axis labels
    ctx.fillStyle = '#64748b';
    ctx.font = '11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('p', (pL + pR) / 2, pB + 14);
    ctx.fillText('x', (xL + xR) / 2, xB + 16);

    // Narrow σ ↔ wide Δp hint
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui,sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('narrower σ → wider Δp', R - 8, pT + 16);
  }

  _drawPhi(ctx, L, T, R, B, phi) {
    const midY = (T + B) / 2;
    const halfH = (B - T) * 0.38;
    const ymax = maxOf(phi.ys);
    function X(p) {
      return L + (R - L) * (p - phi.xMin) / (phi.xMax - phi.xMin);
    }
    function Y(v) {
      return midY - halfH * (v / ymax);
    }

    // Phase-coloured fill (envelope)
    for (let i = 0; i < phi.xs.length - 1; i++) {
      const x0 = X(phi.xs[i]);
      const x1 = X(phi.xs[i + 1]);
      const y0 = Y(phi.ys[i]);
      const y1 = Y(phi.ys[i + 1]);
      ctx.beginPath();
      ctx.moveTo(x0, midY);
      ctx.lineTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x1, midY);
      ctx.closePath();
      ctx.fillStyle = hslPhase(0.58 + 0.08 * (phi.xs[i] / (phi.xMax || 1)), 48);
      ctx.globalAlpha = 0.55;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.beginPath();
    for (let i = 0; i < phi.xs.length; i++) {
      const px = X(phi.xs[i]);
      const py = Y(phi.ys[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 2;
    ctx.stroke();

    // ⟨p⟩ marker
    const xp0 = X(phi.p0);
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = 'rgba(251,191,36,0.7)';
    ctx.beginPath();
    ctx.moveTo(xp0, T + 20);
    ctx.lineTo(xp0, B - 4);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#fbbf24';
    ctx.font = '600 10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⟨p⟩', xp0, B - 6);
  }

  _drawPsi(ctx, L, T, R, B, psi) {
    const midY = (T + B) / 2;
    const halfH = (B - T) * 0.4;
    const ampMax = maxOf(psi.amp);
    const densMax = maxOf(psi.dens);

    function X(x) {
      return L + (R - L) * (x - psi.xMin) / (psi.xMax - psi.xMin);
    }
    function Yamp(a) {
      return midY - halfH * (a / ampMax);
    }
    function Ydens(d) {
      return B - 8 - (B - T - 24) * (d / densMax);
    }

    if (this.mode === 'wave') {
      // Phase-coloured |ψ| envelope (Polytechnique look)
      for (let i = 0; i < psi.xs.length - 1; i++) {
        const x0 = X(psi.xs[i]);
        const x1 = X(psi.xs[i + 1]);
        const top0 = Yamp(psi.amp[i]);
        const bot0 = midY + (midY - top0);
        const top1 = Yamp(psi.amp[i + 1]);
        const bot1 = midY + (midY - top1);
        ctx.beginPath();
        ctx.moveTo(x0, top0);
        ctx.lineTo(x1, top1);
        ctx.lineTo(x1, bot1);
        ctx.lineTo(x0, bot0);
        ctx.closePath();
        ctx.fillStyle = hslPhase(psi.hue[i], 50);
        ctx.globalAlpha = 0.75;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      // Envelope outline
      ctx.beginPath();
      for (let i = 0; i < psi.xs.length; i++) {
        const px = X(psi.xs[i]);
        const py = Yamp(psi.amp[i]);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = 'rgba(226,232,240,0.85)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < psi.xs.length; i++) {
        const px = X(psi.xs[i]);
        const py = midY + (midY - Yamp(psi.amp[i]));
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      if (this.showRe) {
        ctx.beginPath();
        for (let i = 0; i < psi.xs.length; i++) {
          const px = X(psi.xs[i]);
          const py = midY - halfH * (psi.re[i] / ampMax);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.fillStyle = '#fbbf24';
        ctx.font = '600 10px system-ui,sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('Re ψ', R - 8, T + 16);
      }
    } else if (this.mode === 'probability') {
      ctx.beginPath();
      ctx.moveTo(X(psi.xs[0]), B - 8);
      for (let i = 0; i < psi.xs.length; i++) {
        ctx.lineTo(X(psi.xs[i]), Ydens(psi.dens[i]));
      }
      ctx.lineTo(X(psi.xs[psi.xs.length - 1]), B - 8);
      ctx.closePath();
      ctx.fillStyle = 'rgba(56,189,248,0.28)';
      ctx.fill();
      ctx.beginPath();
      for (let i = 0; i < psi.xs.length; i++) {
        const px = X(psi.xs[i]);
        const py = Ydens(psi.dens[i]);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.fillStyle = '#38bdf8';
      ctx.font = '600 11px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('P(x) = |ψ|²', (L + R) / 2, T + 18);
    } else {
      // Detections: faint |ψ|² + hit ticks
      ctx.beginPath();
      for (let i = 0; i < psi.xs.length; i++) {
        const px = X(psi.xs[i]);
        const py = Ydens(psi.dens[i]);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = 'rgba(56,189,248,0.35)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      const show = this.hits.slice(-200);
      for (let i = 0; i < show.length; i++) {
        const x = show[i];
        if (x < psi.xMin || x > psi.xMax) continue;
        const px = X(x);
        const age = i / Math.max(show.length - 1, 1);
        const jitter = ((i * 37) % 11) - 5;
        ctx.fillStyle = 'rgba(251,191,36,' + (0.35 + 0.55 * age) + ')';
        ctx.beginPath();
        ctx.arc(px, midY + jitter, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fbbf24';
      ctx.font = '600 11px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('each dot = one position measurement', (L + R) / 2, T + 18);
    }
  }
}
