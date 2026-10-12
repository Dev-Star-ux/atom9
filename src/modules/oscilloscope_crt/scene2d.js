// CRT oscilloscope — 2D view: a labeled gun→plates→screen schematic strip
// above a real CRT-style phosphor screen (bezel, graticule, curvature
// vignette) whose trace decays like real phosphor persistence instead of
// being a static full-length curve.
import { createDualCanvas } from '../common/teachPlots.js';
import { PhosphorTrail } from './physics.js';

export class Crt2D {
  constructor(host) {
    this.state = { view: 'sweep', vAmp: 3, vFreq: 2, sweepHz: 1, fx: 2, fy: 3, phaseDeg: 0 };
    this._trail = new PhosphorTrail();
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) {
    if (!p) return;
    const viewChanged = p.view != null && p.view !== this.state.view;
    const waveChanged = p.wave != null && p.wave !== this.state.wave;
    Object.assign(this.state, p);
    if (viewChanged || waveChanged) this._trail.reset();
  }
  setPaused(v) { this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _draw(ctx, W, H, phase) {
    if (!W || !H) return;
    const s = this.state;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 15px system-ui,sans-serif';
    ctx.fillText(s.view === 'sweep' ? 'CRT oscilloscope — time-base sweep' : 'CRT oscilloscope — X-Y (Lissajous) mode', 16, 20);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(
      s.view === 'sweep'
        ? 'Horizontal plates: sawtooth time-base. Vertical plates: input signal Vy(t).'
        : 'Both plate pairs driven by AC — the beam traces the phase relationship between fx and fy.',
      16, 38
    );

    const { spot, persist } = this._trail.advance(s, phase);

    const schematicTop = 48;
    const schematicH = Math.max(56, Math.min(108, H * 0.2));
    this._drawSchematic(ctx, 16, schematicTop, W - 32, schematicH, s, spot, phase);

    const screenTop = schematicTop + schematicH + 12;
    const screenBottom = H - 24;
    if (screenBottom > screenTop + 40) {
      this._drawScreen(ctx, 16, screenTop, W - 32, screenBottom - screenTop, phase, persist);
    }

    ctx.fillStyle = '#64748b'; ctx.font = '10px system-ui,sans-serif';
    ctx.fillText(
      s.view === 'sweep'
        ? 'time base: ' + s.sweepHz.toFixed(1) + ' Hz  ·  ' + (s.wave || 'sine') + '  ·  Vy: ' + s.vAmp.toFixed(1) + ' V @ ' + s.vFreq.toFixed(1) + ' Hz'
        : (s.wave || 'sine') + '  ·  fx=' + s.fx.toFixed(1) + ' Hz, fy=' + s.fy.toFixed(1) + ' Hz, phase=' + s.phaseDeg.toFixed(0) + '°  ·  ratio ' + (s.fy / s.fx).toFixed(2),
      16, H - 8
    );
  }

  // Small labeled side-view: electron gun → deflection plates → screen, so
  // learners connect the glowing trace below to the physical mechanism.
  _drawSchematic(ctx, x, y, w, h, s, spot, phase) {
    ctx.save();
    this._roundRectPath(ctx, x, y, w, h, 8);
    ctx.fillStyle = 'rgba(15,23,42,0.55)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(100,116,139,0.35)'; ctx.lineWidth = 1;
    ctx.stroke();

    const axisY = y + h * 0.5;
    const x0 = x + w * 0.03, x1 = x + w * 0.97;
    ctx.strokeStyle = 'rgba(148,163,184,0.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x0, axisY); ctx.lineTo(x1, axisY); ctx.stroke();

    const X = (frac) => x + w * frac;

    // Cathode (heated filament) — small glowing element
    const catX = X(0.06);
    const cg = ctx.createRadialGradient(catX, axisY, 0, catX, axisY, 11);
    cg.addColorStop(0, '#fde68a'); cg.addColorStop(1, 'rgba(253,230,138,0)');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(catX, axisY, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath(); ctx.arc(catX, axisY, 4, 0, Math.PI * 2); ctx.fill();

    // Grid — dashed vertical line (controls beam current)
    const gridX = X(0.17);
    ctx.strokeStyle = '#94a3b8'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(gridX, axisY - h * 0.2); ctx.lineTo(gridX, axisY + h * 0.2); ctx.stroke();
    ctx.setLineDash([]);

    // Anode — accelerating ring
    const anodeX = X(0.28);
    ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(anodeX, axisY, 5, h * 0.16, 0, 0, Math.PI * 2); ctx.stroke();

    // Y plates (vertical deflection) — horizontal bars top & bottom
    const yp0 = X(0.42), yp1 = X(0.56);
    ctx.fillStyle = '#f472b6';
    ctx.fillRect(yp0, axisY - h * 0.24, yp1 - yp0, 3);
    ctx.fillRect(yp0, axisY + h * 0.24 - 3, yp1 - yp0, 3);

    // X plates (horizontal deflection) — vertical bars, closer together
    const xp0 = X(0.64), xp1 = X(0.78);
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(xp0, axisY - h * 0.2, 3, h * 0.4);
    ctx.fillRect(xp1 - 3, axisY - h * 0.2, 3, h * 0.4);

    // Screen — thin glowing bar
    const scrX = X(0.93);
    ctx.fillStyle = '#134e2f';
    ctx.fillRect(scrX - 3, axisY - h * 0.26, 6, h * 0.52);

    // A traveling glow that laps the axis left→right, standing in for the
    // beam itself (not just the resulting trace), nudged vertically near
    // the plates to hint at the current deflection.
    const travel = (phase * 0.55) % 1;
    const bx = x0 + (x1 - x0) * travel;
    const bendZone = travel > 0.4 ? 1 : travel / 0.4;
    const by = axisY + (spot ? spot.y : 0) * h * 0.15 * bendZone;
    ctx.fillStyle = '#eafff2';
    ctx.shadowColor = '#4ade80'; ctx.shadowBlur = 9;
    ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#94a3b8'; ctx.font = '9px system-ui,sans-serif'; ctx.textAlign = 'center';
    const labelY = axisY + h * 0.32 + 10;
    ctx.fillText('cathode', catX, labelY);
    ctx.fillText('grid', gridX, labelY);
    ctx.fillText('anode', anodeX, labelY);
    ctx.fillText('Y plates', (yp0 + yp1) / 2, labelY);
    ctx.fillText('X plates', (xp0 + xp1) / 2, labelY);
    ctx.fillText('screen', scrX, labelY);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  // The real phosphor screen: beveled bezel, dark inset face, graticule,
  // curvature vignette, and a decaying (persistence) trace.
  _drawScreen(ctx, x, y, w, h, phase, persist) {
    ctx.save();
    this._roundRectPath(ctx, x, y, w, h, 16);
    ctx.fillStyle = '#151b28';
    ctx.fill();
    const bezelGrad = ctx.createLinearGradient(x, y, x, y + h);
    bezelGrad.addColorStop(0, 'rgba(255,255,255,0.06)');
    bezelGrad.addColorStop(0.15, 'rgba(255,255,255,0)');
    bezelGrad.addColorStop(1, 'rgba(0,0,0,0.25)');
    this._roundRectPath(ctx, x, y, w, h, 16);
    ctx.fillStyle = bezelGrad; ctx.fill();
    ctx.strokeStyle = '#2a3346'; ctx.lineWidth = 2; ctx.stroke();

    const inset = 11;
    const sx = x + inset, sy = y + inset, sw = w - inset * 2, sh = h - inset * 2;
    this._roundRectPath(ctx, sx, sy, sw, sh, 9);
    ctx.fillStyle = '#03120a';
    ctx.fill();
    ctx.strokeStyle = '#134e2f'; ctx.lineWidth = 1.5; ctx.stroke();

    ctx.save();
    this._roundRectPath(ctx, sx, sy, sw, sh, 9);
    ctx.clip();

    ctx.strokeStyle = 'rgba(74,222,128,0.14)'; ctx.lineWidth = 1;
    for (let i = 1; i < 10; i++) {
      const gx = sx + (i / 10) * sw;
      ctx.beginPath(); ctx.moveTo(gx, sy); ctx.lineTo(gx, sy + sh); ctx.stroke();
    }
    for (let i = 1; i < 8; i++) {
      const gy = sy + (i / 8) * sh;
      ctx.beginPath(); ctx.moveTo(sx, gy); ctx.lineTo(sx + sw, gy); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(74,222,128,0.28)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(sx + sw / 2, sy); ctx.lineTo(sx + sw / 2, sy + sh); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx, sy + sh / 2); ctx.lineTo(sx + sw, sy + sh / 2); ctx.stroke();

    const cx = sx + sw / 2, cy = sy + sh / 2;
    const rx = (sw / 2) * 0.94, ry = (sh / 2) * 0.9;
    const pts = this._trail.points;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const age = phase - p.t;
      const alpha = Math.max(0, 1 - age / persist);
      if (alpha <= 0.02) continue;
      const px = cx + p.x * rx;
      const py = cy - p.y * ry;
      ctx.fillStyle = 'rgba(74,222,128,' + (alpha * 0.85).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(px, py, 1.4 + alpha * 0.8, 0, Math.PI * 2); ctx.fill();
    }
    if (pts.length) {
      const head = pts[pts.length - 1];
      const hx = cx + head.x * rx, hy = cy - head.y * ry;
      ctx.fillStyle = '#eafff2';
      ctx.shadowColor = '#4ade80'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(hx, hy, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.globalCompositeOperation = 'source-over';

    // Screen-curvature vignette
    const vg = ctx.createRadialGradient(cx, cy, Math.min(sw, sh) * 0.22, cx, cy, Math.max(sw, sh) * 0.62);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = vg;
    ctx.fillRect(sx, sy, sw, sh);

    ctx.restore(); // clip
    ctx.restore(); // outer save
  }

  _roundRectPath(ctx, x, y, w, h, r) {
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); return; }
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
}
