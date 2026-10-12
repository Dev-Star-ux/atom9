// 2D Infinite Square Well — Schroeder-style:
// Re/Im or |ψ|²+phase, eight phasor “clocks”, time evolution.
import { createDualCanvas } from '../common/teachPlots.js';
import { el } from '../common/ui.js';
import { N_MAX, phaseCss, WellState } from './physics.js';

export class InfiniteWell2D {
  constructor(host, sharedState) {
    this.host = host;
    this.state = sharedState || new WellState();
    this.paused = false;
    this._active = true;
    this._clockHit = [];
    this._buildChrome();
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h) {
      if (!self.paused && self._active) self.state.tick(0.016);
      self._draw(ctx, w, h);
    });
    this._onClick = function (ev) { self._handleClick(ev); };
    this._canvas.canvas.addEventListener('click', this._onClick);
  }

  _buildChrome() {
    const box = el('div', 'dual-2d-toggles well-toggles');
    const self = this;

    function btn(label, fn) {
      const b = el('button', 'chip', label);
      b.onclick = function () { fn(); };
      box.appendChild(b);
      return b;
    }

    this._modeBtn = btn(
      this.state.viewMode === 'reim' ? 'View: Re / Im' : 'View: |ψ|² / phase',
      function () {
        self.state.viewMode = self.state.viewMode === 'reim' ? 'density' : 'reim';
        self._modeBtn.textContent = self.state.viewMode === 'reim' ? 'View: Re / Im' : 'View: |ψ|² / phase';
      }
    );
    btn('Zero', function () { self.state.zero(); });
    btn('Normalize', function () { self.state.normalize(); });
    btn('n = 1', function () { self.state.setLevel(1); });
    btn('n = 2', function () { self.state.setLevel(2); });
    btn('1+2', function () {
      self.state.zero();
      const s = Math.sqrt(0.5);
      self.state.setAmp(1, s, 0);
      self.state.setAmp(2, s, 0);
      self.state.t = 0;
    });

    this.host.appendChild(box);
    this._tog = box;
  }

  setParams(p) { this.state.setParams(p); }
  setPaused(v) {
    this.paused = !!v;
    this._canvas.setPaused(v);
  }
  setActive(v) {
    this._active = !!v;
    if (this._tog) this._tog.style.display = v ? '' : 'none';
  }

  resize() { this._canvas.resize(); }
  tick() {}

  _handleClick(ev) {
    const rect = this._canvas.canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left);
    const y = (ev.clientY - rect.top);
    for (let i = 0; i < this._clockHit.length; i++) {
      const c = this._clockHit[i];
      const dx = x - c.x;
      const dy = y - c.y;
      if (dx * dx + dy * dy <= c.r * c.r) {
        this.state.bumpLevel(c.n);
        return;
      }
    }
  }

  _draw(ctx, W, H) {
    if (!W || !H) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);

    // Title band — leave left for toolbar, right for 2D|3D toggle (~110px)
    const titleL = 150;
    const titleR = W - 120;
    const titleCx = (titleL + titleR) / 2;
    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 14px system-ui,sans-serif';
    ctx.textAlign = 'center';
    if (titleR - titleL > 160) {
      ctx.fillText('Infinite square well', titleCx, 22);
      ctx.fillStyle = '#8092b4';
      ctx.font = '11px system-ui,sans-serif';
      ctx.fillText('n = 1…8  ·  click clocks below', titleCx, 40);
    }

    const sample = this.state.sample(180);
    // Reserve: top title, left toolbar, bottom clocks, right pause
    const clockH = Math.min(118, Math.max(96, H * 0.22));
    const plotTop = 54;
    const plotBot = H - clockH - 8;
    const plotL = 148; // clear of left toolbar
    const plotR = W - 20;
    const plotW = Math.max(180, plotR - plotL);
    const plotH = Math.max(100, plotBot - plotTop);

    this._drawWell(ctx, plotL, plotTop, plotW, plotH, sample);
    this._drawClocks(ctx, W, H, clockH);
  }

  _drawWell(ctx, x0, y0, w, h, sample) {
    ctx.fillStyle = 'rgba(10,17,34,0.95)';
    ctx.fillRect(x0, y0, w, h);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(x0, y0, w, h);

    // Walls — labels above the plot, not rotated through the wave
    ctx.fillStyle = 'rgba(239,68,68,0.85)';
    ctx.fillRect(x0, y0, 8, h);
    ctx.fillRect(x0 + w - 8, y0, 8, h);
    ctx.fillStyle = '#fca5a5';
    ctx.font = '600 10px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('V=∞', x0 + 12, y0 + 14);
    ctx.textAlign = 'right';
    ctx.fillText('V=∞', x0 + w - 12, y0 + 14);

    const padL = 22;
    const padR = 22;
    const padB = 22;
    const innerL = x0 + padL;
    const innerR = x0 + w - padR;
    const midY = y0 + (h - padB) * 0.52;
    const aNm = sample.aNm;

    ctx.strokeStyle = 'rgba(148,163,184,0.35)';
    ctx.beginPath();
    ctx.moveTo(innerL, midY);
    ctx.lineTo(innerR, midY);
    ctx.stroke();

    function X(xNm) {
      return innerL + (innerR - innerL) * (xNm / aNm);
    }

    // Legend in top-center of plot (away from V=∞ corners)
    ctx.textAlign = 'center';
    ctx.font = '11px system-ui,sans-serif';
    if (this.state.viewMode === 'reim') {
      let amp = 1e-9;
      for (let i = 0; i < sample.re.length; i++) {
        amp = Math.max(amp, Math.abs(sample.re[i]), Math.abs(sample.im[i]));
      }
      const scale = ((h - padB) * 0.36) / amp;
      ctx.beginPath();
      for (let i = 0; i < sample.xs.length; i++) {
        const px = X(sample.xs[i]);
        const py = midY - sample.re[i] * scale;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < sample.xs.length; i++) {
        const px = X(sample.xs[i]);
        const py = midY - sample.im[i] * scale;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.fillStyle = '#fb923c';
      ctx.fillText('Re ψ', (innerL + innerR) / 2 - 36, y0 + 16);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('Im ψ', (innerL + innerR) / 2 + 36, y0 + 16);
    } else {
      let dmax = 1e-9;
      for (let i = 0; i < sample.dens.length; i++) if (sample.dens[i] > dmax) dmax = sample.dens[i];
      const scale = ((h - padB - 8) * 0.7) / dmax;
      const base = y0 + h - padB;
      for (let i = 0; i < sample.xs.length - 1; i++) {
        const x1 = X(sample.xs[i]);
        const x2 = X(sample.xs[i + 1]);
        const y1 = base - sample.dens[i] * scale;
        ctx.fillStyle = phaseCss(sample.phase[i], 0.85);
        ctx.fillRect(x1, y1, Math.max(1, x2 - x1 + 0.5), base - y1);
      }
      ctx.fillStyle = '#eaf0fb';
      ctx.fillText('|ψ|²  (colour = phase)', (innerL + innerR) / 2, y0 + 16);
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('x = 0', innerL, y0 + h - 6);
    ctx.textAlign = 'right';
    ctx.fillText('x = a', innerR, y0 + h - 6);
  }

  _drawClocks(ctx, W, H, clockH) {
    this._clockHit = [];
    const top = H - clockH;
    // Leave room on the right for the Pause button (~100px)
    const usableW = Math.max(200, W - 110);
    ctx.fillStyle = 'rgba(10,17,34,0.95)';
    ctx.fillRect(0, top, usableW, clockH);
    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(0, top);
    ctx.lineTo(usableW, top);
    ctx.lineTo(usableW, H);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Basis phasors  ·  click to add  ·  |c|=1 at rim', 10, top + 14);

    const r = Math.min(24, (usableW / N_MAX) * 0.28);
    const cy = top + 52;
    const gap = usableW / (N_MAX + 1);
    const labelY = Math.min(H - 6, cy + r + 12);

    for (let i = 0; i < N_MAX; i++) {
      const cx = gap * (i + 1);
      const c = this.state.ampAt(i);
      const m = Math.sqrt(c.re * c.re + c.im * c.im);

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(15,23,42,0.95)';
      ctx.fill();
      ctx.strokeStyle = m > 0.08 ? '#38bdf8' : '#475569';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.strokeStyle = 'rgba(148,163,184,0.25)';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2);
      ctx.stroke();

      if (m > 0.02) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + c.re * r * 0.9, cy - c.im * r * 0.9);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(cx + c.re * r * 0.9, cy - c.im * r * 0.9, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#eaf0fb';
      ctx.font = '600 10px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), cx, labelY);

      this._clockHit.push({ n: i + 1, x: cx, y: cy, r: r + 6 });
    }
  }

  dispose() {
    if (this._canvas && this._canvas.canvas) {
      this._canvas.canvas.removeEventListener('click', this._onClick);
    }
    if (this._tog && this._tog.parentNode) this._tog.parentNode.removeChild(this._tog);
    this._canvas.dispose();
  }
}
