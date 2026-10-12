// Seebeck effect — classroom thermocouple demo: a hot-water beaker and a
// cold/ice-water beaker, each with one metal-pair junction dipped in it, the
// two dissimilar wires running to an analog galvanometer whose needle
// deflects live with the EMF. A small inset keeps the EMF-vs-ΔT curve.
import { createDualCanvas } from '../common/teachPlots.js';
import { seebeckEMF, findPair, needleAngleRad, METER_FULL_SCALE_MV } from './physics.js';

function tempColor(T) {
  // 253..473 K -> blue..red
  const f = Math.max(0, Math.min(1, (T - 253) / 220));
  const r = Math.round(50 + f * 205);
  const b = Math.round(230 - f * 190);
  return 'rgb(' + r + ',' + Math.round(80 + f * 50) + ',' + b + ')';
}

export class Seebeck2D {
  constructor(host) {
    this.state = { Th: 373, Tc: 293, pairId: 'cuConstantan' };
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) { if (p) Object.assign(this.state, p); }
  setPaused(v) { this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _draw(ctx, W, H, phase) {
    if (!W || !H) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);
    const s = this.state;
    const pair = findPair(s.pairId);
    const emfV = seebeckEMF(pair.S, s.Th, s.Tc);
    const emfMv = emfV * 1000;

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 15px system-ui,sans-serif';
    ctx.fillText('Thermocouple demo — hot bath, ice bath, galvanometer', 16, 26);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(pair.name + '   ·   S = ' + (pair.S * 1e6).toFixed(0) + ' µV/K   ·   V = S·(Th − Tc)', 16, 46);

    const topY = 66;
    const bottomY = H - 18;
    const stageH = bottomY - topY;

    // Layout: hot beaker (left), cold beaker (right), meter centered above,
    // wires arcing from each junction up to the meter terminals.
    const beakerW = Math.min(150, W * 0.22);
    const beakerH = Math.min(190, stageH * 0.62);
    const beakerY = topY + stageH - beakerH - 8;
    const hotX = W * 0.24;
    const coldX = W * 0.76;

    const meterR = Math.min(64, W * 0.09, stageH * 0.24);
    const meterX = W / 2;
    const meterY = topY + meterR + 8;

    this._drawBeaker(ctx, hotX, beakerY, beakerW, beakerH, s.Th, 'hot', phase);
    this._drawBeaker(ctx, coldX, beakerY, beakerW, beakerH, s.Tc, 'cold', phase);

    // Junction points (submerged near mid-liquid height in each beaker).
    const hotJx = hotX, hotJy = beakerY + beakerH * 0.42;
    const coldJx = coldX, coldJy = beakerY + beakerH * 0.42;
    const meterLx = meterX - meterR * 0.85, meterLy = meterY + meterR * 0.25;
    const meterRx = meterX + meterR * 0.85, meterRy = meterY + meterR * 0.25;

    // --- Wires: metal A (copper, orange) from hot junction to meter's left
    // terminal; metal B (constantan, silver) from meter's right terminal to
    // cold junction. Gentle arcs so they read as wires, not straight rods.
    this._drawWire(ctx, hotJx, hotJy, meterLx, meterLy, '#f59e0b', 4.5, -0.35);
    this._drawWire(ctx, meterRx, meterRy, coldJx, coldJy, '#cbd5e1', 4.5, -0.35);
    // Short jumper closing the loop conceptually is the meter itself.

    ctx.fillStyle = '#f59e0b';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('metal A (Cu)', (hotJx + meterLx) / 2, Math.min(hotJy, meterLy) - 44);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('metal B (constantan)', (coldJx + meterRx) / 2, Math.min(coldJy, meterRy) - 44);
    ctx.textAlign = 'left';

    // Junction blobs colored by local temperature, with small leader labels.
    this._drawJunction(ctx, hotJx, hotJy, s.Th, 'hot junction');
    this._drawJunction(ctx, coldJx, coldJy, s.Tc, 'cold junction');

    // Drifting charge carriers along both wire runs.
    const speed = Math.max(0.15, Math.min(2.6, Math.abs(emfMv) / 3));
    const dir = emfV >= 0 ? 1 : -1;
    ctx.fillStyle = 'rgba(250, 204, 21, 0.9)';
    for (let i = 0; i < 6; i++) {
      const frac = ((phase * speed * 0.09 * dir) + i / 6) % 1;
      const t = (frac + 1) % 1;
      const p1 = this._wirePoint(hotJx, hotJy, meterLx, meterLy, -0.35, t);
      ctx.beginPath(); ctx.arc(p1.x, p1.y, 3, 0, Math.PI * 2); ctx.fill();
      const p2 = this._wirePoint(meterRx, meterRy, coldJx, coldJy, -0.35, t);
      ctx.beginPath(); ctx.arc(p2.x, p2.y, 3, 0, Math.PI * 2); ctx.fill();
    }

    // --- Analog galvanometer / voltmeter dial with a rotating needle ---
    this._drawMeter(ctx, meterX, meterY, meterR, emfMv);

    // --- Inset: EMF vs ΔT curve (secondary panel, small corner card) ---
    this._drawInset(ctx, W, H, pair, s, emfMv);
  }

