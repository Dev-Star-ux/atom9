// 2D Bainbridge-style mass spectrometer (fully offline teaching view):
// accelerator → velocity selector → magnetic sector → detector + spectrum.
import { createDualCanvas } from '../common/teachPlots.js';
import { el } from '../common/ui.js';
import { ELEMENTS, M_MIN, M_MAX, radius as physRadius } from './physics.js';

function massColorCss(m) {
  const t = (m - M_MIN) / (M_MAX - M_MIN);
  const h = 210 - 210 * t;
  return 'hsl(' + Math.round(h) + ',78%,62%)';
}

export class MassSpec2D {
  constructor(host) {
    this.host = host;
    this.V = 2000;
    this.B = 1;
    this.nIons = 8;
    this.elementName = 'Chlorine (Cl)';
    this.isos = ELEMENTS[this.elementName];
    this.labels = {};
    this.showSelector = true;
    this.showRadius = true;
    this.paused = false;
    this.ions = [];
    this.hits = {}; // mass → count
    this._buildToggles();
    this._respawnAll();
    const self = this;
    this._canvas = createDualCanvas(host, function (ctx, w, h, phase) {
      if (!self.paused) self._step(0.016);
      self._draw(ctx, w, h, phase);
    });
  }

  _buildToggles() {
    const box = el('div', 'dual-2d-toggles mass-spec-toggles');
    const self = this;
    function add(label, key) {
      const lab = el('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = self[key];
      cb.onchange = function () { self[key] = cb.checked; };
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode(' ' + label));
      box.appendChild(lab);
    }
    add('Velocity selector', 'showSelector');
    add('Radius marks', 'showRadius');
    this.host.appendChild(box);
    this._tog = box;
  }

  setLabels(labels) { this.labels = labels || {}; }
  setPaused(v) {
    this.paused = !!v;
    this._canvas.setPaused(v);
  }
  setApparatusVisible() { /* 2D always shows schematic */ }
  setIonCount(n) {
    this.nIons = Math.max(1, Math.round(n));
    this._respawnAll();
  }
  setElement(name) {
    this.elementName = name;
    this.isos = ELEMENTS[name] || ELEMENTS['Chlorine (Cl)'];
    this.hits = {};
    this._respawnAll();
  }
  setParams(V, B) {
    if (V != null) this.V = V;
    if (B != null) this.B = B;
    this.hits = {};
    this._respawnAll();
  }
  // dualView calls setParams(object) — accept both styles
  setParamsObj(p) {
    if (!p) return;
    if (typeof p === 'object' && !Array.isArray(p)) {
      if (p.V != null) this.V = p.V;
      if (p.B != null) this.B = p.B;
      if (p.elementName) this.setElement(p.elementName);
      if (p.ionCount != null) this.setIonCount(p.ionCount);
    }
  }

  resize() { this._canvas.resize(); }
  tick() {}

  _pickMass() {
    const r = Math.random();
    let a = 0;
    for (let i = 0; i < this.isos.length; i++) {
      a += this.isos[i].ab;
      if (r <= a) return this.isos[i].m;
    }
    return this.isos[this.isos.length - 1].m;
  }

  _rScale(layout) {
    // Map physical radius into detector half-circle pixels (fill most of the sector)
    const rPhys = physRadius(40, this.V, this.B); // mid-mass reference
    const target = layout.fieldR * 0.88;
    return target / Math.max(1e-6, rPhys);
  }

  _radiusPx(m, layout) {
    return physRadius(m, this.V, this.B) * this._rScale(layout);
  }

  _respawnAll() {
    this.ions = [];
    for (let i = 0; i < this.nIons; i++) this.ions.push(this._newIon(Math.random()));
  }

  _newIon(delay) {
    return {
      m: this._pickMass(),
      phase: 'acc', // acc → select → arc → done
      t: delay != null ? -delay : 0, // negative = wait
      a: 0,
    };
  }

