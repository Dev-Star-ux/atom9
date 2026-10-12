// AllVisualizer-style 2D photoelectric lab:
// photons → metal surface → electrons if hf ≥ φ
// https://allvisualizer.com/physics-visualizer/simulations/photoelectric-effect
import { createDualCanvas } from '../common/teachPlots.js';
import { el } from '../common/ui.js';
import {
  thresholdFreq,
  keMaxEV,
  photocurrent,
  freqToColor,
  H_TRUE,
  E,
  C,
  METALS,
} from './physics.js';

function rgbCss(rgb, a) {
  const alpha = a == null ? 1 : a;
  return 'rgba(' + Math.round(rgb[0] * 255) + ',' + Math.round(rgb[1] * 255) + ',' +
    Math.round(rgb[2] * 255) + ',' + alpha + ')';
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

function metalName(phi) {
  for (let i = 0; i < METALS.length; i++) {
    if (Math.abs(METALS[i].phi - phi) < 0.05) return METALS[i].name;
  }
  return 'Metal';
}

export class Photoelectric2D {
  constructor(host) {
    this.host = host;
    this.state = { phi: 2.28, fHz: 7e14, intensity: 0.6, Vstop: 0 };
    this.paused = false;
    this._active = true;
    this._phase = 0;
    this._photons = [];
    this._electrons = [];
    this._sparks = [];
    this._ejected = 0;

    this._hud = el('div', 'pe-hud', '');
    host.appendChild(this._hud);

    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      if (!self.paused && self._active) {
        self._phase = phase;
        self._step(0.04);
      }
      self._draw(ctx, w, h);
    });
    this._updateHud();
  }

  setParams(p) {
    if (!p) return;
    if (p.phi != null) {
      if (Math.abs(p.phi - this.state.phi) > 0.01) this._ejected = 0;
      this.state.phi = p.phi;
    }
    if (p.fHz != null) this.state.fHz = p.fHz;
    if (p.intensity != null) this.state.intensity = p.intensity;
    if (p.Vstop != null) this.state.Vstop = p.Vstop;
    this._updateHud();
  }

  setPaused(v) {
    this.paused = !!v;
    this._canvas.setPaused(v);
  }

  setActive(v) {
    this._active = !!v;
    if (this._hud) this._hud.style.display = v ? '' : 'none';
  }

  resize() { this._canvas.resize(); }

  dispose() {
    this._canvas.dispose();
    if (this._hud.parentNode) this._hud.parentNode.removeChild(this._hud);
  }

  _updateHud() {
    const f0 = thresholdFreq(this.state.phi);
    const ke = keMaxEV(this.state.fHz, this.state.phi);
    const ePh = (H_TRUE * this.state.fHz) / E;
    const wl = (C / this.state.fHz) * 1e9;
    const occurs = this.state.fHz >= f0;
    this._hud.textContent =
      metalName(this.state.phi) +
      '  ·  hf = ' + ePh.toFixed(2) + ' eV' +
      '  ·  φ = ' + this.state.phi.toFixed(2) + ' eV' +
      '  ·  λ ≈ ' + wl.toFixed(0) + ' nm' +
      '  ·  KE_max = ' + (occurs ? ke.toFixed(2) + ' eV' : '0') +
      '  ·  ejected ' + this._ejected +
      '  ·  ' + (occurs ? 'effect ON' : 'below threshold');
  }

  _step(dt) {
    const f0 = thresholdFreq(this.state.phi);
    const emits = this.state.fHz >= f0;
    const ke = keMaxEV(this.state.fHz, this.state.phi);
    const stopped = ke > 0 && this.state.Vstop >= ke;
    // Intensity → more photons / second (AllVisualizer insight)
    const rate = 0.12 + this.state.intensity * 0.85;

    if (Math.random() < rate) {
      this._photons.push({
        x: 0.02 + Math.random() * 0.06,
        y: 0.22 + Math.random() * 0.45,
        vx: 0.42 + Math.random() * 0.18,
        life: 1,
        wave: Math.random() * Math.PI * 2,
      });
    }

    const nextP = [];
    for (let i = 0; i < this._photons.length; i++) {
      const p = this._photons[i];
      p.x += p.vx * dt;
      p.wave += dt * 14;
      if (p.x >= 0.58) {
        // Hit metal
        this._sparks.push({ x: 0.58, y: p.y, life: 0.35, ok: emits && !stopped });
        if (emits && !stopped) {
          this._ejected++;
          const speed = 0.18 + 0.12 * Math.min(3, ke);
          const ang = -0.55 + Math.random() * 1.1;
          this._electrons.push({
            x: 0.59,
            y: p.y,
            vx: Math.cos(ang) * speed,
            vy: Math.sin(ang) * speed * 0.55,
            ax: -0.25 * Math.max(0, this.state.Vstop) / Math.max(0.25, ke),
            life: 1.2,
          });
        }
        continue;
      }
      nextP.push(p);
    }
    this._photons = nextP.slice(-60);

    const nextE = [];
    for (let i = 0; i < this._electrons.length; i++) {
      const e = this._electrons[i];
      e.vx += e.ax * dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.life -= dt;
      if (e.life > 0 && e.vx > 0.02 && e.x < 0.98 && e.y > 0.05 && e.y < 0.95) nextE.push(e);
    }
    this._electrons = nextE.slice(-50);

    for (let i = this._sparks.length - 1; i >= 0; i--) {
      this._sparks[i].life -= dt;
      if (this._sparks[i].life <= 0) this._sparks.splice(i, 1);
    }

    this._updateHud();
  }

  _draw(ctx, w, h) {
    if (!this._active) return;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0b1220');
    g.addColorStop(1, '#151a2c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const topH = Math.floor(h * 0.62);
    this._drawDemo(ctx, w, topH);
    this._drawKePlot(ctx, 0, topH, w, h - topH);
  }

  _drawDemo(ctx, w, h) {
    const rgb = freqToColor(this.state.fHz);
    const beam = rgbCss(rgb, 1);
    const f0 = thresholdFreq(this.state.phi);
    const emits = this.state.fHz >= f0;
    const ke = keMaxEV(this.state.fHz, this.state.phi);
    const ePh = (H_TRUE * this.state.fHz) / E;
    const wl = (C / this.state.fHz) * 1e9;
    const fTHz = this.state.fHz / 1e12;
    const I = photocurrent(this.state.fHz, this.state.intensity, this.state.Vstop, this.state.phi);
    const name = metalName(this.state.phi);

    // Title
    ctx.fillStyle = '#f1f5f9';
    ctx.font = '700 14px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Photoelectric effect — photons hit metal; electrons leave only if hf ≥ φ', 16, 24);

    // Status banner
    roundRect(ctx, 16, 34, w - 32, 34, 8);
    ctx.fillStyle = 'rgba(15,23,42,0.82)';
    ctx.fill();
    ctx.fillStyle = emits ? '#4ade80' : '#f87171';
    ctx.font = '700 12px system-ui,sans-serif';
    ctx.fillText(
      emits ? '✓ Photoelectric effect occurs' : '✗ Below threshold — no electrons ejected',
      28, 55
    );
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(
      emits
        ? 'Higher intensity → more electrons, same KE_max'
        : 'Raise frequency (or pick a metal with lower φ)',
      Math.min(w - 28, 360), 55
    );

    // Stage area
    const stageY = 80;
    const stageH = h - stageY - 12;
    const metalX = w * 0.58;
    const metalW = w * 0.16;
    const metalY = stageY + 10;
    const metalH = stageH - 28;

    // Light source
    const lx = 28;
    const ly = stageY + stageH * 0.35;
    roundRect(ctx, lx, ly, 54, 54, 10);
    ctx.fillStyle = '#334155';
    ctx.fill();
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.arc(lx + 27, ly + 27, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Light', lx + 27, ly - 8);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText(fTHz.toFixed(0) + ' THz', lx + 27, ly + 70);
    ctx.fillText(wl.toFixed(0) + ' nm', lx + 27, ly + 84);

    // Beam wash
    ctx.save();
    ctx.globalAlpha = 0.14 + this.state.intensity * 0.18;
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(lx + 54, ly + 14);
    ctx.lineTo(metalX, metalY + 20);
    ctx.lineTo(metalX, metalY + metalH - 20);
    ctx.lineTo(lx + 54, ly + 40);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Metal block (AllVisualizer-style surface)
    const metalGrad = ctx.createLinearGradient(metalX, 0, metalX + metalW, 0);
    metalGrad.addColorStop(0, '#64748b');
    metalGrad.addColorStop(0.35, '#94a3b8');
    metalGrad.addColorStop(1, '#475569');
    roundRect(ctx, metalX, metalY, metalW, metalH, 6);
    ctx.fillStyle = metalGrad;
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Surface shine / atoms hint
    for (let i = 0; i < 8; i++) {
      const ay = metalY + 18 + i * ((metalH - 36) / 7);
      ctx.fillStyle = 'rgba(226,232,240,0.35)';
      ctx.beginPath();
      ctx.arc(metalX + 14, ay, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#0f172a';
    ctx.font = '700 12px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, metalX + metalW / 2, metalY + metalH / 2 - 6);
    ctx.font = '600 10px system-ui,sans-serif';
    ctx.fillText('φ = ' + this.state.phi.toFixed(2) + ' eV', metalX + metalW / 2, metalY + metalH / 2 + 12);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.fillText('Metal surface', metalX + metalW / 2, metalY + metalH + 16);

    // Collector / free space label
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ejected e⁻ →', metalX + metalW + 12, metalY + 18);

    // Photons
    for (let i = 0; i < this._photons.length; i++) {
      const p = this._photons[i];
      const px = p.x * w;
      const py = stageY + p.y * stageH;
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.arc(px, py, 4.5, 0, Math.PI * 2);
      ctx.fill();
      // tiny wave ripple
      ctx.strokeStyle = rgbCss(rgb, 0.45);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(px, py, 7 + Math.sin(p.wave) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Hit sparks
    for (let i = 0; i < this._sparks.length; i++) {
      const s = this._sparks[i];
      const a = Math.max(0, s.life / 0.35);
      ctx.beginPath();
      ctx.arc(s.x * w, stageY + s.y * stageH, 6 + (1 - a) * 10, 0, Math.PI * 2);
      ctx.fillStyle = s.ok
        ? 'rgba(74,222,128,' + (a * 0.55) + ')'
        : 'rgba(248,113,113,' + (a * 0.45) + ')';
      ctx.fill();
    }

    // Electrons
    for (let i = 0; i < this._electrons.length; i++) {
      const e = this._electrons[i];
      const px = e.x * w;
      const py = stageY + e.y * stageH;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e0f2fe';
      ctx.font = '700 9px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('e⁻', px, py - 8);
    }

    // Readout card (right)
    const rx = metalX + metalW + 18;
    const ry = stageY + 8;
    const rw = Math.max(160, w - rx - 16);
    roundRect(ctx, rx, ry, rw, Math.min(188, stageH - 20), 10);
    ctx.fillStyle = 'rgba(15,23,42,0.88)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(148,163,184,0.35)';
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#f1f5f9';
    ctx.font = '700 12px system-ui,sans-serif';
    ctx.fillText('Readout', rx + 12, ry + 20);

    const rows = [
      ['Photon energy hf', ePh.toFixed(2) + ' eV'],
      ['Work function φ', this.state.phi.toFixed(2) + ' eV'],
      ['Threshold f₀', (f0 / 1e12).toFixed(0) + ' THz'],
      ['Max KE', emits ? ke.toFixed(2) + ' eV' : '0 eV'],
      ['Intensity', Math.round(this.state.intensity * 100) + '%'],
      ['Electrons ejected', String(this._ejected)],
      ['Current', I > 0 ? 'flows' : 'zero'],
    ];
    for (let i = 0; i < rows.length; i++) {
      const y = ry + 42 + i * 20;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px system-ui,sans-serif';
      ctx.fillText(rows[i][0], rx + 12, y);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '600 11px system-ui,sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(rows[i][1], rx + rw - 12, y);
      ctx.textAlign = 'left';
    }

    // Einstein badge
    roundRect(ctx, 16, stageY + stageH - 36, Math.min(340, metalX - 28), 28, 8);
    ctx.fillStyle = 'rgba(15,23,42,0.75)';
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.fillText('KE_max = hf − φ' + (emits ? '  →  ' + ke.toFixed(2) + ' eV' : '  (need hf ≥ φ)'), 26, stageY + stageH - 18);
  }

  _drawKePlot(ctx, x0, y0, w, h) {
    ctx.fillStyle = '#070a12';
    ctx.fillRect(x0, y0, w, h);

    const padL = 48;
    const padR = 16;
    const padT = 28;
    const padB = 28;
    const L = x0 + padL;
    const R = x0 + w - padR;
    const T = y0 + padT;
    const B = y0 + h - padB;

    const f0 = thresholdFreq(this.state.phi) / 1e14;
    const fNow = this.state.fHz / 1e14;
    const keNow = Math.max(0, keMaxEV(this.state.fHz, this.state.phi));
    const yMax = Math.max(4, keNow + 1);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('KE_max vs frequency  ·  Einstein line (slope ∝ h)', L, y0 + 16);

    ctx.strokeStyle = 'rgba(148,163,184,0.35)';
    ctx.beginPath();
    ctx.moveTo(L, T);
    ctx.lineTo(L, B);
    ctx.lineTo(R, B);
    ctx.stroke();

    function X(f) { return L + (R - L) * (f - 3) / (15 - 3); }
    function Y(ke) { return B - (B - T) * (ke / yMax); }

    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= 60; i++) {
      const f14 = 3 + (15 - 3) * i / 60;
      const ke = Math.max(0, keMaxEV(f14 * 1e14, this.state.phi));
      const px = X(f14);
      const py = Y(ke);
      if (!started) { ctx.moveTo(px, py); started = true; }
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = '#f87171';
    ctx.beginPath();
    ctx.moveTo(X(f0), T);
    ctx.lineTo(X(f0), B);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#f87171';
    ctx.font = '600 10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('f₀', X(f0), T + 12);

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(X(fNow), Y(keNow), 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('f (×10¹⁴ Hz)', (L + R) / 2, y0 + h - 6);
    ctx.save();
    ctx.translate(x0 + 14, (T + B) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('KE (eV)', 0, 0);
    ctx.restore();
  }
}
