/** Micro-electrokinetics teaching canvas — electrophoresis / electroosmosis / DEP. */
import { createDualCanvas } from '../common/teachPlots.js';
import {
  smoluchowskiVelocity,
  dielectrophoreticForce,
  curvePoints,
  WATER_VISCOSITY_PAS,
} from './physics.js';

export class MicroEK2D {
  constructor(host) {
    this.state = {
      mode: 'electrophoresis',
      fieldVm: 1e5,
      zetaMv: -50,
      particleRadiusUm: 1,
      epsR: 78,
      cmFactor: 0.3,
    };
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.mode != null) this.state.mode = p.mode;
    if (p.fieldVm != null) this.state.fieldVm = p.fieldVm;
    if (p.zetaMv != null) this.state.zetaMv = p.zetaMv;
    if (p.particleRadiusUm != null) this.state.particleRadiusUm = p.particleRadiusUm;
    if (p.epsR != null) this.state.epsR = p.epsR;
    if (p.cmFactor != null) this.state.cmFactor = p.cmFactor;
  }

  setPaused(v) { this._canvas.setPaused(v); }
  setActive(v) { this._active = !!v; }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _draw(ctx, W, H, phase) {
    if (!W || !H) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);

    // Persistent bold caption strip — the single most important clarity fix:
    // states plainly which of the three phenomena is active and what is moving.
    const capH = 38;
    this._drawCaption(ctx, W, capH);

    const schemH = Math.floor((H - capH) * 0.7);
    ctx.save();
    ctx.translate(0, capH);
    this._drawChannel(ctx, W, schemH, phase);
    ctx.restore();
    this._drawCurve(ctx, 0, capH + schemH + 4, W, H - capH - schemH - 4);
  }

  _drawCaption(ctx, W, H) {
    const mode = this.state.mode;
    ctx.fillStyle = 'rgba(24, 32, 51, 0.96)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H - 0.5);
    ctx.lineTo(W, H - 0.5);
    ctx.stroke();

    let text, color;
    if (mode === 'electrophoresis') {
      text = 'ELECTROPHORESIS: the CHARGED PARTICLE moves through still fluid';
      color = '#67e8f9';
    } else if (mode === 'electroosmosis') {
      text = 'ELECTROOSMOSIS: the FLUID ITSELF moves, carrying the particle along';
      color = '#4ade80';
    } else {
      text = 'DIELECTROPHORESIS: a NEUTRAL particle is pushed by the field GRADIENT';
      color = '#fbbf24';
    }
    ctx.fillStyle = color;
    ctx.font = '700 16px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 12, H / 2 + 1);
    ctx.textBaseline = 'alphabetic';
  }

  _drawChannel(ctx, W, H, phase) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 0, W, H);

    const mode = this.state.mode;

    const chY0 = 20;
    const chH = Math.max(40, H - 46);
    const chX0 = W * 0.12;
    const chX1 = W * 0.88;
    const chW = chX1 - chX0;

    // Channel walls
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(chX0, chY0, chW, chH);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.06)';
    ctx.fillRect(chX0, chY0, chW, chH);

    if (mode === 'dielectrophoresis') {
      this._drawDEP(ctx, chX0, chY0, chW, chH, phase);
    } else {
      this._drawElectrodes(ctx, chX0, chY0, chW, chH);
      if (mode === 'electrophoresis') this._drawElectrophoresis(ctx, chX0, chY0, chW, chH, phase);
      else this._drawElectroosmosis(ctx, chX0, chY0, chW, chH, phase);
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText('Lab-on-a-chip: cell sorting, sample separation, DNA analysis', 16, H - 6);
  }

  _drawElectrodes(ctx, x0, y0, w, h) {
    ctx.fillStyle = '#f87171';
    ctx.fillRect(x0 - 10, y0 - 6, 8, h + 12);
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(x0 + w + 2, y0 - 6, 8, h + 12);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('+', x0 - 6, y0 - 10);
    ctx.fillText('−', x0 + w + 6, y0 - 10);
    ctx.textAlign = 'left';
  }

  _drawElectrophoresis(ctx, x0, y0, w, h, phase) {
    const v = smoluchowskiVelocity(this.state.epsR, this.state.zetaMv, this.state.fieldVm, WATER_VISCOSITY_PAS);
    const speedPxS = Math.min(60, Math.abs(v) * 4e4 + 4);
    const cy = y0 + h / 2;
    const span = w - 24;
    let t = (phase * speedPxS / span) % 1;
    if (t < 0) t += 1;
    // charge sign of particle inferred from zeta sign (teaching simplification)
    const charged = this.state.zetaMv >= 0 ? '#fbbf24' : '#67e8f9';
    const x = this.state.zetaMv >= 0 ? x0 + 12 + span * t : x0 + 12 + span * (1 - t);
    ctx.fillStyle = charged;
    ctx.beginPath();
    ctx.arc(x, cy, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.state.zetaMv >= 0 ? '+' : '−', x, cy + 3);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#67e8f9';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText('fluid stays still — only the charged particle drifts', x0, y0 + h + 16);
  }

  _drawElectroosmosis(ctx, x0, y0, w, h, phase) {
    const v = smoluchowskiVelocity(this.state.epsR, this.state.zetaMv, this.state.fieldVm, WATER_VISCOSITY_PAS);
    const dir = this.state.zetaMv >= 0 ? -1 : 1;
    const speedPxS = Math.min(60, Math.abs(v) * 4e4 + 4);

    // Plug flow: small arrows spanning the ENTIRE channel width, every row,
    // all the same direction and the same length — that uniformity IS the point.
    const arrowLen = 22;
    const nCols = 6;
    const nRows = 5;
    const colSpan = (w - 16) / nCols;
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.9)';
    ctx.fillStyle = 'rgba(74, 222, 128, 0.9)';
    ctx.lineWidth = 1.5;
    for (let r = 0; r < nRows; r++) {
      const y = y0 + (h * (r + 0.5)) / nRows;
      for (let c = 0; c < nCols; c++) {
        const cx0 = x0 + 8 + colSpan * (c + 0.5) - arrowLen / 2;
        const startX = dir > 0 ? cx0 : cx0 + arrowLen;
        const endX = dir > 0 ? cx0 + arrowLen : cx0;
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(endX, y);
        ctx.lineTo(endX - dir * 6, y - 3);
        ctx.lineTo(endX - dir * 6, y + 3);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Neutral particles carried along at uniform speed (plug profile)
    const span = w - 24;
    const nParticles = 3;
    for (let i = 0; i < nParticles; i++) {
      let t = (phase * speedPxS / span + i / nParticles) % 1;
      if (t < 0) t += 1;
      const x = dir > 0 ? x0 + 12 + span * t : x0 + 12 + span * (1 - t);
      const y = y0 + h * (0.3 + 0.4 * ((i * 37) % 100) / 100);
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#4ade80';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText('flat "plug" velocity profile — every arrow same length', x0, y0 + h + 16);
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic 12px system-ui,sans-serif';
    ctx.fillText('note: uniform profile, unlike pressure-driven (parabolic) flow', x0, y0 + h + 32);
  }

  _drawDEP(ctx, x0, y0, w, h, phase) {
    // narrowing electrode gap in the middle
    const cx = x0 + w / 2;
    const gapHalf = Math.max(10, w * 0.06);
    ctx.fillStyle = '#f87171';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(cx - gapHalf, y0 + h / 2);
    ctx.lineTo(x0, y0 + h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.moveTo(x0 + w, y0);
    ctx.lineTo(cx + gapHalf, y0 + h / 2);
    ctx.lineTo(x0 + w, y0 + h);
    ctx.closePath();
    ctx.fill();

    // field-line hints converging at the gap
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.5)';
    ctx.lineWidth = 1;
    const nLines = 6;
    for (let i = 0; i < nLines; i++) {
      const yA = y0 + (h * (i + 0.5)) / nLines;
      ctx.beginPath();
      ctx.moveTo(x0 + 4, yA);
      ctx.quadraticCurveTo(cx, y0 + h / 2, x0 + w - 4, yA);
      ctx.stroke();
    }

    // "non-uniform field" label pointing at the narrow gap
    ctx.fillStyle = '#c4b5fd';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('non-uniform field (gap)', cx, y0 - 8);
    ctx.strokeStyle = 'rgba(196, 181, 253, 0.7)';
    ctx.beginPath();
    ctx.moveTo(cx, y0 - 4);
    ctx.lineTo(cx, y0 + h / 2 - 12);
    ctx.stroke();
    ctx.textAlign = 'left';

    // color code: green = positive DEP (toward gap), red = negative DEP (away)
    const positive = this.state.cmFactor >= 0;
    const color = positive ? '#4ade80' : '#f87171';
    const speedPxS = Math.min(50, Math.abs(this.state.cmFactor) * 60 + 6);
    const t = Math.min(1, (Math.sin(phase * speedPxS * 0.02) + 1) / 2);
    const startX = x0 + w * 0.22;
    const endX = cx - gapHalf - 6;
    const farX = x0 + w * 0.22;
    const px = positive ? startX + (endX - startX) * t : endX - (endX - farX) * t;
    const py = y0 + h / 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(positive ? 'positive DEP → drawn toward high-field gap' : 'negative DEP → repelled from high-field gap', x0, y0 + h + 16);

    // explicit legend
    const lx = x0;
    const ly = y0 + h + 28;
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(lx, ly, 10, 10);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText('positive DEP (toward gap)', lx + 16, ly + 9);
    ctx.fillStyle = '#f87171';
    ctx.fillRect(lx + 190, ly, 10, 10);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('negative DEP (away from gap)', lx + 206, ly + 9);
  }

  _drawCurve(ctx, ox, oy, W, H) {
    const padL = 56;
    const padR = 20;
    const padT = 50;
    const padB = 42;
    const plotX = ox + padL;
    const plotY = oy + padT;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const mode = this.state.mode;

    ctx.fillStyle = '#0a1122';
    ctx.fillRect(plotX, plotY, plotW, plotH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(plotX + 0.5, plotY + 0.5, plotW - 1, plotH - 1);

    let pts, xOp, yOp, xMax, yMax, yMin, xLabel, yLabel, titleTxt, valueTxt;

    if (mode === 'dielectrophoresis') {
      const gradE2 = 1e17;
      xMax = 1;
      pts = curvePoints('dielectrophoresis', {
        epsR: this.state.epsR,
        particleRadiusUm: this.state.particleRadiusUm,
        gradE2: gradE2,
      }, xMax, 100);
      xOp = this.state.cmFactor;
      yOp = dielectrophoreticForce(this.state.particleRadiusUm, this.state.epsR, this.state.cmFactor, gradE2);
      yMax = 1e-9; yMin = -1e-9;
      for (let i = 0; i < pts.length; i++) { if (pts[i].y > yMax) yMax = pts[i].y; if (pts[i].y < yMin) yMin = pts[i].y; }
      xLabel = 'CM factor →';
      yLabel = 'F_DEP (N)';
      titleTxt = 'DEP force vs Clausius–Mossotti factor';
      valueTxt = 'F_DEP = ' + yOp.toExponential(2) + ' N   (r=' + this.state.particleRadiusUm.toFixed(1) + ' µm, CM=' + this.state.cmFactor.toFixed(2) + ')';
      // x range is fixed -0.5..1
      var xMin = -0.5;
      this._plotXY(ctx, plotX, plotY, plotW, plotH, pts, xOp, yOp, xMin, xMax, yMin, yMax, xLabel, yLabel);
    } else {
      xMax = 1e6;
      pts = curvePoints(mode, {
        epsR: this.state.epsR,
        zetaMv: this.state.zetaMv,
        viscosityPas: WATER_VISCOSITY_PAS,
      }, xMax, 100);
      xOp = this.state.fieldVm;
      yOp = smoluchowskiVelocity(this.state.epsR, this.state.zetaMv, this.state.fieldVm, WATER_VISCOSITY_PAS);
      yMax = 1e-9; yMin = -1e-9;
      for (let i = 0; i < pts.length; i++) { if (pts[i].y > yMax) yMax = pts[i].y; if (pts[i].y < yMin) yMin = pts[i].y; }
      xLabel = 'E (V/m) →';
      yLabel = 'v (m/s)';
      titleTxt = mode === 'electrophoresis' ? 'Particle drift velocity vs field' : 'Plug-flow velocity vs field';
      valueTxt = 'v = ' + yOp.toExponential(2) + ' m/s   (ζ=' + this.state.zetaMv.toFixed(0) + ' mV, E=' + xOp.toExponential(1) + ' V/m)';
      this._plotXY(ctx, plotX, plotY, plotW, plotH, pts, xOp, yOp, 0, xMax, yMin, yMax, xLabel, yLabel);
    }

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 14px system-ui,sans-serif';
    ctx.fillText(titleTxt, ox + 16, oy + 22);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText(valueTxt, plotX, oy + 40);
  }

  _plotXY(ctx, plotX, plotY, plotW, plotH, pts, xOp, yOp, xMin, xMax, yMin, yMax, xLabel, yLabel) {
    const xSpan = (xMax - xMin) || 1;
    const ySpan = (yMax - yMin) || 1;
    function X(x) { return plotX + ((x - xMin) / xSpan) * plotW; }
    function Y(y) { return plotY + plotH - ((y - yMin) / ySpan) * plotH; }

    // zero line
    if (yMin < 0 && yMax > 0) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.beginPath();
      ctx.moveTo(plotX, Y(0));
      ctx.lineTo(plotX + plotW, Y(0));
      ctx.stroke();
    }

    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const px = X(pts[i].x);
      const py = Y(pts[i].y);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(X(xOp), Y(yOp), 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(xLabel, plotX + plotW / 2, plotY + plotH + 30);
    ctx.textAlign = 'left';
    ctx.save();
    ctx.translate(plotX - 42, plotY + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
  }
}
