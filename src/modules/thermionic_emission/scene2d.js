/** Thermionic emission — vacuum diode teaching canvas. */
import { createDualCanvas } from '../common/teachPlots.js';
import {
  richardsonCurrentDensity,
  richardsonCurrent,
  childLangmuirCurrent,
  diodeCurrent,
  limitingRegime,
  curvePoints,
} from './physics.js';

const K_CL = 2e-6;

export class ThermionicScene2D {
  constructor(host) {
    this.state = {
      T: 2000,
      W: 4.5,
      V: 50,
    };
    this._particles = [];
    for (let i = 0; i < 60; i++) {
      this._particles.push({ t: Math.random(), y: Math.random() });
    }
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      self._draw(ctx, w, h, phase);
    });
  }

  setParams(p) {
    if (!p) return;
    if (p.T != null) this.state.T = p.T;
    if (p.W != null) this.state.W = p.W;
    if (p.V != null) this.state.V = p.V;
  }

  setPaused(v) { this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _draw(ctx, W, H, phase) {
    if (!W || !H) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);

    const capH = Math.min(40, Math.floor(H * 0.09));
    this._drawCaption(ctx, W, capH);

    const schemH = Math.floor((H - capH) * 0.7);
    this._drawTube(ctx, W, capH, schemH, phase);
    this._drawCurve(ctx, 0, capH + schemH + 4, W, H - capH - schemH - 4);
  }

  /** Persistent bold top caption stating the current limiting regime in plain words. */
  _drawCaption(ctx, W, H) {
    const T = this.state.T;
    const Wf = this.state.W;
    const V = this.state.V;
    const regime = limitingRegime(T, Wf, null, V, K_CL);
    const isTempLimited = regime === 'temperature';
    const bg = isTempLimited ? 'rgba(251, 146, 60, 0.16)' : 'rgba(56, 189, 248, 0.16)';
    const fg = isTempLimited ? '#fdba74' : '#7dd3fc';
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H - 0.5);
    ctx.lineTo(W, H - 0.5);
    ctx.stroke();

    const label = isTempLimited
      ? 'TEMPERATURE-LIMITED — every electron that CAN escape the cathode gets collected'
      : 'SPACE-CHARGE-LIMITED — electrons pile up near the cathode, repelling more from leaving';
    ctx.fillStyle = fg;
    ctx.font = '700 ' + Math.max(16, Math.min(18, Math.floor(H * 0.42))) + 'px system-ui,sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 14, H / 2 + 1);
    ctx.textBaseline = 'alphabetic';
  }

  _drawTube(ctx, W, capH, H, phase) {
    const oy = capH;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, oy, W, H);
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
    ctx.beginPath();
    ctx.moveTo(0, oy + H - 0.5);
    ctx.lineTo(W, oy + H - 0.5);
    ctx.stroke();

    const T = this.state.T;
    const Wf = this.state.W;
    const V = this.state.V;
    const Jrich = richardsonCurrentDensity(T, Wf);
    const Irich = richardsonCurrent(T, Wf);
    const Icl = childLangmuirCurrent(V, K_CL);
    const Idiode = diodeCurrent(T, Wf, null, V, K_CL);
    const regime = limitingRegime(T, Wf, null, V, K_CL);

    ctx.fillStyle = '#f1f5f9';
    ctx.font = '700 14px system-ui,sans-serif';
    ctx.fillText('Vacuum diode   ·   J = A T² e^(−W/kT)', 16, oy + 20);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '13px system-ui,sans-serif';
    ctx.fillText(
      'T = ' + T.toFixed(0) + ' K · W = ' + Wf.toFixed(2) + ' eV · V = ' + V.toFixed(0) +
      ' V · I ≈ ' + Idiode.toExponential(2) + ' A (' + (regime === 'temperature' ? 'temperature-limited' : 'space-charge-limited') + ')',
      16, oy + 40
    );

    const y = oy + H * 0.62;
    const envL = W * 0.12;
    const envR = W * 0.88;
    const envT = y - 58;
    const envB = y + 58;

    // Glass envelope
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.lineWidth = 2;
    roundRect(ctx, envL, envT, envR - envL, envB - envT, 24);
    ctx.stroke();

    // Cathode (heated filament) glow scales with T (800-3000K -> dull red to white-hot)
    const xCath = envL + 46;
    const heat = Math.max(0, Math.min(1, (T - 800) / (3000 - 800)));
    const r = Math.round(180 + 70 * heat);
    const g = Math.round(40 + 190 * heat);
    const b = Math.round(20 + 140 * heat * heat);
    const glowColor = 'rgb(' + r + ',' + g + ',' + b + ')';
    const glowR = 10 + 16 * heat;
    const grad = ctx.createRadialGradient(xCath, y, 2, xCath, y, glowR);
    grad.addColorStop(0, glowColor);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(xCath, y, glowR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(xCath, y - 38);
    for (let i = 0; i <= 8; i++) {
      const yy = y - 38 + (76 * i) / 8;
      const xx = xCath + (i % 2 === 0 ? -6 : 6);
      ctx.lineTo(xx, yy);
    }
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('cathode (filament)', xCath, envB + 18);

    // Callout arrow: work-function barrier the electron must climb to escape.
    const arrowX = xCath + 26;
    const arrowTopY = y - 14;
    const arrowBotY = y + 20;
    ctx.strokeStyle = '#facc15';
    ctx.fillStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(arrowX, arrowBotY);
    ctx.lineTo(arrowX, arrowTopY + 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(arrowX, arrowTopY);
    ctx.lineTo(arrowX - 5, arrowTopY + 9);
    ctx.lineTo(arrowX + 5, arrowTopY + 9);
    ctx.closePath();
    ctx.fill();
    ctx.font = '700 12px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('must climb W = ' + Wf.toFixed(2) + ' eV', arrowX + 10, arrowTopY + 4);
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillStyle = '#eab308';
    ctx.fillText('to escape the surface', arrowX + 10, arrowTopY + 18);

    // Small energy-barrier inset: metal sea of electrons must hop over a hill of height W.
    this._drawBarrierInset(ctx, envL + 6, envT + 6, 118, 58, phase);

    // Anode plate
    const xAnode = envR - 46;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.fillRect(xAnode - 8, y - 42, 16, 84);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(xAnode - 8.5, y - 42.5, 17, 84);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '700 12px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('anode (+' + V.toFixed(0) + ' V)', xAnode, envB + 18);
    ctx.textAlign = 'left';

    // Electrons boiling off cathode and drifting to anode. Emission RATE is
    // exaggerated on a log scale of the Richardson saturation current so the
    // T- and W- dependence is dramatically visible on screen (real exponential
    // spans >30 orders of magnitude, far too subtle to render literally).
    const logI = Math.log10(Math.max(Irich, 1e-38));
    const visRate = Math.max(0, Math.min(1, (logI + 34) / 38));
    const nShow = Math.max(1, Math.round(2 + 56 * visRate));
    const speed = 0.25 + 0.9 * Math.min(1, V / 150);
    for (let i = 0; i < nShow; i++) {
      const p = this._particles[i % this._particles.length];
      const t = (phase * speed * 0.5 + p.t) % 1;
      const x = xCath + (xAnode - xCath) * t;
      const wobble = Math.sin((phase * 2 + p.y * 10)) * 4 * (1 - t);
      ctx.fillStyle = '#67e8f9';
      ctx.globalAlpha = 0.85 * (0.3 + 0.7 * (1 - Math.abs(t - 0.5) * 0.6));
      ctx.beginPath();
      ctx.arc(x, y + (p.y - 0.5) * 50 + wobble, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText(
      'J_sat ≈ ' + Jrich.toExponential(2) + ' A/m² · I_sat ≈ ' + Irich.toExponential(2) +
      ' A · I_CL ≈ ' + Icl.toExponential(2) + ' A',
      16, oy + H - 8
    );
  }

  /** Tiny energy-barrier diagram: metal Fermi sea, vacuum level W above it, electrons hopping over. */
  _drawBarrierInset(ctx, x, y, w, h, phase) {
    ctx.fillStyle = 'rgba(2, 6, 16, 0.82)';
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.7)';
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, w, h, 6);
    ctx.fill();
    ctx.stroke();

    const baseY = y + h - 12;
    const topY = y + 10;
    const midX = x + w / 2;

    // Metal region (filled sea of electrons) on the left half
    ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
    ctx.fillRect(x + 6, baseY - 2, w / 2 - 8, 2);
    ctx.strokeStyle = '#64748b';
    ctx.beginPath();
    ctx.moveTo(x + 6, baseY);
    ctx.lineTo(midX, baseY);
    ctx.stroke();

    // Barrier hill: step up from metal level to vacuum level, then flat outside.
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(midX, baseY);
    ctx.lineTo(midX, topY);
    ctx.lineTo(x + w - 6, topY);
    ctx.stroke();

    ctx.fillStyle = '#facc15';
    ctx.font = '700 10px system-ui,sans-serif';
    ctx.fillText('W', midX + 3, (baseY + topY) / 2 + 3);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px system-ui,sans-serif';
    ctx.fillText('metal', x + 10, baseY + 10);
    ctx.fillText('vacuum', x + w - 42, topY - 3);

    // Electron hopping the barrier (loops with phase)
    const hopT = (phase * 0.6) % 1;
    const hx = midX - 10 + hopT * 24;
    const hy = baseY - Math.sin(hopT * Math.PI) * (baseY - topY) * 0.9;
    ctx.fillStyle = '#67e8f9';
    ctx.beginPath();
    ctx.arc(hx, hy, 2.6, 0, Math.PI * 2);
    ctx.fill();
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

    const T = this.state.T;
    const Wf = this.state.W;
    const V = this.state.V;
    const VMax = 300;
    const pts = curvePoints(T, Wf, null, K_CL, VMax, 120);
    const Idiode = diodeCurrent(T, Wf, null, V, K_CL);
    const regime = limitingRegime(T, Wf, null, V, K_CL);

    let iMax = 1e-12;
    for (let i = 0; i < pts.length; i++) if (pts[i].I > iMax) iMax = pts[i].I;
    iMax *= 1.15;

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '700 15px system-ui,sans-serif';
    ctx.fillText('Diode current vs anode voltage', ox + 16, oy + 22);

    ctx.fillStyle = '#0a1122';
    ctx.fillRect(plotX, plotY, plotW, plotH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(plotX + 0.5, plotY + 0.5, plotW - 1, plotH - 1);

    function X(v) { return plotX + (v / VMax) * plotW; }
    function Y(i) { return plotY + plotH - (i / iMax) * plotH; }

    ctx.strokeStyle = regime === 'temperature' ? '#fb923c' : '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const px = X(pts[i].V);
      const py = Y(pts[i].I);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Operating point
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(X(V), Y(Idiode), 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('anode voltage V →', plotX + plotW / 2, oy + H - 10);
    ctx.textAlign = 'left';
    ctx.save();
    ctx.translate(16, plotY + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('I (A)', 0, 0);
    ctx.restore();

    ctx.fillStyle = '#f1f5f9';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.fillText(
      'I ≈ ' + Idiode.toExponential(2) + ' A   ·   regime: ' +
      (regime === 'temperature' ? 'temperature-limited (Richardson saturation)' : 'space-charge-limited (Child-Langmuir)'),
      plotX, oy + 40
    );
  }
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}
