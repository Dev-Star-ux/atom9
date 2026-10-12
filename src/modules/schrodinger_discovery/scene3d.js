// Canvas TDSE viewport — |ψ| height + phase colour, grey V(x).
// No Three.js / modern APIs — works on older Chromium.
import {
  N, DX, DT,
  potentialArray, makeState, stepTDSE, observables, phaseColor,
} from './physics.js';

export class SchrodingerDiscoveryScene {
  constructor(container) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'tdse-canvas';
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this.hud = document.createElement('div');
    this.hud.className = 'tdse-hud';
    container.appendChild(this.hud);

    this.potential = 'barrier';
    this.initial = 'gaussian';
    this.V0 = 80;
    this.position = 0.28;
    this.velocity = 55;
    this.variance = 0.045;
    this.level = 1;
    this.running = false;
    this.paused = false;
    this.t = 0;
    this.V = potentialArray(this.potential, this.V0);
    const st = makeState(this.initial, this._opts());
    this.re = st.re;
    this.im = st.im;

    this._alive = true;
    this._raf = null;
    this._animate = this._animate.bind(this);
    this.resize();
    this._animate();
  }

  _opts() {
    return {
      position: this.position,
      velocity: this.velocity,
      variance: this.variance,
      level: this.level,
    };
  }

  setParams(p) {
    if (!p) return;
    let reset = false;
    if (p.potential != null && p.potential !== this.potential) { this.potential = p.potential; reset = true; }
    if (p.initial != null && p.initial !== this.initial) { this.initial = p.initial; reset = true; }
    if (p.V0 != null && p.V0 !== this.V0) { this.V0 = p.V0; reset = true; }
    if (p.position != null) { this.position = p.position; reset = true; }
    if (p.velocity != null) { this.velocity = p.velocity; reset = true; }
    if (p.variance != null) { this.variance = p.variance; reset = true; }
    if (p.level != null) { this.level = p.level; reset = true; }
    if (p.running != null) this.running = !!p.running;
    if (reset) this.reset();
  }

  setPaused(v) {
    this.paused = !!v;
  }

  reset() {
    this.V = potentialArray(this.potential, this.V0);
    const st = makeState(this.initial, this._opts());
    this.re = st.re;
    this.im = st.im;
    this.t = 0;
  }

  toggleRun() {
    this.running = !this.running;
    return this.running;
  }

  getPickables() { return []; }
  applyTips() {}

  tick() {
    // driven by rAF; module may call this as no-op
  }

  _stepPhysics() {
    if (!this.running || this.paused) return;
    // several substeps per frame for visible motion
    for (let s = 0; s < 40; s++) {
      stepTDSE(this.re, this.im, this.V, DT);
      this.t += DT;
    }
  }

  _draw() {
    const c = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (!w || !h) return;

    c.fillStyle = '#05060a';
    c.fillRect(0, 0, w, h);

    const padL = 48, padR = 20, padT = 28, padB = 36;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    const y0 = padT + plotH * 0.72; // baseline for ψ
    const ampScale = plotH * 0.38;

    // axes frame
    c.strokeStyle = '#22304f';
    c.lineWidth = 1;
    c.strokeRect(padL, padT, plotW, plotH);

    // potential (grey)
    let vMax = 1e-6;
    for (let i = 0; i < N; i++) if (this.V[i] > vMax) vMax = this.V[i];
    c.beginPath();
    for (let i = 0; i < N; i++) {
      const x = padL + (i / (N - 1)) * plotW;
      const y = padT + plotH - (this.V[i] / (vMax * 1.15)) * plotH * 0.85;
      if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.strokeStyle = 'rgba(148,163,184,0.55)';
    c.lineWidth = 2;
    c.stroke();
    c.fillStyle = 'rgba(148,163,184,0.12)';
    c.lineTo(padL + plotW, padT + plotH);
    c.lineTo(padL, padT + plotH);
    c.closePath();
    c.fill();

    // |ψ| with phase colour segments
    let aMax = 1e-6;
    for (let i = 0; i < N; i++) {
      const a = Math.sqrt(this.re[i] * this.re[i] + this.im[i] * this.im[i]);
      if (a > aMax) aMax = a;
    }
    for (let i = 0; i < N - 1; i++) {
      const a0 = Math.sqrt(this.re[i] * this.re[i] + this.im[i] * this.im[i]);
      const a1 = Math.sqrt(this.re[i + 1] * this.re[i + 1] + this.im[i + 1] * this.im[i + 1]);
      const x0 = padL + (i / (N - 1)) * plotW;
      const x1 = padL + ((i + 1) / (N - 1)) * plotW;
      const yA = y0 - (a0 / aMax) * ampScale;
      const yB = y0 - (a1 / aMax) * ampScale;
      c.beginPath();
      c.moveTo(x0, y0);
      c.lineTo(x0, yA);
      c.lineTo(x1, yB);
      c.lineTo(x1, y0);
      c.closePath();
      c.fillStyle = phaseColor(this.re[i], this.im[i], a0 / aMax);
      c.globalAlpha = 0.9;
      c.fill();
      c.globalAlpha = 1;
      c.beginPath();
      c.moveTo(x0, yA);
      c.lineTo(x1, yB);
      c.strokeStyle = phaseColor(this.re[i], this.im[i], 1);
      c.lineWidth = 2;
      c.stroke();
    }

    // baseline
    c.strokeStyle = 'rgba(128,146,180,0.35)';
    c.beginPath();
    c.moveTo(padL, y0);
    c.lineTo(padL + plotW, y0);
    c.stroke();

    // Leave top-left free for the scene legend; plot labels stay readable
    c.fillStyle = '#8092b4';
    c.font = '11px system-ui,sans-serif';
    c.fillText('x = 0', padL, padT + plotH + 18);
    c.fillText('x = 1', padL + plotW - 28, padT + plotH + 18);
    c.fillText('|ψ|  (colour = phase)', padL + 8, padT + 14);
    c.fillText('V(x)', padL + plotW - 28, padT + 14);

    const obs = observables(this.re, this.im);
    this.hud.innerHTML =
      '<div><span class="k">t</span> ' + this.t.toFixed(3) + '</div>' +
      '<div><span class="k">P(x&lt;½)</span> ' + obs.pLeft.toFixed(3) + '</div>' +
      '<div><span class="k">⟨x⟩</span> ' + obs.xMean.toFixed(3) + '</div>' +
      '<div><span class="k">RMS</span> ' + obs.xRms.toFixed(3) + '</div>';

    this._lastObs = obs;
  }

  _animate() {
    if (!this._alive) return;
    this._raf = requestAnimationFrame(this._animate);
    this._stepPhysics();
    this._draw();
  }

  resize() {
    const w = this.container.clientWidth || 640;
    const h = this.container.clientHeight || 400;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  dispose() {
    this._alive = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this.canvas && this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
    if (this.hud && this.hud.parentNode) this.hud.parentNode.removeChild(this.hud);
  }
}
