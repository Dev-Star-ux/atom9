import { createDualCanvas } from '../common/teachPlots.js';
import { Plot, CANVAS_COLORS } from '../common/canvasPlot.js';
import { el } from '../common/ui.js';
import { getScheme, betaSpectrumDensity, modeMeta, sampleBetaEnergy } from './physics.js';

const COL = {
  proton: '#f87171',
  neutron: '#64748b',
  parent: '#f472b6',
  daughter: '#38bdf8',
  bg: '#070d18',
};

export class AlphaBeta2D {
  constructor(host) {
    this.host = host;
    this.schemeId = 'u238a';
    this.paused = false;
    this._active = true;
    this._phase = 0;
    this._events = [];
    this._flash = 0;
    this._hud = el('div', 'abd-hud', '');
    host.appendChild(this._hud);
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      if (!self.paused && self._active) {
        self._phase = phase;
        self._step(0.025);
      }
      self._draw(ctx, w, h);
    });
    this._updateHud();
  }

  scheme() { return getScheme(this.schemeId); }

  setParams(p) {
    if (!p) return;
    if (p.schemeId != null) this.schemeId = p.schemeId;
    if (p.reset) { this._events = []; this._flash = 0; }
    this._updateHud();
  }

  setPaused(v) { this.paused = !!v; this._canvas.setPaused(v); }
  setActive(v) { this._active = !!v; this._hud.style.display = v ? '' : 'none'; }
  resize() { this._canvas.resize(); }
  dispose() {
    this._canvas.dispose();
    if (this._hud.parentNode) this._hud.parentNode.removeChild(this._hud);
  }

  _updateHud() {
    const s = this.scheme();
    const m = modeMeta(s.mode);
    this._hud.textContent =
      s.name + '   ·   ' + m.label + '   ·   Q = ' + s.Q + ' MeV   ·   T½ ' + s.halfLife +
      '   ·   ΔZ = ' + (s.zChange > 0 ? '+' : '') + s.zChange;
  }

  _step(dt) {
    const s = this.scheme();
    if (Math.random() < dt * 1.2) this._spawnEvent(s);
    for (let i = this._events.length - 1; i >= 0; i--) {
      const e = this._events[i];
      e.t += dt * e.speed;
      if (e.t >= 1) this._events.splice(i, 1);
    }
    this._flash = Math.max(0, this._flash - dt * 2);
  }

  _spawnEvent(s) {
    const tr = s.transitions[Math.floor(Math.random() * s.transitions.length)];
    const meta = modeMeta(tr.type === 'betaMinus' || tr.type === 'betaPlus' ? tr.type : s.mode);
    let E = tr.E;
    if (tr.type === 'betaMinus' || tr.type === 'betaPlus') {
      E = sampleBetaEnergy(s.spectrum.Q || s.Q);
    }
    this._events.push({
      type: tr.type,
      t: 0,
      speed: 0.55 + Math.random() * 0.35,
      E: E,
      label: tr.label || meta.label,
      color: meta.color,
    });
    this._flash = 1;
  }

  _draw(ctx, w, h) {
    if (!this._active) return;
    const s = this.scheme();
    const topH = Math.floor(h * 0.58);
    const botH = h - topH;

    ctx.fillStyle = COL.bg;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Decay schemes — nucleons, energy levels & spectra', 14, 20);

    const gap = 10;
    const leftW = Math.floor(w * 0.38);
    const midW = Math.floor(w * 0.34);
    this._drawNucleusPanel(ctx, 8, 28, leftW - 8, topH - 36, s);
    this._drawLevelDiagram(ctx, leftW + gap, 28, midW, topH - 36, s);
    this._drawEquationBox(ctx, leftW + midW + gap * 2, 28, w - leftW - midW - gap * 3 - 8, topH - 36, s);
    this._drawSpectrum(ctx, 12, topH + 8, w - 24, botH - 16, s);
  }

  _drawNucleusPanel(ctx, x, y, w, h, s) {
    ctx.strokeStyle = 'rgba(51,65,85,0.7)';
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#64748b';
    ctx.font = '600 10px system-ui,sans-serif';
    ctx.fillText('Nucleon picture', x + 8, y + 14);

    const cy = y + h * 0.52;
    const r = Math.min(w * 0.22, h * 0.28);
    const cx1 = x + w * 0.28;
    const cx2 = x + w * 0.72;

    this._drawNucleus(ctx, cx1, cy, r, s.parent.Z, s.parent.N, s.parent.sym, COL.parent);
    ctx.fillStyle = '#475569';
    ctx.font = '18px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('→', (cx1 + cx2) / 2, cy + 6);

    this._drawNucleus(ctx, cx2, cy, r * 0.95, s.daughter.Z, s.daughter.N, s.daughter.sym, COL.daughter);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Z=' + s.parent.Z + ' N=' + s.parent.N, cx1, cy + r + 22);
    ctx.fillText('Z=' + s.daughter.Z + ' N=' + s.daughter.N, cx2, cy + r + 22);

    const m = modeMeta(s.mode);
    ctx.fillStyle = m.color;
    ctx.font = '600 10px system-ui,sans-serif';
    ctx.fillText('ΔZ = ' + (s.zChange > 0 ? '+' : '') + s.zChange + '   ΔN = ' + (s.nChange > 0 ? '+' : '') + s.nChange, x + w / 2, y + h - 10);

    if (this._flash > 0) {
      ctx.fillStyle = 'rgba(251,191,36,' + (this._flash * 0.15) + ')';
      ctx.fillRect(x, y, w, h);
    }
  }

  _drawNucleus(ctx, cx, cy, R, Z, N, label, ringCol) {
    const total = Math.min(Z + N, 80);
    const nProton = Math.round(total * (Z / (Z + N)));
    const nNeut = total - nProton;
    const pts = this._packCircles(nProton + nNeut, R * 0.72);
    for (let i = 0; i < pts.length; i++) {
      const isP = i < nProton;
      ctx.beginPath();
      ctx.arc(cx + pts[i].x, cy + pts[i].y, R * 0.11, 0, Math.PI * 2);
      ctx.fillStyle = isP ? COL.proton : COL.neutron;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = ringCol;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, cx, cy - R - 8);
  }

  _packCircles(n, R) {
    const out = [];
    if (n <= 0) return out;
    out.push({ x: 0, y: 0 });
    for (let i = 1; i < n; i++) {
      const ang = i * 2.399963;
      const rad = R * Math.sqrt(i / n) * 0.95;
      out.push({ x: Math.cos(ang) * rad, y: Math.sin(ang) * rad });
    }
    return out;
  }

  _drawLevelDiagram(ctx, x, y, w, h, s) {
    ctx.strokeStyle = 'rgba(51,65,85,0.7)';
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#64748b';
    ctx.font = '600 10px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Energy levels (MeV)', x + 8, y + 14);

    const Emax = Math.max(s.Q, 2.6, ...s.daughterLevels.map(function (l) { return l.E; })) * 1.15;
    const pad = [x + 36, y + 24, x + w - 12, y + h - 12];
    const plot = new Plot(ctx, pad, [0, 1], [0, Emax]);

    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(pad[0] - 8, pad[1]);
    ctx.lineTo(pad[0] - 8, pad[3]);
    ctx.stroke();
    ctx.fillStyle = '#64748b';
    ctx.font = '8px system-ui,sans-serif';
    ctx.textAlign = 'right';
    [0, Emax * 0.5, Emax].forEach(function (ev) {
      ctx.fillText(ev.toFixed(1), pad[0] - 10, plot.Y(ev) + 3);
    });

    const pX = x + w * 0.32;
    const dX = x + w * 0.72;
    const drawLevel = function (lx, lev, col) {
      const ly = plot.Y(lev.E);
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(lx - 28, ly);
      ctx.lineTo(lx + 28, ly);
      ctx.stroke();
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '8px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(lev.label || lev.E + ' MeV', lx, ly - 6);
    };

    s.parentLevels.forEach(function (l) { drawLevel(pX, l, COL.parent); });
    s.daughterLevels.forEach(function (l) { drawLevel(dX, l, COL.daughter); });

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px system-ui,sans-serif';
    ctx.fillText('parent', pX, pad[3] + 10);
    ctx.fillText('daughter', dX, pad[3] + 10);

    s.transitions.forEach(function (tr) {
      const meta = modeMeta(tr.type === 'gamma' ? 'gamma' : tr.type === 'betaMinus' ? 'betaMinus' : tr.type === 'betaPlus' ? 'betaPlus' : 'alpha');
      const y1 = plot.Y(tr.fromE);
      const y2 = plot.Y(tr.toE);
      const x1 = tr.type === 'gamma' ? dX + 32 : pX + 32;
      const x2 = tr.type === 'gamma' ? dX + 32 : dX - 32;
      ctx.strokeStyle = meta.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (tr.type === 'gamma') {
        ctx.moveTo(x2, y1);
        ctx.lineTo(x2, y2);
      } else {
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.stroke();
      ctx.fillStyle = meta.color;
      ctx.font = '600 9px system-ui,sans-serif';
      ctx.textAlign = 'left';
      const lx = tr.type === 'gamma' ? x2 + 4 : (x1 + x2) / 2;
      const ly = tr.type === 'gamma' ? (y1 + y2) / 2 : (y1 + y2) / 2 - 6;
      ctx.fillText((tr.label || meta.label) + ' ' + tr.E.toFixed(2) + ' MeV', lx, ly);
    });

    this._drawAnimatedParticles(ctx, pX, dX, plot, s);
  }

  _drawAnimatedParticles(ctx, pX, dX, plot, s) {
    for (let i = 0; i < this._events.length; i++) {
      const e = this._events[i];
      const tr = s.transitions[0];
      const y1 = plot.Y(tr.fromE);
      const y2 = plot.Y(tr.toE);
      const t = e.t;
      let px; let py;
      if (e.type === 'gamma') {
        px = dX + 32;
        py = y1 + (y2 - y1) * t;
      } else if (e.type === 'alpha') {
        px = pX + 32 + (dX - 32 - pX - 32) * t;
        py = y1 + (y2 - y1) * t;
      } else {
        px = pX + 32 + (dX - 32 - pX - 32) * t;
        py = y1 + (y2 - y1) * t - Math.sin(t * Math.PI) * 18;
      }
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = e.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.stroke();
    }
  }

  _drawEquationBox(ctx, x, y, w, h, s) {
    ctx.strokeStyle = 'rgba(51,65,85,0.7)';
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#64748b';
    ctx.font = '600 10px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Reaction & notes', x + 8, y + 14);

    const m = modeMeta(s.mode);
    ctx.fillStyle = m.color;
    ctx.font = '700 11px system-ui,sans-serif';
    ctx.fillText(m.label, x + 8, y + 34);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10px system-ui,sans-serif';
    this._wrapText(ctx, s.equation, x + 8, y + 52, w - 16, 14);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px system-ui,sans-serif';
    this._wrapText(ctx, s.note, x + 8, y + h * 0.45, w - 16, 12);

    if (s.extra) {
      ctx.fillStyle = '#a78bfa';
      this._wrapText(ctx, s.extra, x + 8, y + h - 28, w - 16, 12);
    }

    ctx.fillStyle = 'rgba(34,211,238,0.12)';
    ctx.fillRect(x + 8, y + h - 52, w - 16, 36);
    ctx.fillStyle = CANVAS_COLORS.accent;
    ctx.font = '600 10px system-ui,sans-serif';
    ctx.fillText('Q = ' + s.Q + ' MeV released', x + 14, y + h - 30);
  }

  _wrapText(ctx, text, x, y, maxW, lineH) {
    const words = text.split(' ');
    let line = '';
    let ly = y;
    for (let i = 0; i < words.length; i++) {
      const test = line + words[i] + ' ';
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line.trim(), x, ly);
        line = words[i] + ' ';
        ly += lineH;
      } else {
        line = test;
      }
    }
    ctx.fillText(line.trim(), x, ly);
  }

  _drawSpectrum(ctx, x, y, w, h, s) {
    ctx.strokeStyle = 'rgba(51,65,85,0.7)';
    ctx.strokeRect(x, y, w, h);
    const spec = s.spectrum;
    const plotH = h - 28;
    const plotY = y + 18;

    if (spec.kind === 'beta') {
      ctx.fillStyle = '#64748b';
      ctx.font = '600 10px system-ui,sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('β energy spectrum — continuous (neutrino shares energy)', x + 8, y + 12);
      const Q = spec.Q;
      const pad = [x + 40, plotY, x + w - 16, plotY + plotH];
      const plot = new Plot(ctx, pad, [0, Q * 1.05], [0, 1.05]);
      plot.axes('E (MeV)', 'relative intensity', [0, Q * 0.5, Q], function (v) { return v.toFixed(2); });

      const xs = [];
      const ys = [];
      let yMax = 1e-9;
      for (let k = 0; k <= 80; k++) {
        const E = (k / 80) * Q;
        const d = betaSpectrumDensity(E, Q);
        xs.push(E);
        ys.push(d);
        if (d > yMax) yMax = d;
      }
      for (let i = 0; i < ys.length; i++) ys[i] /= yMax;

      ctx.beginPath();
      for (let i = 0; i < xs.length; i++) {
        const px = plot.X(xs[i]);
        const py = plot.Y(ys[i]);
        if (i === 0) ctx.moveTo(px, plot.Y(0));
        ctx.lineTo(px, py);
      }
      ctx.lineTo(plot.X(xs[xs.length - 1]), plot.Y(0));
      ctx.closePath();
      ctx.fillStyle = 'rgba(74,222,128,0.22)';
      ctx.fill();
      plot.curve(xs, ys, '#4ade80', 2);

      ctx.fillStyle = '#86efac';
      ctx.font = '9px system-ui,sans-serif';
      ctx.fillText('E_max = ' + Q.toFixed(2) + ' MeV', pad[0], pad[1] - 4);

      for (let i = 0; i < this._events.length; i++) {
        const e = this._events[i];
        if (e.type !== 'betaMinus' && e.type !== 'betaPlus') continue;
        const px = plot.X(e.E);
        ctx.strokeStyle = 'rgba(74,222,128,0.8)';
        ctx.beginPath();
        ctx.moveTo(px, plot.Y(0));
        ctx.lineTo(px, plot.Y(betaSpectrumDensity(e.E, Q) / yMax));
        ctx.stroke();
      }
    } else if (spec.kind === 'line') {
      ctx.fillStyle = '#64748b';
      ctx.font = '600 10px system-ui,sans-serif';
      ctx.fillText('α spectrum — discrete line (mono-energetic)', x + 8, y + 12);
      const pad = [x + 40, plotY, x + w * 0.45, plotY + plotH];
      const plot = new Plot(ctx, pad, [0, spec.lines[0].E * 1.3], [0, 1.2]);
      plot.axes('E (MeV)', '', [0, spec.lines[0].E], function (v) { return v.toFixed(1); });
      spec.lines.forEach(function (ln) {
        plot.vline(ln.E, '#f87171', []);
        ctx.fillStyle = '#fca5a5';
        ctx.font = '9px system-ui,sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ln.label + ' @ ' + ln.E + ' MeV', plot.X(ln.E), plot.y0 - 4);
      });
    } else if (spec.kind === 'gamma') {
      ctx.fillStyle = '#64748b';
      ctx.font = '600 10px system-ui,sans-serif';
      ctx.fillText('γ lines — discrete energies (de-excitation)', x + 8, y + 12);
      const pad = [x + 40, plotY, x + w * 0.45, plotY + plotH];
      const eMax = Math.max.apply(null, spec.lines.map(function (l) { return l.E; })) * 1.2;
      const plot = new Plot(ctx, pad, [0, eMax], [0, 1.2]);
      plot.axes('E (MeV)', '', [0, 1, 1.33], function (v) { return v.toFixed(2); });
      spec.lines.forEach(function (ln, i) {
        plot.vline(ln.E, '#a78bfa', []);
        ctx.fillStyle = '#c4b5fd';
        ctx.font = '9px system-ui,sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ln.label + '  ' + ln.E + ' MeV', plot.X(ln.E), plot.y0 - 4 - i * 10);
      });
    }

    const legX = x + w * 0.52;
    ctx.fillStyle = '#64748b';
    ctx.font = '600 10px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Compare decay types', legX, y + 12);
    const items = [
      ['α', 'discrete line', '#f87171'],
      ['β', 'continuous', '#4ade80'],
      ['γ', 'discrete lines', '#a78bfa'],
    ];
    items.forEach(function (it, i) {
      ctx.fillStyle = it[2];
      ctx.fillRect(legX, y + 28 + i * 22, 10, 10);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px system-ui,sans-serif';
      ctx.fillText(it[0] + ' — ' + it[1], legX + 16, y + 37 + i * 22);
    });
  }
}