  _layout(W, H) {
    // Reserve chrome: title, 2D|3D toggle (top-right), flow + pause (bottom), spectrum (bottom-left)
    const titleH = 44;
    const footerH = 58;
    const sidePad = 24;
    const availW = Math.max(320, W - sidePad * 2);
    const availH = Math.max(220, H - titleH - footerH);

    const accW = Math.min(120, Math.max(84, availW * 0.13));
    const selW = this.showSelector ? Math.min(108, Math.max(72, availW * 0.11)) : 0;
    const preW = accW + selW + 20;

    // Larger sector — use most of the free viewport
    const fieldR = Math.min(
      (availW - preW - 48) * 0.82,
      availH * 0.48,
      320
    );
    const stageW = preW + fieldR + 64;
    const stageH = fieldR * 2 + 72;

    const stageLeft = (W - stageW) / 2;
    const stageTop = titleH + Math.max(4, (availH - stageH) / 2);

    const midY = stageTop + 56;
    const entryX = stageLeft + preW;
    const entryY = midY;

    return {
      left: stageLeft,
      right: stageLeft + stageW,
      top: stageTop,
      bot: stageTop + stageH,
      midY: midY,
      accW: accW,
      selW: selW,
      fieldLeft: entryX,
      fieldR: Math.max(100, fieldR),
      cx: entryX,
      cy: midY,
      detY: midY + fieldR + 8,
      entryX: entryX,
      entryY: entryY,
      stageCenterX: W / 2,
      stageCenterY: stageTop + stageH / 2,
    };
  }

  _step(dt) {
    const dummy = this._layout(800, 480); // radii scale independent of exact size via _rScale
    void dummy;
    for (let i = 0; i < this.ions.length; i++) {
      const ion = this.ions[i];
      ion.t += dt * 1.35;
      if (ion.t < 0) continue;
      if (ion.phase === 'acc') {
        if (ion.t > 0.55) { ion.phase = 'select'; ion.t = 0; }
      } else if (ion.phase === 'select') {
        if (ion.t > 0.45) { ion.phase = 'arc'; ion.t = 0; ion.a = 0; }
      } else if (ion.phase === 'arc') {
        const speed = 1.8 / Math.sqrt(ion.m) + 0.35;
        ion.a += dt * speed;
        if (ion.a >= Math.PI) {
          const key = String(ion.m);
          this.hits[key] = (this.hits[key] || 0) + 1;
          this.ions[i] = this._newIon(0.15 + Math.random() * 0.4);
        }
      }
    }
  }

  _ionPos(ion, L) {
    const acc0 = L.left + 10;
    const acc1 = L.left + L.accW;
    const sel0 = acc1;
    const sel1 = acc1 + L.selW;
    const entry = { x: L.entryX, y: L.entryY };
    if (ion.t < 0) return { x: acc0, y: L.midY, visible: false };
    if (ion.phase === 'acc') {
      const u = Math.min(1, ion.t / 0.55);
      return { x: acc0 + (acc1 - acc0) * u, y: L.midY, visible: true };
    }
    if (ion.phase === 'select') {
      const u = Math.min(1, ion.t / 0.45);
      const x0 = L.selW > 0 ? sel0 : acc1;
      const x1 = L.selW > 0 ? sel1 : entry.x;
      return { x: x0 + (x1 - x0) * u, y: L.midY, visible: true };
    }
    // arc: semicircle in B-field, center below entry so path curves downward to detector
    const r = this._radiusPx(ion.m, L);
    const a = Math.min(Math.PI, ion.a);
    // center of circle is below entry at (entry.x, entry.y + r)? 
    // Physics Classroom: ions enter from left, curve in semicircle to land on detector below.
    // Center at (entry.x, entry.y), start at angle -π/2 going to +π/2... 
    // Better: center at (cx, cy)=(entry.x, entry.y), start going right then down then left?
    // Classic Bainbridge: beam enters at top of semicircle, lands on plate along diameter.
    // Entry at left of field: center = (entry.x, entry.y), angle from -π/2 (up?):
    // Actually: center below entry: C=(entry.x, entry.y), start angle = -π/2 means point above center...
    // Start at left: angle=π, end at angle=0 (right) for lower semicircle? 
    // Standard: r = m v / (q B), path is half-circle. Entry E, center C below E by 0:
    // Let C = (entry.x, entry.y), ion starts at angle = π (left of C? no that's left).
    // Entry from left into field: ion at (entry.x, entry.y), velocity +x.
    // B into page for +q → force down → clockwise. Center is below entry: C=(entry.x, entry.y + 0) wait.
    // For clockwise from going +x: center is BELOW: C = (entry.x, entry.y + r) is wrong.
    // Velocity +x, B into page, F = q(v × B) for +q: v×B is -y (down). Centripetal toward center, so center is below: C=(ex, ey+r)? Force is toward center. Force is down, so center is down from ion: C=(ex, ey+r) but ion starts at (ex,ey) which is distance r above C. Angle from vertical: at start, vector from C to ion is (0,-r), angle=-π/2. Clockwise increases angle toward 0 (right) then π/2 (down)... Actually clockwise from -π/2 goes to -π, -3π/2...
    // Use parametric: angle from 0 at start (rightward tangent):
    // x = ex + r * sin(a)
    // y = ey + r * (1 - cos(a))
    // At a=0: (ex, ey); a=π/2: (ex+r, ey+r); a=π: (ex, ey+2r) — lands below. Perfect for detector under.
    const x = entry.x + r * Math.sin(a);
    const y = entry.y + r * (1 - Math.cos(a));
    return { x: x, y: y, visible: true, r: r };
  }

