// 2D fission — chain-reaction board with k gauge, generation waves, fragments.
import { createDualCanvas } from '../common/teachPlots.js';
import { el } from '../common/ui.js';
import {
  fissionMultiplication, criticalityLabel, plainStatus,
  neutronsFromFission, ENERGY_MEV,
} from './physics.js';

export class Fission2D {
  constructor(host) {
    this.host = host;
    this.enrichment = 40;
    this.paused = false;
    this._active = true;
    this.nuclei = [];
    this.neutrons = [];
    this.fragments = [];
    this.flashes = [];
    this.energyMeV = 0;
    this.fissions = 0;
    this.generation = 0;
    this._genCounts = [0, 0, 0, 0, 0, 0];
    this._autoSeed = 0;
    this._hud = el('div', 'nf-hud', '');
    host.appendChild(this._hud);
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h) {
      if (!self.paused && self._active) self._step(0.04);
      self._draw(ctx, w, h);
    });
    this._initNuclei();
    this.injectNeutron(true);
    this._updateHud();
  }

  setParams(p) {
    if (!p) return;
    let rebuild = false;
    if (p.enrichment != null && Math.abs(p.enrichment - this.enrichment) > 0.5) {
      this.enrichment = p.enrichment;
      rebuild = true;
    } else if (p.enrichment != null) {
      this.enrichment = p.enrichment;
    }
    if (p.reset || rebuild) {
      this._initNuclei();
      this.energyMeV = 0;
      this.fissions = 0;
      this.generation = 0;
      this._genCounts = [0, 0, 0, 0, 0, 0];
      this.fragments = [];
      this.flashes = [];
      this.neutrons = [];
      this.injectNeutron(true);
    }
    this._updateHud();
  }

  injectNeutron(fromLeft) {
    const y = 0.18 + Math.random() * 0.64;
    this.neutrons.push({
      x: fromLeft ? 0.03 : 0.06 + Math.random() * 0.4,
      y: y,
      vx: 0.24 + Math.random() * 0.1,
      vy: (Math.random() - 0.5) * 0.14,
      life: 0,
      gen: 0,
      trail: [],
    });
  }

  setPaused(v) { this.paused = !!v; this._canvas.setPaused(v); }
  setActive(v) { this._active = !!v; this._hud.style.display = v ? '' : 'none'; }
  resize() { this._canvas.resize(); }
  dispose() {
    this._canvas.dispose();
    if (this._hud.parentNode) this._hud.parentNode.removeChild(this._hud);
  }

  _k() { return fissionMultiplication(this.enrichment); }

  _deadFraction() {
    let dead = 0;
    for (let j = 0; j < this.nuclei.length; j++) if (!this.nuclei[j].alive) dead++;
    return dead / Math.max(1, this.nuclei.length);
  }

  _updateHud() {
    const k = this._k();
    this._hud.textContent =
      'k ≈ ' + k.toFixed(2) + ' · ' + criticalityLabel(k).toUpperCase() +
      '   ·   gen ' + this.generation +
      '   ·   fissions ' + this.fissions +
      '   ·   E ≈ ' + this.energyMeV.toFixed(0) + ' MeV' +
      '   ·   n ' + this.neutrons.length;
  }

  _initNuclei() {
    this.nuclei = [];
    const cols = 10;
    const rows = 8;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const u235 = Math.random() * 100 < this.enrichment;
        this.nuclei.push({
          x: 0.1 + c / (cols - 1) * 0.58,
          y: 0.14 + r / (rows - 1) * 0.72,
          u235: u235,
          alive: true,
        });
      }
    }
  }

  _step(dt) {
    const k = this._k();
    this._autoSeed += dt;
    if (this.neutrons.length === 0 && this._autoSeed > 2.2 && this._deadFraction() < 0.85) {
      this._autoSeed = 0;
      this.injectNeutron(true);
    }

    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const f = this.fragments[i];
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vy += 0.08 * dt;
      f.life -= dt;
      if (f.life <= 0) this.fragments.splice(i, 1);
    }
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      this.flashes[i].life -= dt;
      if (this.flashes[i].life <= 0) this.flashes.splice(i, 1);
    }

    const nextN = [];
    for (let i = 0; i < this.neutrons.length; i++) {
      const n = this.neutrons[i];
      n.x += n.vx * dt;
      n.y += n.vy * dt;
      n.life += dt;
      if (!n.trail) n.trail = [];
      n.trail.push({ x: n.x, y: n.y });
      if (n.trail.length > 14) n.trail.shift();

      let hit = false;
      for (let j = 0; j < this.nuclei.length; j++) {
        const u = this.nuclei[j];
        if (!u.alive) continue;
        const dx = n.x - u.x;
        const dy = n.y - u.y;
        if (dx * dx + dy * dy > 0.0009) continue;

        if (!u.u235) {
          hit = true;
          this.flashes.push({ x: u.x, y: u.y, life: 0.22, kind: 'scatter' });
          break;
        }

        hit = true;
        u.alive = false;
        this.fissions++;
        this.energyMeV += ENERGY_MEV;
        const g = (n.gen || 0) + 1;
        this.generation = Math.max(this.generation, g);
        if (g < this._genCounts.length) this._genCounts[g]++;
        this.flashes.push({ x: u.x, y: u.y, life: 0.65, kind: 'fission', gen: g });

        const ang0 = Math.random() * Math.PI * 2;
        this.fragments.push({
          x: u.x, y: u.y,
          vx: Math.cos(ang0) * 0.22, vy: Math.sin(ang0) * 0.22 - 0.04,
          life: 1.1, label: 'Fr',
        });
        this.fragments.push({
          x: u.x, y: u.y,
          vx: Math.cos(ang0 + Math.PI) * 0.22, vy: Math.sin(ang0 + Math.PI) * 0.22 - 0.04,
          life: 1.1, label: 'Fr',
        });

        const count = neutronsFromFission(k);
        for (let s = 0; s < count; s++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = 0.22 + Math.random() * 0.14;
          nextN.push({
            x: u.x, y: u.y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            life: 0,
            gen: g,
            trail: [],
          });
        }
        break;
      }

      if (!hit && n.life < 8 && n.x > -0.02 && n.x < 1.02 && n.y > 0.02 && n.y < 0.98) {
        nextN.push(n);
      }
    }
    this.neutrons = nextN.slice(0, 120);
    this._updateHud();
  }

  _draw(ctx, w, h) {
    if (!this._active) return;
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#070d18');
    g.addColorStop(1, '#121a2e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const k = this._k();
    const statusCol = k < 0.95 ? '#fbbf24' : k < 1.05 ? '#4ade80' : '#f87171';

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Chain reaction — neutron → U-235 fission → more neutrons', 14, 22);

    this._drawKGauge(ctx, w - 118, 36, 96, k, statusCol);
    this._drawGenBars(ctx, w - 118, 148, 96, this._genCounts);

    const gx = w * 0.06;
    const gy = h * 0.12;
    const gw = w * 0.62;
    const gh = h * 0.78;
    ctx.strokeStyle = 'rgba(56,189,248,0.25)';
    ctx.lineWidth = 2;
    roundRect(ctx, gx - 6, gy - 6, gw + 12, gh + 12, 14);
    ctx.stroke();
    ctx.fillStyle = 'rgba(15,23,42,0.45)';
    ctx.fill();

    for (let i = 0; i < this.nuclei.length; i++) {
      const u = this.nuclei[i];
      const x = gx + u.x * gw;
      const y = gy + u.y * gh;
      if (!u.alive) {
        ctx.fillStyle = 'rgba(30,41,59,0.35)';
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fillStyle = u.u235 ? '#f59e0b' : '#64748b';
      ctx.fill();
      ctx.strokeStyle = u.u235 ? '#fde68a' : '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.font = '700 8px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(u.u235 ? '235' : '238', x, y + 3);
    }

    for (let i = 0; i < this.neutrons.length; i++) {
      const n = this.neutrons[i];
      if (n.trail && n.trail.length > 1) {
        ctx.strokeStyle = 'rgba(56,189,248,0.28)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let t = 0; t < n.trail.length; t++) {
          const px = gx + n.trail[t].x * gw;
          const py = gy + n.trail[t].y * gh;
          if (t === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      const x = gx + n.x * gw;
      const y = gy + n.y * gh;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
      ctx.strokeStyle = '#bae6fd';
      ctx.stroke();
    }

    for (let i = 0; i < this.fragments.length; i++) {
      const f = this.fragments[i];
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.beginPath();
      ctx.arc(gx + f.x * gw, gy + f.y * gh, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#fb923c';
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    for (let i = 0; i < this.flashes.length; i++) {
      const fl = this.flashes[i];
      const a = Math.max(0, fl.life / 0.65);
      const fx = gx + fl.x * gw;
      const fy = gy + fl.y * gh;
      ctx.beginPath();
      ctx.arc(fx, fy, 6 + (1 - a) * 32, 0, Math.PI * 2);
      ctx.fillStyle = fl.kind === 'fission'
        ? 'rgba(251,191,36,' + (a * 0.6) + ')'
        : 'rgba(148,163,184,' + (a * 0.35) + ')';
      ctx.fill();
      if (fl.kind === 'fission' && fl.gen != null && a > 0.4) {
        ctx.fillStyle = '#fde68a';
        ctx.font = '700 10px system-ui,sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('gen ' + fl.gen, fx, fy - 18);
      }
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = statusCol;
    ctx.font = '700 12px system-ui,sans-serif';
    ctx.fillText(criticalityLabel(k).toUpperCase(), 14, 44);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText(plainStatus(k), 14, 60);

    if (this._deadFraction() > 0.75) {
      ctx.fillStyle = 'rgba(248,113,113,0.15)';
      roundRect(ctx, gx, gy + gh * 0.4, gw, gh * 0.2, 8);
      ctx.fill();
      ctx.fillStyle = '#fca5a5';
      ctx.font = '600 12px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Much fuel spent — Reset or Fire neutron', gx + gw / 2, gy + gh * 0.52);
      ctx.textAlign = 'left';
    }
  }

  _drawKGauge(ctx, x, y, size, k, col) {
    roundRect(ctx, x - 8, y - 8, size + 16, size + 36, 10);
    ctx.fillStyle = 'rgba(10,17,34,0.88)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(51,65,85,0.8)';
    ctx.stroke();
    const cx = x + size / 2;
    const cy = y + size / 2 + 4;
    const r = size * 0.38;
    ctx.strokeStyle = 'rgba(51,65,85,0.9)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, 0);
    ctx.stroke();
    const frac = Math.min(1, k / 2);
    ctx.strokeStyle = col;
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, Math.PI + frac * Math.PI);
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 14px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('k=' + k.toFixed(2), cx, cy + 4);
    ctx.fillStyle = '#64748b';
    ctx.font = '9px system-ui,sans-serif';
    ctx.fillText('multiplication', cx, cy + 18);
  }

  _drawGenBars(ctx, x, y, w, counts) {
    ctx.fillStyle = 'rgba(10,17,34,0.88)';
    roundRect(ctx, x - 8, y - 6, w + 16, 72, 8);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 9px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Fissions by generation', x, y + 6);
    let mx = 1;
    for (let i = 0; i < counts.length; i++) if (counts[i] > mx) mx = counts[i];
    const barW = (w - 8) / counts.length;
    for (let i = 1; i < counts.length; i++) {
      const bh = (counts[i] / mx) * 44;
      ctx.fillStyle = i >= 3 ? '#f87171' : '#38bdf8';
      ctx.fillRect(x + (i - 1) * barW + 2, y + 54 - bh, barW - 3, bh);
      ctx.fillStyle = '#64748b';
      ctx.font = '8px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(i), x + (i - 1) * barW + barW / 2, y + 64);
    }
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
