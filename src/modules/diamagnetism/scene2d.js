// Diamagnetism 2D teaching canvas — three switchable views:
//  - 'levitate': the sample's height above the magnet is a genuine
//    force-balance simulation (magnetic repulsion/attraction vs weight),
//    so a diamagnetic sample settles into a stable floating equilibrium
//    while a paramagnetic one is pulled down onto the magnet.
//  - 'bars': susceptibility comparison across common materials.
//  - 'balance': a Curie-balance-style schematic reading off the force.
import { createDualCanvas } from '../common/teachPlots.js';
import {
  findMaterial,
  forcePerVolume,
  localForcePerVolume,
  decayLength,
  SAMPLE_WEIGHT,
  MATERIALS,
} from './physics.js';

const WORLD_H_M = 0.09; // visible height above the pole face, in metres
const M_EFF = 6000;
const DAMPING = 0.985;

export class Diamagnetism2D {
  constructor(host) {
    this.state = { materialId: 'bismuth', B: 1.0, dBdz: 20, view: 'levitate' };
    this._z = 0.02;
    this._v = 0;
    this._lastPhase = null;
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) { self._step(phase); self._draw(ctx, w, h, phase); });
  }

  setParams(p) { if (p) Object.assign(this.state, p); }
  setPaused(v) { this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _step(phase) {
    if (this._lastPhase == null) this._lastPhase = phase;
    let dt = phase - this._lastPhase;
    this._lastPhase = phase;
    if (!(dt > 0) || dt > 0.2) dt = 0.016;

    const s = this.state;
    const m = findMaterial(s.materialId);
    const F = localForcePerVolume(m.chi, s.B, s.dBdz, this._z);
    const a = (F - SAMPLE_WEIGHT) / M_EFF;
    this._v = (this._v + a * dt) * DAMPING;
    this._z += this._v * dt;
    const zMax = WORLD_H_M * 1.05;
    if (this._z <= 0) { this._z = 0; this._v = Math.min(this._v, 0) * 0.2; }
    if (this._z >= zMax) { this._z = zMax; this._v = Math.min(this._v, 0); }
  }

  _draw(ctx, W, H, phase) {
    if (!W || !H) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);
    const s = this.state;
    const m = findMaterial(s.materialId);

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 15px system-ui,sans-serif';
    ctx.fillText('Diamagnetism — force balance sets a stable floating height', 16, 26);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText('F/V = (χ/μ₀)·B·(dB/dz)   ·   χ < 0 repels toward weaker field, χ > 0 is pulled toward stronger field', 16, 46);

    if (s.view === 'bars') this._drawBars(ctx, W, H, m);
    else if (s.view === 'balance') this._drawBalance(ctx, W, H, m, phase);
    else this._drawLevitate(ctx, W, H, m, phase);
  }

  _drawLevitate(ctx, W, H, m, phase) {
    const padSide = 30;
    const sceneTop = 62;
    const magnetH = 34;
    const magnetY = H - 56; // top surface of the magnet block
    const cx = W / 2;
    const magnetW = Math.min(220, W - padSide * 2);

    const pxPerM = (magnetY - sceneTop - 10) / WORLD_H_M;

    // Field lines arcing from the pole face
    const decay = decayLength(this.state.B, this.state.dBdz);
    const lineTopPx = Math.max(sceneTop + 10, magnetY - decay * pxPerM * 3.2);
    ctx.strokeStyle = 'rgba(148,163,184,0.32)';
    for (let i = -3; i <= 3; i++) {
      const x = cx + i * (magnetW / 8);
      ctx.beginPath();
      ctx.moveTo(x, magnetY);
      ctx.quadraticCurveTo(x + i * 9, (magnetY + lineTopPx) / 2, x, lineTopPx);
      ctx.stroke();
    }

    // Magnet block — alternating-polarity checkerboard hint (as in the real
    // pyrolytic-graphite demo, small NdFeB cubes glued N-up / S-up).
    const nSeg = 4;
    const segW = magnetW / nSeg;
    for (let i = 0; i < nSeg; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#7f1d1d' : '#1e3a8a';
      ctx.fillRect(cx - magnetW / 2 + i * segW, magnetY, segW, magnetH);
      ctx.fillStyle = '#eaf0fb';
      ctx.font = '700 12px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(i % 2 === 0 ? 'N' : 'S', cx - magnetW / 2 + i * segW + segW / 2, magnetY + magnetH / 2 + 4);
    }
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(cx - magnetW / 2 + 0.5, magnetY + 0.5, magnetW - 1, magnetH - 1);
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('checkerboard magnet (alternating poles)', cx, magnetY + magnetH + 14);
    ctx.textAlign = 'left';

    // Sample: physically-integrated height
    let z = this._z;
    const settled = Math.abs(this._v) < 0.02 && z > 0.004;
    const bob = settled ? Math.sin(phase * 2.2) * 0.0009 : 0;
    const zDraw = Math.max(0, z + bob);
    const sampleR = 15;
    // Offset so the sample's underside rests exactly on the pole face at
    // z=0, instead of its center sinking half into the magnet block.
    const sy = magnetY - zDraw * pxPerM - sampleR * 0.42;

    ctx.fillStyle = m.type === 'diamagnetic' ? '#94a3b8' : '#fbbf24';
    ctx.beginPath();
    ctx.ellipse(cx, sy, sampleR, sampleR * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(m.name, cx, sy - sampleR - 10);
    ctx.textAlign = 'left';

    // Induced-moment arrow: opposes B for diamagnetic, aligns for paramagnetic
    const arrowLen = 20;
    ctx.strokeStyle = m.type === 'diamagnetic' ? '#38bdf8' : '#f97316';
    ctx.lineWidth = 2.5;
    const dir = m.type === 'diamagnetic' ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(cx, sy - dir * arrowLen / 2);
    ctx.lineTo(cx, sy + dir * arrowLen / 2);
    ctx.stroke();

    // Weight arrow (always down) and net magnetic force arrow, side by side.
    // Both the arrow tips and their text labels are clamped to stay above
    // the magnet's top edge so they never overlap the N/S pole labels.
    const magnetTopLimit = magnetY - 4;
    const Fnow = localForcePerVolume(m.chi, this.state.B, this.state.dBdz, z);
    const fLen = Math.min(46, (Math.abs(Fnow) / SAMPLE_WEIGHT) * 22 + 6);
    const fUp = Fnow > 0;
    const fTipY = Math.min(sy - (fUp ? 1 : -1) * fLen, magnetTopLimit);
    ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx + 34, sy);
    ctx.lineTo(cx + 34, fTipY);
    ctx.stroke();
    this._arrowHead(ctx, cx + 34, fTipY, fUp ? -1 : 1, '#4ade80');

    const wTipY = Math.min(sy + 22, magnetTopLimit);
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 34, sy);
    ctx.lineTo(cx - 34, wTipY);
    ctx.stroke();
    this._arrowHead(ctx, cx - 34, wTipY, 1, '#94a3b8');
    ctx.fillStyle = '#64748b'; ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('W', cx - 34 - 12, Math.min(sy + 14, magnetTopLimit));
    ctx.fillStyle = '#4ade80';
    ctx.fillText('F', cx + 34 + 8, Math.min(sy - (fUp ? 1 : -1) * fLen * 0.5, magnetTopLimit));

    // Status readout
    const gapMm = z * 1000;
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 12px system-ui,sans-serif';
    let status;
    if (m.type === 'diamagnetic' && z > 0.003) {
      status = 'Floating: magnetic repulsion balances weight at ' + gapMm.toFixed(1) + ' mm above the pole face';
    } else if (m.type === 'diamagnetic') {
      status = 'Repelled, but too weakly to lift off — raise B or dB/dz to levitate';
    } else {
      status = 'Attracted — pulled down onto the magnet (no stable levitation point)';
    }
    ctx.fillText(status, 16, sceneTop - 8);
    ctx.fillStyle = '#94a3b8'; ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('χ = ' + m.chi.toExponential(2) + '  ·  local F/V ≈ ' + Fnow.toExponential(2) + ' N/m³  ·  decay length L = B/(dB/dz) ≈ ' + (decay * 1000).toFixed(0) + ' mm', 16, H - 12);
  }

  _arrowHead(ctx, x, y, dir, color) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 5, y + dir * 8);
    ctx.lineTo(x + 5, y + dir * 8);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  _drawBars(ctx, W, H, m) {
    const padL = 56, padR = 24, top = 74;
    const barsH = H - top - 30;
    const barW = W - padL - padR;
    ctx.fillStyle = '#e2e8f0'; ctx.font = '600 13px system-ui,sans-serif';
    ctx.fillText('Susceptibility χ by material (diamagnetic = negative, below the line)', padL, top - 10);
    ctx.fillStyle = '#0a1122'; ctx.fillRect(padL, top, barW, barsH);
    ctx.strokeStyle = '#334155'; ctx.strokeRect(padL + 0.5, top + 0.5, barW - 1, barsH - 1);
    const chiMax = 5e-4;
    const midY = top + barsH / 2;
    ctx.strokeStyle = '#475569'; ctx.beginPath(); ctx.moveTo(padL, midY); ctx.lineTo(padL + barW, midY); ctx.stroke();
    const gap = barW / (MATERIALS.length + 1);
    MATERIALS.forEach((mat, i) => {
      const bx = padL + gap * (i + 1);
      const bh = (Math.abs(mat.chi) / chiMax) * (barsH / 2 - 16);
      ctx.fillStyle = mat.chi < 0 ? '#38bdf8' : '#f97316';
      const bw = 26;
      if (mat.chi < 0) ctx.fillRect(bx - bw / 2, midY, bw, bh);
      else ctx.fillRect(bx - bw / 2, midY - bh, bw, bh);
      if (mat.id === this.state.materialId) {
        const hy = mat.chi < 0 ? midY : midY - bh;
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2;
        ctx.strokeRect(bx - bw / 2 - 2, hy - 2, bw + 4, bh + 4);
      }
      ctx.fillStyle = '#94a3b8'; ctx.font = '10px system-ui,sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(mat.name, bx, midY + barsH / 2 + 14);
      ctx.fillText(mat.chi.toExponential(1), bx, (mat.chi < 0 ? midY + bh + 12 : midY - bh - 6));
      ctx.textAlign = 'left';
    });
    ctx.fillStyle = '#64748b'; ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('Superconductors: χ = −1 (perfect diamagnet, Meissner effect) — off this chart\'s scale.', padL, H - 10);
  }

  _drawBalance(ctx, W, H, m, phase) {
    const s = this.state;
    const F = forcePerVolume(m.chi, s.B, s.dBdz);
    const repel = F < 0;

    ctx.fillStyle = '#e2e8f0'; ctx.font = '600 13px system-ui,sans-serif';
    ctx.fillText('Curie-balance-style force measurement', 16, 68);
    ctx.fillStyle = '#94a3b8'; ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('The sample hangs near a pole tip in a non-uniform field; the beam tilts until the restoring torque balances the magnetic force.', 16, 86);

    const cx = W / 2, pivotY = Math.min(150, H * 0.32);
    const armLen = Math.min(150, W * 0.28);

    // stand
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(cx, pivotY); ctx.lineTo(cx, pivotY + 110); ctx.stroke();
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(cx - 46, pivotY + 110); ctx.lineTo(cx + 46, pivotY + 110); ctx.stroke();

    // beam tilt angle proportional to force (small-angle), capped
    const maxAngle = 0.32;
    const torqueScale = 4e4;
    let angle = Math.max(-maxAngle, Math.min(maxAngle, F * torqueScale));
    // settle the needle smoothly rather than snapping (teaching readability)
    if (this._balAngle == null) this._balAngle = 0;
    this._balAngle += (angle - this._balAngle) * 0.06;
    angle = this._balAngle;

    const leftX = cx - Math.cos(angle) * armLen, leftY = pivotY - Math.sin(angle) * armLen;
    const rightX = cx + Math.cos(angle) * armLen, rightY = pivotY + Math.sin(angle) * armLen;

    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(leftX, leftY); ctx.lineTo(rightX, rightY); ctx.stroke();
    ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.arc(cx, pivotY, 6, 0, Math.PI * 2); ctx.fill();

    // sample hangs from the left end on a thread, near a small magnet pole
    const threadLen = 46;
    const sx = leftX, sTopY = leftY;
    const sBotY = sTopY + threadLen;
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sx, sTopY); ctx.lineTo(sx, sBotY); ctx.stroke();
    ctx.fillStyle = m.type === 'diamagnetic' ? '#94a3b8' : '#fbbf24';
    ctx.beginPath(); ctx.arc(sx, sBotY + 10, 11, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1e293b'; ctx.stroke();
    ctx.fillStyle = '#e2e8f0'; ctx.font = '10px system-ui,sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(m.name, sx, sBotY + 34);

    // small magnet pole just beside the sample
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(sx + 22, sBotY - 6, 24, 32);
    ctx.fillStyle = '#eaf0fb'; ctx.font = '700 10px system-ui,sans-serif';
    ctx.fillText('N', sx + 34, sBotY + 14);
    ctx.textAlign = 'left';

    // counterweight / pointer on the right end sweeping a small scale arc
    const wx = rightX, wy = rightY;
    ctx.fillStyle = '#475569';
    ctx.beginPath(); ctx.arc(wx, wy, 10, 0, Math.PI * 2); ctx.fill();

    const scaleY = wy + 50, scaleR = 60;
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx + armLen, scaleY, scaleR, Math.PI * 0.62, Math.PI * 1.38); ctx.stroke();
    ctx.fillStyle = '#64748b'; ctx.font = '9px system-ui,sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('repel', cx + armLen - scaleR * 0.75, scaleY - 8);
    ctx.fillText('attract', cx + armLen + scaleR * 0.75, scaleY - 8);
    ctx.textAlign = 'left';
    const needleAng = Math.PI - (Math.PI / 2 + angle * 2.2);
    const nx = cx + armLen + Math.cos(needleAng) * scaleR * 0.85;
    const ny = scaleY - Math.sin(needleAng) * scaleR * 0.85;
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx + armLen, scaleY); ctx.lineTo(nx, ny); ctx.stroke();

    ctx.fillStyle = '#e2e8f0'; ctx.font = '600 12px system-ui,sans-serif';
    ctx.fillText(
      (repel ? 'Repelled' : 'Attracted') + '  ·  measured F/V ≈ ' + F.toExponential(2) + ' N/m³',
      16, H - 26
    );
    ctx.fillStyle = '#94a3b8'; ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('Beam deflection ∝ torque ∝ magnetic force — this is how χ is measured in the lab (Gouy / Curie balance).', 16, H - 10);
  }
}
