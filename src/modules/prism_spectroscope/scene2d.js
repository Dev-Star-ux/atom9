// Prism spectroscope — λ spectrum with line labels / continuous curve.
import { createDualCanvas } from '../common/teachPlots.js';
import { drawSpectrum } from './physics.js';

export class PrismSpectroscope2D {
  constructor(host) {
    this.state = { source: 'continuous', temp: 5500 };
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h) {
      self._draw(ctx, w, h);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.source != null) this.state.source = p.source;
    if (p.temp != null) this.state.temp = p.temp;
  }

  setPaused(v) { this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  tick() {}

  _draw(ctx, w, h) {
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#eaf0fb';
    ctx.font = '14px system-ui,sans-serif';
    const src = this.state.source;
    const title = src === 'continuous'
      ? 'Continuous spectrum (thermal / blackbody)'
      : 'Line spectrum — ' + src;
    ctx.fillText(title, 20, 28);

    const pad = 24;
    const stripH = Math.floor(h * 0.58);
    ctx.save();
    ctx.translate(pad, 48);
    drawSpectrum(ctx, w - pad * 2, stripH, this.state.source, this.state.temp, {
      axis: true,
      labels: true,
    });
    ctx.restore();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    const note = src === 'continuous'
      ? 'Every λ present → smooth rainbow. Peak shifts with T (Wien).'
      : 'Only discrete atomic transitions → sharp bright lines.';
    ctx.fillText(note, 24, h - 24);
  }

  dispose() { this._canvas.dispose(); }
}
