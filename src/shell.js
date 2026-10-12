// Application shell: header + collapsible sidebar + content area.
// Settings: language, font, experiments visibility, exercises on/off.
import { MODULES, NAV_GROUPS } from './modules/registry.js';
import { LearnExercisesController } from './learnExercises.js';
import { ProblemEditorController } from './problemEditor.js';
import { GlobalSearchController } from './globalSearch.js';

const el = (tag, cls, txt) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt != null) e.textContent = txt;
  return e;
};

function visibleModules(config) {
  const hidden = config.hiddenModules || {};
  return MODULES.filter(function (m) { return !hidden[m.id]; });
}

export class Shell {
  constructor({ i18n, fonts, config }) {
    this.i18n = i18n;
    this.fonts = fonts;
    this.config = config || {};
    if (!this.config.hiddenModules) this.config.hiddenModules = {};
    if (this.config.exercisesEnabled == null) this.config.exercisesEnabled = true;
    if (this.config.problemEditorEnabled == null) this.config.problemEditorEnabled = false;
    if (this.config.showPrinciple == null) this.config.showPrinciple = false;
    if (this.config.showAiPanel == null) this.config.showAiPanel = false;
    if (this.config.showKeyIdeas == null) this.config.showKeyIdeas = false;
    if (this.config.sidebarCollapsed == null) this.config.sidebarCollapsed = true;
    // Child/exported projects: never show Export. Main app defaults to enabled.
    if (this.config.childProject) this.config.exportEnabled = false;
    else if (this.config.exportEnabled == null) this.config.exportEnabled = true;
    this.active = null;
    this.root = document.getElementById('app');
    this._sidebarCollapsed = !!this.config.sidebarCollapsed;
    this._panelCollapsed = !!this.config.panelCollapsed;
    var pw = Number(this.config.panelWidth);
    this._panelWidth = isFinite(pw) && pw >= 240 ? pw : 300;
    this.learnEx = new LearnExercisesController(this);
    this.problemEditor = new ProblemEditorController(this);
    this.search = new GlobalSearchController(this);
    this._settingsUnlocked = false;
  }

  t(k, v) { return this.i18n.t(k, v); }

  getVisibleModules() {
    return visibleModules(this.config);
  }

