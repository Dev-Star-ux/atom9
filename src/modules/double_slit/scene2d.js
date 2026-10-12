// oPhysics-style 2D double-slit: wavefronts, maxima, screen pattern + I(y).
import { createDualCanvas } from '../common/teachPlots.js';
import { intensityProfile, wavelengthM, slitSepM } from './physics.js';
import { el } from '../common/ui.js';

export class DoubleSlit2D {
  constructor(host) {
    this.host = host;
    this.state = { freq: 7, slitSep: 80, distance: 1 };
    this.showWaves = true;
    this.showMaxima = true;
    this.showScale = true;
    this._buildToggles();
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  _buildToggles() {
    const box = el('div', 'dual-2d-toggles');
    function add(label, key) {
      const lab = el('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = this[key];
      const self = this;
      cb.onchange = function () { self[key] = cb.checked; };
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode(' ' + label));
      box.appendChild(lab);
    }
    add.call(this, 'Wavefronts', 'showWaves');
    add.call(this, 'Maxima', 'showMaxima');
    add.call(this, 'Scale', 'showScale');
    this.host.appendChild(box);
    this._tog = box;
  }

  setParams(p) {
    if (!p) return;
    if (p.freq != null) this.state.freq = p.freq;
    if (p.slitSep != null) this.state.slitSep = p.slitSep;
    if (p.distance != null) this.state.distance = p.distance;
  }

  setPaused(v) { this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  tick() {}

  _draw(ctx, W, H, phase) {
    if (!W || !H) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);

    const profile = intensityProfile(this.state.freq, this.state.slitSep, this.state.distance, 160);
    const lam = wavelengthM(this.state.freq);
    const d = slitSepM(this.state.slitSep);
    const L = this.state.distance;

    // Layout: apparatus left/center, I(y) plot on the right
    const plotW = Math.min(200, W * 0.28);
    const left = 50;
    const right = W - plotW - 24;
    const top = 40;
    const bot = H - 36;
    const midY = (top + bot) / 2;
    const slitX = left + (right - left) * 0.28;
    const screenX = right - 8;
    const prop = (right - slitX);

    // Title
    ctx.fillStyle = '#eaf0fb';
    ctx.font = '13px system-ui,sans-serif';
    ctx.fillText('Double-slit interference (2D)', 16, 22);
    ctx.fillStyle = '#8092b4';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('λ = ' + (lam * 1e9).toFixed(0) + ' nm · d = ' + this.state.slitSep + ' µm · L = ' + L.toFixed(1), 250, 22);

    // Source
    const srcX = left;
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(srcX, midY, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('source', srcX - 14, midY + 22);

    // Barrier + slits
    const slitGapPx = Math.max(18, Math.min(70, 20 + this.state.slitSep * 0.25));
    const slitHalf = slitGapPx / 2;
    const s1 = midY - slitHalf;
    const s2 = midY + slitHalf;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(slitX - 6, top, 12, s1 - 6 - top);
    ctx.fillRect(slitX - 6, s1 + 6, 12, (s2 - 6) - (s1 + 6));
    ctx.fillRect(slitX - 6, s2 + 6, 12, bot - (s2 + 6));
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(slitX - 6, s1 - 6, 12, 12);
    ctx.fillRect(slitX - 6, s2 - 6, 12, 12);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('slits', slitX - 12, top - 6);

    // Screen
    ctx.fillStyle = '#334155';
    ctx.fillRect(screenX, top, 10, bot - top);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('screen', screenX - 18, top - 6);

    // Wavefronts from each slit
    if (this.showWaves) {
      const lamPx = Math.max(10, Math.min(36, 14 + (700 - lam * 1e9) * 0.04));
      const nRings = 14;
      for (let k = 0; k < nRings; k++) {
        const r = ((phase * 40 + k * lamPx) % (nRings * lamPx));
        if (r < 4) continue;
        const alpha = Math.max(0.05, 0.35 * (1 - r / (nRings * lamPx)));
        ctx.strokeStyle = 'rgba(56,189,248,' + alpha + ')';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(slitX, s1, r, -1.2, 1.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(slitX, s2, r, -1.2, 1.2);
        ctx.stroke();
      }
      // Plane waves into slits
      ctx.strokeStyle = 'rgba(251,191,36,0.35)';
      for (let i = 0; i < 8; i++) {
        const x = srcX + 16 + ((phase * 30 + i * 16) % 80);
        if (x >= slitX - 8) continue;
        ctx.beginPath();
        ctx.moveTo(x, midY - 50);
        ctx.lineTo(x, midY + 50);
        ctx.stroke();
      }
    }

    // Intensity on screen (vertical strip colors)
    let iMax = 1e-9;
    for (let i = 0; i < profile.Is.length; i++) if (profile.Is[i] > iMax) iMax = profile.Is[i];
    for (let i = 0; i < profile.ys.length; i++) {
      const yPhys = profile.ys[i];
      const t = (yPhys + 0.04) / 0.08;
      const py = top + t * (bot - top);
      const bright = profile.Is[i] / iMax;
      const g = Math.floor(40 + 200 * bright);
      const b = Math.floor(80 + 175 * bright);
      ctx.fillStyle = 'rgb(30,' + g + ',' + b + ')';
      ctx.fillRect(screenX, py - 1, 10, 3);
    }

    // Maxima rays
    if (this.showMaxima && profile.fringe > 0) {
      ctx.strokeStyle = 'rgba(251,191,36,0.55)';
      ctx.setLineDash([4, 3]);
      const fringePx = (profile.fringe / 0.08) * (bot - top);
      for (let m = -4; m <= 4; m++) {
        const py = midY + m * fringePx;
        if (py < top || py > bot) continue;
        ctx.beginPath();
        ctx.moveTo(slitX, midY);
        ctx.lineTo(screenX, py);
        ctx.stroke();
        if (this.showScale) {
          ctx.fillStyle = '#fbbf24';
          ctx.font = '10px system-ui,sans-serif';
          ctx.fillText('m=' + m, screenX - 36, py + 3);
        }
      }
      ctx.setLineDash([]);
    }

    // Path from source to slits
    ctx.strokeStyle = 'rgba(148,163,184,0.4)';
    ctx.beginPath();
    ctx.moveTo(srcX + 8, midY);
    ctx.lineTo(slitX - 6, s1);
    ctx.moveTo(srcX + 8, midY);
    ctx.lineTo(slitX - 6, s2);
    ctx.stroke();

    // I(y) plot on the right
    const px0 = W - plotW - 8;
    const px1 = W - 12;
    const py0 = top;
    const py1 = bot;
    ctx.fillStyle = '#0a1122';
    ctx.fillRect(px0 - 8, py0 - 8, plotW + 16, py1 - py0 + 16);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(px0, py0, px1 - px0, py1 - py0);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('I(y)', px0, py0 - 12);

    ctx.beginPath();
    for (let i = 0; i < profile.ys.length; i++) {
      const t = (profile.ys[i] + 0.04) / 0.08;
      const py = py0 + t * (py1 - py0);
      const ix = px0 + (profile.Is[i] / iMax) * (px1 - px0) * 0.92;
      if (i === 0) ctx.moveTo(ix, py); else ctx.lineTo(ix, py);
    }
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineWidth = 1;

    if (profile.fringe > 0) {
      ctx.fillStyle = '#8092b4';
      ctx.fillText('Δy ≈ ' + (profile.fringe * 1e3).toFixed(2) + ' mm', px0, py1 + 18);
    }
  }

  dispose() {
    if (this._tog && this._tog.parentNode) this._tog.parentNode.removeChild(this._tog);
    this._canvas.dispose();
  }
}