  _drawBeaker(ctx, cx, topY, w, h, T, kind, phase) {
    const x0 = cx - w / 2, x1 = cx + w / 2;
    const rimY = topY;
    const baseY = topY + h;
    const liquidTop = topY + h * 0.22;

    // Glass outline (open-top trapezoid-ish beaker).
    const neckIn = w * 0.04;
    ctx.strokeStyle = 'rgba(203,213,225,0.55)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x0, rimY);
    ctx.lineTo(x0 + neckIn * 0.3, baseY - 6);
    ctx.quadraticCurveTo(x0 + neckIn, baseY, x0 + neckIn + 8, baseY);
    ctx.lineTo(x1 - neckIn - 8, baseY);
    ctx.quadraticCurveTo(x1 - neckIn, baseY, x1 - neckIn * 0.3, baseY - 6);
    ctx.lineTo(x1, rimY);
    ctx.stroke();

    // Liquid fill.
    const hot = kind === 'hot';
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x0 + 2, liquidTop);
    ctx.lineTo(x0 + neckIn * 0.3, baseY - 6);
    ctx.quadraticCurveTo(x0 + neckIn, baseY - 2, x0 + neckIn + 8, baseY - 2);
    ctx.lineTo(x1 - neckIn - 8, baseY - 2);
    ctx.quadraticCurveTo(x1 - neckIn, baseY - 2, x1 - neckIn * 0.3, baseY - 6);
    ctx.lineTo(x1 - 2, liquidTop);
    ctx.closePath();
    ctx.clip();
    const grad = ctx.createLinearGradient(0, liquidTop, 0, baseY);
    if (hot) {
      grad.addColorStop(0, 'rgba(251,146,60,0.42)');
      grad.addColorStop(1, 'rgba(190,45,20,0.5)');
    } else {
      grad.addColorStop(0, 'rgba(125,211,252,0.4)');
      grad.addColorStop(1, 'rgba(30,64,150,0.5)');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(x0, liquidTop, w, baseY - liquidTop);

    if (hot) {
      // Rising bubble / heat-shimmer particles.
      ctx.fillStyle = 'rgba(255,214,140,0.75)';
      for (let i = 0; i < 7; i++) {
        const seed = i * 0.71;
        const t = ((phase * 0.35 + seed) % 1);
        const bx = x0 + w * (0.2 + 0.6 * ((seed * 1.9) % 1));
        const by = baseY - 4 - t * (baseY - liquidTop - 6);
        const r = 1.6 + 2 * (1 - t);
        ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      // Ice cubes floating near the surface.
      ctx.fillStyle = 'rgba(224,242,254,0.85)';
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 1;
      const cubes = [[-0.22, 0], [0.12, 6], [0.32, -3]];
      for (let i = 0; i < cubes.length; i++) {
        const [fx, dy] = cubes[i];
        const s2 = 13;
        const bx = cx + w * fx - s2 / 2;
        const by = liquidTop + dy - s2 * 0.35;
        ctx.fillRect(bx, by, s2, s2);
        ctx.strokeRect(bx, by, s2, s2);
      }
    }
    ctx.restore();

    // Meniscus line + temperature readout.
    ctx.strokeStyle = hot ? 'rgba(253,186,116,0.9)' : 'rgba(186,230,253,0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x0 + 2, liquidTop); ctx.lineTo(x1 - 2, liquidTop); ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(hot ? 'hot bath' : 'ice bath', cx, rimY - 10);
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.fillStyle = tempColor(T);
    ctx.fillText((T - 273).toFixed(0) + ' °C', cx, baseY + 18);
    ctx.textAlign = 'left';
  }

  _wirePoint(x0, y0, x1, y1, bow, t) {
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + bow * Math.abs(x1 - x0) * 0.28;
    // Quadratic bezier point.
    const u = 1 - t;
    const x = u * u * x0 + 2 * u * t * mx + t * t * x1;
    const y = u * u * y0 + 2 * u * t * my + t * t * y1;
    return { x, y };
  }

  _drawWire(ctx, x0, y0, x1, y1, color, width, bow) {
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + bow * Math.abs(x1 - x0) * 0.28;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(mx, my, x1, y1);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  _drawJunction(ctx, x, y, T, label) {
    ctx.fillStyle = tempColor(T);
    ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + 26);
    ctx.textAlign = 'left';
  }

  _drawMeter(ctx, cx, cy, r, emfMv) {
    // Dial housing.
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.arc(cx, cy, r + 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r + 10, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

    // Tick marks across the scale (+/- full scale).
    const full = 24; // METER_FULL_SCALE_MV kept in sync via import below
    ctx.strokeStyle = '#334155';
    ctx.fillStyle = '#334155';
    ctx.font = '9px system-ui,sans-serif';
    ctx.textAlign = 'center';
    for (let i = -4; i <= 4; i++) {
      const frac = i / 4;
      const ang = -Math.PI / 2 + frac * (58 * Math.PI / 180);
      const x0 = cx + Math.sin(ang) * (r - 8);
      const y0 = cy - Math.cos(ang) * (r - 8);
      const x1 = cx + Math.sin(ang) * (r - 1);
      const y1 = cy - Math.cos(ang) * (r - 1);
      ctx.lineWidth = i === 0 ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
    ctx.fillStyle = '#64748b';
    ctx.fillText('−', cx - r * 0.72, cy + r * 0.5);
    ctx.fillText('+', cx + r * 0.72, cy + r * 0.5);
    ctx.fillText('0', cx, cy - r * 0.7);

    // Needle.
    const angle = needleAngleRad(emfMv, METER_FULL_SCALE_MV, 58);
    const nx = cx + Math.sin(angle) * (r - 10);
    const ny = cy - Math.cos(angle) * (r - 10);
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();

    // Readout below the dial.
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('galvanometer', cx, cy + r + 24);
    ctx.fillStyle = '#4ade80';
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.fillText(emfMv.toFixed(3) + ' mV', cx, cy + r + 41);
    ctx.textAlign = 'left';
  }

  _drawInset(ctx, W, H, pair, s, emfMv) {
    const w = Math.min(190, W * 0.26);
    const h = Math.min(120, H * 0.24);
    const x = W - w - 14;
    const y = 62;
    ctx.fillStyle = 'rgba(6,10,20,0.88)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

    const padL = x + 30, padR = x + w - 8, cTop = y + 18, cBot = y + h - 16;
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 10px system-ui,sans-serif';
    ctx.fillText('EMF vs ΔT', x + 8, y + 12);

    const dTmax = 220;
    const cW = padR - padL, cH = cBot - cTop;
    function X(dt) { return padL + (dt / dTmax) * cW; }
    const emfAtMax = pair.S * dTmax * 1000;
    function Y(mv) { return cBot - (mv / (emfAtMax * 1.08)) * cH; }

    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const dt = (i / 60) * dTmax;
      const mv = pair.S * dt * 1000;
      const px = X(dt), py = Y(mv);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    const dT = s.Th - s.Tc;
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(X(Math.max(0, Math.min(dTmax, dT))), Y(Math.max(0, emfMv)), 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, cTop); ctx.lineTo(padL, cBot); ctx.lineTo(padR, cBot); ctx.stroke();
    ctx.fillStyle = '#64748b'; ctx.font = '9px system-ui,sans-serif';
    ctx.fillText('ΔT (K) →', padL + cW / 2 - 16, cBot + 12);
  }
}
