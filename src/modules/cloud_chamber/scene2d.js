// Top-down diffusion cloud chamber — matches classroom demos:
// black cold plate, side lamp, white condensation trails, α source pin.
import { createDualCanvas } from '../common/teachPlots.js';
import { el } from '../common/ui.js';
import {
  ChamberSim,
  BATCH_SIZE,
  COL_THROUGH,
  COL_WIDE,
  COL_BACK,
  SIM_W,
  SIM_H,
} from './physics.js';

function trackColor(sim, kind, fade) {
  if (!sim.colorCode || kind === 'through') {
    const a = 0.25 + 0.55 * fade;
    return 'rgba(236,242,255,' + a.toFixed(3) + ')';
  }
  const hex = kind === 'back' ? COL_BACK : COL_WIDE;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + (0.55 + 0.4 * fade).toFixed(3) + ')';
}

export class CloudChamber2D {
  constructor(host, sharedSim) {
    this.host = host;
    this.sim = sharedSim || new ChamberSim();
    this.paused = false;
    this._buildToggles();
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h) {
      // 2D owns the sim clock while this view is visible
      if (!self.paused && self._active) self.sim.tick(0.016);
      self._draw(ctx, w, h);
    });
    this._active = true;
  }

  setActive(v) { this._active = !!v; }

  _buildToggles() {
    const box = el('div', 'dual-2d-toggles cloud-chamber-toggles');
    const self = this;
    function add(label, key) {
      const lab = el('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = self.sim[key];
      cb.onchange = function () { self.sim[key] = cb.checked; };
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode(' ' + label));
      box.appendChild(lab);
    }
    add('Continuous source', 'autoEmit');
    add('Colour-code scatters', 'colorCode');
    this.host.appendChild(box);
    this._tog = box;
  }

  setParams(p) { this.sim.setParams(p); }
  setPaused(v) {
    this.paused = !!v;
    this._canvas.setPaused(v);
  }
  fireBatch(n) { this.sim.fireBatch(n != null ? n : BATCH_SIZE); }
  clearTracks() { this.sim.clear(); }
  get counts() { return this.sim.counts; }
  resize() { this._canvas.resize(); }
  tick() {}

  _layout(W, H) {
    const pad = 18;
    const titleH = 36;
    const footerH = 28;
    const availW = W - pad * 2;
    const availH = H - titleH - footerH - 8;
    const aspect = SIM_W / SIM_H;
    let cw = availW;
    let ch = cw / aspect;
    if (ch > availH) {
      ch = availH;
      cw = ch * aspect;
    }
    return {
      x: (W - cw) / 2,
      y: titleH + (availH - ch) / 2,
      w: cw,
      h: ch,
      s: cw / SIM_W,
    };
  }

  _to(L, sx, sy) {
    return { x: L.x + sx * L.s, y: L.y + sy * L.s };
  }

  _draw(ctx, W, H) {
    if (!W || !H) return;
    const L = this._layout(W, H);
    ctx.fillStyle = '#06080f';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 14px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Diffusion cloud chamber', W / 2, 20);
    ctx.fillStyle = '#8092b4';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('Top view · white trails = ionising α tracks in alcohol vapour', W / 2, 36);

    this._drawChamber(ctx, L);
    this._drawTracks(ctx, L);
    this._drawLive(ctx, L);
    this._drawFlashes(ctx, L);
    this._drawHud(ctx, W, H);
  }

  _drawChamber(ctx, L) {
    // Outer rim / acrylic walls
    ctx.fillStyle = '#1a2233';
    roundRect(ctx, L.x - 10, L.y - 10, L.w + 20, L.h + 20, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(148,163,184,0.35)';
    ctx.lineWidth = 2;
    roundRect(ctx, L.x - 10, L.y - 10, L.w + 20, L.h + 20, 14);
    ctx.stroke();

    // Black cold plate (essential contrast for white tracks)
    const g = ctx.createLinearGradient(L.x, L.y, L.x, L.y + L.h);
    g.addColorStop(0, '#0c1018');
    g.addColorStop(0.55, '#050608');
    g.addColorStop(1, '#020305');
    ctx.fillStyle = g;
    roundRect(ctx, L.x, L.y, L.w, L.h, 8);
    ctx.fill();

    // Soft mist layer near the sensitive region
    const mist = ctx.createLinearGradient(L.x, L.y + L.h * 0.15, L.x, L.y + L.h * 0.85);
    mist.addColorStop(0, 'rgba(180,200,230,0.02)');
    mist.addColorStop(0.45, 'rgba(200,220,255,0.07)');
    mist.addColorStop(1, 'rgba(180,200,230,0.02)');
    ctx.fillStyle = mist;
    ctx.fillRect(L.x + 4, L.y + 4, L.w - 8, L.h - 8);

    // Alcohol felt along the “warm” top edge of the lid (drawn as a strip)
    ctx.fillStyle = 'rgba(100,116,139,0.45)';
    ctx.fillRect(L.x + 8, L.y + 6, L.w - 16, 10);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('alcohol felt', L.x + 14, L.y + 14);

    // Side lamp (grazing illumination like a real demo)
    const lampX = L.x + L.w - 6;
    const lampGrad = ctx.createRadialGradient(lampX, L.y + L.h * 0.5, 4, lampX, L.y + L.h * 0.5, L.w * 0.55);
    lampGrad.addColorStop(0, 'rgba(251,191,36,0.16)');
    lampGrad.addColorStop(0.4, 'rgba(251,191,36,0.05)');
    lampGrad.addColorStop(1, 'rgba(251,191,36,0)');
    ctx.fillStyle = lampGrad;
    ctx.fillRect(L.x, L.y, L.w, L.h);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(lampX - 2, L.y + L.h * 0.28, 5, L.h * 0.44);
    ctx.fillStyle = '#fde68a';
    ctx.font = '9px system-ui,sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('lamp', lampX - 8, L.y + L.h * 0.5);

    // α source pin on the left
    const src = this._to(L, 28, SIM_H * 0.5);
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.arc(src.x - 10, src.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(src.x - 10, src.y);
    ctx.lineTo(src.x + 8, src.y);
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(src.x + 8, src.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('α source', src.x - 10, src.y - 16);

    // Quiet note: atoms invisible — only rare scatter flashes a nucleus
    ctx.fillStyle = 'rgba(128,146,180,0.55)';
    ctx.font = '10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('atoms in the vapour are invisible — a bright kink means a close nuclear hit', L.x + L.w / 2, L.y + L.h - 10);
  }

  _drawPolyline(ctx, L, pts, width, stroke) {
    if (!pts || pts.length < 4) return;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < pts.length; i += 2) {
      const p = this._to(L, pts[i], pts[i + 1]);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  _drawTracks(ctx, L) {
    const tracks = this.sim.tracks;
    for (let i = 0; i < tracks.length; i++) {
      const tr = tracks[i];
      const fade = Math.max(0, tr.life / tr.max);
      const thick = tr.kind === 'through' ? 2.2 * L.s : 3.6 * L.s;
      // Soft glow under the condensation trail
      this._drawPolyline(ctx, L, tr.pts, thick * 2.2, trackColor(this.sim, tr.kind, fade * 0.35));
      this._drawPolyline(ctx, L, tr.pts, thick, trackColor(this.sim, tr.kind, fade));
    }
  }

  _drawLive(ctx, L) {
    const alphas = this.sim.alphas;
    for (let i = 0; i < alphas.length; i++) {
      const a = alphas[i];
      const kind = a.scattered
        ? (Math.abs(a.scatterAngle) * 180 / Math.PI > 90 ? 'back' : 'wide')
        : 'through';
      this._drawPolyline(ctx, L, a.pts, 2.6 * L.s, trackColor(this.sim, kind, 0.95));
      const tip = this._to(L, a.x, a.y);
      ctx.fillStyle = 'rgba(255,240,220,0.9)';
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawFlashes(ctx, L) {
    for (let i = 0; i < this.sim.flashes.length; i++) {
      const f = this.sim.flashes[i];
      const p = this._to(L, f.x, f.y);
      const t = Math.max(0, f.life / 1.2);
      ctx.fillStyle = 'rgba(251,191,36,' + (0.55 * t).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5 + 8 * (1 - t), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,' + (0.9 * t).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
      if (t > 0.4) {
        ctx.fillStyle = 'rgba(253,230,138,' + t.toFixed(3) + ')';
        ctx.font = '600 10px system-ui,sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('nucleus', p.x + 8, p.y - 6);
      }
    }
  }

  _drawHud(ctx, W, H) {
    const c = this.sim.counts;
    const tot = c.total || 0;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    const line = 'tracks ' + tot
      + '   ·   straight ' + c.through
      + '   ·   wide ' + c.wide
      + '   ·   back ' + c.back;
    ctx.fillText(line, 16, H - 12);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Fire a batch to watch ~40 alphas · rare gold/red = nuclear scatter', W - 16, H - 12);
  }

  dispose() {
    if (this._tog && this._tog.parentNode) this._tog.parentNode.removeChild(this._tog);
    this._canvas.dispose();
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
