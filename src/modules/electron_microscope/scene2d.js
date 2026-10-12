import { createDualCanvas } from '../common/teachPlots.js';
import { electronWavelength, rayleighResolution, LIGHT_WAVELENGTH_M } from './physics.js';
import { drawTwoPointBlobs } from './resolveDemo.js';

const SAMPLE_SEP_NM = 2; // fixed real-world spacing between the two demo features

function drawColumn(ctx, x0, w, top, bot, opts) {
  const cx = x0 + w / 2;
  ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.5;
  ctx.strokeRect(x0, top, w, bot - top);
  // source
  ctx.fillStyle = opts.sourceColor;
  ctx.beginPath(); ctx.arc(cx, top + 16, 7, 0, Math.PI * 2); ctx.fill();
  // condenser lens
  ctx.strokeStyle = opts.lensColor; ctx.lineWidth = 2;
  const lensY = top + (bot - top) * 0.34;
  const objY = top + (bot - top) * 0.62;
  ctx.beginPath(); ctx.ellipse(cx, lensY, w * 0.32, 5, 0, 0, Math.PI * 2); ctx.stroke();
  // objective lens
  ctx.beginPath(); ctx.ellipse(cx, objY, w * 0.32, 6, 0, 0, Math.PI * 2); ctx.stroke();
  // sample
  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cx - w * 0.28, objY + 2); ctx.lineTo(cx + w * 0.28, objY + 2); ctx.stroke();
  // rays converging through lenses to sample and diverging to screen
  ctx.strokeStyle = opts.rayColor; ctx.lineWidth = 1;
  ctx.globalAlpha = 0.7;
  for (const s of [-1, 0, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + s * 6, top + 20);
    ctx.lineTo(cx, lensY);
    ctx.lineTo(cx + s * 10, objY);
    ctx.lineTo(cx, objY + 2);
    ctx.lineTo(cx + s * 16, bot - 16);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // screen / detector
  ctx.fillStyle = opts.screenColor;
  ctx.fillRect(cx - w * 0.34, bot - 14, w * 0.68, 7);
  ctx.fillStyle = '#94a3b8'; ctx.font = '10px system-ui,sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(opts.label, cx, top - 8);
  ctx.textAlign = 'left';
}