  build() {
    this.root.innerHTML = '';
    this.root.className = '';
    this._applyShellClasses();
    this.root.appendChild(this._buildSidebar());
    this.main = el('div', 'main');
    this.main.appendChild(this._buildHeader());
    this.content = el('div', 'content');
    this.main.appendChild(this.content);
    this.root.appendChild(this.main);

    this._settingsPanel = this._buildSettings();
    this.root.appendChild(this._settingsPanel);

    this._fabSettings = el('button', 'settings-fab');
    this._fabSettings.type = 'button';
    this._fabSettings.title = this.t('nav.settingsFab');
    this._fabSettings.setAttribute('aria-label', this.t('nav.settingsFab'));
    this._fabSettings.textContent = '⚙';
    this.root.appendChild(this._fabSettings);
    this._bindSettingsFab(this._fabSettings);

    this._syncExerciseButton();
    this._syncProblemEditorButton();

    const self = this;
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        const tag = (e.target && e.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        self.search.open();
      }
    });

    const vis = visibleModules(this.config);
    const want = this.config.activeModule;
    const first = (want && vis.some(function (m) { return m.id === want; }))
      ? want
      : (vis[0] ? vis[0].id : MODULES[0].id);
    this.switchTo(first);
  }

  _buildSidebar() {
    const bar = el('aside', 'sidebar');

    const top = el('div', 'sidebar-top');
    const brand = el('div', 'brand');
    brand.appendChild(el('div', 'brand-logo', '⚛'));
    const bt = el('div', 'brand-text');
    bt.appendChild(el('div', 'brand-title', this.t('app.title')));
    bt.appendChild(el('div', 'brand-sub', this.t('app.subtitle')));
    brand.appendChild(bt);
    top.appendChild(brand);

    const toggle = el('button', 'sidebar-toggle');
    toggle.type = 'button';
    toggle.title = this.t('nav.toggleSidebar');
    toggle.setAttribute('aria-label', this.t('nav.toggleSidebar'));
    toggle.textContent = '☰';
    toggle.onclick = () => this._toggleSidebar();
    top.appendChild(toggle);
    bar.appendChild(top);

    bar.appendChild(el('div', 'nav-head', this.t('nav.modules')));
    this._navList = el('nav', 'nav-list');
    this._rebuildNavItems();
    bar.appendChild(this._navList);

    const footer = el('div', 'sidebar-footer');
    const settingsBtn = el('button', 'nav-item settings-btn');
    settingsBtn.appendChild(el('span', 'nav-icon', '⚙'));
    settingsBtn.appendChild(el('span', 'nav-label', this.t('nav.settings')));
    settingsBtn.onclick = () => this.toggleSettings(true);
    footer.appendChild(settingsBtn);
    bar.appendChild(footer);
    return bar;
  }

  _rebuildNavItems() {
    this._navList.innerHTML = '';
    const vis = visibleModules(this.config);
    const visSet = {};
    for (let i = 0; i < vis.length; i++) visSet[vis[i].id] = vis[i];

    for (let g = 0; g < NAV_GROUPS.length; g++) {
      const grp = NAV_GROUPS[g];
      const items = [];
      for (let i = 0; i < MODULES.length; i++) {
        const m = MODULES[i];
        if (m.group === grp.id && visSet[m.id]) items.push(m);
      }
      if (!items.length) continue;
      const head = el('div', 'nav-group-head', this.t(grp.titleKey));
      this._navList.appendChild(head);
      for (let j = 0; j < items.length; j++) {
        const m = items[j];
        const item = el('button', 'nav-item');
        item.dataset.id = m.id;
        item.appendChild(el('span', 'nav-icon', m.icon || '•'));
        item.appendChild(el('span', 'nav-label', this.t(m.navKey)));
        item.onclick = (function (self, id) {
          return function () { self.switchTo(id); };
        })(this, m.id);
        this._navList.appendChild(item);
      }
    }

    if (this.active) {
      const id = this.active.module.id;
      for (let j = 0; j < this._navList.children.length; j++) {
        const item = this._navList.children[j];
        if (item.classList && item.classList.contains('nav-item')) {
          item.classList.toggle('active', item.dataset.id === id);
        }
      }
    }
  }

  _toggleSidebar() {
    this._sidebarCollapsed = !this._sidebarCollapsed;
    this.config.sidebarCollapsed = this._sidebarCollapsed;
    this._applyShellClasses();
    this._persist();
    var self = this;
    setTimeout(function () {
      if (self.active && self.active.instance && typeof self.active.instance.scene !== 'undefined') {
        var sc = self.active.instance.scene;
        if (sc && typeof sc.resize === 'function') sc.resize();
      }
      window.dispatchEvent(new Event('resize'));
    }, 50);
  }

  _buildHeader() {
    const h = el('header', 'header');
    const left = el('div', 'header-left');
    const menuBtn = el('button', 'header-menu-btn');
    menuBtn.type = 'button';
    menuBtn.textContent = '☰';
    menuBtn.title = this.t('nav.toggleSidebar');
    menuBtn.onclick = () => this._toggleSidebar();
    left.appendChild(menuBtn);
    const titles = el('div', 'header-titles');
    this._hTitle = el('h1', 'h-title');
    this._hDesc = el('p', 'h-desc');
    titles.appendChild(this._hTitle);
    titles.appendChild(this._hDesc);
    left.appendChild(titles);
    h.appendChild(left);

    const right = el('div', 'header-right');
    this._searchBtn = el('button', 'header-action-btn header-search-btn');
    this._searchBtn.type = 'button';
    this._searchBtn.textContent = this.t('nav.search');
    this._searchBtn.title = this.t('nav.searchHint');
    this._searchBtn.onclick = () => this.search.open();
    right.appendChild(this._searchBtn);

    this._learnBtn = el('button', 'header-action-btn header-learn-btn');
    this._learnBtn.type = 'button';
    this._learnBtn.textContent = this.t('nav.learn');
    this._learnBtn.title = this.t('nav.learnHint');
    this._learnBtn.onclick = () => this.learnEx.openLearn();
    right.appendChild(this._learnBtn);

    this._exBtn = el('button', 'header-action-btn header-exercises-btn');
    this._exBtn.type = 'button';
    this._exBtn.textContent = this.t('nav.exercises');
    this._exBtn.title = this.t('nav.exercisesHint');
    this._exBtn.onclick = () => this.learnEx.openExercises();
    right.appendChild(this._exBtn);

    this._peBtn = el('button', 'header-action-btn header-editor-btn');
    this._peBtn.type = 'button';
    this._peBtn.textContent = this.t('nav.problemEditor');
    this._peBtn.title = this.t('nav.problemEditorHint');
    this._peBtn.onclick = () => this.problemEditor.open();
    right.appendChild(this._peBtn);

    const hdrSettings = el('button', 'header-settings-btn');
    hdrSettings.type = 'button';
    hdrSettings.textContent = '⚙ ' + this.t('nav.settings');
    hdrSettings.onclick = () => this.toggleSettings(true);
    right.appendChild(hdrSettings);

    h.appendChild(right);
    return h;
  }

  _syncExerciseButton() {
    if (!this._exBtn) return;
    const on = this.config.exercisesEnabled !== false;
    this._exBtn.style.display = on ? '' : 'none';
  }

  _syncProblemEditorButton() {
    if (!this._peBtn) return;
    const on = this.config.problemEditorEnabled === true;
    this._peBtn.style.display = on ? '' : 'none';
  }

  switchTo(id) {
    if (this.problemEditor && this.problemEditor.isOpen && this.problemEditor.isOpen() && this.problemEditor.isDirty && this.problemEditor.isDirty()) {
      if (!window.confirm(this.t('problemEditor.unsaved'))) return;
    }
    if (this.learnEx) this.learnEx.close();
    if (this.problemEditor) this.problemEditor.close();
    if (this.search) this.search.close();
    const vis = visibleModules(this.config);
    let module = null;
    for (let i = 0; i < vis.length; i++) {
      if (vis[i].id === id) { module = vis[i]; break; }
    }
    if (!module) module = vis[0] || MODULES[0];
    if (this.active) {
      try { this.active.instance.unmount(); } catch (e) { console.error(e); }
      this.content.innerHTML = '';
    }
    this._hTitle.textContent = this.t(module.titleKey);
    this._hDesc.textContent = this.t(module.descKey);
    for (let j = 0; j < this._navList.children.length; j++) {
      const item = this._navList.children[j];
      item.classList.toggle('active', item.dataset.id === module.id);
    }
    const ctx = { t: (k, v) => this.t(k, v), i18n: this.i18n };
    const instance = module.create(ctx);
    instance.mount(this.content);
    this.active = { module, instance };
    this.config.activeModule = module.id;
    this._persist();
    this._wirePanelCollapse();
  }

  /** Collapse / expand the experiment right panel; keep main viewport dominant. */
  _wirePanelCollapse() {
    const self = this;
    if (!this.content) return;
    const old = this.content.querySelector('.panel-collapse-btn');
    if (old && old.parentNode) old.parentNode.removeChild(old);

    const panel = this.content.querySelector('.panel');
    if (!panel) {
      this.content.classList.remove('panel-collapsed');
      return;
    }

    // Wrap panel so the toggle can sit on the panel's left edge and
    // move with the panel width (no separate slide animation).
    var rail = panel.parentElement;
    if (!rail || !rail.classList || !rail.classList.contains('panel-rail')) {
      rail = el('div', 'panel-rail');
      if (panel.parentNode) panel.parentNode.insertBefore(rail, panel);
      rail.appendChild(panel);
    }

    const btn = el('button', 'panel-collapse-btn');
    btn.type = 'button';
    this._panelCollapseBtn = btn;
    btn.onclick = function () {
      self._panelCollapsed = !self._panelCollapsed;
      self.config.panelCollapsed = self._panelCollapsed;
      self._persist();
      self._applyPanelCollapsed();
    };
    rail.insertBefore(btn, panel);
    this._wirePanelResize(rail);
    this._applyPanelCollapsed();
  }

  _clampPanelWidth(w) {
    var min = 240;
    var max = 640;
    if (this.content) {
      var room = Math.floor(this.content.clientWidth * 0.58);
      if (room > min) max = Math.min(max, room);
    }
    w = Math.round(w);
    if (w < min) w = min;
    if (w > max) w = max;
    return w;
  }

  _applyPanelWidth() {
    var rail = this.content && this.content.querySelector('.panel-rail');
    if (!rail) return;
    if (this._panelCollapsed) return;
    var w = this._clampPanelWidth(this._panelWidth);
    this._panelWidth = w;
    rail.style.width = w + 'px';
    rail.style.minWidth = w + 'px';
    rail.style.maxWidth = w + 'px';
  }

  _wirePanelResize(rail) {
    var self = this;
    var old = rail.querySelector('.panel-resize-handle');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var handle = el('div', 'panel-resize-handle');
    handle.title = this.t('common.panelResize');
    handle.setAttribute('aria-label', this.t('common.panelResize'));
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-orientation', 'vertical');
    rail.insertBefore(handle, rail.querySelector('.panel'));

    handle.onpointerdown = function (e) {
      if (self._panelCollapsed) return;
      e.preventDefault();
      try { handle.setPointerCapture(e.pointerId); } catch (err) { /* older Chrome */ }
      rail.classList.add('is-resizing');
      var startX = e.clientX;
      var startW = rail.getBoundingClientRect().width;
      function move(ev) {
        var next = self._clampPanelWidth(startW - (ev.clientX - startX));
        self._panelWidth = next;
        self._applyPanelWidth();
      }
      function up() {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        handle.removeEventListener('pointercancel', up);
        rail.classList.remove('is-resizing');
        self.config.panelWidth = self._panelWidth;
        self._persist();
        self._reflowActiveScene();
      }
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
      handle.addEventListener('pointercancel', up);
    };
  }

  _applyPanelCollapsed() {
    if (!this.content) return;
    const collapsed = !!this._panelCollapsed;
    this.content.classList.toggle('panel-collapsed', collapsed);
    if (!collapsed) this._applyPanelWidth();
    const btn = this._panelCollapseBtn || this.content.querySelector('.panel-collapse-btn');
    if (btn) {
      btn.textContent = collapsed ? '◂' : '▸';
      btn.title = collapsed ? this.t('common.panelExpand') : this.t('common.panelCollapse');
      btn.setAttribute('aria-label', btn.title);
      btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      btn.style.right = '';
      btn.style.bottom = '';
      btn.style.left = '';
      btn.style.top = '';
    }
    var self = this;
    var rail = this.content.querySelector('.panel-rail');
    function reflow() { self._reflowActiveScene(); }
    // Reflow now, after layout, and when the rail width transition ends
    reflow();
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(function () {
        requestAnimationFrame(reflow);
      });
    }
    if (rail) {
      var onEnd = function (e) {
        if (e && e.target !== rail) return;
        rail.removeEventListener('transitionend', onEnd);
        reflow();
      };
      rail.addEventListener('transitionend', onEnd);
    }
    setTimeout(reflow, 220);
  }

  _reflowActiveScene() {
    window.dispatchEvent(new Event('resize'));
    if (!this.active || !this.active.instance) return;
    const inst = this.active.instance;
    if (inst.scene && typeof inst.scene.resize === 'function') inst.scene.resize();
    if (inst.dual && typeof inst.dual.resize === 'function') inst.dual.resize();
    if (inst.view && typeof inst.view.resize === 'function') inst.view.resize();
    if (inst._canvas && typeof inst._canvas.resize === 'function') inst._canvas.resize();
    // Dual-view / nested hosts
    if (this.content) {
      var hosts = this.content.querySelectorAll('.view-host, .viewport, .lab-host, .lab-viewport');
      for (var i = 0; i < hosts.length; i++) {
        var h = hosts[i];
        // force layout read so canvas code sees final sizes
        void h.offsetWidth;
      }
    }
  }

  _buildSettings() {
    const overlay = el('div', 'overlay hidden');
    overlay.onclick = (e) => { if (e.target === overlay) this.toggleSettings(false); };
    const panel = el('div', 'settings is-locked');
    this._settingsBox = panel;
    panel.appendChild(el('div', 'settings-title', this.t('settings.title')));

    const lock = el('div', 'settings-lock');
    lock.appendChild(el('p', 'settings-hint', this.t('settings.lockHint')));
    const passField = el('div', 'field');
    passField.appendChild(el('label', null, this.t('settings.lockPassword')));
    const pass = el('input', 'settings-lock-input');
    pass.type = 'password';
    pass.autocomplete = 'off';
    pass.spellcheck = false;
    this._settingsPassInput = pass;
    passField.appendChild(pass);
    lock.appendChild(passField);
    const err = el('p', 'settings-lock-error', '');
    this._settingsLockError = err;
    lock.appendChild(err);
    const unlockBtn = el('button', 'btn primary settings-unlock-btn', this.t('settings.lockUnlock'));
    unlockBtn.type = 'button';
    const self = this;
    function tryUnlock() {
      const value = (pass.value || '').trim();
      if (value === 'atom123') {
        self._settingsUnlocked = true;
        err.textContent = '';
        pass.value = '';
        self._settingsBox.classList.remove('is-locked');
        return;
      }
      self._settingsUnlocked = false;
      err.textContent = self.t('settings.lockWrong');
      pass.value = '';
      pass.focus();
    }
    unlockBtn.onclick = tryUnlock;
    pass.onkeydown = function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        tryUnlock();
      }
    };
    lock.appendChild(unlockBtn);
    panel.appendChild(lock);

    const body = el('div', 'settings-body');
    const langRow = el('div', 'field');
    langRow.appendChild(el('label', null, this.t('settings.language')));
    const langSel = el('select');
    for (let i = 0; i < this.i18n.languages.length; i++) {
      const l = this.i18n.languages[i];
      const o = el('option', null, l.name); o.value = l.code;
      if (l.code === this.i18n.code) o.selected = true;
      langSel.appendChild(o);
    }
    langSel.onchange = async () => {
      await this.i18n.setLanguage(langSel.value);
      this.config.language = langSel.value;
      this._persist();
      this._retranslate();
    };
    langRow.appendChild(langSel);

    const fontRow = el('div', 'field');
    fontRow.appendChild(el('label', null, this.t('settings.font')));
    const fontSel = el('select');
    const sysOpt = el('option', null, this.t('settings.systemDefault')); sysOpt.value = '';
    if (!this.config.fontFamily) sysOpt.selected = true;
    fontSel.appendChild(sysOpt);
    for (let fi = 0; fi < this.fonts.available.length; fi++) {
      const f = this.fonts.available[fi];
      const o = el('option', null, f.family); o.value = f.family;
      if (f.family === this.config.fontFamily) o.selected = true;
      fontSel.appendChild(o);
    }
    fontSel.onchange = () => {
      this.config.fontFamily = fontSel.value;
      this.fonts.apply(this.config.fontFamily, this.config.fontSize);
      this._persist();
    };
    fontRow.appendChild(fontSel);

    const sizeRow = el('div', 'field');
    sizeRow.appendChild(el('label', null, this.t('settings.fontSize')));
    const sizeWrap = el('div', 'row');
    const size = el('input'); size.type = 'range'; size.min = '12'; size.max = '20'; size.step = '1';
    size.value = String(this.config.fontSize || 16);
    const sizeVal = el('span', 'val', size.value);
    size.oninput = () => {
      sizeVal.textContent = size.value;
      this.config.fontSize = +size.value;
      this.fonts.apply(this.config.fontFamily, this.config.fontSize);
    };
    size.onchange = () => this._persist();
    sizeWrap.appendChild(size); sizeWrap.appendChild(sizeVal);
    sizeRow.appendChild(sizeWrap);

    body.appendChild(langRow);
    body.appendChild(fontRow);
    body.appendChild(sizeRow);
    body.appendChild(this._buildExercisesToggle());
    body.appendChild(this._buildProblemEditorToggle());
    body.appendChild(this._buildRightPanelToggles());
    body.appendChild(this._buildExperimentVisibility());
    body.appendChild(this._buildExportSection());
    panel.appendChild(body);

    const close = el('button', 'btn settings-close', '✕');
    close.onclick = () => this.toggleSettings(false);
    panel.appendChild(close);

    overlay.appendChild(panel);
    return overlay;
  }

  _buildExportSection() {
    if (this.config.exportEnabled === false || this.config.childProject) return el('div', '');
    const wrap = el('div', 'field export-field');
    wrap.appendChild(el('label', null, this.t('settings.export')));
    wrap.appendChild(el('p', 'settings-hint', this.t('settings.exportHint')));
    const btn = el('button', 'btn primary export-open-btn', this.t('settings.exportOpen'));
    btn.type = 'button';
    const self = this;
    btn.onclick = function () {
      self.toggleSettings(false);
      self.openExportModal();
    };
    wrap.appendChild(btn);
    return wrap;
  }

  openExportModal() {
    if (this.config.exportEnabled === false || this.config.childProject) return;
    if (this._exportOverlay) {
      this._exportOverlay.classList.remove('hidden');
      this._syncExportPreview();
      return;
    }
    const overlay = el('div', 'overlay export-overlay');
    overlay.onclick = (e) => {
      if (e.target === overlay && !this._exportBusy) this.closeExportModal();
    };
    const panel = el('div', 'settings export-modal');
    panel.appendChild(el('div', 'settings-title', this.t('settings.exportTitle')));
    panel.appendChild(el('p', 'settings-hint', this.t('settings.exportIntro')));

    const nameField = el('div', 'field');
    nameField.appendChild(el('label', null, this.t('settings.exportName')));
    const nameInput = el('input', 'export-input');
    nameInput.type = 'text';
    nameInput.value = 'Atomic_Physics_Export';
    nameField.appendChild(nameInput);
    panel.appendChild(nameField);

    const dirField = el('div', 'field');
    dirField.appendChild(el('label', null, this.t('settings.exportDir')));
    const dirInput = el('input', 'export-input');
    dirInput.type = 'text';
    dirInput.placeholder = this.t('settings.exportDirPlaceholder');
    dirField.appendChild(dirInput);

    const quick = el('div', 'export-quick');
    quick.appendChild(el('span', 'export-quick-label', this.t('settings.exportQuick')));
    const quickRow = el('div', 'export-quick-row');
    quick.appendChild(quickRow);
    dirField.appendChild(quick);
    panel.appendChild(dirField);

    const self = this;
    (function () {
      if (!window.api || typeof window.api.listExportFolders !== 'function') return;
      window.api.listExportFolders().then(function (res) {
        const folders = (res && res.folders) || [];
        if (!dirInput.value && folders.length) {
          // Prefer Desktop, else first known folder
          var start = folders[0].path;
          for (var i = 0; i < folders.length; i++) {
            if (folders[i].label === 'Desktop') { start = folders[i].path; break; }
          }
          dirInput.value = start;
          self._syncExportPreview();
        }
        for (var j = 0; j < folders.length; j++) {
          (function (f) {
            var chip = el('button', 'btn export-chip', f.label);
            chip.type = 'button';
            chip.title = f.path;
            chip.onclick = function () {
              dirInput.value = f.path;
              self._syncExportPreview();
              self._exportStatus.className = 'export-status ok';
              self._exportStatus.textContent = self.t('settings.exportFolderSet');
            };
            quickRow.appendChild(chip);
          })(folders[j]);
        }
      });
    })();

    const preview = el('p', 'export-preview', '');
    panel.appendChild(preview);
    this._exportPreview = preview;
    nameInput.oninput = function () { self._syncExportPreview(); };
    dirInput.oninput = function () { self._syncExportPreview(); };
    this._exportNameInput = nameInput;
    this._exportDirInput = dirInput;

    const listLabel = el('label', null, this.t('settings.exportPick'));
    panel.appendChild(listLabel);
    const actions = el('div', 'exp-actions');
    const selAll = el('button', 'btn exp-action', this.t('settings.exportSelectAll'));
    const selNone = el('button', 'btn exp-action', this.t('settings.exportSelectNone'));
    actions.appendChild(selAll);
    actions.appendChild(selNone);
    panel.appendChild(actions);

    const list = el('div', 'exp-list export-list');
    this._exportChecks = [];
    for (let i = 0; i < MODULES.length; i++) {
      const m = MODULES[i];
      const row = el('label', 'exp-row');
      const cb = el('input');
      cb.type = 'checkbox';
      cb.checked = true;
      cb.dataset.id = m.id;
      row.appendChild(cb);
      row.appendChild(el('span', 'exp-icon', m.icon || '•'));
      row.appendChild(el('span', 'exp-name', this.t(m.navKey)));
      list.appendChild(row);
      this._exportChecks.push(cb);
    }
    panel.appendChild(list);
    selAll.onclick = function () {
      for (let i = 0; i < self._exportChecks.length; i++) self._exportChecks[i].checked = true;
    };
    selNone.onclick = function () {
      for (let i = 0; i < self._exportChecks.length; i++) self._exportChecks[i].checked = false;
    };

    const status = el('p', 'export-status', '');
    panel.appendChild(status);
    this._exportStatus = status;

    const footer = el('div', 'export-footer');
    const cancel = el('button', 'btn', this.t('settings.exportCancel'));
    cancel.type = 'button';
    cancel.onclick = function () {
      if (!self._exportBusy) self.closeExportModal();
    };
    const confirm = el('button', 'btn primary', this.t('settings.exportConfirm'));
    confirm.type = 'button';
    confirm.onclick = function () { self._runExport(); };
    this._exportConfirmBtn = confirm;
    footer.appendChild(cancel);
    footer.appendChild(confirm);
    panel.appendChild(footer);

    const x = el('button', 'btn settings-close', '✕');
    x.onclick = function () {
      if (!self._exportBusy) self.closeExportModal();
    };
    panel.appendChild(x);

    overlay.appendChild(panel);
    this.root.appendChild(overlay);
    this._exportOverlay = overlay;
    this._syncExportPreview();
  }

  closeExportModal() {
    if (this._exportOverlay) this._exportOverlay.classList.add('hidden');
  }

  _syncExportPreview() {
    if (!this._exportPreview) return;
    const dir = (this._exportDirInput && this._exportDirInput.value) || '';
    const name = (this._exportNameInput && this._exportNameInput.value) || '';
    if (!dir.trim()) {
      this._exportPreview.textContent = this.t('settings.exportPreviewEmpty');
      return;
    }
    const sep = dir.indexOf('/') >= 0 && dir.indexOf('\\') < 0 ? '/' : '\\';
    const cleaned = dir.replace(/[\\/]+$/, '');
    this._exportPreview.textContent =
      this.t('settings.exportPreview') + ' ' + cleaned + sep + (name.trim() || 'Atomic_Physics_Export');
  }

  _runExport() {
    if (this.config.exportEnabled === false || this.config.childProject) return;
    if (this._exportBusy) return;
    const self = this;
    const modules = [];
    for (let i = 0; i < this._exportChecks.length; i++) {
      if (this._exportChecks[i].checked) modules.push(this._exportChecks[i].dataset.id);
    }
    if (!modules.length) {
      this._exportStatus.className = 'export-status err';
      this._exportStatus.textContent = this.t('settings.exportNeedModules');
      return;
    }
    const baseDir = (this._exportDirInput.value || '').trim();
    if (!baseDir) {
      this._exportStatus.className = 'export-status err';
      this._exportStatus.textContent = this.t('settings.exportNeedDir');
      return;
    }
    const projectName = (this._exportNameInput.value || '').trim() || 'Atomic_Physics_Export';
    this._exportBusy = true;
    this._exportConfirmBtn.disabled = true;
    this._exportStatus.className = 'export-status';
    this._exportStatus.textContent = this.t('settings.exportWorking');
    if (!window.api || typeof window.api.exportProject !== 'function') {
      this._exportBusy = false;
      this._exportConfirmBtn.disabled = false;
      this._exportStatus.className = 'export-status err';
      this._exportStatus.textContent = this.t('settings.exportFail');
      return;
    }
    window.api.exportProject({
      modules: modules,
      baseDir: baseDir,
      projectName: projectName,
    }).then(function (res) {
      self._exportBusy = false;
      self._exportConfirmBtn.disabled = false;
      if (res && res.ok) {
        self._exportStatus.className = 'export-status ok';
        self._exportStatus.textContent = self.t('settings.exportDone') + ' ' + res.outDir;
      } else {
        self._exportStatus.className = 'export-status err';
        self._exportStatus.textContent = (res && res.error) || self.t('settings.exportFail');
      }
    }, function () {
      self._exportBusy = false;
      self._exportConfirmBtn.disabled = false;
      self._exportStatus.className = 'export-status err';
      self._exportStatus.textContent = self.t('settings.exportFail');
    });
  }

  _buildExercisesToggle() {
    const wrap = el('div', 'field');
    wrap.appendChild(el('label', null, this.t('settings.exercises')));
    wrap.appendChild(el('p', 'settings-hint', this.t('settings.exercisesHint')));
    const row = el('label', 'exp-row exercises-toggle-row');
    const cb = el('input');
    cb.type = 'checkbox';
    cb.checked = this.config.exercisesEnabled !== false;
    const self = this;
    cb.onchange = function () {
      self.config.exercisesEnabled = !!cb.checked;
      self._syncExerciseButton();
      self._persist();
      if (!cb.checked && self.learnEx) self.learnEx.close();
    };
    row.appendChild(cb);
    row.appendChild(el('span', 'exp-name', this.t('settings.exercisesEnable')));
    wrap.appendChild(row);
    return wrap;
  }

  _buildProblemEditorToggle() {
    const wrap = el('div', 'field');
    wrap.appendChild(el('label', null, this.t('settings.problemEditor')));
    wrap.appendChild(el('p', 'settings-hint', this.t('settings.problemEditorHint')));
    const row = el('label', 'exp-row exercises-toggle-row');
    const cb = el('input');
    cb.type = 'checkbox';
    cb.checked = this.config.problemEditorEnabled === true;
    const self = this;
    cb.onchange = function () {
      self.config.problemEditorEnabled = !!cb.checked;
      self._syncProblemEditorButton();
      self._persist();
      if (!cb.checked && self.problemEditor) self.problemEditor.close();
    };
    row.appendChild(cb);
    row.appendChild(el('span', 'exp-name', this.t('settings.problemEditorEnable')));
    wrap.appendChild(row);
    return wrap;
  }

  _buildRightPanelToggles() {
    const wrap = el('div', 'field');
    wrap.appendChild(el('label', null, this.t('settings.rightPanel')));
    wrap.appendChild(el('p', 'settings-hint', this.t('settings.rightPanelHint')));
    const self = this;

    function row(key, checked, onChange) {
      const r = el('label', 'exp-row exercises-toggle-row');
      const cb = el('input');
      cb.type = 'checkbox';
      cb.checked = checked;
      cb.onchange = function () { onChange(!!cb.checked); };
      r.appendChild(cb);
      r.appendChild(el('span', 'exp-name', self.t(key)));
      return r;
    }

    wrap.appendChild(row('settings.showPrinciple', this.config.showPrinciple === true, function (on) {
      self.config.showPrinciple = on;
      self._applyShellClasses();
      self._persist();
    }));
    wrap.appendChild(row('settings.showAiPanel', this.config.showAiPanel === true, function (on) {
      self.config.showAiPanel = on;
      self._applyShellClasses();
      self._persist();
    }));
    wrap.appendChild(row('settings.showKeyIdeas', this.config.showKeyIdeas === true, function (on) {
      self.config.showKeyIdeas = on;
      self._applyShellClasses();
      self._persist();
    }));
    return wrap;
  }

  _applyShellClasses() {
    if (!this.root) return;
    this.root.classList.toggle('sidebar-collapsed', !!this._sidebarCollapsed);
    this.root.classList.toggle('hide-principle', this.config.showPrinciple !== true);
    this.root.classList.toggle('hide-ai', this.config.showAiPanel !== true);
    this.root.classList.toggle('hide-key-ideas', this.config.showKeyIdeas !== true);
  }

  _buildExperimentVisibility() {
    const wrap = el('div', 'field experiments-field');
    wrap.appendChild(el('label', null, this.t('settings.experiments')));
    wrap.appendChild(el('p', 'settings-hint', this.t('settings.experimentsHint')));

    const actions = el('div', 'exp-actions');
    const showAll = el('button', 'btn exp-action', this.t('settings.showAll'));
    const hideAll = el('button', 'btn exp-action', this.t('settings.hideAll'));
    actions.appendChild(showAll);
    actions.appendChild(hideAll);
    wrap.appendChild(actions);

    const list = el('div', 'exp-list');
    const self = this;
    function rebuildChecks() {
      list.innerHTML = '';
      for (let i = 0; i < MODULES.length; i++) {
        const m = MODULES[i];
        const row = el('label', 'exp-row');
        const cb = el('input');
        cb.type = 'checkbox';
        cb.checked = !self.config.hiddenModules[m.id];
        cb.onchange = (function (id, input) {
          return function () {
            if (input.checked) delete self.config.hiddenModules[id];
            else self.config.hiddenModules[id] = true;
            if (visibleModules(self.config).length === 0) {
              delete self.config.hiddenModules[id];
              input.checked = true;
              return;
            }
            self._persist();
            self._rebuildNavItems();
            const stillVisible = visibleModules(self.config).some(function (vm) {
              return self.active && vm.id === self.active.module.id;
            });
            if (!stillVisible) {
              const first = visibleModules(self.config)[0];
              if (first) self.switchTo(first.id);
            }
          };
        })(m.id, cb);
        row.appendChild(cb);
        row.appendChild(el('span', 'exp-icon', m.icon || '•'));
        row.appendChild(el('span', 'exp-name', self.t(m.navKey)));
        list.appendChild(row);
      }
    }
    rebuildChecks();
    wrap.appendChild(list);

    showAll.onclick = function () {
      self.config.hiddenModules = {};
      self._persist();
      rebuildChecks();
      self._rebuildNavItems();
    };
    hideAll.onclick = function () {
      const keep = (self.active && self.active.module.id) || MODULES[0].id;
      const next = {};
      for (let i = 0; i < MODULES.length; i++) {
        if (MODULES[i].id !== keep) next[MODULES[i].id] = true;
      }
      self.config.hiddenModules = next;
      self._persist();
      rebuildChecks();
      self._rebuildNavItems();
    };

    return wrap;
  }

  _bindSettingsFab(btn) {
    const self = this;
    const size = 46;
    const pad = 8;

    function clamp(x, y) {
      const maxX = Math.max(pad, window.innerWidth - size - pad);
      const maxY = Math.max(pad, window.innerHeight - size - pad);
      return {
        x: Math.max(pad, Math.min(maxX, x)),
        y: Math.max(pad, Math.min(maxY, y)),
      };
    }

    function applyPos(fab, x, y) {
      const p = clamp(x, y);
      fab.style.left = p.x + 'px';
      fab.style.top = p.y + 'px';
      fab.style.right = 'auto';
      fab.style.bottom = 'auto';
      return p;
    }

    const pos = this.config.fabPos;
    if (pos && isFinite(pos.x) && isFinite(pos.y)) applyPos(btn, pos.x, pos.y);

    this._fabDrag = { dragging: false, moved: false, startX: 0, startY: 0, origLeft: 0, origTop: 0 };

    btn.addEventListener('pointerdown', function (e) { self._fabPointerDown(e); });
    btn.addEventListener('mousedown', function (e) { self._fabPointerDown(e); });
    btn.addEventListener('click', function (e) { self._fabClick(e); });

    if (!this._fabDragBound) {
      this._fabDragBound = true;
      window.addEventListener('pointermove', function (e) { self._fabPointerMove(e); });
      window.addEventListener('mousemove', function (e) { self._fabPointerMove(e); });
      window.addEventListener('pointerup', function () { self._fabPointerUp(); });
      window.addEventListener('mouseup', function () { self._fabPointerUp(); });
      window.addEventListener('resize', function () {
        const fab = self._fabSettings;
        if (!fab || !self.config.fabPos) return;
        const r = fab.getBoundingClientRect();
        self.config.fabPos = applyPos(fab, r.left, r.top);
      });
    }
  }

  _fabPointerDown(e) {
    if (e.button != null && e.button !== 0) return;
    const btn = this._fabSettings;
    const d = this._fabDrag;
    if (!btn || !d) return;
    d.dragging = true;
    d.moved = false;
    const r = btn.getBoundingClientRect();
    d.startX = e.clientX;
    d.startY = e.clientY;
    d.origLeft = r.left;
    d.origTop = r.top;
    if (e.pointerId != null && btn.setPointerCapture) {
      try { btn.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }
    btn.classList.add('dragging');
    if (e.preventDefault) e.preventDefault();
  }

  _fabPointerMove(e) {
    const btn = this._fabSettings;
    const d = this._fabDrag;
    if (!btn || !d || !d.dragging) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) d.moved = true;
    if (!d.moved) return;
    const size = 46;
    const pad = 8;
    const maxX = Math.max(pad, window.innerWidth - size - pad);
    const maxY = Math.max(pad, window.innerHeight - size - pad);
    const x = Math.max(pad, Math.min(maxX, d.origLeft + dx));
    const y = Math.max(pad, Math.min(maxY, d.origTop + dy));
    btn.style.left = x + 'px';
    btn.style.top = y + 'px';
    btn.style.right = 'auto';
    btn.style.bottom = 'auto';
  }

  _fabPointerUp() {
    const btn = this._fabSettings;
    const d = this._fabDrag;
    if (!btn || !d || !d.dragging) return;
    d.dragging = false;
    btn.classList.remove('dragging');
    if (d.moved) {
      const r = btn.getBoundingClientRect();
      const size = 46;
      const pad = 8;
      const maxX = Math.max(pad, window.innerWidth - size - pad);
      const maxY = Math.max(pad, window.innerHeight - size - pad);
      this.config.fabPos = {
        x: Math.max(pad, Math.min(maxX, r.left)),
        y: Math.max(pad, Math.min(maxY, r.top)),
      };
      this._persist();
    }
  }

  _fabClick(e) {
    const d = this._fabDrag;
    if (d && d.moved) {
      e.preventDefault();
      e.stopPropagation();
      d.moved = false;
      return;
    }
    this.toggleSettings(true);
  }

  toggleSettings(show) {
    this._settingsPanel.classList.toggle('hidden', !show);
    if (!show) {
      this._settingsUnlocked = false;
      if (this._settingsBox) this._settingsBox.classList.add('is-locked');
      if (this._settingsPassInput) this._settingsPassInput.value = '';
      if (this._settingsLockError) this._settingsLockError.textContent = '';
      return;
    }
    this._settingsUnlocked = false;
    if (this._settingsBox) this._settingsBox.classList.add('is-locked');
    if (this._settingsPassInput) {
      this._settingsPassInput.value = '';
      const input = this._settingsPassInput;
      setTimeout(function () { input.focus(); }, 0);
    }
    if (this._settingsLockError) this._settingsLockError.textContent = '';
  }

  _persist() {
    if (!window.api) return;
    window.api.saveConfig({
      language: this.config.language,
      fontFamily: this.config.fontFamily,
      fontSize: this.config.fontSize,
      activeModule: this.config.activeModule,
      sidebarCollapsed: this.config.sidebarCollapsed !== false,
      exercisesEnabled: this.config.exercisesEnabled !== false,
      problemEditorEnabled: this.config.problemEditorEnabled === true,
      showPrinciple: this.config.showPrinciple === true,
      showAiPanel: this.config.showAiPanel === true,
      showKeyIdeas: this.config.showKeyIdeas === true,
      fabPos: this.config.fabPos && isFinite(this.config.fabPos.x) && isFinite(this.config.fabPos.y)
        ? { x: this.config.fabPos.x, y: this.config.fabPos.y }
        : null,
      panelCollapsed: !!this.config.panelCollapsed,
      panelWidth: isFinite(this._panelWidth) ? this._panelWidth : 300,
      hiddenModules: this.config.hiddenModules || {},
      exportEnabled: this.config.exportEnabled !== false && !this.config.childProject,
      childProject: !!this.config.childProject,
    });
  }

  _retranslate() {
    const activeId = this.active ? this.active.module.id : MODULES[0].id;
    this.config.activeModule = activeId;
    this.active = null;
    this.build();
  }
}
