/** Stealth RCS teaching — conventional vs stealth scatter + bar compare. */
import { createDualCanvas } from '../common/teachPlots.js';
import {
  stealthSigmaEff, conventionalSigma, wavelength, diffractionHint, scatterLobes,
  reductionRatio, formatSigmaM2, getShape,
} from './physics.js';

export class StealthTechnologyScene2D {
  constructor(host) {
    this.state = {
      shapeId: 'faceted',
      shaping: 0.86,
      absorb: 0,
      frequency: 1e10,
      sigma0: 5,
    };
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.shapeId != null) this.state.shapeId = p.shapeId;
    if (p.shaping != null) this.state.shaping = p.shaping;
    if (p.absorb != null) this.state.absorb = p.absorb;
    if (p.frequency != null) this.state.frequency = p.frequency;
    if (p.sigma0 != null) this.state.sigma0 = p.sigma0;
  }

  setPaused(v) { this._canvas.setPaused(v); }
  setActive(v) { this._active = !!v; }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _draw(ctx, W, H, phase) {
    if (!W || !H) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);

    const captionH = Math.min(52, Math.floor(H * 0.14));
    this._drawCaption(ctx, W, captionH);

    const schemH = Math.floor((H - captionH) * 0.68);
    this._drawSchematic(ctx, captionH, W, schemH, phase);
    this._drawBars(ctx, 0, captionH + schemH + 4, W, H - captionH - schemH - 4);
  }

  _drawCaption(ctx, W, H) {
    const conv = conventionalSigma(this.state.sigma0);
    const ste = stealthSigmaEff(this.state.shapeId, this.state.absorb, this.state.frequency);
    const reduced = ste < conv * 0.35;

    ctx.fillStyle = reduced ? 'rgba(22, 101, 52, 0.95)' : 'rgba(120, 53, 15, 0.92)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = reduced ? '#4ade80' : '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, H - 0.5);
    ctx.lineTo(W, H - 0.5);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 16px system-ui,sans-serif';
    ctx.fillText(
      reduced
        ? 'RCS REDUCED — stealth σ_eff ≪ conventional (radar sees a much weaker echo)'
        : 'Pick a stealth shape type — catalog σ_eff (m²) is much smaller than conventional',
      14, H * 0.38
    );
    ctx.fillStyle = reduced ? '#bbf7d0' : '#fde68a';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.fillText(
      'RCS compare lab  ·  select shape type  ·  σ_eff shown in m²',
      14, H * 0.72
    );
    ctx.textBaseline = 'alphabetic';
  }

  _drawAircraft(ctx, x, y, stealth, phase) {
    ctx.save();
    ctx.translate(x, y);
    if (stealth) {
      const id = this.state.shapeId || 'faceted';
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      if (id === 'flyingWing') {
        ctx.moveTo(-78, 10);
        ctx.lineTo(0, -18);
        ctx.lineTo(78, 10);
        ctx.lineTo(20, 8);
        ctx.lineTo(0, 14);
        ctx.lineTo(-20, 8);
        ctx.closePath();
        ctx.fill();
      } else if (id === 'blended') {
        ctx.moveTo(-62, 10);
        ctx.quadraticCurveTo(-8, -14, 58, 2);
        ctx.lineTo(48, 12);
        ctx.lineTo(-28, 16);
        ctx.closePath();
        ctx.fill();
      } else if (id === 'cruise') {
        ctx.moveTo(-55, 4);
        ctx.lineTo(62, 2);
        ctx.lineTo(62, 8);
        ctx.lineTo(-48, 10);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-8, 6);
        ctx.lineTo(-18, 22);
        ctx.lineTo(8, 8);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-8, 6);
        ctx.lineTo(-18, -10);
        ctx.lineTo(8, 4);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.moveTo(-70, 8);
        ctx.lineTo(-20, -6);
        ctx.lineTo(50, -2);
        ctx.lineTo(70, 4);
        ctx.lineTo(40, 14);
        ctx.lineTo(-40, 16);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = '#94a3b8';
      ctx.stroke();
      ctx.fillStyle = 'rgba(51,65,85,' + (0.3 + 0.5 * this.state.absorb).toFixed(3) + ')';
      ctx.fill();
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(0, 6, 55, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-10, -2, 50, 6);
      ctx.beginPath();
      ctx.moveTo(-5, 6);
      ctx.lineTo(-45, 28);
      ctx.lineTo(15, 8);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-5, 6);
      ctx.lineTo(-45, -16);
      ctx.lineTo(15, 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(40, -18, 6, 24);
    }
    ctx.restore();
  }

  _drawLobes(ctx, cx, cy, lobes, color, scale) {
    const dirs = [
      { ang: Math.PI, a: lobes.back },
      { ang: -0.7, a: lobes.side },
      { ang: 0.7, a: lobes.side },
      { ang: 0, a: lobes.forward },
    ];
    for (let i = 0; i < dirs.length; i++) {
      const L = 20 + dirs[i].a * scale;
      const x1 = cx + Math.cos(dirs[i].ang) * L;
      const y1 = cy + Math.sin(dirs[i].ang) * L * 0.6;
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.25 + 0.6 * dirs[i].a;
      ctx.lineWidth = 2 + 4 * dirs[i].a;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x1, y1, 8 + 10 * dirs[i].a, 5 + 6 * dirs[i].a, dirs[i].ang, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  _drawSchematic(ctx, top, W, H, phase) {
    ctx.save();
    ctx.translate(0, top);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 0, W, H);

    const conv = conventionalSigma(this.state.sigma0);
    const ste = stealthSigmaEff(this.state.shapeId, this.state.absorb, this.state.frequency);
    const lam = wavelength(this.state.frequency);
    const dif = diffractionHint(this.state.frequency);
    const lobesS = scatterLobes(this.state.shaping, this.state.absorb);
    const lobesC = scatterLobes(0, 0);
    const ratioPct = reductionRatio(
      this.state.sigma0, this.state.shaping, this.state.absorb,
      this.state.shapeId, this.state.frequency,
    ) * 100;
    const fGHz = this.state.frequency / 1e9;
    const sh = getShape(this.state.shapeId);
    const absPct = this.state.absorb * 100;

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 14px system-ui,sans-serif';
    ctx.fillText('Threat radar illuminates BOTH aircraft — compare echo strength', 16, 18);

    ctx.font = '700 13px system-ui,sans-serif';
    ctx.fillStyle = '#67e8f9';
    ctx.fillText('f = ' + fGHz.toFixed(1) + ' GHz', 16, 40);
    ctx.fillStyle = '#a78bfa';
    ctx.fillText(sh.id === 'flyingWing' ? 'flying wing' : sh.id, 140, 40);
    ctx.fillStyle = '#34d399';
    ctx.fillText('absorb ' + absPct.toFixed(0) + '%', 280, 40);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('λ = ' + (lam * 100).toFixed(2) + ' cm', 420, 40);

    // Big remaining RCS number
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(W - 200, 12, 184, 56);
    ctx.strokeStyle = '#38bdf8';
    ctx.strokeRect(W - 200, 12, 184, 56);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.fillText('σ_eff (m²)', W - 188, 30);
    ctx.fillStyle = '#67e8f9';
    ctx.font = '800 18px system-ui,sans-serif';
    ctx.fillText(formatSigmaM2(ste), W - 188, 56);

    // Radar dish on left aiming at BOTH aircraft
    const dishX = 48;
    const dishY = H * 0.55;
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(dishX, dishY, 26, -1.1, 1.1);
    ctx.stroke();
    ctx.fillStyle = '#86efac';
    ctx.beginPath();
    ctx.arc(dishX + 8, dishY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#64748b';
    ctx.fillRect(dishX - 5, dishY + 24, 10, 16);
    ctx.fillStyle = '#4ade80';
    ctx.font = '700 11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('radar dish', dishX, dishY + 54);
    ctx.textAlign = 'left';

    const y1 = H * 0.38;
    const y2 = H * 0.72;
    const ax = W * 0.48;

    // Illumination beams to both aircraft
    const pulse = (phase * 0.2) % 1;
    for (let b = 0; b < 2; b++) {
      const ty = b === 0 ? y1 : y2;
      ctx.strokeStyle = 'rgba(74,222,128,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(dishX + 28, dishY);
      ctx.lineTo(ax - 80, ty);
      ctx.stroke();
      const t = pulse;
      const bx = dishX + 28 + t * (ax - 80 - dishX - 28);
      const by = dishY + t * (ty - dishY);
      ctx.fillStyle = 'rgba(74,222,128,0.85)';
      ctx.beginPath();
      ctx.arc(bx, by, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#86efac';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('same radar beam', dishX + 36, dishY - 30);

    this._drawAircraft(ctx, ax, y1, false, phase);
    this._drawLobes(ctx, ax, y1, lobesC, 'rgba(248,113,113,0.9)', 70);
    ctx.fillStyle = '#fca5a5';
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.fillText('conventional', ax - 40, y1 + 44);
    ctx.fillStyle = '#f87171';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('σ = ' + formatSigmaM2(conv) + '  (strong return)', ax - 50, y1 + 60);

    this._drawAircraft(ctx, ax, y2, true, phase);
    this._drawLobes(ctx, ax, y2, lobesS, 'rgba(56,189,248,0.9)', 70);
    ctx.fillStyle = '#7dd3fc';
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.fillText('stealth', ax - 20, y2 + 44);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('σ_eff = ' + formatSigmaM2(ste) + '  (catalog + RAM)', ax - 50, y2 + 60);

    // Corner reflector contrast
    const cx = W * 0.84;
    const cy = H * 0.55;
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy - 25);
    ctx.lineTo(cx - 20, cy + 25);
    ctx.lineTo(cx + 25, cy + 25);
    ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('corner reflector', cx - 30, cy + 44);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('(huge RCS contrast)', cx - 36, cy + 58);

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText(
      'Good: remaining RCS % falls. Diffraction hint ' + (dif * 100).toFixed(0) + '% at long λ softens shaping.',
      16, H - 8
    );
    ctx.restore();
  }

  _drawBars(ctx, ox, oy, W, H) {
    const padL = 60;
    const padR = 30;
    const padT = 48;
    const padB = 36;
    const plotX = ox + padL;
    const plotY = oy + padT;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const conv = conventionalSigma(this.state.sigma0);
    const ste = stealthSigmaEff(this.state.shapeId, this.state.absorb, this.state.frequency);
    const ratio = reductionRatio(
      this.state.sigma0, this.state.shaping, this.state.absorb,
      this.state.shapeId, this.state.frequency,
    );
    const yMax = Math.max(conv, ste, 0.01);

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '700 14px system-ui,sans-serif';
    ctx.fillText('RCS comparison — conventional vs stealth σ_eff', ox + 16, oy + 22);

    ctx.fillStyle = '#0a1122';
    ctx.fillRect(plotX, plotY, plotW, plotH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(plotX + 0.5, plotY + 0.5, plotW - 1, plotH - 1);

    const bw = plotW * 0.22;
    const h1 = (conv / yMax) * (plotH - 20);
    const h2 = (ste / yMax) * (plotH - 20);
    const x1 = plotX + plotW * 0.25 - bw / 2;
    const x2 = plotX + plotW * 0.65 - bw / 2;

    ctx.fillStyle = '#f87171';
    ctx.fillRect(x1, plotY + plotH - 10 - h1, bw, h1);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(x2, plotY + plotH - 10 - h2, bw, h2);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('conventional', x1 + bw / 2, plotY + plotH + 8);
    ctx.fillText('stealth', x2 + bw / 2, plotY + plotH + 8);
    ctx.fillText(formatSigmaM2(conv), x1 + bw / 2, plotY + plotH - 16 - h1);
    ctx.fillText(formatSigmaM2(ste), x2 + bw / 2, plotY + plotH - 16 - h2);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#fbbf24';
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.fillText('remaining RCS = ' + (ratio * 100).toFixed(1) + '% of conventional', plotX + 8, plotY + 20);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.save();
    ctx.translate(14, plotY + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('σ (m²)', 0, 0);
    ctx.restore();
  }
}