export class ElectronMicroscope2D {
  constructor(host) {
    this.state = { voltage: 20000, NA: 0.02, NAlight: 1.0 };
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h) { self._draw(ctx, w, h); });
  }

  setParams(p) { if (p) Object.assign(this.state, p); }
  setPaused(v) { this._canvas.setPaused(v); }
  resize() { this._canvas.resize(); }
  dispose() { this._canvas.dispose(); }

  _draw(ctx, W, H) {
    if (!W || !H) return;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);
    const s = this.state;
    const lambdaE = electronWavelength(s.voltage);
    const dE = rayleighResolution(lambdaE, s.NA);
    const dL = rayleighResolution(LIGHT_WAVELENGTH_M, s.NAlight);
    const dE_nm = dE * 1e9;
    const dL_nm = dL * 1e9;

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 15px system-ui,sans-serif';
    ctx.fillText('Electron microscope — why electrons resolve far finer detail than light', 16, 22);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillText('λ_e = h / √(2 m e V)   ·   resolution d ≈ 0.61 λ / NA (Rayleigh criterion)', 16, 40);
    ctx.fillText(
      'At ' + (s.voltage / 1000).toFixed(0) + ' kV: λ_e = ' + (lambdaE * 1e12).toFixed(2) + ' pm, resolution ≈ ' +
      dE_nm.toFixed(3) + ' nm  (optical limit ≈ ' + (dL * 1e6).toFixed(2) + ' µm)',
      16, 56
    );

    // --- Schematic columns (compact, top of canvas) ---
    const headerH = 68;
    const colW = Math.min(190, W * 0.24);
    const colTop = headerH + 10;
    const colH = Math.max(90, Math.min(150, H * 0.22));
    const colBot = colTop + colH;
    drawColumn(ctx, W * 0.16, colW, colTop, colBot, {
      sourceColor: '#fde68a', lensColor: '#f59e0b', rayColor: 'rgba(253,230,138,0.7)', screenColor: '#f59e0b',
      label: 'Optical microscope (light bulb + glass lenses)',
    });
    drawColumn(ctx, W * 0.60, colW, colTop, colBot, {
      sourceColor: '#93c5fd', lensColor: '#38bdf8', rayColor: 'rgba(147,197,253,0.7)', screenColor: '#38bdf8',
      label: 'Electron microscope (electron gun + magnetic lenses)',
    });

    // --- wavelength / resolution comparison bar ---
    const barY = colBot + 26;
    const barX = 16, barW = W - 32;
    const maxLog = Math.log10(600e-9);
    const minLog = Math.log10(1e-13);
    function frac(lam) { return (Math.log10(Math.max(lam, 1e-13)) - minLog) / (maxLog - minLog); }
    ctx.strokeStyle = '#334155'; ctx.beginPath(); ctx.moveTo(barX, barY); ctx.lineTo(barX + barW, barY); ctx.stroke();
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillStyle = '#f59e0b';
    let fx = barX + frac(LIGHT_WAVELENGTH_M) * barW;
    ctx.beginPath(); ctx.arc(fx, barY, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillText('light λ ≈ 550 nm', Math.max(barX, fx - 40), barY - 10);
    ctx.fillStyle = '#38bdf8';
    fx = barX + frac(lambdaE) * barW;
    ctx.beginPath(); ctx.arc(fx, barY, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillText('electron λ ≈ ' + (lambdaE * 1e12).toFixed(1) + ' pm', Math.min(barX + barW - 90, fx - 40), barY + 16);

    // --- Resolving-power demo: can each microscope tell two close-together
    // sample features apart? This is the actual payoff of the smaller
    // wavelength — make it visible, not just a number. ---
    const rpTitleY = barY + 34;
    const rpTop = rpTitleY + 10;
    const rpH = Math.max(130, H - rpTop - 10);
    const gap = 16;
    const boxW = (W - 32 - gap) / 2;
    const box1X = 16;
    const box2X = 16 + boxW + gap;

    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.fillText('Can each microscope resolve two sample features ' + SAMPLE_SEP_NM + ' nm apart?', 16, rpTitleY);

    this._drawResolveBox(ctx, box1X, rpTop, boxW, rpH, {
      title: 'Optical microscope view',
      dNm: dL_nm,
      core: 'rgba(255,247,214,0.95)',
      mid: 'rgba(245,158,11,0.75)',
      accent: '#f59e0b',
    });
    this._drawResolveBox(ctx, box2X, rpTop, boxW, rpH, {
      title: 'Electron microscope view',
      dNm: dE_nm,
      core: 'rgba(224,242,254,0.95)',
      mid: 'rgba(56,189,248,0.8)',
      accent: '#38bdf8',
    });
  }

  _drawResolveBox(ctx, x0, y0, w, h, opts) {
    ctx.fillStyle = 'rgba(10,17,34,0.85)';
    ctx.fillRect(x0, y0, w, h);
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.5;
    ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(opts.title, x0 + w / 2, y0 + 18);

    const blobTop = y0 + 30;
    const blobH = Math.max(40, h - 64);
    const info = drawTwoPointBlobs(ctx, x0 + 6, blobTop, w - 12, blobH, {
      dNm: opts.dNm,
      sepNm: SAMPLE_SEP_NM,
      core: opts.core,
      mid: opts.mid,
    });

    const resolved = info.resolved;
    ctx.fillStyle = resolved ? '#4ade80' : '#f87171';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.fillText(resolved ? 'RESOLVED — two separate points' : 'NOT RESOLVED — blurs into one', x0 + w / 2, y0 + h - 22);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui,sans-serif';
    const dTxt = opts.dNm >= 1 ? opts.dNm.toFixed(1) : opts.dNm.toFixed(3);
    ctx.fillText('resolution d ≈ ' + dTxt + ' nm   (feature spacing = ' + SAMPLE_SEP_NM + ' nm)', x0 + w / 2, y0 + h - 8);
    ctx.textAlign = 'left';
  }
}
