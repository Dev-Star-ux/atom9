export class CanvasScene {
  constructor(container, { draw, onResize } = {}) {
    this.container = container;
    this.canvas = document.createElement("canvas");
    this.canvas.className = "canvas-scene";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.display = "block";
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this._draw = draw || (() => {
    });
    this._onResize = onResize;
    this.phase = 0;
    this.paused = false;
    this._alive = true;
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
    this.resize();
  }
  setDraw(fn) {
    this._draw = fn;
  }
  setPaused(v) {
    this.paused = !!v;
  }
  resize() {
    var _a;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w;
    this.h = h;
    (_a = this._onResize) == null ? void 0 : _a.call(this, w, h);
  }
  _loop() {
    if (!this._alive) return;
    this._raf = requestAnimationFrame(this._loop);
    if (!this.paused) this.phase += 0.016;
    this._draw(this.ctx, this.w, this.h, this.phase);
  }
  dispose() {
    this._alive = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
  }
}
export class GridSearch1D {
  constructor({ lo, hi, evalLoss, logger, paramLabel = "x" }) {
    var _a;
    this.window = [lo, hi];
    this.estimate = (lo + hi) / 2;
    this.evalLoss = evalLoss;
    this.iter = 0;
    this.lastLoss = evalLoss(this.estimate);
    this.trueValue = this.estimate;
    this.logger = logger || null;
    this.paramLabel = paramLabel;
    (_a = this.logger) == null ? void 0 : _a.data(`Init search ${paramLabel} \u2208 [${lo}, ${hi}], loss=${this.lastLoss.toExponential(3)}`);
  }
  step(steps = 64, shrink = 0.28) {
    const [lo, hi] = this.window;
    let best = lo, bl = Infinity;
    for (let k = 0; k < steps; k++) {
      const x = lo + (hi - lo) * k / (steps - 1);
      const l = this.evalLoss(x);
      if (l < bl) {
        bl = l;
        best = x;
      }
    }
    this.estimate = best;
    this.lastLoss = bl;
    const half = (hi - lo) * shrink;
    this.window = [Math.max(lo, best - half), Math.min(hi, best + half)];
    this.iter++;
    if (this.logger) {
      const err = this.trueValue != null ? Math.abs(best - this.trueValue) / (Math.abs(this.trueValue) || 1) * 100 : null;
      this.logger.step(
        `iter ${this.iter}: ${this.paramLabel}=${best.toPrecision(5)}, loss=${bl.toExponential(3)}, window [${this.window[0].toPrecision(4)}, ${this.window[1].toPrecision(4)}]` + (err != null ? `, err ${err.toFixed(2)}%` : "")
      );
    }
    return bl;
  }
  errorPct() {
    return Math.abs(this.estimate - this.trueValue) / (Math.abs(this.trueValue) || 1) * 100;
  }
}
