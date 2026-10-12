/** Electrostatic shielding / Faraday cage teaching canvas. */
import { createDualCanvas } from '../common/teachPlots.js';
import {
  getMaterial,
  shieldingFactor,
  interiorField,
  curvePoints,
} from './physics.js';

export class ElectrostaticShielding2D {
  constructor(host) {
    this.state = {
      E0: 5,
      cageOn: true,
      materialId: 'conductor',
      holeMm: 5,
    };
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.E0 != null) this.state.E0 = p.E0;
    if (p.cageOn != null) this.state.cageOn = p.cageOn;
    if (p.materialId != null) this.state.materialId = p.materialId;
    if (p.holeMm != null) this.state.holeMm = p.holeMm;
  }

  setPaused(v) { this._canvas.setPaused(v); }
  setActive(v) { this._active = !!v; }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _draw(ctx, W, H, phase) {
    if (!W || !H) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);

    const captionH = 36;
    this._drawCaption(ctx, W, captionH);

    // Keep the curve panel small and fixed so the schematic — the main,
    // easy-to-read picture — gets most of the space.
    const curveH = Math.floor(H * 0.3);
    const schemH = H - captionH - curveH - 4;
    this._drawField(ctx, W, schemH, phase, captionH);
    this._drawCurve(ctx, 0, captionH + schemH + 4, W, curveH);
  }

  /** Bold plain-language caption stating what's currently happening. */
  _drawCaption(ctx, W, H) {
    const cageOn = this.state.cageOn;
    const mat = this.state.materialId;
    let text;
    if (!cageOn) {
      text = 'Cage off: full bars — nothing blocks the field';
    } else if (mat === 'conductor') {
      text = 'Solid conductor: phone loses all bars — same as sealing it in foil';
    } else if (mat === 'mesh') {
      text = 'Mesh: blocks most of the field, but a few bars leak through the gaps';
    } else {
      text = 'Insulator: full bars — no shielding at all';
    }

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(148,163,184,0.35)';
    ctx.beginPath();
    ctx.moveTo(0, H - 0.5);
    ctx.lineTo(W, H - 0.5);
    ctx.stroke();

    ctx.fillStyle = '#fde68a';
    ctx.font = '700 15px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 14, H / 2 + 1);
    ctx.textBaseline = 'alphabetic';
  }

  _drawField(ctx, W, H, phase, yOffset) {
    ctx.save();
    ctx.translate(0, yOffset);
    this._drawFieldInner(ctx, W, H, phase);
    ctx.restore();
  }

  _drawFieldInner(ctx, W, H, phase) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
    ctx.beginPath();
    ctx.moveTo(0, H - 0.5);
    ctx.lineTo(W, H - 0.5);
    ctx.stroke();

    const mat = getMaterial(this.state.materialId);
    const cageOn = this.state.cageOn;
    const S = shieldingFactor(this.state.materialId, this.state.holeMm);
    const Ein = interiorField(this.state.E0, this.state.materialId, this.state.holeMm, cageOn);

    const boxL = W * 0.4;
    const boxR = W * 0.7;
    const boxT = H * 0.16;
    const boxB = H * 0.92;
    const solid = cageOn && this.state.materialId === 'conductor';
    const isMesh = cageOn && this.state.materialId === 'mesh';
    const passThrough = !cageOn || this.state.materialId === 'insulator';

    // Field lines from left edge to right edge, y-spread. Fewer, bigger
    // lines read more clearly than a dense bundle.
    const nLines = 5;
    for (let i = 0; i < nLines; i++) {
      const y = boxT - 16 + (i + 0.5) * ((boxB - boxT + 32) / nLines);
      if (y < 4 || y > H - 4) continue;
      const flowT = (phase * 0.5 + i * 0.13) % 1;

      if (solid) {
        this._drawArrowLine(ctx, 6, y, boxL - 2, y, '#38bdf8', 3, flowT);
      } else if (isMesh) {
        const leakFrac = 1 / S;
        this._drawArrowLine(ctx, 6, y, boxL - 2, y, '#38bdf8', 3, flowT);
        if (leakFrac > 0.15) {
          ctx.globalAlpha = Math.min(0.85, leakFrac * 3);
          this._drawArrowLine(ctx, boxL, y, boxR, y, '#38bdf8', 1.6, flowT);
          this._drawArrowLine(ctx, boxR + 2, y, W - 6, y, '#38bdf8', 3, flowT);
          ctx.globalAlpha = 1;
        } else {
          this._drawArrowLine(ctx, boxR + 2, y, W - 6, y, 'rgba(56,189,248,0.18)', 1.2, flowT);
        }
      } else {
        this._drawArrowLine(ctx, 6, y, W - 6, y, '#38bdf8', 3, flowT);
      }
    }

    // Cage box
    ctx.lineWidth = 2;
    if (this.state.materialId === 'mesh') {
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = mat.color;
      ctx.strokeRect(boxL + 0.5, boxT + 0.5, boxR - boxL - 1, boxB - boxT - 1);
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.35)';
      ctx.lineWidth = 1;
      const cols = 4;
      for (let c = 1; c < cols; c++) {
        const gx = boxL + (c / cols) * (boxR - boxL);
        ctx.beginPath();
        ctx.moveTo(gx, boxT);
        ctx.lineTo(gx, boxB);
        ctx.stroke();
      }
      const rows = 3;
      for (let r = 1; r < rows; r++) {
        const gy = boxT + (r / rows) * (boxB - boxT);
        ctx.beginPath();
        ctx.moveTo(boxL, gy);
        ctx.lineTo(boxR, gy);
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = mat.color;
      ctx.fillStyle = mat.color;
      ctx.globalAlpha = 0.12;
      ctx.fillRect(boxL, boxT, boxR - boxL, boxB - boxT);
      ctx.globalAlpha = 1;
      ctx.strokeRect(boxL + 0.5, boxT + 0.5, boxR - boxL - 1, boxB - boxT - 1);
    }
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(mat.name, (boxL + boxR) / 2, boxT - 8);
    ctx.textAlign = 'left';

    // Induced charge symbols on faces (conductor / mesh, cage on) — the
    // +/- signs are self-explanatory next to the caption, no extra labels.
    if (cageOn && (solid || isMesh)) {
      ctx.font = '800 18px system-ui,sans-serif';
      ctx.textAlign = 'center';
      const nCh = 3;
      for (let i = 0; i < nCh; i++) {
        const y = boxT + (i + 0.5) * (boxB - boxT) / nCh;
        ctx.fillStyle = '#f87171';
        ctx.fillText('+', boxL - 11, y + 6);
        ctx.fillStyle = '#60a5fa';
        ctx.fillText('−', boxR + 11, y + 6);
      }
      ctx.textAlign = 'left';
    }

    // A phone sitting inside the cage — the tangible, relatable version of
    // the field probe (same idea as the classic "put a phone in a metal
    // box, watch the bars drop" demo).
    const midY = (boxT + boxB) / 2;
    const midX = (boxL + boxR) / 2;
    const sigFrac = Math.max(0, Math.min(1, Ein / Math.max(this.state.E0, 1e-9)));
    const barsLit = passThrough ? 4 : Math.round(sigFrac * 4);
    this._drawPhone(ctx, midX, midY, barsLit);
  }

  /** A small phone with signal bars — bars drop to none once the cage
   *  actually blocks the field, exactly like a real phone loses signal
   *  inside a sealed metal enclosure. */
  _drawPhone(ctx, cx, cy, barsLit) {
    const pw = 20;
    const ph = 36;
    const px = cx - pw / 2;
    const py = cy - ph / 2 + 6;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(px, py, pw, ph, 4);
    else ctx.rect(px, py, pw, ph);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = barsLit > 0 ? 'rgba(74,222,128,0.28)' : 'rgba(248,113,113,0.22)';
    ctx.fillRect(px + 3, py + 4, pw - 6, ph - 8);

    const barsX = cx - 18;
    const barsY = cy - ph / 2 - 8;
    for (let i = 0; i < 4; i++) {
      const bw = 4;
      const bh = 5 + i * 4;
      const bx = barsX + i * (bw + 2);
      const by = barsY - bh;
      ctx.fillStyle = i < barsLit ? '#4ade80' : 'rgba(148,163,184,0.28)';
      ctx.fillRect(bx, by, bw, bh);
    }
    ctx.font = '700 11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = barsLit > 0 ? '#4ade80' : '#f87171';
    ctx.fillText(barsLit > 0 ? barsLit + ' bar' + (barsLit === 1 ? '' : 's') : 'NO SIGNAL', cx, barsY - 22);
    ctx.textAlign = 'left';
  }

  _drawArrowLine(ctx, x0, y0, x1, y1, color, width, flowT) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    const ang = Math.atan2(y1 - y0, x1 - x0);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - 6 * Math.cos(ang - 0.4), y1 - 6 * Math.sin(ang - 0.4));
    ctx.lineTo(x1 - 6 * Math.cos(ang + 0.4), y1 - 6 * Math.sin(ang + 0.4));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  /** Small, secondary curve panel — precise numbers live in the info
   *  table below the controls, so this stays compact. */
  _drawCurve(ctx, ox, oy, W, H) {
    const padL = 40;
    const padR = 14;
    const padT = 22;
    const padB = 16;
    const plotX = ox + padL;
    const plotY = oy + padT;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const holeMax = 50;
    const pts = curvePoints(this.state.materialId, holeMax, 100);
    let eMax = 1e-9;
    for (let i = 0; i < pts.length; i++) if (pts[i].Ein > eMax) eMax = pts[i].Ein;
    eMax = Math.max(eMax, 1e-6);

    const EinNorm = interiorField(1, this.state.materialId, this.state.holeMm, true);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.fillText('Interior field vs mesh hole size', ox + 12, oy + 14);

    ctx.fillStyle = '#0a1122';
    ctx.fillRect(plotX, plotY, plotW, plotH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(plotX + 0.5, plotY + 0.5, plotW - 1, plotH - 1);

    function X(h) { return plotX + (h / holeMax) * plotW; }
    function Y(e) { return plotY + plotH - (e / eMax) * plotH; }

    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const px = X(pts[i].holeMm);
      const py = Y(pts[i].Ein);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(X(this.state.holeMm), Y(EinNorm), 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('hole size →', plotX + plotW / 2, oy + H - 3);
    ctx.textAlign = 'left';
  }
}
