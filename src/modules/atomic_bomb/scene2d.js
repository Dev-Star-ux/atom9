/** Teaching cartoon: leaky neutrons until assembly makes k > 1. */
import { createDualCanvas } from '../common/teachPlots.js';
import { el } from '../common/ui.js';
import { kEff, assemblyStatus, statusPlain, fissionChance } from './physics.js';

export class AtomicBombScene2D {
  constructor(host) {
    this.state = { typeId: 'gun', speed: 0.7, compress: 0.55, boost: 0.4 };
    this.u = 0;
    this.running = true;
    this._hold = 0;
    this._active = true;
    this.neutrons = [];
    this.flashes = [];
    this._seed = 0;
    this._hud = el('div', 'ab-hud', 'Watch the blue neutrons. Do they leak, or make more?');
    this._hud.style.display = 'none';
    host.appendChild(this._hud);
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h) {
      self._draw(ctx, w, h);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.typeId != null && p.typeId !== this.state.typeId) {
      this.state.typeId = p.typeId;
      this.u = 0;
      this.running = true;
      this.neutrons = [];
    }
    if (p.speed != null) this.state.speed = p.speed;
    if (p.compress != null) this.state.compress = p.compress;
    if (p.boost != null) this.state.boost = p.boost;
    if (p.reset) { this.u = 0; this.neutrons = []; }
    if (p.fire) { this.u = 0; this.running = true; this._hold = 0; this.neutrons = []; }
  }

  setPaused(v) { this._canvas.setPaused(v); }
  setActive(v) {
    this._active = !!v;
    this._hud.style.display = 'none';
  }
  resize() { this._canvas.resize(); }
  dispose() {
    this._canvas.dispose();
    if (this._hud.parentNode) this._hud.parentNode.removeChild(this._hud);
  }

  _spawn(n, cx, cy, boosted) {
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = 90 + Math.random() * 140;
      this.neutrons.push({
        x: cx != null ? cx : 0.22,
        y: cy != null ? cy : 0.45 + Math.random() * 0.2,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: 0,
        boost: !!boosted,
      });
    }
  }

  _masses(W, H, body) {
    const u = this.u;
    const y = body.y + body.h * 0.58;
    if (this.state.typeId === 'gun') {
      const a = { x: body.x + 90 + u * (body.w * 0.38), y: y, r: 46 };
      const b = { x: body.x + body.w - 120, y: y, r: 52 };
      return [a, b];
    }
    const shrink = 1 - 0.22 * u * this.state.compress;
    const pit = {
      x: body.x + body.w * 0.5,
      y: y,
      r: Math.min(body.w, body.h) * 0.22 * shrink,
    };
    return [pit];
  }

  _inside(nx, ny, masses) {
    for (let i = 0; i < masses.length; i++) {
      const m = masses[i];
      const dx = nx - m.x;
      const dy = ny - m.y;
      if (dx * dx + dy * dy < m.r * m.r) return true;
    }
    return false;
  }

  _step(dt, W, H, body, k) {
    const masses = this._masses(W, H, body);
    const pHit = fissionChance(k);
    this._seed += dt;
    if (this.neutrons.length < (k >= 1 ? 10 : 5) && this._seed > 0.28) {
      this._seed = 0;
      const m = masses[0];
      this._spawn(1, m.x, m.y, false);
    }
    if (this.state.typeId === 'boosted' && this.u > 0.7 && Math.random() < 0.08 * this.state.boost) {
      const m = masses[0];
      this._spawn(1, m.x, m.y, true);
    }
    const next = [];
    for (let i = 0; i < this.neutrons.length; i++) {
      const n = this.neutrons[i];
      n.x += n.vx * dt;
      n.y += n.vy * dt;
      n.life += dt;
      if (n.x < body.x - 8 || n.x > body.x + body.w + 8 || n.y < body.y - 8 || n.y > body.y + body.h + 8) {
        continue;
      }
      const inMass = this._inside(n.x, n.y, masses);
      if (inMass && n.life > 0.08 && Math.random() < pHit * dt * 8) {
        this.flashes.push({ x: n.x, y: n.y, t: 0.35, boost: n.boost });
        this._spawn(k >= 1 ? 3 : 1, n.x, n.y, n.boost);
        continue;
      }
      if (n.life < 3.2) next.push(n);
    }
    this.neutrons = next.slice(0, 80);
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      this.flashes[i].t -= dt;
      if (this.flashes[i].t <= 0) this.flashes.splice(i, 1);
    }
  }

  _draw(ctx, W, H) {
    if (!W || !H) return;
    const k = kEff(this.state.typeId, this.u, this.state.compress, this.state.boost);
    const st = assemblyStatus(k);
    if (this._canvas && !this._canvas.paused && this._active) {
      if (this.running) {
        this.u += 0.016 * (0.18 + 0.7 * this.state.speed);
        if (this.u > 1) { this.u = 1; this.running = false; this._hold = 0; }
      } else {
        this._hold += 0.016;
        if (this._hold > 1.4) {
          this.u = 0;
          this.running = true;
          this.neutrons = [];
        }
      }
    }

    const names = { gun: 'Gun-type', implosion: 'Implosion', boosted: 'Fusion-boosted' };
    this._hud.textContent = names[this.state.typeId] + '  ·  ' + statusPlain(k);

    ctx.fillStyle = '#070d18';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '800 18px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(names[this.state.typeId] + '   k = ' + k.toFixed(2), 16, 10);
    ctx.fillStyle = k >= 1 ? '#86efac' : '#fdba74';
    ctx.font = '700 15px system-ui,sans-serif';
    ctx.fillText(statusPlain(k), 16, 36);

    const barH = 78;
    const stepH = 58;
    const body = { x: 12, y: 62, w: W - 24, h: H - 62 - barH - stepH - 16 };
    this._stage(ctx, body, k);
    if (this._canvas && !this._canvas.paused && this._active) {
      this._step(0.04, W, H, body, k);
    }
    this._drawMasses(ctx, body);
    this._drawNeutrons(ctx);
    this._kbar(ctx, 12, H - barH - stepH - 10, W - 24, barH, k, st);
    this._steps(ctx, 12, H - stepH - 6, W - 24, stepH);
  }

  _stage(ctx, body) {
    ctx.save();
    roundRect(ctx, body.x, body.y, body.w, body.h, 16);
    ctx.fillStyle = 'rgba(15,23,42,0.92)';
    ctx.fill();
    ctx.restore();
  }

  _drawMasses(ctx, body) {
    const masses = this._masses(0, 0, body);
    const type = this.state.typeId;
    if (type === 'gun') {
      ctx.fillStyle = '#475569';
      roundRect(ctx, body.x + 36, masses[0].y - 40, body.w - 72, 80, 14);
      ctx.fill();
    } else {
      const pit = masses[0];
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 7;
      for (let i = 0; i < 12; i++) {
        const a0 = (i / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(pit.x, pit.y, pit.r + 28, a0, a0 + 0.4);
        ctx.stroke();
      }
      ctx.fillStyle = '#fdba74';
      ctx.font = '700 13px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('squeeze', pit.x, pit.y - pit.r - 40);
    }
    for (let i = 0; i < masses.length; i++) {
      const m = masses[i];
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#fbbf24' : '#f59e0b';
      ctx.fill();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2;
      ctx.stroke();
      for (let j = 0; j < 8; j++) {
        const ang = (j / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(m.x + Math.cos(ang) * m.r * 0.45, m.y + Math.sin(ang) * m.r * 0.45, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#b45309';
        ctx.fill();
      }
      ctx.fillStyle = '#0f172a';
      ctx.font = '800 14px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(type === 'gun' ? (i === 0 ? 'A' : 'B') : 'pit', m.x, m.y);
    }
    if (type === 'boosted') {
      const m = masses[0];
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = '#22d3ee';
      ctx.fill();
      ctx.fillStyle = '#083344';
      ctx.font = '800 11px system-ui,sans-serif';
      ctx.fillText('D–T', m.x, m.y);
    }
  }

  _drawNeutrons(ctx) {
    for (let i = 0; i < this.flashes.length; i++) {
      const f = this.flashes[i];
      ctx.beginPath();
      ctx.arc(f.x, f.y, 8 + (0.35 - f.t) * 40, 0, Math.PI * 2);
      ctx.fillStyle = f.boost ? 'rgba(34,211,238,' + (f.t * 2) + ')' : 'rgba(251,191,36,' + (f.t * 2) + ')';
      ctx.fill();
    }
    for (let i = 0; i < this.neutrons.length; i++) {
      const n = this.neutrons[i];
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.boost ? 6 : 5, 0, Math.PI * 2);
      ctx.fillStyle = n.boost ? '#22d3ee' : '#38bdf8';
      ctx.fill();
      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.fillStyle = '#7dd3fc';
    ctx.font = '700 12px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('blue dots = neutrons   ·   flash = a fission', 28, 80);
  }

  _kbar(ctx, x, y, w, h, k, st) {
    roundRect(ctx, x, y, w, h, 12);
    ctx.fillStyle = 'rgba(15,23,42,0.95)';
    ctx.fill();
    const stName = { subcritical: 'k < 1  leak wins', near: 'k ≈ 1', supercritical: 'k > 1  chain grows' }[st] || st;
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '800 16px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('k = ' + k.toFixed(2) + '    ' + stName, x + 16, y + 8);
    const bx = x + 16;
    const by = y + 38;
    const bw = w - 32;
    const bh = 26;
    roundRect(ctx, bx, by, bw, bh, 8);
    ctx.fillStyle = '#020617';
    ctx.fill();
    const frac = Math.max(0, Math.min(1, (k - 0.65) / 1.05));
    roundRect(ctx, bx, by, bw * frac, bh, 8);
    ctx.fillStyle = k >= 1 ? '#22c55e' : '#f59e0b';
    ctx.fill();
    const x1 = bx + ((1 - 0.65) / 1.05) * bw;
    ctx.strokeStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(x1, by - 3);
    ctx.lineTo(x1, by + bh + 3);
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.fillText('1.0', x1 - 8, by + bh + 4);
  }

  _steps(ctx, x, y, w, h) {
    const type = this.state.typeId;
    const items = type === 'gun'
      ? ['1  Apart', '2  Sliding', '3  Together  k>1']
      : type === 'boosted'
        ? ['1  Loose pit', '2  Squeeze', '3  Extra neutrons']
        : ['1  Loose pit', '2  Squeeze', '3  k > 1'];
    const u = this.u;
    const active = u < 0.33 ? 0 : u < 0.72 ? 1 : 2;
    const cw = (w - 16) / 3;
    for (let i = 0; i < 3; i++) {
      const xx = x + i * (cw + 8);
      roundRect(ctx, xx, y, cw, h, 10);
      ctx.fillStyle = i === active ? 'rgba(6,78,59,0.9)' : 'rgba(15,23,42,0.9)';
      ctx.fill();
      ctx.strokeStyle = i === active ? '#34d399' : '#334155';
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
