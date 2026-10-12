/** One nucleus, five plain steps — the fission mechanism. */
import { createDualCanvas } from '../common/teachPlots.js';
import { el } from '../common/ui.js';
import {
  getTarget, canFission, stageFromPhase, dropAxes, NU_BAR,
} from './physics.js';

const STEPS = [
  { id: 'approach', title: '1  Neutron arrives' },
  { id: 'capture', title: '2  Nucleus captures it' },
  { id: 'compound', title: '3  Hot nucleus wobbles' },
  { id: 'elongate', title: '4  It stretches' },
  { id: 'scission', title: '5  It splits + neutrons' },
];

export class FissionMechanismScene2D {
  constructor(host) {
    this.state = { targetId: 'u235', neutronMeV: 0.025, speed: 1 };
    this.phase = 0;
    this._active = true;
    this._hud = el('div', 'fm-hud', 'One neutron. One nucleus. Watch if it splits.');
    host.appendChild(this._hud);
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h) {
      self._draw(ctx, w, h);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.targetId != null) this.state.targetId = p.targetId;
    if (p.neutronMeV != null) this.state.neutronMeV = p.neutronMeV;
    if (p.speed != null) this.state.speed = p.speed;
    if (p.reset) this.phase = 0;
    this._updateHud();
  }

  _updateHud() {
    const tgt = getTarget(this.state.targetId);
    const ok = canFission(tgt, this.state.neutronMeV);
    this._hud.textContent = ok
      ? tgt.a + ': this neutron has enough energy — the nucleus can split'
      : tgt.a + ': this neutron is too slow — the nucleus will not split';
  }

  setPaused(v) { this._canvas.setPaused(v); }
  setActive(v) {
    this._active = !!v;
    this._hud.style.display = v ? '' : 'none';
  }
  resize() { this._canvas.resize(); }
  dispose() {
    this._canvas.dispose();
    if (this._hud.parentNode) this._hud.parentNode.removeChild(this._hud);
  }

  _story(ok) {
    const st = stageFromPhase(this.phase);
    if (!ok && (st === 'elongate' || st === 'scission' || st === 'fragments')) {
      return 'The barrier is too high. The neutron will leave. Try Fast n for U-238.';
    }
    if (st === 'approach') return 'A neutron flies in from the left.';
    if (st === 'capture') return 'The nucleus swallows the neutron.';
    if (st === 'compound') return 'The extra energy makes the drop wobble.';
    if (st === 'elongate') return 'Charge pushes the ends apart. A neck forms.';
    if (st === 'scission') return 'The neck snaps. Two fragments + neutrons.';
    return 'Fragments fly apart. About ' + NU_BAR + ' extra neutrons.';
  }

  _draw(ctx, W, H) {
    if (!W || !H) return;
    const tgt = getTarget(this.state.targetId);
    const ok = canFission(tgt, this.state.neutronMeV);
    if (this._canvas && !this._canvas.paused && this._active) {
      const sp = 0.11 * this.state.speed * (ok ? 1 : 0.45);
      this.phase += 0.016 * sp;
      if (this.phase > 1) this.phase -= 1;
      this._updateHud();
    }

    ctx.fillStyle = '#070d18';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '800 18px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('How one nucleus fissions', 16, 12);
    ctx.fillStyle = ok ? '#86efac' : '#fdba74';
    ctx.font = '700 15px system-ui,sans-serif';
    ctx.fillText(this._story(ok), 16, 38);

    const strip = 70;
    this._nucleus(ctx, 12, 64, W - 24, H - 64 - strip - 10, tgt, ok);
    this._stepBar(ctx, 12, H - strip - 6, W - 24, strip, ok);
  }

  _nucleus(ctx, x, y, w, h, tgt, ok) {
    ctx.save();
    ctx.translate(x, y);
    roundRect(ctx, 0, 0, w, h, 16);
    ctx.fillStyle = 'rgba(15,23,42,0.95)';
    ctx.fill();

    const st = stageFromPhase(this.phase);
    const blocked = !ok && (st === 'elongate' || st === 'scission' || st === 'fragments');
    const cx = w * 0.5;
    const cy = h * 0.52;
    const ax = dropAxes(blocked ? 0.4 : this.phase);
    const R = Math.min(w, h) * 0.22;

    if (st === 'approach' || st === 'capture' || blocked) {
      let t = this.phase / 0.32;
      if (blocked) t = 1 - ((this.phase - 0.52) / 0.48);
      t = Math.max(0, Math.min(1, t));
      const nx = 50 + t * (cx - R - 70);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(nx, cy, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e0f2fe';
      ctx.font = '800 16px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('n', nx, cy - 22);
    }

    if (!blocked && st !== 'fragments') {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.fillStyle = ok ? '#f59e0b' : '#64748b';
      ctx.beginPath();
      ctx.ellipse(0, 0, R * ax.a, R * ax.b, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 3;
      ctx.stroke();
      for (let i = 0; i < 16; i++) {
        const ang = (i / 16) * Math.PI * 2 + this.phase * 2;
        ctx.fillStyle = i % 2 ? '#fb923c' : '#facc15';
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * R * ax.a * 0.52, Math.sin(ang) * R * ax.b * 0.52, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = '#fde68a';
      ctx.font = '800 16px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('nucleus  ' + tgt.a, cx, cy + R * ax.b + 28);
    } else if (!blocked) {
      const t = (this.phase - 0.88) / 0.12;
      const sep = t * 110;
      ctx.fillStyle = '#fb923c';
      ctx.beginPath();
      ctx.ellipse(cx - 40 - sep, cy, R * 0.72, R * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + 40 + sep, cy, R * 0.64, R * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fed7aa';
      ctx.font = '700 14px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('fragment', cx - 40 - sep, cy + R * 0.7);
      ctx.fillText('fragment', cx + 40 + sep, cy + R * 0.7);
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(cx + (i - 1) * 28, cy - 70 - t * 50, 8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#7dd3fc';
      ctx.fillText('new neutrons', cx, cy - 100 - t * 40);
    } else {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.ellipse(0, 0, R, R * 0.92, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#fdba74';
      ctx.font = '800 18px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('no split', cx, cy + R + 30);
    }
    ctx.restore();
  }

  _stepBar(ctx, x, y, w, h, ok) {
    const st = stageFromPhase(this.phase);
    const cw = (w - 32) / 5;
    for (let i = 0; i < STEPS.length; i++) {
      const xx = x + i * (cw + 8);
      const on = STEPS[i].id === st || (st === 'fragments' && STEPS[i].id === 'scission');
      const dead = !ok && i >= 3;
      roundRect(ctx, xx, y, cw, h, 10);
      ctx.fillStyle = dead ? 'rgba(30,41,59,0.8)' : on ? 'rgba(6,78,59,0.85)' : 'rgba(15,23,42,0.9)';
      ctx.fill();
      ctx.strokeStyle = on ? '#34d399' : '#334155';
      ctx.stroke();
      ctx.fillStyle = dead ? '#64748b' : '#e2e8f0';
      ctx.font = '700 13px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(STEPS[i].title, xx + cw / 2, y + h / 2);
    }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
