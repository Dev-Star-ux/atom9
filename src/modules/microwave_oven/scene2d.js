/** Microwave oven — cavity standing waves, turntable, |E| plot. */
import { createDualCanvas } from '../common/teachPlots.js';
import {
  freeSpaceWavelength, eFieldCurve, cavitySpotGrid, heatingPower,
  magnetronFreq, standingWaveE, cavityWavelength,
} from './physics.js';

export class MicrowaveOvenScene2D {
  constructor(host) {
    this.state = {
      power: 800,
      modeIndex: 3,
      turntable: 1,
      waterFrac: 0.7,
      cavityL: 0.35,
    };
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.power != null) this.state.power = p.power;
    if (p.modeIndex != null) this.state.modeIndex = p.modeIndex;
    if (p.turntable != null) this.state.turntable = p.turntable;
    if (p.waterFrac != null) this.state.waterFrac = p.waterFrac;
    if (p.cavityL != null) this.state.cavityL = p.cavityL;
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
    this._drawCurve(ctx, 0, captionH + schemH + 4, W, H - captionH - schemH - 4);
  }

  _drawCaption(ctx, W, H) {
    const heating = this.state.power > 50 && this.state.waterFrac > 0.05;
    const ttOn = this.state.turntable > 0.5;
    ctx.fillStyle = heating ? 'rgba(22, 101, 52, 0.95)' : 'rgba(120, 53, 15, 0.92)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = heating ? '#4ade80' : '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, H - 0.5);
    ctx.lineTo(W, H - 0.5);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 16px system-ui,sans-serif';
    var line1;
    if (heating) {
      line1 = ttOn
        ? 'HEATING — turntable ON averaging hot/cold spots'
        : 'HEATING — turntable OFF: fixed hot/cold spots (uneven cook)';
    } else {
      line1 = 'Raise Power and Water % — magnetron must heat a water-rich load';
    }
    ctx.fillText(line1, 14, H * 0.38);
    ctx.fillStyle = heating ? '#bbf7d0' : '#fde68a';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.fillText(
      'Microwave oven cavity  ·  turn Power, Mode, Turntable On/Off, Water %',
      14, H * 0.72
    );
    ctx.textBaseline = 'alphabetic';
  }

  _drawSchematic(ctx, top, W, H, phase) {
    ctx.save();
    ctx.translate(0, top);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 0, W, H);

    const L = this.state.cavityL;
    const m = this.state.modeIndex;
    const lam = freeSpaceWavelength(magnetronFreq());
    const lamC = cavityWavelength(L, m);
    const heat = heatingPower(this.state.power, 1.0, 0.7, this.state.waterFrac);
    const ang = this.state.turntable > 0.5 ? phase * 0.35 : 0;
    const waterPct = this.state.waterFrac * 100;
    const ttOn = this.state.turntable > 0.5;

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 14px system-ui,sans-serif';
    ctx.fillText('Microwave oven — magnetron → waveguide → cavity standing waves', 16, 18);

    ctx.font = '700 13px system-ui,sans-serif';
    ctx.fillStyle = '#fb923c';
    ctx.fillText('2.45 GHz  λ≈' + (lam * 100).toFixed(1) + ' cm', 16, 40);
    ctx.fillStyle = '#67e8f9';
    ctx.fillText('mode m=' + Math.round(m) + '  λ_c≈' + (lamC * 100).toFixed(1) + ' cm', 230, 40);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('water ' + waterPct.toFixed(0) + '%', 460, 40);
    ctx.fillStyle = '#a3e635';
    ctx.fillText('heat ∝ ' + heat.toFixed(0), 580, 40);

    // Magnetron
    const mx = 42;
    const my = H * 0.52;
    ctx.fillStyle = '#334155';
    ctx.fillRect(mx - 20, my - 26, 40, 52);
    ctx.fillStyle = '#fb923c';
    ctx.beginPath();
    ctx.arc(mx, my, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(mx, my, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fdba74';
    ctx.font = '700 10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('magnetron', mx, my + 40);

    // Waveguide into cavity
    ctx.fillStyle = '#64748b';
    ctx.fillRect(mx + 20, my - 7, 48, 14);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 10px system-ui,sans-serif';
    ctx.fillText('waveguide', mx + 24, my - 12);
    ctx.textAlign = 'left';

    // Oven box
    const cx = W * 0.20;
    const cy = H * 0.20;
    const cw = W * 0.58;
    const ch = H * 0.64;
    ctx.fillStyle = 'rgba(30, 41, 59, 0.5)';
    ctx.fillRect(cx, cy, cw, ch);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.strokeRect(cx, cy, cw, ch);

    // Door mesh hint (right edge of cavity = door)
    const doorX = cx + cw - 14;
    ctx.strokeStyle = 'rgba(148,163,184,0.55)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      const yy = cy + 8 + i * (ch - 16) / 9;
      ctx.beginPath();
      ctx.moveTo(doorX, yy);
      ctx.lineTo(cx + cw - 2, yy);
      ctx.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const xx = doorX + i * 4;
      ctx.beginPath();
      ctx.moveTo(xx, cy + 6);
      ctx.lineTo(xx, cy + ch - 6);
      ctx.stroke();
    }
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 10px system-ui,sans-serif';
    ctx.fillText('door mesh', doorX - 8, cy - 4);

    // Standing-wave shading
    const nx = 16;
    const ny = 12;
    const spots = cavitySpotGrid(nx, ny, m, ang, ttOn);
    const cellW = cw / nx;
    const cellH = ch / ny;
    for (let k = 0; k < spots.length; k++) {
      const s = spots[k];
      const a = 0.08 + 0.55 * s.E2 * (this.state.power / 1200);
      ctx.fillStyle = 'rgba(251,146,60,' + a.toFixed(3) + ')';
      ctx.fillRect(cx + s.i * cellW, cy + s.j * cellH, cellW + 0.5, cellH + 0.5);
    }

    // Hot / cold callouts inside cavity
    ctx.fillStyle = '#fb923c';
    ctx.font = '700 11px system-ui,sans-serif';
    ctx.fillText('hot (antinodes)', cx + 10, cy + 18);
    ctx.fillStyle = '#64748b';
    ctx.fillText('cold (nodes)', cx + 10, cy + 34);

    // Turntable + food
    const tcx = cx + cw / 2;
    const tcy = cy + ch * 0.72;
    const tr = Math.min(cw, ch) * 0.18;
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tcx, tcy, tr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(tcx, tcy, tr * 0.92, 0, Math.PI * 2);
    ctx.fill();
    if (ttOn) {
      ctx.strokeStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(tcx, tcy);
      ctx.lineTo(tcx + Math.cos(ang) * tr, tcy + Math.sin(ang) * tr);
      ctx.stroke();
    }

    const fw = 28 + 20 * this.state.waterFrac;
    const fh = 18 + 10 * this.state.waterFrac;
    ctx.save();
    ctx.translate(tcx, tcy);
    ctx.rotate(ang);
    ctx.fillStyle = 'rgba(74,222,128,' + (0.35 + 0.5 * this.state.waterFrac).toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(0, 0, fw, fh, 0, 0, Math.PI * 2);
    ctx.fill();
    const Efood = standingWaveE(0.5 * L, L, m);
    const glow = heatingPower(this.state.power, 1, Efood, this.state.waterFrac) / 1200;
    ctx.strokeStyle = 'rgba(251,191,36,' + Math.min(1, 0.2 + glow).toFixed(3) + ')';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 12px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('food on turntable', tcx, tcy + tr + 16);
    ctx.fillStyle = ttOn ? '#4ade80' : '#f87171';
    ctx.font = '700 11px system-ui,sans-serif';
    ctx.fillText(
      ttOn ? 'turntable ON — averaging hot/cold spots' : 'turntable OFF — cold spots stay cold',
      tcx, tcy + tr + 32
    );
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('water ' + waterPct.toFixed(0) + '%', tcx, tcy + tr + 48);
    ctx.textAlign = 'left';

    // Side legend
    const lx = cx + cw + 18;
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 11px system-ui,sans-serif';
    ctx.fillText('hot (antinodes)', lx, cy + 20);
    ctx.fillStyle = 'rgba(251,146,60,0.75)';
    ctx.fillRect(lx, cy + 28, 36, 14);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 11px system-ui,sans-serif';
    ctx.fillText('cold (nodes)', lx, cy + 60);
    ctx.fillStyle = 'rgba(251,146,60,0.1)';
    ctx.fillRect(lx, cy + 68, 36, 14);

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText(
      'What to turn: Power, Mode index, Turntable On/Off, Water %. Good: green HEATING + smoother cook with turntable ON.',
      16, H - 8
    );
    ctx.restore();
  }

  _drawCurve(ctx, ox, oy, W, H) {
    const padL = 52;
    const padR = 20;
    const padT = 48;
    const padB = 40;
    const plotX = ox + padL;
    const plotY = oy + padT;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const L = this.state.cavityL;
    const pts = eFieldCurve(L, this.state.modeIndex, 100);

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '700 14px system-ui,sans-serif';
    ctx.fillText('|E| along cavity — peaks = hot, zeros = cold', ox + 16, oy + 22);

    ctx.fillStyle = '#0a1122';
    ctx.fillRect(plotX, plotY, plotW, plotH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(plotX + 0.5, plotY + 0.5, plotW - 1, plotH - 1);

    function X(x) { return plotX + (x / L) * plotW; }
    function Y(e) { return plotY + plotH - e * plotH * 0.9 - plotH * 0.05; }

    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const px = X(pts[i].x);
      const py = Y(pts[i].E);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.lineTo(X(L), plotY + plotH);
    ctx.lineTo(X(0), plotY + plotH);
    ctx.closePath();
    ctx.fillStyle = 'rgba(251,146,60,0.12)';
    ctx.fill();

    // Label a peak and a node if possible
    let maxE = 0;
    let maxI = 0;
    let minI = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      if (pts[i].E > maxE) { maxE = pts[i].E; maxI = i; }
      if (pts[i].E < pts[minI].E) minI = i;
    }
    ctx.fillStyle = '#fb923c';
    ctx.font = '600 10px system-ui,sans-serif';
    ctx.fillText('hot', X(pts[maxI].x) - 8, Y(pts[maxI].E) - 6);
    ctx.fillStyle = '#64748b';
    ctx.fillText('cold', X(pts[minI].x) - 10, Y(0.05) - 4);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('x along cavity (m) →', plotX + plotW / 2, oy + H - 10);
    ctx.textAlign = 'left';
    ctx.save();
    ctx.translate(14, plotY + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('|E| (norm.)', 0, 0);
    ctx.restore();
  }
}
