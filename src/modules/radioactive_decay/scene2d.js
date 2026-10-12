// 2D radioactive decay — probabilistic nuclei, subsample visuals, N(t) bar chart.
import { createDualCanvas } from '../common/teachPlots.js';
import { el } from '../common/ui.js';
import {
  remainingCount, activity, halfLivesElapsed, plainDecay,
  decayConstantFromHalfLife, binomialDecayed,
} from './physics.js';

const VISUAL_MAX = 420;
const BAR_MAX = 72;

export class Decay2D {
  constructor(host) {
    this.host = host;
    this.n0 = 10000;
    this.halfLife = 12;
    this.halfLifeReal = '5,730 y';
    this.isotopeName = 'Carbon-14';
    this.decayMode = 'β⁻';
    this.paused = false;
    this._active = true;
    this._t = 0;
    this._alive = this.n0;
    this._atoms = [];
    this._sparks = [];
    this._history = [];
    this._hud = el('div', 'rd-hud', '');
    host.appendChild(this._hud);
    this._resetSample();
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h) {
      self._draw(ctx, w, h);
    });
    this._updateHud();
  }

  setParams(p) {
    if (!p) return;
    let reset = false;
    if (p.n0 != null && p.n0 !== this.n0) { this.n0 = p.n0; reset = true; }
    if (p.halfLife != null && p.halfLife !== this.halfLife) { this.halfLife = p.halfLife; reset = true; }
    if (p.halfLifeReal != null) this.halfLifeReal = p.halfLifeReal;
    if (p.isotopeName != null) this.isotopeName = p.isotopeName;
    if (p.decayMode != null) this.decayMode = p.decayMode;
    if (p.reset) reset = true;
    if (reset) {
      this._t = 0;
      this._history = [];
      this._sparks = [];
      this._resetSample();
    }
    this._updateHud();
  }

  /** Driven by module timer so 2D/3D stay in sync. */
  tick(dt) {
    if (this.paused || !this._active) return;
    this._t += dt;
    this._stepDecay(dt);
  }

  aliveCount() { return this._alive; }

  setPaused(v) { this.paused = !!v; this._canvas.setPaused(v); }
  setActive(v) { this._active = !!v; this._hud.style.display = v ? '' : 'none'; }
  resize() { this._canvas.resize(); }
  dispose() {
    this._canvas.dispose();
    if (this._hud.parentNode) this._hud.parentNode.removeChild(this._hud);
  }

  _visualTarget() {
    return Math.min(VISUAL_MAX, Math.max(1, this.n0));
  }

  _resetSample() {
    this._alive = this.n0;
    this._atoms = [];
    const vCount = this._visualTarget();
    const cols = Math.ceil(Math.sqrt(vCount * 1.25));
    const rows = Math.ceil(vCount / cols);
    let i = 0;
    for (let r = 0; r < rows && i < vCount; r++) {
      for (let c = 0; c < cols && i < vCount; c++) {
        this._atoms.push({
          x: (c + 0.5) / cols,
          y: (r + 0.5) / rows,
          alive: true,
          daughter: false,
        });
        i++;
      }
    }
    this._history = [{ t: 0, n: this.n0, a: activity(this.n0, this.halfLife) }];
  }

  _syncVisuals(prevAlive) {
    const vCount = this._atoms.length;
    if (!vCount) return;
    const wantAlive = Math.round((this._alive / Math.max(1, this.n0)) * vCount);
    let visualAlive = 0;
    for (let i = 0; i < vCount; i++) if (this._atoms[i].alive) visualAlive++;

    // Turn off extras (decayed)
    while (visualAlive > wantAlive) {
      const idx = Math.floor(Math.random() * vCount);
      const a = this._atoms[idx];
      if (!a.alive) continue;
      a.alive = false;
      a.daughter = true;
      visualAlive--;
      if (this._sparks.length < 28) {
        this._sparks.push({
          x: a.x, y: a.y,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -0.2 - Math.random() * 0.3,
          life: 0.75,
          mode: this.decayMode,
        });
      }
    }
    // Turn on if reset / growth (should not happen in decay)
    while (visualAlive < wantAlive) {
      const idx = Math.floor(Math.random() * vCount);
      const a = this._atoms[idx];
      if (a.alive) continue;
      a.alive = true;
      a.daughter = false;
      visualAlive++;
    }

    // Extra sparks when many decayed this step
    const died = Math.max(0, prevAlive - this._alive);
    if (died > 0 && this._sparks.length < 18) {
      const bursts = Math.min(6, Math.ceil(died / Math.max(1, this.n0 / 40)));
      for (let b = 0; b < bursts; b++) {
        this._sparks.push({
          x: 0.15 + Math.random() * 0.7,
          y: 0.15 + Math.random() * 0.7,
          vx: (Math.random() - 0.5) * 0.35,
          vy: -0.15 - Math.random() * 0.25,
          life: 0.55,
          mode: this.decayMode,
        });
      }
    }
  }

  _stepDecay(dt) {
    const lam = decayConstantFromHalfLife(this.halfLife);
    const p = 1 - Math.exp(-lam * dt);
    const prev = this._alive;
    const died = binomialDecayed(this._alive, p);
    this._alive = Math.max(0, this._alive - died);
    this._syncVisuals(prev);

    for (let i = this._sparks.length - 1; i >= 0; i--) {
      const s = this._sparks[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      if (s.life <= 0) this._sparks.splice(i, 1);
    }

    const last = this._history[this._history.length - 1];
    if (!last || this._t - last.t >= 0.08) {
      this._history.push({
        t: this._t,
        n: this._alive,
        a: activity(this._alive, this.halfLife),
      });
      if (this._history.length > 600) this._history.shift();
    }
    this._updateHud();
  }

  _updateHud() {
    const n = this._alive;
    const frac = n / Math.max(1, this.n0);
    const lam = decayConstantFromHalfLife(this.halfLife);
    const ideal = Math.round(remainingCount(this.n0, this._t, this.halfLife));
    this._hud.textContent =
      this.isotopeName + ' (' + this.decayMode + ')' +
      '   ·   N = ' + n + ' / ' + this.n0 + '  (ideal ≈ ' + ideal + ')' +
      '   ·   T½ = ' + this.halfLifeReal + '  (lab clock ' + this.halfLife.toFixed(1) + ' s)' +
      '   ·   λ = ' + lam.toFixed(3) + ' /s' +
      '   ·   t = ' + this._t.toFixed(1) + ' s (' + halfLivesElapsed(this._t, this.halfLife).toFixed(2) + '×T½)';
  }

  _draw(ctx, w, h) {
    if (!this._active) return;
    ctx.fillStyle = '#070d18';
    ctx.fillRect(0, 0, w, h);

    const topH = Math.floor(h * 0.36);
    this._drawSample(ctx, w, topH);
    this._drawBarChart(ctx, 0, topH, w, h - topH);
  }

  _drawSample(ctx, w, h) {
    const n = this._alive;
    const frac = n / Math.max(1, this.n0);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.textAlign = 'left';
    const visNote = this.n0 > VISUAL_MAX
      ? '  ·  showing ' + this._atoms.length + ' of ' + this.n0 + ' (subsample)'
      : '';
    ctx.fillText(
      'Sample — green = parent  ·  grey = daughter  ·  flash = ' + this.decayMode + '  (each nucleus decays at random)' + visNote,
      14, 20
    );

    roundRect(ctx, 14, 28, w - 28, 22, 6);
    ctx.fillStyle = 'rgba(15,23,42,0.8)';
    ctx.fill();
    ctx.fillStyle = '#4ade80';
    ctx.font = '700 11px system-ui,sans-serif';
    ctx.fillText(n + ' / ' + this.n0 + '  (' + Math.round(frac * 100) + '%)', 22, 43);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText(plainDecay(frac), 200, 43);

    const padX = 24;
    const padY = 58;
    const boxW = w - padX * 2;
    const boxH = h - padY - 14;
    ctx.strokeStyle = 'rgba(56,189,248,0.22)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, padX - 4, padY - 4, boxW + 8, boxH + 8, 10);
    ctx.stroke();

    const r = this.n0 > 2000 ? 2.8 : this.n0 > 500 ? 3.4 : 4.2;
    for (let i = 0; i < this._atoms.length; i++) {
      const a = this._atoms[i];
      const x = padX + a.x * boxW;
      const y = padY + a.y * boxH;
      if (a.alive) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = '#4ade80';
        ctx.fill();
      } else if (a.daughter) {
        ctx.beginPath();
        ctx.arc(x, y, r * 0.75, 0, Math.PI * 2);
        ctx.fillStyle = '#64748b';
        ctx.fill();
      }
    }

    for (let i = 0; i < this._sparks.length; i++) {
      const s = this._sparks[i];
      ctx.globalAlpha = Math.max(0, s.life / 0.85);
      ctx.beginPath();
      ctx.arc(padX + s.x * boxW, padY + s.y * boxH, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = String(s.mode).indexOf('α') >= 0 ? '#fbbf24' : '#38bdf8';
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Current N bar (shrinking)
    ctx.fillStyle = 'rgba(51,65,85,0.55)';
    roundRect(ctx, padX, padY + boxH - 8, boxW, 7, 3);
    ctx.fill();
    ctx.fillStyle = '#4ade80';
    roundRect(ctx, padX, padY + boxH - 8, Math.max(2, boxW * frac), 7, 3);
    ctx.fill();
  }

  _drawBarChart(ctx, x0, y0, w, h) {
    ctx.fillStyle = '#0a1220';
    ctx.fillRect(x0, y0, w, h);

    const L = x0 + 64;
    const R = x0 + w - 20;
    const T = y0 + 36;
    const B = y0 + h - 28;

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Number of nuclei  N(t)   ·   green bars = random sample   ·   blue = ideal law', L, y0 + 18);

    ctx.strokeStyle = 'rgba(148,163,184,0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(L, T);
    ctx.lineTo(L, B);
    ctx.lineTo(R, B);
    ctx.stroke();

    const tMax = Math.max(this.halfLife * 4.5, this._t + this.halfLife * 0.25);
    const nMax = this.n0;

    // Y ticks: 100%, 75%, 50%, 25%, 0
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px ui-monospace, Consolas, monospace';
    ctx.textAlign = 'right';
    for (let k = 0; k <= 4; k++) {
      const frac = 1 - k / 4;
      const nLabel = Math.round(nMax * frac);
      const py = B - (B - T) * frac;
      ctx.fillText(String(nLabel), L - 8, py + 4);
      ctx.strokeStyle = 'rgba(148,163,184,0.1)';
      ctx.beginPath();
      ctx.moveTo(L, py);
      ctx.lineTo(R, py);
      ctx.stroke();
    }

    // Bars from history (downsample)
    const hist = this._history;
    const nBars = Math.min(BAR_MAX, Math.max(1, hist.length));
    const step = Math.max(1, Math.floor(hist.length / nBars));
    const barSlots = [];
    for (let i = 0; i < hist.length; i += step) barSlots.push(hist[i]);
    if (barSlots.length && hist[hist.length - 1] !== barSlots[barSlots.length - 1]) {
      barSlots.push(hist[hist.length - 1]);
    }

    const slotW = (R - L) / Math.max(1, barSlots.length);
    const gap = Math.max(1, slotW * 0.18);
    for (let i = 0; i < barSlots.length; i++) {
      const pt = barSlots[i];
      const bh = (B - T) * (pt.n / nMax);
      const bx = L + i * slotW + gap / 2;
      const bw = Math.max(2, slotW - gap);
      ctx.fillStyle = i === barSlots.length - 1 ? '#86efac' : '#4ade80';
      ctx.globalAlpha = 0.88;
      ctx.fillRect(bx, B - bh, bw, Math.max(1, bh));
      ctx.globalAlpha = 1;
    }

    // Ideal exponential curve
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const t = (i / 120) * tMax;
      const n = remainingCount(this.n0, t, this.halfLife);
      const px = L + (R - L) * (t / tMax);
      const py = B - (B - T) * (n / nMax);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = 'rgba(56,189,248,0.95)';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Half-life markers
    for (let n = 1; n <= 3; n++) {
      const t = this.halfLife * n;
      if (t > tMax) break;
      const px = L + (R - L) * (t / tMax);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(251,191,36,0.85)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(px, T);
      ctx.lineTo(px, B);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#fbbf24';
      ctx.font = '700 10px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(n + '×T½', px, T + 12);
    }

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Time →  (lab clock; physical T½ = ' + this.halfLifeReal + ')', (L + R) / 2, B + 18);

    // Live readout
    const frac = this._alive / Math.max(1, this.n0);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(
      'Now: N = ' + this._alive + '   ·   ideal ≈ ' + Math.round(remainingCount(this.n0, this._t, this.halfLife)) +
      '   ·   noise = sample − ideal (probabilistic)',
      L, y0 + h - 6
    );
  }
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
