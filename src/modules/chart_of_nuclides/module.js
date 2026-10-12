import { el, principleCard, infoTable } from '../common/ui.js';
import {
  NUCLIDES, DECAY_COLORS, CHAINS, getNuclide, getChainFor, findChainContaining, nuclideLabel,
} from './nuclidesData.js';

class ChartOfNuclidesInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.selected = getNuclide(92, 238);
    this._overlay = null;
    this._chainOverlay = null;
    this._hover = null;
    this._pad = { l: 52, r: 18, t: 28, b: 42 };
    this.zoom = 1;
    this._viewN0 = 0;
    this._viewZ0 = 0;
    this._zoomMin = 1;
    this._zoomMax = 12;
    this._drag = null;
    this._didDrag = false;
  }

  T(k, v) { return this.t('modules.chart_of_nuclides.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-orbital', 'module-cn');
    this.viewport = el('div', 'viewport cn-viewport');
    root.appendChild(this.viewport);

    this.panel = el('div', 'panel cn-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.chart_of_nuclides'));
    this.panel.appendChild(this._buildLegendCard());
    this.panel.appendChild(this._buildHintCard());
    root.appendChild(this.panel);

    this._shell = el('div', 'cn-shell');
    this.viewport.appendChild(this._shell);
    this._shell.appendChild(el('div', 'cn-title', this.T('title')));
    this._shell.appendChild(el('p', 'cn-sub', this.T('pageDesc')));

    this._canvasWrap = el('div', 'cn-canvas-wrap');
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'cn-canvas';
    this._canvasWrap.appendChild(this.canvas);
    this._shell.appendChild(this._canvasWrap);

    this._shell.appendChild(this._buildZoomBar());

    this._hud = el('div', 'cn-hud', this.T('hudIdle'));
    this._shell.appendChild(this._hud);

    this.ctx2d = this.canvas.getContext('2d');
    this._computeBounds();
    this._index = this._buildIndex();

    this._onResize = function () { self._draw(); };
    this._onClick = function (ev) { self._handlePointer(ev, true); };
    this._onMove = function (ev) { self._handlePointer(ev, false); };
    this._onWinMove = function (ev) {
      if (self._drag) self._handlePointer(ev, false);
    };
    this._onWheel = function (ev) { self._handleWheel(ev); };
    this._onDown = function (ev) { self._handleDown(ev); };
    this._onUp = function (ev) { self._handleUp(ev); };
    this._onLeave = function () {
      self._hover = null;
      if (!self._drag) {
        self._hud.textContent = self.T('hudIdle');
        self._draw();
      }
    };
    window.addEventListener('resize', this._onResize);
    window.addEventListener('mouseup', this._onUp);
    window.addEventListener('mousemove', this._onWinMove);
    this.canvas.addEventListener('click', this._onClick);
    this.canvas.addEventListener('mousemove', this._onMove);
    this.canvas.addEventListener('mousedown', this._onDown);
    this.canvas.addEventListener('mouseleave', this._onLeave);
    this.canvas.addEventListener('wheel', this._onWheel, { passive: false });

    this._syncZoomUI();
    this._draw();
  }

  _buildZoomBar() {
    const self = this;
    const bar = el('div', 'cn-zoom-bar');
    bar.appendChild(el('span', 'cn-zoom-label', this.T('controls.zoom')));

    const minus = el('button', 'btn cn-zoom-btn', '−');
    minus.type = 'button';
    minus.title = this.T('controls.zoomOut');
    minus.onclick = function () { self._bumpZoom(1 / 1.25); };

    const plus = el('button', 'btn cn-zoom-btn', '+');
    plus.type = 'button';
    plus.title = this.T('controls.zoomIn');
    plus.onclick = function () { self._bumpZoom(1.25); };

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'cn-zoom-slider';
    slider.min = String(this._zoomMin * 100);
    slider.max = String(this._zoomMax * 100);
    slider.step = '5';
    slider.value = '100';
    slider.setAttribute('aria-label', this.T('controls.zoom'));
    slider.oninput = function () {
      self._setZoom(Number(slider.value) / 100, null, null, false);
    };

    const pct = el('span', 'cn-zoom-pct', '100%');
    const reset = el('button', 'btn cn-zoom-reset', this.T('controls.zoomReset'));
    reset.type = 'button';
    reset.onclick = function () {
      self.zoom = 1;
      self._viewN0 = 0;
      self._viewZ0 = 0;
      self._syncZoomUI();
      self._draw();
    };

    bar.appendChild(minus);
    bar.appendChild(slider);
    bar.appendChild(plus);
    bar.appendChild(pct);
    bar.appendChild(reset);
    this._zoomSlider = slider;
    this._zoomPct = pct;
    return bar;
  }

  _syncZoomUI() {
    if (this._zoomSlider) this._zoomSlider.value = String(Math.round(this.zoom * 100));
    if (this._zoomPct) this._zoomPct.textContent = Math.round(this.zoom * 100) + '%';
  }

  _bumpZoom(factor) {
    const w = this._w || 800;
    const h = this._h || 480;
    this._setZoom(this.zoom * factor, w / 2, h / 2, true);
  }

  _setZoom(next, anchorX, anchorY, fromButtons) {
    const z0 = Math.max(this._zoomMin, Math.min(this._zoomMax, next));
    if (!this._plot) {
      this.zoom = z0;
      this._syncZoomUI();
      this._draw();
      return;
    }
    let focusN = null;
    let focusZ = null;
    if (anchorX != null && anchorY != null) {
      const world = this._xyToWorld(anchorX, anchorY);
      if (world) {
        focusN = world.n;
        focusZ = world.z;
      }
    }
    this.zoom = z0;
    this._applyViewMetrics();
    if (focusN != null) {
      const p = this._plot;
      this._viewN0 = focusN - (anchorX - p.x0) / this._cellW;
      this._viewZ0 = focusZ - (p.y1 - anchorY) / this._cellH;
    }
    this._clampView();
    this._syncZoomUI();
    this._draw();
  }

  _handleWheel(ev) {
    ev.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    const factor = ev.deltaY < 0 ? 1.12 : 1 / 1.12;
    this._setZoom(this.zoom * factor, x, y, false);
  }

  _handleDown(ev) {
    if (ev.button !== 0) return;
    const rect = this.canvas.getBoundingClientRect();
    this._drag = {
      x: ev.clientX,
      y: ev.clientY,
      n0: this._viewN0,
      z0: this._viewZ0,
    };
    this._didDrag = false;
    this.canvas.classList.add('dragging');
  }

  _handleUp() {
    this._drag = null;
    this.canvas.classList.remove('dragging');
  }

  _buildLegendCard() {
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.legend')));
    const wrap = el('div', 'cn-legend');
    const items = [
      ['stable', this.T('legend.stable')],
      ['β⁻', this.T('legend.bm')],
      ['β⁺', this.T('legend.bp')],
      ['α', this.T('legend.alpha')],
      ['radioactive', this.T('legend.other')],
    ];
    items.forEach(function (it) {
      const row = el('div', 'cn-legend-item');
      const sw = el('span', 'cn-swatch');
      sw.style.background = DECAY_COLORS[it[0]] || '#94a3b8';
      row.appendChild(sw);
      row.appendChild(el('span', null, it[1]));
      wrap.appendChild(row);
    });
    card.appendChild(wrap);
    return card;
  }

  _buildHintCard() {
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.howto')));
    card.appendChild(el('p', 'param-help', this.T('controls.howtoBody')));
    const btn = el('button', 'btn primary', this.T('controls.openU238'));
    const self = this;
    btn.type = 'button';
    btn.onclick = function () {
      const n = getNuclide(92, 238);
      if (n) self._openNuclideModal(n);
    };
    card.appendChild(btn);
    return card;
  }

  _computeBounds() {
    let nMax = 0;
    let zMax = 0;
    for (let i = 0; i < NUCLIDES.length; i++) {
      nMax = Math.max(nMax, NUCLIDES[i].n);
      zMax = Math.max(zMax, NUCLIDES[i].z);
    }
    this.nMax = nMax + 2;
    this.zMax = zMax + 2;
  }

  _buildIndex() {
    const idx = {};
    for (let i = 0; i < NUCLIDES.length; i++) {
      const n = NUCLIDES[i];
      idx[n.z + ',' + n.n] = n;
    }
    return idx;
  }

  _applyViewMetrics() {
    const p = this._plot;
    if (!p) return;
    const spanN = this.nMax / this.zoom;
    const spanZ = this.zMax / this.zoom;
    this._spanN = spanN;
    this._spanZ = spanZ;
    this._cellW = (p.x1 - p.x0) / spanN;
    this._cellH = (p.y1 - p.y0) / spanZ;
  }

  _clampView() {
    const maxN0 = Math.max(0, this.nMax - this._spanN);
    const maxZ0 = Math.max(0, this.zMax - this._spanZ);
    this._viewN0 = Math.max(0, Math.min(maxN0, this._viewN0));
    this._viewZ0 = Math.max(0, Math.min(maxZ0, this._viewZ0));
  }

  _layout() {
    const wrap = this._canvasWrap;
    const w = Math.max(640, wrap.clientWidth || 800);
    const h = Math.max(420, Math.floor(w * 0.58));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._w = w;
    this._h = h;
    const pad = this._pad;
    this._plot = {
      x0: pad.l,
      y0: pad.t,
      x1: w - pad.r,
      y1: h - pad.b,
    };
    this._applyViewMetrics();
    this._clampView();
  }

  _nzToXY(n, z) {
    const p = this._plot;
    const x = p.x0 + (n - this._viewN0 + 0.5) * this._cellW;
    const y = p.y1 - (z - this._viewZ0 + 0.5) * this._cellH;
    return { x: x, y: y };
  }

  _xyToWorld(x, y) {
    const p = this._plot;
    if (x < p.x0 || x > p.x1 || y < p.y0 || y > p.y1) return null;
    return {
      n: this._viewN0 + (x - p.x0) / this._cellW,
      z: this._viewZ0 + (p.y1 - y) / this._cellH,
    };
  }

  _xyToNZ(x, y) {
    const world = this._xyToWorld(x, y);
    if (!world) return null;
    return { n: Math.floor(world.n), z: Math.floor(world.z) };
  }

  _colorFor(nu) {
    if (!nu) return '#334155';
    if (DECAY_COLORS[nu.decay]) return DECAY_COLORS[nu.decay];
    if (nu.halfLife === 'stable' || nu.decay === 'stable') return DECAY_COLORS.stable;
    if (String(nu.decay).indexOf('α') >= 0) return DECAY_COLORS['α'];
    if (String(nu.decay).indexOf('β⁺') >= 0 || String(nu.decay).indexOf('β+') >= 0) return DECAY_COLORS['β⁺'];
    if (String(nu.decay).indexOf('β') >= 0) return DECAY_COLORS['β⁻'];
    return DECAY_COLORS.radioactive;
  }

  _tickStep(span, prefer) {
    const raw = Math.max(span / prefer, 1e-6);
    const pow = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    const n = raw / pow;
    let step = pow;
    if (n > 5) step = 10 * pow;
    else if (n > 2) step = 5 * pow;
    else if (n > 1) step = 2 * pow;
    return Math.max(1, Math.round(step));
  }

  _draw() {
    this._layout();
    const ctx = this.ctx2d;
    const w = this._w;
    const h = this._h;
    const p = this._plot;
    const n0 = this._viewN0;
    const z0 = this._viewZ0;
    const n1 = n0 + this._spanN;
    const z1 = z0 + this._spanZ;

    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.beginPath();
    ctx.rect(p.x0, p.y0, p.x1 - p.x0, p.y1 - p.y0);
    ctx.clip();

    // grid
    const stepN = this._tickStep(this._spanN, 10);
    const stepZ = this._tickStep(this._spanZ, 8);
    ctx.strokeStyle = 'rgba(148,163,184,0.1)';
    ctx.lineWidth = 1;
    const nStart = Math.floor(n0 / stepN) * stepN;
    for (let n = nStart; n <= n1 + 0.01; n += stepN) {
      const x = p.x0 + (n - n0) * this._cellW;
      ctx.beginPath();
      ctx.moveTo(x, p.y0);
      ctx.lineTo(x, p.y1);
      ctx.stroke();
    }
    const zStart = Math.floor(z0 / stepZ) * stepZ;
    for (let z = zStart; z <= z1 + 0.01; z += stepZ) {
      const y = p.y1 - (z - z0) * this._cellH;
      ctx.beginPath();
      ctx.moveTo(p.x0, y);
      ctx.lineTo(p.x1, y);
      ctx.stroke();
    }

    // nuclides (only those that can appear in view)
    const cw = Math.max(2, this._cellW - 0.6);
    const ch = Math.max(2, this._cellH - 0.6);
    const padN = 2;
    const padZ = 2;
    for (let i = 0; i < NUCLIDES.length; i++) {
      const nu = NUCLIDES[i];
      if (nu.n < n0 - padN || nu.n > n1 + padN || nu.z < z0 - padZ || nu.z > z1 + padZ) continue;
      const xy = this._nzToXY(nu.n, nu.z);
      ctx.fillStyle = this._colorFor(nu);
      ctx.globalAlpha = 0.92;
      ctx.fillRect(xy.x - cw / 2, xy.y - ch / 2, cw, ch);
    }
    ctx.globalAlpha = 1;

    // highlight selected / hover
    [this.selected, this._hover].forEach(function (nu, i) {
      if (!nu) return;
      const xy = this._nzToXY(nu.n, nu.z);
      ctx.strokeStyle = i === 0 ? '#2fe0d0' : '#e2e8f0';
      ctx.lineWidth = i === 0 ? 2.2 : 1.4;
      ctx.strokeRect(xy.x - cw / 2 - 1, xy.y - ch / 2 - 1, cw + 2, ch + 2);
    }, this);

    // magic numbers
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(125,211,252,0.28)';
    [2, 8, 20, 28, 50, 82, 126].forEach(function (m) {
      if (m >= n0 && m <= n1) {
        const x = p.x0 + (m - n0) * this._cellW;
        ctx.beginPath();
        ctx.moveTo(x, p.y0);
        ctx.lineTo(x, p.y1);
        ctx.stroke();
      }
      if (m >= z0 && m <= z1) {
        const y = p.y1 - (m - z0) * this._cellH;
        ctx.beginPath();
        ctx.moveTo(p.x0, y);
        ctx.lineTo(p.x1, y);
        ctx.stroke();
      }
    }, this);
    ctx.setLineDash([]);

    if (this._chainHighlight && this._chainHighlight.length) {
      this._drawChainPath(this._chainHighlight);
    }
    ctx.restore();

    // axes (outside clip)
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 12px Segoe UI, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.T('axis.n'), (p.x0 + p.x1) / 2, h - 12);
    ctx.save();
    ctx.translate(14, (p.y0 + p.y1) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(this.T('axis.z'), 0, 0);
    ctx.restore();

    ctx.font = '11px Segoe UI, system-ui, sans-serif';
    ctx.fillStyle = '#64748b';
    const labelStepN = this._tickStep(this._spanN, 6);
    const labelStepZ = this._tickStep(this._spanZ, 6);
    for (let n = Math.ceil(n0 / labelStepN) * labelStepN; n <= n1; n += labelStepN) {
      const x = p.x0 + (n - n0) * this._cellW;
      if (x < p.x0 + 4 || x > p.x1 - 4) continue;
      ctx.fillText(String(Math.round(n)), x, p.y1 + 16);
    }
    ctx.textAlign = 'right';
    for (let z = Math.ceil(z0 / labelStepZ) * labelStepZ; z <= z1; z += labelStepZ) {
      const y = p.y1 - (z - z0) * this._cellH;
      if (y < p.y0 + 4 || y > p.y1 - 4) continue;
      ctx.fillText(String(Math.round(z)), p.x0 - 8, y + 3);
    }
  }

  _handlePointer(ev, isClick) {
    const rect = this.canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;

    if (this._drag && !isClick && (ev.buttons & 1)) {
      const dx = ev.clientX - this._drag.x;
      const dy = ev.clientY - this._drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) this._didDrag = true;
      this._viewN0 = this._drag.n0 - dx / this._cellW;
      this._viewZ0 = this._drag.z0 + dy / this._cellH;
      this._clampView();
      this._draw();
      return;
    }

    if (isClick && this._didDrag) {
      this._didDrag = false;
      return;
    }

    const nz = this._xyToNZ(x, y);
    if (!nz) {
      if (!isClick) {
        this._hover = null;
        this._hud.textContent = this.T('hudIdle');
        this._draw();
      }
      return;
    }
    let found = this._index[nz.z + ',' + nz.n] || null;
    if (!found) {
      for (let dn = -1; dn <= 1 && !found; dn++) {
        for (let dz = -1; dz <= 1 && !found; dz++) {
          found = this._index[(nz.z + dz) + ',' + (nz.n + dn)] || null;
        }
      }
    }
    if (!found) {
      if (!isClick) {
        this._hover = null;
        this._hud.textContent = 'N = ' + nz.n + ' · Z = ' + nz.z;
        this._draw();
      }
      return;
    }
    this._hover = found;
    this._hud.textContent = nuclideLabel(found) + '   ·   N=' + found.n + '   Z=' + found.z + '   ·   ' + found.decay;
    this._draw();
    if (isClick) {
      this.selected = found;
      this._openNuclideModal(found);
    }
  }

  _openNuclideModal(nu) {
    this._closeAllModals();
    const self = this;
    const overlay = el('div', 'overlay cn-overlay');
    overlay.onclick = function (ev) {
      if (ev.target === overlay) self._closeAllModals();
    };

    const modal = el('div', 'cn-modal');
    const head = el('div', 'cn-modal-head');
    const badge = el('div', 'cn-badge');
    badge.textContent = nu.symbol;
    head.appendChild(badge);
    const titles = el('div', 'cn-modal-titles');
    titles.appendChild(el('div', 'cn-modal-name', nuclideLabel(nu)));
    titles.appendChild(el('div', 'cn-modal-sub', nu.name));
    head.appendChild(titles);
    const close = el('button', 'btn cn-modal-close', '✕');
    close.type = 'button';
    close.onclick = function () { self._closeAllModals(); };
    head.appendChild(close);
    modal.appendChild(head);

    const body = el('div', 'cn-modal-body');
    body.appendChild(infoTable([
      [this.T('info.z'), String(nu.z)],
      [this.T('info.n'), String(nu.n)],
      [this.T('info.a'), String(nu.a)],
      [this.T('info.half'), nu.halfLife || '—'],
      [this.T('info.decay'), nu.decay || '—'],
      [this.T('info.spin'), nu.spin || '—'],
      [this.T('info.be'), nu.bindingMeV != null ? nu.bindingMeV.toFixed(3) + ' MeV/nucleon' : '—'],
      [this.T('info.abund'), nu.abundance != null ? nu.abundance + ' %' : '—'],
    ]));

    const actions = el('div', 'cn-actions');
    const chainBtn = el('button', 'btn primary', this.T('controls.showChain'));
    chainBtn.type = 'button';
    const hit = getChainFor(nu.z, nu.a) || (findChainContaining(nu.z, nu.a) && findChainContaining(nu.z, nu.a).chain);
    if (!hit) {
      chainBtn.disabled = true;
      chainBtn.title = this.T('controls.noChain');
    }
    chainBtn.onclick = function () {
      self._closeNuclideModal();
      self._openChainView(nu);
    };
    actions.appendChild(chainBtn);
    body.appendChild(actions);
    if (!hit) body.appendChild(el('p', 'cn-note', this.T('controls.noChain')));

    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    this._overlay = overlay;

    this._onKey = function (ev) {
      if (ev.key === 'Escape') self._closeAllModals();
    };
    window.addEventListener('keydown', this._onKey);
  }

  _openChainView(nu) {
    this._closeAllModals();
    let chain = getChainFor(nu.z, nu.a);
    let startIndex = 0;
    if (!chain) {
      const found = findChainContaining(nu.z, nu.a);
      if (found) {
        chain = found.chain;
        startIndex = found.index;
      }
    }
    if (!chain) return;

    const self = this;
    const overlay = el('div', 'overlay cn-overlay');
    overlay.onclick = function (ev) {
      if (ev.target === overlay) self._closeAllModals();
    };

    const modal = el('div', 'cn-modal cn-chain-modal');
    const head = el('div', 'cn-modal-head');
    head.appendChild(el('div', 'cn-modal-name', this.T('chain.title')));
    const close = el('button', 'btn cn-modal-close', '✕');
    close.type = 'button';
    close.onclick = function () { self._closeAllModals(); };
    head.appendChild(close);
    modal.appendChild(head);

    const body = el('div', 'cn-modal-body');
    body.appendChild(el('p', 'cn-chain-heading', chain.title));
    body.appendChild(el('p', 'cn-note', this.T('chain.help')));

    const list = el('div', 'cn-chain-flow');
    const steps = chain.steps || [];
    for (let i = startIndex; i < steps.length; i++) {
      const step = steps[i];
      const node = el('div', 'cn-chain-node' + (i === startIndex ? ' current' : ''));
      const nu2 = getNuclide(step.z, step.a);
      let text = step.z + '-' + step.a;
      if (nu2) text = nuclideLabel(nu2);
      node.appendChild(el('div', 'cn-chain-nuclide', text));
      node.appendChild(el('div', 'cn-chain-meta',
        'Z=' + step.z + ' · N=' + (step.a - step.z) + ' · T½ = ' + (step.hl || '—')));
      list.appendChild(node);

      if (i < steps.length - 1 && step.mode && step.mode !== 'stable') {
        const arrow = el('div', 'cn-chain-arrow');
        arrow.appendChild(el('div', 'cn-arrow-mode', '↓  ' + step.mode));
        list.appendChild(arrow);
      }
    }
    body.appendChild(list);
    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    this._chainOverlay = overlay;

    this._onKey = function (ev) {
      if (ev.key === 'Escape') self._closeAllModals();
    };
    window.addEventListener('keydown', this._onKey);

    this._chainHighlight = steps.slice(startIndex);
    this._draw();
  }

  _drawChainPath(steps) {
    if (!steps || steps.length < 2 || !this.ctx2d) return;
    const ctx = this.ctx2d;
    ctx.save();
    ctx.strokeStyle = 'rgba(47, 224, 208, 0.9)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const xy = this._nzToXY(s.a - s.z, s.z);
      if (i === 0) ctx.moveTo(xy.x, xy.y);
      else ctx.lineTo(xy.x, xy.y);
    }
    ctx.stroke();
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const xy = this._nzToXY(s.a - s.z, s.z);
      ctx.fillStyle = i === 0 ? '#2fe0d0' : '#f8fafc';
      ctx.beginPath();
      ctx.arc(xy.x, xy.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(7, 11, 20, 0.9)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  _closeNuclideModal() {
    if (this._overlay && this._overlay.parentNode) this._overlay.parentNode.removeChild(this._overlay);
    this._overlay = null;
  }

  _closeChainView() {
    if (this._chainOverlay && this._chainOverlay.parentNode) {
      this._chainOverlay.parentNode.removeChild(this._chainOverlay);
    }
    this._chainOverlay = null;
    this._chainHighlight = null;
    this._draw();
  }

  _closeAllModals() {
    if (this._onKey) {
      window.removeEventListener('keydown', this._onKey);
      this._onKey = null;
    }
    this._closeNuclideModal();
    this._closeChainView();
  }

  unmount() {
    this._closeAllModals();
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('mouseup', this._onUp);
    window.removeEventListener('mousemove', this._onWinMove);
    if (this.canvas) {
      this.canvas.removeEventListener('click', this._onClick);
      this.canvas.removeEventListener('mousemove', this._onMove);
      this.canvas.removeEventListener('mousedown', this._onDown);
      this.canvas.removeEventListener('mouseleave', this._onLeave);
      this.canvas.removeEventListener('wheel', this._onWheel);
    }
  }
}

export default {
  id: 'chart_of_nuclides',
  icon: '🗺️',
  group: 'nuclear',
  navKey: 'modules.chart_of_nuclides.navTitle',
  titleKey: 'modules.chart_of_nuclides.title',
  descKey: 'modules.chart_of_nuclides.desc',
  create: function (ctx) {
    return new ChartOfNuclidesInstance(ctx);
  },
};
