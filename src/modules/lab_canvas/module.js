import { LabCanvasScene, COMPONENTS, EXPERIMENTS, getExperiment } from './scene2d.js';
import { getComponent } from './components.js';
import { getDetectorKind, senseBadges } from './detectors.js';
import { explainSetup, explainLive, suggestNext } from './explain.js';
import { el, principleCard, collapsibleCard } from '../common/ui.js';
import { equationEl } from '../common/latex.js';
import { AILogger } from '../common/aiPanel.js';

class LabCanvasInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.logger = new AILogger();
    this._explainTimer = 0;
    this.activeExpId = 'detector_match';
  }

  T(k, v) { return this.t('modules.lab_canvas.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-lab');
    this.root = root;

    this.viewport = el('div', 'viewport lab-viewport');
    root.appendChild(this.viewport);

    this.panel = el('div', 'panel lab-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.lab_canvas'));
    this.panel.appendChild(this._buildDesignButton());
    this.panel.appendChild(this._buildExperimentsCard());
    // Parts tray: sidebar when guided, floating on canvas in design mode
    this._paletteCard = this._buildPaletteCard();
    this._toolsCollapse = collapsibleCard(this.T('palette.title'), {
      open: false,
      extraClass: 'lab-tools-collapse',
    });
    this._toolsCollapse.body.appendChild(this._paletteCard);
    this.panel.appendChild(this._toolsCollapse.card);
    this.panel.appendChild(this._buildPropsCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);

    this.scene = new LabCanvasScene(this.viewport);
    this._banner = el('div', 'lab-exp-banner');
    this.viewport.appendChild(this._banner);
    this._aboutBtn = el('button', 'btn lab-about-btn', this.T('know.about'));
    this._aboutBtn.type = 'button';
    this._aboutBtn.onclick = function () { self._openKnowModal(); };
    this.viewport.appendChild(this._aboutBtn);
    this._buildKnowModal();
    // Bench controls always live at the bottom of the main canvas
    this._benchCard = this._buildRunCard();
    this._benchCard.classList.add('lab-canvas-bench');
    this.viewport.appendChild(this._benchCard);
    this.scene.setCallbacks({
      onChange: function (reason) { self._onSceneChange(reason); },
      onSelect: function (node) { self._renderProps(node); },
    });

    this._onKey = function (e) {
      if (e.key === 'Escape') {
        self._closeKnowModal();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const tag = (e.target && e.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        self.scene.deleteSelected();
      }
    };
    window.addEventListener('keydown', this._onKey);

    this._selectExperiment('detector_match', false);
    this._refreshAI(true);
  }

  _buildDesignButton() {
    const self = this;
    const wrap = el('div', 'lab-design-launch');
    const btn = el('button', 'btn primary lab-design-btn', this.T('design.button'));
    btn.type = 'button';
    btn.onclick = function () {
      self._selectExperiment('blank', true);
    };
    wrap.appendChild(btn);
    wrap.appendChild(el('p', 'param-help lab-design-hint', this.T('design.hint')));
    this._designBtn = btn;
    return wrap;
  }

  _buildExperimentsCard() {
    const self = this;
    const pack = collapsibleCard(this.T('experiments.title'), {
      open: false,
      extraClass: 'lab-exp-card',
    });
    this._expSetOpen = pack.setOpen;
    pack.body.appendChild(el('p', 'param-help', this.T('experiments.help')));
    this._expList = el('div', 'lab-exp-list');
    EXPERIMENTS.forEach(function (exp) {
      if (exp.id === 'blank') return; // Design mode has its own button
      const item = el('button', 'lab-exp-item');
      item.type = 'button';
      item.dataset.id = exp.id;
      const levelKey = 'experiments.levels.' + (exp.level || 'core');
      const levelLabel = self.T(levelKey);
      item.innerHTML =
        '<span class="lab-exp-ico">' + exp.icon + '</span>' +
        '<span class="lab-exp-text">' +
          '<span class="lab-exp-name">' + exp.title + '</span>' +
          '<span class="lab-exp-blurb">' + exp.blurb + '</span>' +
        '</span>' +
        '<span class="lab-exp-level">' + levelLabel + '</span>';
      item.onclick = function () {
        self._selectExperiment(exp.id, true);
      };
      self._expList.appendChild(item);
    });
    pack.body.appendChild(this._expList);
    return pack.card;
  }

  _buildKnowModal() {
    const self = this;
    const overlay = el('div', 'lab-know-overlay hidden');
    const modal = el('div', 'lab-know-modal');
    const head = el('div', 'lab-know-modal-head');
    this._knowModalTitle = el('div', 'lab-know-modal-title', this.T('know.title'));
    const close = el('button', 'lab-know-modal-close', '✕');
    close.type = 'button';
    close.setAttribute('aria-label', this.t('common.close'));
    close.onclick = function () { self._closeKnowModal(); };
    head.appendChild(this._knowModalTitle);
    head.appendChild(close);
    modal.appendChild(head);
    this._knowHost = el('div', 'lab-know-modal-body lab-know-body');
    modal.appendChild(this._knowHost);
    overlay.appendChild(modal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) self._closeKnowModal();
    });
    this.viewport.appendChild(overlay);
    this._knowOverlay = overlay;
  }

  _openKnowModal() {
    if (!this._knowOverlay) return;
    const exp = getExperiment(this.activeExpId);
    this._fillKnow(exp);
    this._knowOverlay.classList.remove('hidden');
  }

  _closeKnowModal() {
    if (this._knowOverlay) this._knowOverlay.classList.add('hidden');
  }

  _selectExperiment(id, load) {
    const exp = getExperiment(id);
    this.activeExpId = exp.id;
    if (load !== false) {
      this.scene.loadPreset(exp.id);
      this._setRunningUI(false);
    }
    this._highlightExpList();
    this._renderBanner(exp);
    this._setDesignMode(exp.id === 'blank');
    this._syncSidebarCollapse(exp.id === 'blank');
    this._syncAboutBtn(exp);
    this._closeKnowModal();
    // Prefill modal content so About opens instantly
    this._fillKnow(exp);
    if (load !== false) this._refreshAI(true);
  }

  _syncAboutBtn(exp) {
    if (!this._aboutBtn) return;
    // Show About for any loaded experiment (including design brief)
    this._aboutBtn.style.display = '';
    this._aboutBtn.textContent = this.T('know.about');
    if (this._knowModalTitle) {
      this._knowModalTitle.textContent = (exp.icon ? exp.icon + '  ' : '') + (exp.title || this.T('know.title'));
    }
  }

  _syncSidebarCollapse(design) {
    if (this._designBtn) {
      this._designBtn.classList.toggle('active', !!design);
    }
    if (design) {
      if (this._expSetOpen) this._expSetOpen(false);
      if (this._propsSetOpen) this._propsSetOpen(false);
      if (this._aiSetOpen) this._aiSetOpen(false);
      if (this._toolsCollapse) this._toolsCollapse.card.style.display = 'none';
    } else {
      if (this._toolsCollapse) this._toolsCollapse.card.style.display = '';
      if (this._expSetOpen) this._expSetOpen(false);
      if (this._propsSetOpen) this._propsSetOpen(false);
      if (this._aiSetOpen) this._aiSetOpen(false);
      if (this._toolsCollapse) this._toolsCollapse.setOpen(false);
    }
  }

  /** Design-your-own-lab: floating parts tray on the main canvas (bench stays bottom). */
  _setDesignMode(on) {
    const design = !!on;
    this._designMode = design;
    if (this.root) this.root.classList.toggle('lab-design-mode', design);
    if (!this._paletteCard || !this.panel || !this.viewport) return;

    if (design) {
      this.viewport.appendChild(this._paletteCard);
      this._paletteCard.classList.add('lab-float-palette');
      this._paletteCard.classList.remove('lab-side-tool');
      this._ensurePaletteDrag();
      this._resetPalettePos();
    } else {
      const host = (this._toolsCollapse && this._toolsCollapse.body) || this.panel;
      host.appendChild(this._paletteCard);
      this._paletteCard.classList.remove('lab-float-palette');
      this._paletteCard.classList.add('lab-side-tool');
      this._paletteCard.style.left = '';
      this._paletteCard.style.top = '';
    }
    // Bench always stays on the main panel
    if (this._benchCard && this._benchCard.parentNode !== this.viewport) {
      this.viewport.appendChild(this._benchCard);
    }
    if (this.scene && typeof this.scene.resize === 'function') this.scene.resize();
  }

  _resetPalettePos() {
    if (!this._paletteCard) return;
    this._paletteCard.style.left = '16px';
    this._paletteCard.style.top = '72px';
  }

  _ensurePaletteDrag() {
    if (this._paletteDragBound || !this._paletteCard) return;
    this._paletteDragBound = true;
    const self = this;
    const handle = this._paletteCard.querySelector('.lab-float-handle') || this._paletteCard;
    handle.addEventListener('pointerdown', function (e) {
      if (!self._designMode) return;
      // Don't start drag from part buttons
      if (e.target.closest && e.target.closest('.lab-pal-item, button.lab-pal-item, input, select')) return;
      if (e.button != null && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = self._paletteCard.getBoundingClientRect();
      const host = self.viewport.getBoundingClientRect();
      const ox = e.clientX - rect.left;
      const oy = e.clientY - rect.top;
      self._paletteCard.classList.add('dragging');
      try { handle.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }

      function move(ev) {
        const x = ev.clientX - host.left - ox;
        const y = ev.clientY - host.top - oy;
        const maxX = Math.max(8, host.width - self._paletteCard.offsetWidth - 8);
        const maxY = Math.max(8, host.height - self._paletteCard.offsetHeight - 72);
        self._paletteCard.style.left = Math.max(8, Math.min(maxX, x)) + 'px';
        self._paletteCard.style.top = Math.max(8, Math.min(maxY, y)) + 'px';
      }
      function up(ev) {
        self._paletteCard.classList.remove('dragging');
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        try { handle.releasePointerCapture(ev.pointerId); } catch (err2) { /* ignore */ }
      }
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    });
  }

  _highlightExpList() {
    if (!this._expList) return;
    const id = this.activeExpId;
    const kids = this._expList.children;
    for (let i = 0; i < kids.length; i++) {
      kids[i].classList.toggle('active', kids[i].dataset.id === id);
    }
  }

  _fillKnow(exp) {
    const self = this;
    if (!this._knowHost) return;
    this._knowHost.innerHTML = '';
    this._knowHost.appendChild(el('div', 'lab-know-heading', exp.icon + '  ' + exp.title));
    this._knowHost.appendChild(el('p', 'lab-know-blurb', exp.blurb));

    if (exp.goal) {
      this._knowHost.appendChild(el('div', 'field-label', this.T('know.goal')));
      this._knowHost.appendChild(el('p', 'lab-know-goal', exp.goal));
    }

    if (exp.physics && exp.physics.length) {
      this._knowHost.appendChild(el('div', 'field-label', this.T('know.physics')));
      const ul = el('ul', 'lab-know-list');
      exp.physics.forEach(function (line) { ul.appendChild(el('li', null, line)); });
      this._knowHost.appendChild(ul);
    }

    if (exp.equations && exp.equations.length) {
      this._knowHost.appendChild(el('div', 'field-label', this.T('know.equations')));
      const eqWrap = el('div', 'lab-know-eqs');
      exp.equations.forEach(function (eq) {
        try {
          eqWrap.appendChild(equationEl(eq, 'equation lab-know-eq'));
        } catch (err) {
          eqWrap.appendChild(el('div', 'equation lab-know-eq', eq));
        }
      });
      this._knowHost.appendChild(eqWrap);
    }

    if (exp.apparatus) {
      this._knowHost.appendChild(el('div', 'field-label', this.T('know.apparatus')));
      this._knowHost.appendChild(el('p', 'lab-know-blurb', exp.apparatus));
    }

    if (exp.observe && exp.observe.length) {
      this._knowHost.appendChild(el('div', 'field-label', this.T('know.observe')));
      const ul = el('ul', 'lab-know-list lab-know-observe');
      exp.observe.forEach(function (line) { ul.appendChild(el('li', null, line)); });
      this._knowHost.appendChild(ul);
    }

    this._knowHost.appendChild(el('div', 'field-label', this.T('know.steps')));
    const ol = el('ol', 'lab-know-steps');
    (exp.steps || []).forEach(function (line) { ol.appendChild(el('li', null, line)); });
    this._knowHost.appendChild(ol);

    if (exp.challenges && exp.challenges.length) {
      this._knowHost.appendChild(el('div', 'field-label', this.T('know.challenges')));
      const ul = el('ul', 'lab-know-list lab-know-challenge');
      exp.challenges.forEach(function (line) { ul.appendChild(el('li', null, line)); });
      this._knowHost.appendChild(ul);
    }

    if (exp.pitfalls && exp.pitfalls.length) {
      this._knowHost.appendChild(el('div', 'field-label', this.T('know.pitfalls')));
      const ul = el('ul', 'lab-know-list lab-know-pitfall');
      exp.pitfalls.forEach(function (line) { ul.appendChild(el('li', null, line)); });
      this._knowHost.appendChild(ul);
    }

    const actions = el('div', 'lab-know-modal-actions');
    const run = el('button', 'btn primary', this.T('know.runThis'));
    run.type = 'button';
    run.onclick = function () {
      self._closeKnowModal();
      if (!self.scene.running) {
        self.scene.start();
        self._setRunningUI(true);
        self.logger.clear();
        self.logger.info(self.T('ai.logStart'));
        self._dumpSetupToLog();
        self._refreshAI(false);
      }
    };
    const closeBtn = el('button', 'btn', this.t('common.close'));
    closeBtn.type = 'button';
    closeBtn.onclick = function () { self._closeKnowModal(); };
    actions.appendChild(run);
    actions.appendChild(closeBtn);
    this._knowHost.appendChild(actions);
  }

  _renderBanner(exp) {
    if (!this._banner) return;
    const goal = exp.goal ? exp.goal : exp.blurb;
    this._banner.innerHTML =
      '<strong>' + exp.title + '</strong>' +
      '<span>' + goal + '</span>';
  }

  _buildPaletteCard() {
    const self = this;
    const card = el('div', 'card lab-side-tool lab-palette-card');
    const head = el('div', 'lab-float-handle');
    head.appendChild(el('div', 'card-title', this.T('palette.title')));
    head.appendChild(el('span', 'lab-float-grip', this.T('palette.dragHint')));
    card.appendChild(head);
    card.appendChild(el('p', 'param-help lab-palette-help', this.T('palette.help')));
    const grid = el('div', 'lab-palette');
    COMPONENTS.forEach(function (c) {
      const b = el('button', 'lab-pal-item');
      b.type = 'button';
      b.innerHTML = '<span class="lab-pal-ico">' + c.icon + '</span><span class="lab-pal-lab">' + c.short + '</span>';
      b.title = c.label;
      b.onclick = function (e) {
        e.stopPropagation();
        self.scene.addComponent(c.id);
        self._refreshAI(true);
      };
      grid.appendChild(b);
    });
    card.appendChild(grid);
    return card;
  }

  _buildRunCard() {
    const self = this;
    const card = el('div', 'lab-canvas-bench');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    const row = el('div', 'lab-run-row');
    this._runBtn = el('button', 'btn primary', this.T('controls.run'));
    this._runBtn.type = 'button';
    this._runBtn.onclick = function () {
      self.scene.start();
      self._setRunningUI(true);
      self.logger.clear();
      self.logger.info(self.T('ai.logStart'));
      self._dumpSetupToLog();
      self._refreshAI(false);
    };
    this._stopBtn = el('button', 'btn', this.T('controls.stop'));
    this._stopBtn.type = 'button';
    this._stopBtn.disabled = true;
    this._stopBtn.onclick = function () {
      self.scene.stop();
      self._setRunningUI(false);
      self.logger.ok(self.T('ai.logStop'));
      self._refreshAI(true);
    };
    const clear = el('button', 'btn', this.T('controls.clear'));
    clear.type = 'button';
    clear.onclick = function () {
      self.scene.clear();
      self.activeExpId = 'blank';
      self._highlightExpList();
      const blank = getExperiment('blank');
      self._fillKnow(blank);
      self._renderBanner(blank);
      self._syncAboutBtn(blank);
      self._setRunningUI(false);
      self._setDesignMode(true);
      self._syncSidebarCollapse(true);
      self._closeKnowModal();
      self._refreshAI(true);
    };
    const del = el('button', 'btn', this.T('controls.delete'));
    del.type = 'button';
    del.onclick = function () { self.scene.deleteSelected(); };
    row.appendChild(this._runBtn);
    row.appendChild(this._stopBtn);
    row.appendChild(clear);
    row.appendChild(del);
    card.appendChild(row);

    this._stats = el('div', 'lab-stats', this.T('controls.idle'));
    card.appendChild(this._stats);
    return card;
  }

  _setRunningUI(on) {
    if (this._runBtn) this._runBtn.disabled = !!on;
    if (this._stopBtn) this._stopBtn.disabled = !on;
  }

  _buildPropsCard() {
    const pack = collapsibleCard(this.T('props.title'), {
      open: false,
      extraClass: 'lab-props-card',
    });
    this._propsSetOpen = pack.setOpen;
    this._propsHost = el('div', 'lab-props');
    this._propsHost.appendChild(el('p', 'param-help', this.T('props.none')));
    pack.body.appendChild(this._propsHost);
    return pack.card;
  }

  _buildAICard() {
    const self = this;
    const pack = collapsibleCard(this.T('ai.title'), {
      open: false,
      extraClass: 'ai lab-ai-card',
    });
    this._aiSetOpen = pack.setOpen;
    const body = pack.body;
    body.appendChild(el('p', 'ai-desc', this.T('ai.desc')));

    const ask = el('button', 'btn primary', this.T('ai.explain'));
    ask.type = 'button';
    ask.onclick = function () {
      self.logger.clear();
      self._dumpSetupToLog();
      self._dumpLiveToLog();
      self.logger.step(self.T('ai.suggestion') + ' ' + suggestNext(self.scene.getGraph(), function (k, v) {
        return self.T(k, v);
      }));
      self._renderLog();
      if (self._aiSetOpen) self._aiSetOpen(true);
    };
    body.appendChild(ask);

    this._aiNarrative = el('div', 'lab-ai-narrative');
    body.appendChild(this._aiNarrative);

    body.appendChild(el('div', 'field-label', this.T('ai.logTitle')));
    this._logEl = el('pre', 'ai-log lab-ai-log', '');
    body.appendChild(this._logEl);
    return pack.card;
  }

  _renderProps(node) {
    const self = this;
    this._propsHost.innerHTML = '';
    if (!node) {
      this._propsHost.appendChild(el('p', 'param-help', this.T('props.none')));
      return;
    }
    if (this._propsSetOpen) this._propsSetOpen(true);
    const def = getComponent(node.type);
    this._propsHost.appendChild(el('div', 'lab-prop-name', (def && def.label) || node.type));

    if (def && def.kinds) {
      const kindLabel = node.type === 'detector' ? this.T('props.detKind') : this.T('props.kind');
      this._propsHost.appendChild(el('div', 'field-label', kindLabel));
      const chips = el('div', 'chips');
      def.kinds.forEach(function (k) {
        const b = el('button', 'chip' + (node.props.kind === k.id ? ' active' : ''), k.label);
        b.onclick = function () {
          self.scene.updateSelectedProps({ kind: k.id });
          self._renderProps(self.scene._node(self.scene.selectedId));
          self._refreshAI(true);
        };
        chips.appendChild(b);
      });
      this._propsHost.appendChild(chips);
    }

    if (node.type === 'detector') {
      const det = getDetectorKind(node.props.kind || 'gm');
      this._propsHost.appendChild(el('p', 'param-help lab-det-blurb', det.blurb));
      this._propsHost.appendChild(el('div', 'field-label', this.T('props.senses')));
      const row = el('div', 'lab-det-sense-row');
      const badges = senseBadges(det.id);
      for (let i = 0; i < badges.length; i++) {
        const b = badges[i];
        const span = el('span', 'lab-det-badge' + (b.ok ? ' ok' : ' no'), b.label);
        span.title = b.ok ? this.T('props.sensesYes', { p: b.label }) : this.T('props.sensesNo', { p: b.label });
        row.appendChild(span);
      }
      this._propsHost.appendChild(row);
      this._propsHost.appendChild(el('p', 'param-help', this.T('props.detHint')));
    }

    if (def && def.nuclides) {
      this._propsHost.appendChild(el('div', 'field-label', this.T('props.nuclide')));
      const chips = el('div', 'chips');
      def.nuclides.forEach(function (id) {
        const b = el('button', 'chip' + (node.props.nuclide === id ? ' active' : ''), id);
        b.onclick = function () {
          self.scene.updateSelectedProps({ nuclide: id });
          self._renderProps(self.scene._node(self.scene.selectedId));
          self._refreshAI(true);
        };
        chips.appendChild(b);
      });
      this._propsHost.appendChild(chips);
    }

    if (def && def.materials) {
      this._propsHost.appendChild(el('div', 'field-label', this.T('props.material')));
      const chips = el('div', 'chips');
      def.materials.forEach(function (m) {
        const b = el('button', 'chip' + (node.props.material === m.id ? ' active' : ''), m.label);
        b.onclick = function () {
          self.scene.updateSelectedProps({ material: m.id });
          self._renderProps(self.scene._node(self.scene.selectedId));
          self._refreshAI(true);
        };
        chips.appendChild(b);
      });
      this._propsHost.appendChild(chips);
    }

    if (node.type === 'source' || node.type === 'efield' || node.type === 'bfield' || node.type === 'shield') {
      const key = node.type === 'source' ? 'rate'
        : node.type === 'shield' ? 'thickness' : 'strength';
      const label = node.type === 'source' ? this.T('props.rate')
        : node.type === 'shield' ? this.T('props.thickness') : this.T('props.strength');
      this._propsHost.appendChild(el('div', 'field-label', label));
      const input = document.createElement('input');
      input.type = 'range';
      input.min = node.type === 'source' ? '5' : '0.1';
      input.max = node.type === 'source' ? '80' : '1';
      input.step = node.type === 'source' ? '1' : '0.05';
      input.value = String(node.props[key] != null ? node.props[key] : 0.5);
      input.className = 'lab-range';
      const val = el('div', 'lab-range-val', String(input.value));
      input.oninput = function () {
        const v = node.type === 'source' ? Number(input.value) : Number(input.value);
        const o = {};
        o[key] = v;
        self.scene.updateSelectedProps(o);
        val.textContent = String(v);
      };
      this._propsHost.appendChild(input);
      this._propsHost.appendChild(val);
    }
  }

  _onSceneChange(reason) {
    if (reason === 'tick') {
      this._explainTimer += 1;
      if (this._explainTimer % 25 === 0) {
        this._updateStats();
        this._refreshAI(false);
      }
      return;
    }
    this._updateStats();
    if (reason === 'start' || reason === 'wire' || reason === 'add' || reason === 'preset' || reason === 'delete' || reason === 'clear') {
      this._refreshAI(true);
    }
  }

  _updateStats() {
    if (!this._stats || !this.scene) return;
    const s = this.scene.getSim();
    if (!this.scene.running) {
      this._stats.textContent = this.T('controls.idle');
      return;
    }
    this._stats.textContent = this.T('controls.live', {
      t: s.t.toFixed(1),
      e: String(s.emitted || 0),
      f: String(s.fissions || 0),
      a: String(s.absorbed || 0),
    });
  }

  _dumpSetupToLog() {
    const self = this;
    const lines = explainSetup(this.scene.getGraph(), function (k, v) { return self.T(k, v); });
    for (let i = 0; i < lines.length; i++) this.logger.info(lines[i]);
  }

  _dumpLiveToLog() {
    const self = this;
    const lines = explainLive(this.scene.getGraph(), this.scene.getSim(), function (k, v) {
      return self.T(k, v);
    });
    for (let i = 0; i < lines.length; i++) this.logger.data(lines[i]);
  }

  _refreshAI(full) {
    const self = this;
    const graph = this.scene.getGraph();
    const narrative = [];
    const setup = explainSetup(graph, function (k, v) { return self.T(k, v); });
    for (let i = 0; i < setup.length; i++) narrative.push(setup[i]);
    if (this.scene.running) {
      const live = explainLive(graph, this.scene.getSim(), function (k, v) { return self.T(k, v); });
      for (let j = 0; j < live.length; j++) narrative.push(live[j]);
    }
    narrative.push(this.T('ai.suggestion') + ' ' + suggestNext(graph, function (k, v) { return self.T(k, v); }));

    this._aiNarrative.innerHTML = '';
    narrative.forEach(function (line) {
      self._aiNarrative.appendChild(el('p', 'lab-ai-line', line));
    });

    if (full && this.scene.running) {
      const live = explainLive(graph, this.scene.getSim(), function (k, v) { return self.T(k, v); });
      if (live[0]) this.logger.step(live[0]);
    }
    this._renderLog();
  }

  _renderLog() {
    if (this._logEl) this._logEl.textContent = this.logger.render();
  }

  unmount() {
    this._closeKnowModal();
    window.removeEventListener('keydown', this._onKey);
    if (this.scene) this.scene.dispose();
  }
}

export default {
  id: 'lab_canvas',
  icon: '🧪',
  group: 'nuclear',
  navKey: 'modules.lab_canvas.navTitle',
  titleKey: 'modules.lab_canvas.title',
  descKey: 'modules.lab_canvas.desc',
  create: function (ctx) {
    return new LabCanvasInstance(ctx);
  },
};
