/** Eddy currents — aluminum plate through magnet gap (eddy-current brake). */
import { createDualCanvas } from '../common/teachPlots.js';
import { brakeForce, forceVsSpeed, eddyPower } from './physics.js';

var BRAKE_THRESHOLD = 0.8;

export class EddyCurrentsScene2D {
  constructor(host) {
    this.state = { B: 0.5, thickness: 2, sigma: 1, speed: 1 };
    this._plateX = 0.35;
    var self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.B != null) this.state.B = p.B;
    if (p.thickness != null) this.state.thickness = p.thickness;
    if (p.sigma != null) this.state.sigma = p.sigma;
    if (p.speed != null) this.state.speed = p.speed;
  }

  setPaused(v) { this._canvas.setPaused(v); }
  setActive(v) { this._active = !!v; }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _draw(ctx, W, H, phase) {
    if (!W || !H) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);

    var captionH = Math.min(68, Math.floor(H * 0.18));
    this._drawCaption(ctx, W, captionH);

    var schemH = Math.floor((H - captionH) * 0.62);
    this._drawSchematic(ctx, captionH, W, schemH, phase);
    this._drawCurve(ctx, 0, captionH + schemH + 4, W, H - captionH - schemH - 4);
  }

  _drawCaption(ctx, W, H) {
    ctx.fillStyle = 'rgba(20, 35, 45, 0.92)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(56,189,248,0.55)';
    ctx.beginPath();
    ctx.moveTo(0, H - 0.5);
    ctx.lineTo(W, H - 0.5);
    ctx.stroke();

    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#38bdf8';
    ctx.font = '700 15px system-ui,sans-serif';
    var line1 = 'LAB: Aluminum plate through a magnet gap (eddy-current brake)';
    var line2 = 'Why: moving metal in B makes eddy loops → heat + braking force opposite to motion.';
    var line3 = 'Try: raise speed (m/s), B, thickness, or σ — watch F_brake and the green banner.';
    if (H >= 58) {
      ctx.fillText(line1, 14, H * 0.22);
      ctx.font = '600 12px system-ui,sans-serif';
      ctx.fillStyle = '#7dd3fc';
      ctx.fillText(line2, 14, H * 0.52);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(line3, 14, H * 0.78);
    } else {
      ctx.fillText(line1, 14, H / 2);
    }
    ctx.textBaseline = 'alphabetic';
  }

  _drawSuccessBanner(ctx, W, y, text) {
    var bw = Math.min(280, W - 24);
    var bx = W - bw - 12;
    ctx.fillStyle = 'rgba(16, 185, 129, 0.92)';
    ctx.fillRect(bx, y, bw, 26);
    ctx.strokeStyle = '#6ee7b7';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx + 0.5, y + 0.5, bw - 1, 25);
    ctx.fillStyle = '#ecfdf5';
    ctx.font = '700 12px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + bw / 2, y + 13);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  _drawSchematic(ctx, top, W, H, phase) {
    ctx.save();
    ctx.translate(0, top);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
    ctx.beginPath();
    ctx.moveTo(0, H - 0.5);
    ctx.lineTo(W, H - 0.5);
    ctx.stroke();

    var B = this.state.B;
    var thickness = this.state.thickness;
    var sigma = this.state.sigma;
    var speed = this.state.speed;
    var F = brakeForce(B, speed, thickness, sigma);
    var P = eddyPower(B, speed, thickness, sigma);
    var braking = F > BRAKE_THRESHOLD;

    this._plateX += speed * 0.003;
    if (this._plateX > 0.85) this._plateX = 0.15;
    if (this._plateX < 0.15) this._plateX = 0.15;

    // Live readouts
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.fillText('v = ' + speed.toFixed(2) + ' m/s', 16, 20);
    ctx.fillStyle = '#f87171';
    ctx.fillText('F_brake = ' + F.toFixed(2) + ' (arb)', 150, 20);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('P = ' + P.toFixed(2) + ' (arb)', 340, 20);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText(
      'B = ' + B.toFixed(2) + ' T · t = ' + thickness.toFixed(1) +
      ' mm · σ = ' + sigma.toFixed(1),
      16, 38
    );

    if (braking) {
      this._drawSuccessBanner(ctx, W, 8, 'INDUCTIVE BRAKING');
    } else {
      ctx.fillStyle = 'rgba(71, 85, 105, 0.85)';
      ctx.fillRect(W - 220, 8, 208, 26);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 11px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Raise v / B / t / σ to brake', W - 116, 25);
      ctx.textAlign = 'left';
    }

    var cy = H * 0.58;
    var gapL = W * 0.30;
    var gapR = W * 0.70;
    var midX = (gapL + gapR) / 2;
    var poleH = 28;
    var yokeT = 22;

    // Horseshoe / C-magnet yoke
    ctx.fillStyle = '#475569';
    // Left upright
    ctx.fillRect(gapL - 36, cy - 70, yokeT, 140);
    // Right upright
    ctx.fillRect(gapR + 14, cy - 70, yokeT, 140);
    // Bottom bridge
    ctx.fillRect(gapL - 36, cy + 70 - yokeT, gapR - gapL + 72, yokeT);
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('C-magnet yoke', gapL - 30, cy + 88);

    // N pole (top face into gap)
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(gapL, cy - 55, gapR - gapL, poleH);
    ctx.fillStyle = '#fecaca';
    ctx.font = '700 16px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', midX, cy - 35);
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillStyle = '#fca5a5';
    ctx.fillText('N pole', midX, cy - 58);

    // S pole (bottom)
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(gapL, cy + 27, gapR - gapL, poleH);
    ctx.fillStyle = '#bfdbfe';
    ctx.font = '700 16px system-ui,sans-serif';
    ctx.fillText('S', midX, cy + 48);
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillStyle = '#93c5fd';
    ctx.fillText('S pole', midX, cy + 70);

    // B arrow in gap
    ctx.strokeStyle = '#a78bfa';
    ctx.fillStyle = '#a78bfa';
    ctx.lineWidth = 2;
    var bx = gapR + 48;
    ctx.beginPath();
    ctx.moveTo(bx, cy - 22);
    ctx.lineTo(bx, cy + 22);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx, cy + 22);
    ctx.lineTo(bx - 5, cy + 14);
    ctx.lineTo(bx + 5, cy + 14);
    ctx.closePath();
    ctx.fill();
    ctx.font = '11px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('B', bx + 10, cy + 4);

    // Aluminum plate
    var px = W * this._plateX;
    var pThick = 10 + thickness * 2;
    var heat = Math.min(1, P / 8);
    ctx.fillStyle = 'rgba(251,146,60,' + (0.12 + 0.5 * heat).toFixed(3) + ')';
    ctx.fillRect(px - pThick / 2 - 8, cy - 52, pThick + 16, 104);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(px - pThick / 2, cy - 48, pThick, 96);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px - pThick / 2, cy - 48, pThick, 96);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('aluminum plate', px, cy - 56);

    // Eddy loops labeled
    var nLoops = 3;
    var i;
    for (i = 0; i < nLoops; i++) {
      var ry = 16 + i * 10;
      var rx = 12 + i * 3;
      var spin = phase * (1.5 + speed) + i;
      ctx.strokeStyle = 'rgba(251,191,36,' + (0.55 + 0.15 * i).toFixed(3) + ')';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(px, cy - 8 + i * 7, rx, ry * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
      var ax = px + Math.cos(spin) * rx;
      var ay = cy - 8 + i * 7 + Math.sin(spin) * ry * 0.45;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(ax, ay, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fbbf24';
    ctx.font = '700 10px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('eddy current', px + pThick / 2 + 8, cy - 8);

    // Velocity arrow with speed
    ctx.strokeStyle = '#67e8f9';
    ctx.fillStyle = '#67e8f9';
    ctx.lineWidth = 2.5;
    var vx0 = px + pThick / 2 + 10;
    var vx1 = vx0 + 36 + speed * 8;
    ctx.beginPath();
    ctx.moveTo(vx0, cy - 68);
    ctx.lineTo(vx1, cy - 68);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(vx1, cy - 68);
    ctx.lineTo(vx1 - 8, cy - 73);
    ctx.lineTo(vx1 - 8, cy - 63);
    ctx.closePath();
    ctx.fill();
    ctx.font = '700 11px system-ui,sans-serif';
    ctx.fillText('v = ' + speed.toFixed(2) + ' m/s', vx1 + 6, cy - 64);

    // F_brake opposite to v
    if (speed > 0.05) {
      ctx.strokeStyle = '#f87171';
      ctx.fillStyle = '#f87171';
      var flen = 20 + Math.min(50, F * 8);
      var fx1 = px - pThick / 2 - 10;
      var fx0 = fx1 - flen;
      ctx.beginPath();
      ctx.moveTo(fx1, cy + 58);
      ctx.lineTo(fx0, cy + 58);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(fx0, cy + 58);
      ctx.lineTo(fx0 + 8, cy + 53);
      ctx.lineTo(fx0 + 8, cy + 63);
      ctx.closePath();
      ctx.fill();
      ctx.font = '700 11px system-ui,sans-serif';
      ctx.fillText('F_brake', fx0 - 2, cy + 74);
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('Same idea as roller-coaster / train eddy brakes: metal through magnets slows the motion.', 16, H - 8);
    ctx.restore();
  }

  _drawCurve(ctx, ox, oy, W, H) {
    var padL = 52;
    var padR = 20;
    var padT = 48;
    var padB = 40;
    var plotX = ox + padL;
    var plotY = oy + padT;
    var plotW = W - padL - padR;
    var plotH = H - padT - padB;

    var B = this.state.B;
    var thickness = this.state.thickness;
    var sigma = this.state.sigma;
    var speed = this.state.speed;
    var vMax = 5;
    var pts = forceVsSpeed(B, thickness, sigma, vMax, 80);
    var Fnow = brakeForce(B, speed, thickness, sigma);

    var yMax = 0.01;
    var i;
    for (i = 0; i < pts.length; i++) {
      if (pts[i].F > yMax) yMax = pts[i].F;
    }
    yMax = Math.max(yMax * 1.15, Fnow * 1.2, 0.1);

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.fillText('Braking force vs plate speed', ox + 16, oy + 20);

    ctx.fillStyle = '#0a1122';
    ctx.fillRect(plotX, plotY, plotW, plotH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(plotX + 0.5, plotY + 0.5, plotW - 1, plotH - 1);

    function X(v) { return plotX + (v / vMax) * plotW; }
    function Y(f) { return plotY + plotH - Math.max(0, Math.min(1, f / yMax)) * plotH; }

    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (i = 0; i < pts.length; i++) {
      var px = X(pts[i].v);
      var py = Y(pts[i].F);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(X(speed), Y(Fnow), 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('speed v (m/s) →', plotX + plotW / 2, oy + H - 10);
    ctx.textAlign = 'left';
    ctx.save();
    ctx.translate(14, plotY + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('F_brake (arb)', 0, 0);
    ctx.restore();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(
      'F = ' + Fnow.toFixed(2) + ' at v = ' + speed.toFixed(2) + ' m/s  ·  model ∝ σ B² v t²',
      plotX, oy + 38
    );
  }
}
