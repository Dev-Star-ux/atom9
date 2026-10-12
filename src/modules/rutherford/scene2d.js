// PhET-style 2D Rutherford scattering — side view, hyperbolic trajectories.
// https://phet.colorado.edu/en/simulations/rutherford-scattering
import { createDualCanvas } from '../common/teachPlots.js';
import { el } from '../common/ui.js';
import { X0, closestApproach, kappaOf, K_SCALE } from './physics.js';

const B_MAX = 7.5;
const DT = 0.045;
const R_SOFT2 = 0.06;
const N_ALPHA = 48;
const TRAIL_LEN = 90;
const R_PUDDING = 5.2;

function kappaForModel(Z, atomModel) {
  if (atomModel === 'plum') return K_SCALE * Z * 0.07;
  return kappaOf(Z);
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

export class Rutherford2D {
  constructor(host) {
    this.host = host;
    this.Z = 79;
    this.E = 2;
    this.targetName = 'Gold (Au)';
    this.atomModel = 'nuclear';
    this.showTraces = true;
    this.showCenter = true;
    this.paused = false;
    this._active = true;
    this.alphas = [];
    this.trails = [];
    this.hist = new Array(18).fill(0);
    this._lastHist = 0;

    this._hud = el('div', 'ru-hud', '');
    host.appendChild(this._hud);

    for (let i = 0; i < N_ALPHA; i++) {
      this.alphas.push(this._makeAlpha(true));
      this.trails.push([]);
    }

    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      if (!self.paused && self._active) self._step();
      self._draw(ctx, w, h);
    });
    this._updateHud();
  }

  setParams(p) {
    if (!p) return;
    const respawn = !!p._respawn;
    const zChanged = p.Z != null && p.Z !== this.Z;
    const eChanged = p.E != null && p.E !== this.E;
    const modelChanged = p.atomModel != null && p.atomModel !== this.atomModel;
    if (p.Z != null) this.Z = p.Z;
    if (p.E != null) this.E = p.E;
    if (p.targetName != null) this.targetName = p.targetName;
    if (p.atomModel != null) this.atomModel = p.atomModel;
    if (p.showTraces != null) this.showTraces = !!p.showTraces;
    if (p.showCenter != null) this.showCenter = !!p.showCenter;
    if (respawn || zChanged || eChanged || modelChanged) {
      for (let i = 0; i < N_ALPHA; i++) {
        this.alphas[i] = this._makeAlpha(false);
        this.trails[i] = [];
      }
      this.hist.fill(0);
    }
    this._updateHud();
  }

  fireOne() {
    const idx = Math.floor(Math.random() * N_ALPHA);
    this.alphas[idx] = this._makeAlpha(false);
    this.trails[idx] = [];
  }

  setPaused(v) {
    this.paused = !!v;
    this._canvas.setPaused(v);
  }

  setActive(v) {
    this._active = !!v;
    this._hud.style.display = v ? '' : 'none';
  }

  resize() { this._canvas.resize(); }

  dispose() {
    this._canvas.dispose();
    if (this._hud.parentNode) this._hud.parentNode.removeChild(this._hud);
  }

  _v0() {
    return Math.sqrt(2 * this.E);
  }

  _kappa() {
    return kappaForModel(this.Z, this.atomModel);
  }

  _makeAlpha(prewarm) {
    const b = 0.08 + Math.pow(Math.random(), 0.75) * B_MAX;
    const p = {
      x: -X0 * 0.85,
      y: (Math.random() - 0.5) * 2 * b,
      vx: this._v0(),
      vy: 0,
      b: b,
      done: false,
      theta: 0,
    };
    if (prewarm) {
      const n = Math.floor(Math.random() * 200);
      for (let k = 0; k < n; k++) this._integrateStep(p);
    }
    return p;
  }

  _acc(x, y) {
    const kappa = this._kappa();
    const r2 = Math.max(x * x + y * y, R_SOFT2);
    const r = Math.sqrt(r2);
    const f = kappa / (r2 * r);
    return [f * x, f * y];
  }

  _integrateStep(p) {
    let ax, ay, nx, ny;
    ax = this._acc(p.x, p.y)[0];
    ay = this._acc(p.x, p.y)[1];
    p.vx += 0.5 * ax * DT;
    p.vy += 0.5 * ay * DT;
    p.x += p.vx * DT;
    p.y += p.vy * DT;
    nx = this._acc(p.x, p.y)[0];
    ny = this._acc(p.x, p.y)[1];
    p.vx += 0.5 * (ax + nx) * DT;
    p.vy += 0.5 * (ay + ny) * DT;
  }

  _escaped(p, xScale) {
    return p.x > X0 * 0.82 * xScale;
  }

  _step() {
    const xScale = 1;
    for (let i = 0; i < N_ALPHA; i++) {
      const p = this.alphas[i];
      if (p.done) continue;
      this._integrateStep(p);
      if (this.showTraces) {
        const tr = this.trails[i];
        tr.push({ x: p.x, y: p.y });
        if (tr.length > TRAIL_LEN) tr.shift();
      }
      if (this._escaped(p, xScale)) {
        p.theta = Math.atan2(Math.abs(p.vy), p.vx) * (180 / Math.PI);
        p.done = true;
        p.cooldown = 18 + Math.floor(Math.random() * 22);
        const bin = Math.min(17, Math.max(0, Math.floor(p.theta / 10)));
        this.hist[bin]++;
        this._lastHist = p.theta;
      }
      if (p.done && p.cooldown != null) {
        p.cooldown--;
        if (p.cooldown <= 0) {
          this.alphas[i] = this._makeAlpha(false);
          this.trails[i] = [];
        }
      }
    }
  }

  _updateHud() {
    const D = closestApproach(this.Z, this.E);
    const model = this.atomModel === 'plum' ? 'Plum pudding' : 'Nuclear atom';
    this._hud.textContent =
      this.targetName + '  ·  Z = ' + this.Z +
      '  ·  E = ' + this.E.toFixed(1) +
      '  ·  ' + model +
      '  ·  D = ' + D.toFixed(2) +
      (this._lastHist > 0 ? '  ·  last θ ≈ ' + this._lastHist.toFixed(0) + '°' : '');
  }

  _world(w, h) {
    const padL = 58;
    const padR = 24;
    const padT = 36;
    const padB = 32;
    const cw = w - padL - padR;
    const ch = h - padT - padB;
    const cx = padL + cw * 0.52;
    const cy = padT + ch * 0.5;
    const scale = Math.min(cw, ch) / (X0 * 1.75);
    return { padL: padL, padR: padR, padT: padT, padB: padB, cw: cw, ch: ch, cx: cx, cy: cy, scale: scale };
  }

  _wx(W, x) { return W.cx + x * W.scale; }
  _wy(W, y) { return W.cy - y * W.scale; }

  _draw(ctx, w, h) {
    if (!this._active) return;
    const W = this._world(w, h);

    ctx.fillStyle = '#05070d';
    ctx.fillRect(0, 0, w, h);

    this._drawChamber(ctx, w, h, W);
    this._drawTarget(ctx, W);
    if (this.showTraces) this._drawTrails(ctx, W);
    this._drawAlphas(ctx, W);
    if (this.showCenter) this._drawCenter(ctx, W);
    this._drawGun(ctx, W);
    this._drawHist(ctx, w, h);
    this._drawLegend(ctx, w);
  }

  _drawChamber(ctx, w, h, W) {
    roundRect(ctx, W.padL - 8, W.padT - 8, W.cw + 16, W.ch + 16, 12);
    ctx.fillStyle = 'rgba(10,17,34,0.72)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(56,189,248,0.22)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(30,41,59,0.55)';
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(this._wx(W, 0), W.padT);
    ctx.lineTo(this._wx(W, 0), W.padT + W.ch);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#64748b';
    ctx.font = '600 10px system-ui,sans-serif';
    ctx.fillText('beam →', W.padL + 4, W.cy + 4);
  }

  _drawTarget(ctx, W) {
    if (this.atomModel === 'plum') {
      const r = R_PUDDING * W.scale;
      const grd = ctx.createRadialGradient(W.cx, W.cy, 0, W.cx, W.cy, r);
      grd.addColorStop(0, 'rgba(251,191,36,0.35)');
      grd.addColorStop(0.55, 'rgba(251,113,133,0.22)');
      grd.addColorStop(1, 'rgba(251,113,133,0.04)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(W.cx, W.cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(251,191,36,0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      ctx.font = '600 9px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('+ charge spread (Thomson)', W.cx, W.cy + r + 14);
      ctx.textAlign = 'left';
    }

    const rN = (this.atomModel === 'plum' ? 0.35 : 0.55) * W.scale;
    const grd2 = ctx.createRadialGradient(W.cx, W.cy, 0, W.cx, W.cy, rN * 2.2);
    grd2.addColorStop(0, '#fff7cc');
    grd2.addColorStop(0.35, '#ffd24a');
    grd2.addColorStop(1, 'rgba(255,210,74,0)');
    ctx.fillStyle = grd2;
    ctx.beginPath();
    ctx.arc(W.cx, W.cy, rN * 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd24a';
    ctx.beginPath();
    ctx.arc(W.cx, W.cy, rN, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.font = '700 10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('+' + this.Z, W.cx, W.cy + 3);
    ctx.textAlign = 'left';
  }

  _drawCenter(ctx, W) {
    ctx.strokeStyle = 'rgba(148,163,184,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W.cx - 10, W.cy);
    ctx.lineTo(W.cx + 10, W.cy);
    ctx.moveTo(W.cx, W.cy - 10);
    ctx.lineTo(W.cx, W.cy + 10);
    ctx.stroke();
  }

  _drawGun(ctx, W) {
    const gx = W.padL - 4;
    const gy = W.cy;
    ctx.fillStyle = '#334155';
    roundRect(ctx, gx - 28, gy - 12, 32, 24, 4);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(gx + 6, gy);
    ctx.lineTo(gx + 22, gy - 5);
    ctx.lineTo(gx + 22, gy + 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#7dd3fc';
    ctx.font = '600 9px system-ui,sans-serif';
    ctx.fillText('α source', gx - 26, gy - 18);
  }

  _drawTrails(ctx, W) {
    for (let i = 0; i < this.trails.length; i++) {
      const tr = this.trails[i];
      if (tr.length < 2) continue;
      ctx.strokeStyle = 'rgba(56,189,248,0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let j = 0; j < tr.length; j++) {
        const px = this._wx(W, tr[j].x);
        const py = this._wy(W, tr[j].y);
        if (j === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }

  _drawAlphas(ctx, W) {
    for (let i = 0; i < this.alphas.length; i++) {
      const p = this.alphas[i];
      const px = this._wx(W, p.x);
      const py = this._wy(W, p.y);
      const grd = ctx.createRadialGradient(px, py, 0, px, py, 7);
      grd.addColorStop(0, '#ffffff');
      grd.addColorStop(0.35, '#7dd3fc');
      grd.addColorStop(1, 'rgba(125,211,252,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawHist(ctx, w, h) {
    const hw = 118;
    const hh = 72;
    const hx = w - hw - 14;
    const hy = h - hh - 14;
    roundRect(ctx, hx, hy, hw, hh, 8);
    ctx.fillStyle = 'rgba(10,17,34,0.88)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(51,65,85,0.8)';
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 9px system-ui,sans-serif';
    ctx.fillText('θ histogram', hx + 8, hy + 12);

    let hMax = 1;
    for (let i = 0; i < this.hist.length; i++) if (this.hist[i] > hMax) hMax = this.hist[i];

    const barW = (hw - 16) / this.hist.length;
    for (let i = 0; i < this.hist.length; i++) {
      const bh = (this.hist[i] / hMax) * (hh - 28);
      ctx.fillStyle = i >= 9 ? 'rgba(248,113,113,0.85)' : 'rgba(56,189,248,0.65)';
      ctx.fillRect(hx + 8 + i * barW, hy + hh - 8 - bh, barW - 1, bh);
    }
    ctx.fillStyle = '#64748b';
    ctx.font = '8px system-ui,sans-serif';
    ctx.fillText('0°', hx + 6, hy + hh - 2);
    ctx.fillText('180°', hx + hw - 28, hy + hh - 2);
  }

  _drawLegend(ctx, w) {
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.fillText('Rutherford scattering (2D)', 14, 22);
  }
}
