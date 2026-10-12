// lookang-style 2D wave–particle duality of light:
// source → double slit → screen; wave / photon hits / which-path.
// https://iwant2study.org/lookangejss/06QuantumPhysics/ejss_model_DoubleSlitWaveParticleDualitywee/index.html
import { createDualCanvas } from '../common/teachPlots.js';
import { el } from '../common/ui.js';
import {
  freqToNm,
  photonColor,
  photonRgb,
  hitProbability,
  photonEnergyEV,
} from './physics.js';

export class LightDuality2D {
  constructor(host) {
    this.host = host;
    this.state = { mode: 'wave', freq: 7, intensity: 60, slitSep: 80, phase: 0 };
    this.paused = false;
    this._active = true;
    this._hits = [];
    this._photons = [];
    this._hitCount = 0;
    this._accum = null;
    this._accumH = 0;

    this._hud = el('div', 'pe-hud', '');
    host.appendChild(this._hud);

    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      if (!self.paused && self._active) {
        self.state.phase = phase;
        self._step(0.04, w, h);
      }
      self._draw(ctx, w, h);
    });
    this._updateHud();
  }

  setParams(p) {
    if (!p) return;
    const modeChanged = p.mode != null && p.mode !== this.state.mode;
    const sepChanged = p.slitSep != null && Math.abs(p.slitSep - this.state.slitSep) > 0.5;
    const freqChanged = p.freq != null && Math.abs(p.freq - this.state.freq) > 0.05;
    if (p.mode != null) this.state.mode = p.mode;
    if (p.freq != null) this.state.freq = p.freq;
    if (p.intensity != null) this.state.intensity = p.intensity;
    if (p.slitSep != null) this.state.slitSep = p.slitSep;
    if (p.phase != null) this.state.phase = p.phase;
    if (modeChanged || sepChanged || freqChanged) this._clearHits();
    this._updateHud();
  }

  setPaused(v) { this.paused = !!v; this._canvas.setPaused(v); }
  setActive(v) { this._active = !!v; }
  resize() { this._canvas.resize(); }
  tick() {}
  dispose() {
    if (this._canvas && this._canvas.dispose) this._canvas.dispose();
    if (this._hud && this._hud.parentNode) this._hud.parentNode.removeChild(this._hud);
  }

  _clearHits() {
    this._hits = [];
    this._photons = [];
    this._hitCount = 0;
    this._accum = null;
  }

  _layout(W, H) {
    const top = 44;
    const bot = H - 28;
    const left = 48;
    const right = W - 160;
    const midY = (top + bot) / 2;
    const slitX = left + (right - left) * 0.32;
    const screenX = right - 10;
    const half = Math.max(18, Math.min(70, 16 + this.state.slitSep * 0.28));
    return {
      top: top, bot: bot, left: left, right: right, midY: midY,
      slitX: slitX, screenX: screenX, srcX: left,
      s1: midY - half / 2, s2: midY + half / 2, half: half,
    };
  }

  _step(dt, W, H) {
    if (!W || !H) return;
    const L = this._layout(W, H);
    const mode = this.state.mode;
    const rate = (this.state.intensity / 100) * (mode === 'wave' ? 0 : 14);

    // Flying photons toward slits / screen
    if (mode !== 'wave') {
      const nSpawn = Math.min(3, Math.floor(rate * dt * 2 + Math.random()));
      for (let i = 0; i < nSpawn; i++) {
        const which = Math.random() < 0.5 ? 0 : 1;
        const sy = which === 0 ? L.s1 : L.s2;
        this._photons.push({
          x: L.srcX + 8,
          y: L.midY + (Math.random() - 0.5) * 20,
          tx: L.screenX,
          ty: 0,
          which: which,
          sy: sy,
          stage: 0,
          life: 1,
        });
      }
    }

    const next = [];
    for (let i = 0; i < this._photons.length; i++) {
      const p = this._photons[i];
      if (p.stage === 0) {
        p.x += (L.slitX - p.x) * 0.18 + 6;
        p.y += (p.sy - p.y) * 0.12;
        if (p.x >= L.slitX - 4) {
          // Assign screen hit from probability
          let yNorm = 0;
          let tries = 0;
          while (tries < 40) {
            yNorm = (Math.random() * 2 - 1);
            if (Math.random() < hitProbability(yNorm, mode, this.state.freq, this.state.slitSep)) break;
            tries++;
          }
          p.ty = L.midY + yNorm * ((L.bot - L.top) * 0.48);
          p.stage = 1;
        }
      } else {
        p.x += (p.tx - p.x) * 0.22 + 8;
        p.y += (p.ty - p.y) * 0.18;
        if (p.x >= L.screenX - 6) {
          this._registerHit(p.ty, L, W, H);
          continue;
        }
      }
      next.push(p);
    }
    this._photons = next;
  }

  _registerHit(py, L, W, H) {
    this._hitCount++;
    this._hits.push({ y: py, age: 0 });
    if (this._hits.length > 400) this._hits.shift();
    const h = Math.max(32, Math.floor(L.bot - L.top));
    if (!this._accum || this._accumH !== h) {
      this._accum = new Float32Array(h);
      this._accumH = h;
    }
    const idx = Math.floor(py - L.top);
    if (idx >= 0 && idx < h) {
      this._accum[idx] += 1;
      if (idx > 0) this._accum[idx - 1] += 0.4;
      if (idx < h - 1) this._accum[idx + 1] += 0.4;
    }
  }

  _updateHud() {
    const nm = freqToNm(this.state.freq);
    const E = photonEnergyEV(this.state.freq);
    const mode = this.state.mode;
    let status = 'Wave · interference';
    if (mode === 'particle') status = 'Photons · unobserved → fringes';
    else if (mode === 'which_path') status = 'Which-path · no interference';
    this._hud.textContent =
      status +
      '  ·  λ = ' + nm.toFixed(0) + ' nm' +
      '  ·  d = ' + this.state.slitSep + ' µm' +
      '  ·  E = ' + E.toFixed(2) + ' eV' +
      '  ·  hits ' + this._hitCount;
  }

  _draw(ctx, W, H) {
    if (!W || !H) return;
    const L = this._layout(W, H);
    const mode = this.state.mode;
    const rgb = photonRgb(this.state.freq);
    const col = photonColor(this.state.freq);
    const phase = this.state.phase;

    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);

    // Title
    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.fillText('Wave–particle duality — double slit (2D)', 16, 22);
    ctx.fillStyle = '#8092b4';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('lookang-style · λ, d, observe', 320, 22);

    // Source
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(L.srcX, L.midY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('source', L.srcX - 16, L.midY + 24);

    // Incoming plane waves (wave mode) or beam hint
    if (mode === 'wave') {
      ctx.strokeStyle = 'rgba(' + Math.round(rgb[0] * 255) + ',' + Math.round(rgb[1] * 255) + ',' + Math.round(rgb[2] * 255) + ',0.35)';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 10; i++) {
        const x = L.srcX + 14 + ((phase * 28 + i * 14) % 90);
        if (x >= L.slitX - 10) continue;
        ctx.beginPath();
        ctx.moveTo(x, L.midY - 55);
        ctx.lineTo(x, L.midY + 55);
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = 'rgba(251,191,36,0.25)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(L.srcX + 10, L.midY);
      ctx.lineTo(L.slitX - 8, L.midY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Barrier + slits
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(L.slitX - 7, L.top, 14, L.s1 - 7 - L.top);
    ctx.fillRect(L.slitX - 7, L.s1 + 7, 14, (L.s2 - 7) - (L.s1 + 7));
    ctx.fillRect(L.slitX - 7, L.s2 + 7, 14, L.bot - (L.s2 + 7));
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(L.slitX - 7, L.s1 - 7, 14, 14);
    ctx.fillRect(L.slitX - 7, L.s2 - 7, 14, 14);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('slits', L.slitX - 12, L.top - 8);

    // Which-path detectors
    if (mode === 'which_path') {
      ctx.fillStyle = 'rgba(248,113,113,0.85)';
      ctx.fillRect(L.slitX + 10, L.s1 - 10, 14, 20);
      ctx.fillRect(L.slitX + 10, L.s2 - 10, 14, 20);
      ctx.fillStyle = '#fca5a5';
      ctx.font = '10px system-ui,sans-serif';
      ctx.fillText('detectors', L.slitX + 28, L.s1 - 14);
    }

    // Circular wavefronts from slits (wave + particle unobserved)
    if (mode === 'wave' || mode === 'particle') {
      const lamPx = Math.max(10, Math.min(34, 12 + (700 - freqToNm(this.state.freq)) * 0.04));
      const nRings = 12;
      for (let k = 0; k < nRings; k++) {
        const r = ((phase * 36 + k * lamPx) % (nRings * lamPx));
        if (r < 4) continue;
        const alpha = Math.max(0.04, 0.32 * (1 - r / (nRings * lamPx)));
        ctx.strokeStyle = 'rgba(' + Math.round(rgb[0] * 255) + ',' + Math.round(rgb[1] * 255) + ',' + Math.round(rgb[2] * 255) + ',' + alpha + ')';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(L.slitX, L.s1, r, -1.15, 1.15);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(L.slitX, L.s2, r, -1.15, 1.15);
        ctx.stroke();
      }
    }

    // Screen body
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(L.screenX, L.top, 12, L.bot - L.top);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(L.screenX, L.top, 12, L.bot - L.top);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('screen', L.screenX - 18, L.top - 8);

    // Continuous fringe strip (wave) or accum histogram tint
    const span = L.bot - L.top;
    for (let i = 0; i < Math.floor(span); i += 2) {
      const yNorm = ((L.top + i + 1) - L.midY) / (span * 0.48);
      const p = hitProbability(yNorm, mode, this.state.freq, this.state.slitSep);
      let bright = p;
      if (mode !== 'wave' && this._accum && this._accumH === Math.floor(span)) {
        let aMax = 1e-6;
        for (let j = 0; j < this._accum.length; j++) if (this._accum[j] > aMax) aMax = this._accum[j];
        const a = this._accum[Math.min(this._accum.length - 1, i)] / aMax;
        bright = 0.25 * p + 0.75 * a;
      }
      const r = Math.floor(20 + rgb[0] * 220 * bright);
      const g = Math.floor(20 + rgb[1] * 220 * bright);
      const b = Math.floor(30 + rgb[2] * 220 * bright);
      ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
      ctx.fillRect(L.screenX + 1, L.top + i, 10, 3);
    }

    // Photon sprites
    for (let i = 0; i < this._photons.length; i++) {
      const p = this._photons[i];
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Recent hit flashes
    for (let i = 0; i < this._hits.length; i++) {
      const h = this._hits[i];
      h.age += 1;
      const a = Math.max(0, 1 - h.age / 40);
      if (a <= 0) continue;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.35 * a) + ')';
      ctx.beginPath();
      ctx.arc(L.screenX + 6, h.y, 2 + 3 * a, 0, Math.PI * 2);
      ctx.fill();
    }

    // Right panel: I(y) theory + note
    this._drawIy(ctx, W, H, L, mode, rgb);

    this._updateHud();
  }

  _drawIy(ctx, W, H, L, mode, rgb) {
    const px = W - 148;
    const py = 44;
    const pw = 132;
    const ph = Math.min(220, H - 80);
    ctx.fillStyle = 'rgba(10,17,34,0.92)';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(px, py, pw, ph);
    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.fillText('I(y)', px + 10, py + 18);

    const left = px + 18;
    const right = px + pw - 12;
    const top = py + 28;
    const bot = py + ph - 36;
    ctx.strokeStyle = '#1e293b';
    ctx.strokeRect(left, top, right - left, bot - top);

    ctx.beginPath();
    const n = 80;
    for (let i = 0; i <= n; i++) {
      const yNorm = -1 + (2 * i) / n;
      const p = hitProbability(yNorm, mode, this.state.freq, this.state.slitSep);
      const yy = top + ((1 - (yNorm + 1) / 2) * (bot - top));
      const xx = left + p * (right - left) * 0.95;
      if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#8092b4';
    ctx.font = '10px system-ui,sans-serif';
    if (mode === 'which_path') {
      ctx.fillText('two clumps — no fringes', px + 8, py + ph - 12);
    } else {
      ctx.fillText('cos² interference', px + 8, py + ph - 12);
    }

    // Complementarity note
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui,sans-serif';
    const noteY = py + ph + 18;
    if (mode === 'wave') ctx.fillText('Wave: superposition → fringes', px, noteY);
    else if (mode === 'particle') ctx.fillText('Particle hits sample |ψ|²', px, noteY);
    else ctx.fillText('Knowing the path kills interference', px, noteY);
  }
}
