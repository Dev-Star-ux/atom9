/** Two bowls, one idea: same kick — valley comes back, hill runs away. */
import { createDualCanvas } from '../common/teachPlots.js';
import { el } from '../common/ui.js';
import { potential, force, stepBall } from './physics.js';

export class MechanicalEquilibriumScene2D {
  constructor(host) {
    this.host = host;
    this.state = { k: 8, damp: 0.35, kick: 0.9 };
    this.stable = { x: 0.55, v: 0 };
    this.unstable = { x: 0.02, v: 0 };
    this._flashS = 0;
    this._flashU = 0;
    this._auto = 0;
    this._active = true;
    this._hud = el('div', 'eq-hud', 'Same kick on both. Valley comes back. Hill falls away.');
    host.appendChild(this._hud);
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h) {
      self._draw(ctx, w, h);
    });
    this._nudge(true);
  }

  _nudge(resetHill) {
    if (resetHill) this.unstable = { x: 0.02, v: 0 };
    this.stable.v -= this.state.kick;
    this.unstable.v += this.state.kick * 0.5;
    this._flashS = 1;
    this._flashU = 1;
  }

  setParams(p) {
    if (!p) return;
    if (p.k != null) this.state.k = p.k;
    if (p.damp != null) this.state.damp = p.damp;
    if (p.kick != null) this.state.kick = p.kick;
    if (p.nudge) this._nudge(false);
    if (p.reset) {
      this.stable = { x: 0.55, v: 0 };
      this.unstable = { x: 0.02, v: 0 };
      this._auto = 0;
    }
    this._hud.textContent = 'Same kick on both. Valley comes back. Hill falls away.';
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

  _draw(ctx, W, H) {
    if (!W || !H) return;
    if (this._canvas && !this._canvas.paused && this._active) {
      const dt = 0.016;
      this._auto += dt;
      if (this._auto > 3.6) {
        this._auto = 0;
        this.unstable = { x: 0.02, v: 0 };
        this._nudge(false);
      }
      stepBall(this.stable, this.state.k, 'stable', this.state.damp, dt);
      stepBall(this.unstable, this.state.k, 'unstable', this.state.damp * 0.2, dt);
      this._flashS *= 0.94;
      this._flashU *= 0.94;
      if (Math.abs(this.unstable.x) > 1.55) {
        this.unstable.x = 1.55 * Math.sign(this.unstable.x);
        this.unstable.v *= 0.35;
      }
    }

    ctx.fillStyle = '#070d18';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '800 18px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Watch the two balls after the same push', 16, 14);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 14px system-ui,sans-serif';
    ctx.fillText('Green force arrows: which way does F = −dV/dx point?', 16, 38);

    const top = 64;
    const strip = 72;
    const bodyH = H - top - strip - 10;
    this._bowl(ctx, 10, top, W * 0.5 - 16, bodyH, 'stable', this.stable);
    this._bowl(ctx, W * 0.5 + 6, top, W * 0.5 - 16, bodyH, 'unstable', this.unstable);
    this._steps(ctx, 10, H - strip - 6, W - 20, strip);
  }

  _bowl(ctx, x, y, w, h, kind, ball) {
    const stable = kind === 'stable';
    ctx.save();
    ctx.translate(x, y);
    roundRect(ctx, 0, 0, w, h, 14);
    ctx.fillStyle = stable ? 'rgba(6,78,59,0.35)' : 'rgba(127,29,29,0.32)';
    ctx.fill();
    ctx.strokeStyle = stable ? '#34d399' : '#f87171';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = stable ? '#6ee7b7' : '#fca5a5';
    ctx.font = '800 20px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(stable ? 'STABLE' : 'UNSTABLE', 14, 12);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 14px system-ui,sans-serif';
    ctx.fillText(stable ? 'Valley  ·  ball comes back' : 'Hill  ·  ball runs away', 14, 38);

    const pad = 36;
    const x0 = pad;
    const x1 = w - pad;
    const yBase = h * 0.68;
    const amp = h * 0.26;
    ctx.beginPath();
    for (let i = 0; i <= 90; i++) {
      const t = i / 90;
      const xv = -1.35 + 2.7 * t;
      const V = potential(xv, 1, kind);
      const px = x0 + t * (x1 - x0);
      const py = yBase - V * amp;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = stable ? '#34d399' : '#fb7185';
    ctx.lineWidth = 5;
    ctx.stroke();

    const bx = x0 + ((ball.x + 1.35) / 2.7) * (x1 - x0);
    const by = yBase - potential(ball.x, 1, kind) * amp - 22;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(bx + 5, by + 22, 22, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(bx, by, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = stable ? '#22c55e' : '#ef4444';
    ctx.lineWidth = 3;
    ctx.stroke();
    const flash = stable ? this._flashS : this._flashU;
    if (flash > 0.05) {
      ctx.strokeStyle = 'rgba(250,204,21,' + flash.toFixed(2) + ')';
      ctx.lineWidth = 5;
      ctx.stroke();
    }

    const F = force(ball.x, this.state.k, kind);
    const arr = Math.max(-90, Math.min(90, F * 7));
    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(bx, by - 32);
    ctx.lineTo(bx + arr, by - 32);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx + arr, by - 32);
    ctx.lineTo(bx + arr - 10 * Math.sign(arr || 1), by - 38);
    ctx.lineTo(bx + arr - 10 * Math.sign(arr || 1), by - 26);
    ctx.closePath();
    ctx.fillStyle = '#67e8f9';
    ctx.fill();
    ctx.font = '700 14px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(stable ? 'force pulls back' : 'force pushes farther', w / 2, h - 18);
    ctx.restore();
  }

  _steps(ctx, x, y, w, h) {
    const items = [
      '1  Same kick',
      '2  Force direction',
      '3  Valley returns  ·  hill leaves',
    ];
    const cw = (w - 16) / 3;
    for (let i = 0; i < 3; i++) {
      const xx = x + i * (cw + 8);
      roundRect(ctx, xx, y, cw, h, 10);
      ctx.fillStyle = 'rgba(15,23,42,0.9)';
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.stroke();
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '700 14px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(items[i], xx + cw / 2, y + h / 2);
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