  _draw(ctx, W, H) {
    if (!W || !H) return;
    const L = this._layout(W, H);
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);

    // Title stays clear of top-right 2D|3D toggle
    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 15px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Mass Spectrometer', W / 2, 20);
    ctx.fillStyle = '#8092b4';
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText(
      'V = ' + this.V + ' V  ·  B = ' + this.B.toFixed(2) + ' T  ·  r ∝ √m',
      W / 2,
      36
    );
    ctx.textAlign = 'left';

    const boxH = 96;
    const boxTop = L.midY - boxH / 2;

    // --- Charge accelerator ---
    ctx.fillStyle = 'rgba(251,191,36,0.12)';
    ctx.fillRect(L.left, boxTop, L.accW, boxH);
    ctx.strokeStyle = 'rgba(251,191,36,0.55)';
    ctx.strokeRect(L.left, boxTop, L.accW, boxH);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(L.left + 10, boxTop + 8, L.accW - 20, 7);
    ctx.fillRect(L.left + 10, boxTop + boxH - 15, L.accW - 20, 7);
    // Labels inside the chamber so they never hit title / toggles
    ctx.fillStyle = '#fbbf24';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.labels.source || 'accelerator', L.left + L.accW / 2, L.midY - 8);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('+V', L.left + L.accW / 2, L.midY + 18);

    // --- Velocity selector ---
    if (L.selW > 0) {
      const sx = L.left + L.accW;
      ctx.fillStyle = 'rgba(167,139,250,0.10)';
      ctx.fillRect(sx, boxTop, L.selW, boxH);
      ctx.strokeStyle = 'rgba(167,139,250,0.5)';
      ctx.strokeRect(sx, boxTop, L.selW, boxH);
      ctx.fillStyle = '#a78bfa';
      ctx.font = '600 11px system-ui,sans-serif';
      ctx.fillText('velocity', sx + L.selW / 2, L.midY - 14);
      ctx.fillText('selector', sx + L.selW / 2, L.midY);
      ctx.fillStyle = '#c4b5fd';
      ctx.font = '10px system-ui,sans-serif';
      ctx.fillText('E ↑  B ⊗', sx + L.selW / 2, L.midY + 22);
      for (let i = 0; i < 3; i++) {
        const x = sx + 16 + i * (L.selW - 28) / 2;
        ctx.fillStyle = 'rgba(167,139,250,0.55)';
        ctx.font = '13px system-ui,sans-serif';
        ctx.fillText('×', x, boxTop + 22);
      }
      ctx.fillStyle = '#0a1020';
      ctx.fillRect(sx + L.selW - 4, L.midY - 12, 6, 24);
    }

    // --- Magnetic field sector ---
    ctx.fillStyle = 'rgba(59,130,246,0.08)';
    ctx.beginPath();
    ctx.arc(L.cx, L.cy, L.fieldR + 10, -0.12, Math.PI + 0.12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(96,165,250,0.45)';
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(L.cx, L.cy, L.fieldR + 10, 0, Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);
    // Magnet label inside the open sector (right of entry), clear of arcs' start
    ctx.fillStyle = '#93c5fd';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(this.labels.magnet || 'magnetic field B ⊗', L.cx + 18, L.cy + 16);
    const markStep = Math.max(26, L.fieldR / 7);
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 4; j++) {
        const x = L.cx + 36 + i * markStep;
        const y = L.cy + 36 + j * markStep;
        if (Math.hypot(x - L.cx, y - L.cy) > L.fieldR - 8) continue;
        ctx.fillStyle = 'rgba(96,165,250,0.4)';
        ctx.font = '12px system-ui,sans-serif';
        ctx.fillText('×', x, y);
      }
    }

    // Reference arcs for each isotope
    const isos = this.isos;
    let rMin = Infinity;
    let rMax = 0;
    for (let i = 0; i < isos.length; i++) {
      const m = isos[i].m;
      const r = this._radiusPx(m, L);
      if (r < rMin) rMin = r;
      if (r > rMax) rMax = r;
      ctx.strokeStyle = massColorCss(m);
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let k = 0; k <= 48; k++) {
        const a = (k / 48) * Math.PI;
        const x = L.entryX + r * Math.sin(a);
        const y = L.entryY + r * (1 - Math.cos(a));
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      const lx = L.entryX;
      const ly = L.entryY + 2 * r;
      ctx.fillStyle = massColorCss(m);
      ctx.beginPath();
      ctx.arc(lx, ly, 5, 0, Math.PI * 2);
      ctx.fill();
      if (this.showRadius) {
        // Labels to the right of the hit, staggered so isotopes stay readable
        ctx.fillStyle = '#eaf0fb';
        ctx.font = '11px system-ui,sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('m = ' + m, lx + 14, ly + 4 + (i - (isos.length - 1) / 2) * 2);
      }
    }

    // Detector plate (along focal line under arcs)
    const detTop = L.entryY + 2 * rMin - 10;
    const detBot = L.entryY + 2 * rMax + 10;
    ctx.fillStyle = 'rgba(45,212,191,0.18)';
    ctx.fillRect(L.entryX - 20, detTop, 20, detBot - detTop);
    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = 2;
    ctx.strokeRect(L.entryX - 20, detTop, 20, detBot - detTop);
    ctx.fillStyle = '#5eead4';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.save();
    ctx.translate(L.entryX - 32, (detTop + detBot) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText(this.labels.detector || 'detector', 0, 0);
    ctx.restore();

    // Live ions
    for (let i = 0; i < this.ions.length; i++) {
      const p = this._ionPos(this.ions[i], L);
      if (!p.visible) continue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = massColorCss(this.ions[i].m);
      ctx.fill();
      ctx.strokeStyle = '#eaf0fb';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Spectrum card — larger, zoomed to this sample's isotopes
    let mLo = Infinity;
    let mHi = -Infinity;
    for (let i = 0; i < isos.length; i++) {
      if (isos[i].m < mLo) mLo = isos[i].m;
      if (isos[i].m > mHi) mHi = isos[i].m;
    }
    const padM = Math.max(4, (mHi - mLo) * 0.6 + 2);
    mLo = Math.max(M_MIN, mLo - padM);
    mHi = Math.min(M_MAX, mHi + padM);

    const sw = 220;
    const sh = Math.min(180, Math.max(140, H * 0.28));
    const sx0 = 12;
    const sy0 = H - sh - 58;
    ctx.fillStyle = 'rgba(10,17,34,0.92)';
    ctx.fillRect(sx0, sy0, sw, sh);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(sx0, sy0, sw, sh);
    ctx.fillStyle = '#eaf0fb';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Mass spectrum', sx0 + 10, sy0 + 16);
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui,sans-serif';
    ctx.fillText('hits at detector (by m)', sx0 + 10, sy0 + 30);

    let hitMax = 1;
    for (const k in this.hits) if (this.hits[k] > hitMax) hitMax = this.hits[k];
    const plotL = sx0 + 28;
    const plotR = sx0 + sw - 14;
    const plotT = sy0 + 42;
    const plotB = sy0 + sh - 24;
    for (let i = 0; i < isos.length; i++) {
      const m = isos[i].m;
      const ab = isos[i].ab;
      const x = plotL + ((m - mLo) / Math.max(1e-6, mHi - mLo)) * (plotR - plotL);
      const hIdeal = (plotB - plotT) * ab;
      ctx.fillStyle = 'rgba(148,163,184,0.25)';
      ctx.fillRect(x - 8, plotB - hIdeal, 16, hIdeal);
      const hits = this.hits[String(m)] || 0;
      const hLive = (plotB - plotT) * (hits / hitMax) * 0.95;
      ctx.fillStyle = massColorCss(m);
      ctx.fillRect(x - 7, plotB - hLive, 14, hLive);
      ctx.fillStyle = '#eaf0fb';
      ctx.font = '600 11px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(m), x, plotB + 14);
    }
    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(plotL, plotB);
    ctx.lineTo(plotR, plotB);
    ctx.stroke();
    ctx.textAlign = 'left';
  }

  dispose() {
    if (this._tog && this._tog.parentNode) this._tog.parentNode.removeChild(this._tog);
    this._canvas.dispose();
  }
}
