// Problem editor — author exercises for the current experiment.
// Writes exercises/<moduleId>.json through the local server (run.bat).
import { el } from './modules/common/ui.js';

const TYPES = ['selection', 'blank', 'calculation'];

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function newId() {
  return 'q' + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36);
}

function emptyProblem(type) {
  const t = TYPES.indexOf(type) >= 0 ? type : 'selection';
  const p = { id: newId(), type: t, prompt: '', explain: '' };
  if (t === 'selection') {
    p.choices = ['', '', '', ''];
    p.answer = 0;
  } else if (t === 'blank') {
    p.answer = '';
    p.accept = [];
  } else {
    p.answer = 0;
    p.tolerance = 0;
    p.unit = '';
  }
  return p;
}

function snapshot(pack) {
  return JSON.stringify({
    title: pack.title || '',
    problems: pack.problems || [],
  });
}

export class ProblemEditorController {
  constructor(shell) {
    this.shell = shell;
    this._overlay = null;
    this._pack = null;
    this._savedSnap = '';
    this._selected = 0;
    this._status = null;
  }

  t(k, v) {
    return this.shell.t(k, v);
  }

  currentModule() {
    return this.shell.active && this.shell.active.module ? this.shell.active.module : null;
  }

  open() {
    if (this.shell.config.problemEditorEnabled !== true) return;
    const mod = this.currentModule();
    if (!mod) return;
    this.close();
    if (this.shell.learnEx) this.shell.learnEx.close();
    if (this.shell.search) this.shell.search.close();

    const self = this;
    const overlay = el('div', 'overlay pe-overlay');
    const panel = el('div', 'pe-modal');

    const head = el('div', 'pe-head');
    const titleWrap = el('div', 'pe-head-text');
    titleWrap.appendChild(el('span', 'pe-badge', this.t('problemEditor.badge')));
    titleWrap.appendChild(el('div', 'pe-title', this.t('problemEditor.title')));
    const sub = el('div', 'pe-sub', this.t(mod.navKey));
    titleWrap.appendChild(sub);
    this._modSub = sub;
    head.appendChild(titleWrap);

    const close = el('button', 'le-close pe-close');
    close.type = 'button';
    close.setAttribute('aria-label', this.t('common.close') || 'Close');
    close.innerHTML = '<span aria-hidden="true">&times;</span>';
    close.onclick = function () { self._tryClose(); };
    head.appendChild(close);
    panel.appendChild(head);

    const toolbar = el('div', 'pe-toolbar');
    const titleField = el('div', 'pe-title-field');
    titleField.appendChild(el('label', null, this.t('problemEditor.setTitle')));
    this._titleInput = el('input', 'pe-input pe-title-input');
    this._titleInput.type = 'text';
    this._titleInput.placeholder = this.t('problemEditor.setTitleHint');
    this._titleInput.oninput = function () {
      if (self._pack) self._pack.title = self._titleInput.value;
      self._markDirty();
    };
    titleField.appendChild(this._titleInput);
    toolbar.appendChild(titleField);

    const tools = el('div', 'pe-toolbar-actions');
    const addBtn = el('button', 'pe-btn pe-btn-add', this.t('problemEditor.add'));
    addBtn.type = 'button';
    addBtn.onclick = function () { self._addProblem(); };
    const saveBtn = el('button', 'pe-btn pe-btn-save', this.t('problemEditor.save'));
    saveBtn.type = 'button';
    saveBtn.onclick = function () { self._save(); };
    this._saveBtn = saveBtn;
    tools.appendChild(addBtn);
    tools.appendChild(saveBtn);
    toolbar.appendChild(tools);
    panel.appendChild(toolbar);

    const workspace = el('div', 'pe-workspace');
    this._list = el('div', 'pe-list');
    this._form = el('div', 'pe-form');
    workspace.appendChild(this._list);
    workspace.appendChild(this._form);
    panel.appendChild(workspace);

    this._status = el('div', 'pe-status', this.t('problemEditor.loading'));
    panel.appendChild(this._status);

    overlay.appendChild(panel);
    overlay.onclick = function (e) {
      if (e.target === overlay) self._tryClose();
    };
    document.addEventListener('keydown', this._onKey = function (e) {
      if (e.key === 'Escape') self._tryClose();
    });
    this.shell.root.appendChild(overlay);
    this._overlay = overlay;
    this._load(mod);
  }

  isOpen() { return !!this._overlay; }
  isDirty() { return this._isDirty(); }

  _tryClose() {
    if (this._isDirty()) {
      if (!window.confirm(this.t('problemEditor.unsaved'))) return;
    }
    this.close();
  }

  close() {
    if (this._onKey) {
      document.removeEventListener('keydown', this._onKey);
      this._onKey = null;
    }
    if (this._overlay && this._overlay.parentNode) {
      this._overlay.parentNode.removeChild(this._overlay);
    }
    this._overlay = null;
    this._pack = null;
    this._list = null;
    this._form = null;
    this._status = null;
  }

  _isDirty() {
    if (!this._pack) return false;
    return snapshot(this._pack) !== this._savedSnap;
  }

  _markDirty() {
    if (this._saveBtn) {
      this._saveBtn.classList.toggle('pe-dirty', this._isDirty());
    }
  }

  _setStatus(kind, text) {
    if (!this._status) return;
    this._status.className = 'pe-status' + (kind ? ' ' + kind : '');
    this._status.textContent = text || '';
  }

  _load(mod) {
    const self = this;
    const fallbackTitle = this.t(mod.titleKey) + ' — ' + this.t('nav.exercises');
    fetch('/exercises/' + mod.id + '.json')
      .then(function (r) {
        if (!r.ok) return null;
        return r.json();
      })
      .then(function (data) {
        const problems = (data && data.problems) ? clone(data.problems) : [];
        self._pack = {
          moduleId: mod.id,
          title: (data && data.title) ? data.title : fallbackTitle,
          problems: problems,
        };
        self._savedSnap = snapshot(self._pack);
        self._selected = 0;
        if (self._titleInput) self._titleInput.value = self._pack.title;
        self._render();
        self._setStatus('', self.t('problemEditor.ready'));
      })
      .catch(function () {
        self._pack = { moduleId: mod.id, title: fallbackTitle, problems: [] };
        self._savedSnap = snapshot(self._pack);
        if (self._titleInput) self._titleInput.value = self._pack.title;
        self._render();
        self._setStatus('', self.t('problemEditor.ready'));
      });
  }

  _addProblem() {
    if (!this._pack) return;
    this._pack.problems.push(emptyProblem('selection'));
    this._selected = this._pack.problems.length - 1;
    this._render();
    this._markDirty();
    this._setStatus('', this.t('problemEditor.added'));
  }

  _removeProblem(idx) {
    if (!this._pack) return;
    if (!window.confirm(this.t('problemEditor.confirmDelete'))) return;
    this._pack.problems.splice(idx, 1);
    if (this._selected >= this._pack.problems.length) {
      this._selected = Math.max(0, this._pack.problems.length - 1);
    }
    this._render();
    this._markDirty();
  }

  _move(idx, dir) {
    const arr = this._pack.problems;
    const next = idx + dir;
    if (next < 0 || next >= arr.length) return;
    const tmp = arr[idx];
    arr[idx] = arr[next];
    arr[next] = tmp;
    this._selected = next;
    this._render();
    this._markDirty();
  }

  _render() {
    if (!this._list || !this._form || !this._pack) return;
    this._list.innerHTML = '';
    this._form.innerHTML = '';

    const head = el('div', 'pe-list-head');
    head.appendChild(el('span', null, this.t('problemEditor.listTitle')));
    head.appendChild(el('span', 'pe-count', String(this._pack.problems.length)));
    this._list.appendChild(head);

    if (!this._pack.problems.length) {
      const empty = el('div', 'pe-empty');
      empty.appendChild(el('div', 'pe-empty-ico', '✎'));
      empty.appendChild(el('p', null, this.t('problemEditor.empty')));
      this._list.appendChild(empty);
      this._form.appendChild(el('div', 'pe-form-empty', this.t('problemEditor.emptyHint')));
      return;
    }

    const self = this;
    for (let i = 0; i < this._pack.problems.length; i++) {
      const p = this._pack.problems[i];
      const row = el('button', 'pe-item' + (i === this._selected ? ' active' : ''));
      row.type = 'button';
      const typeKey =
        p.type === 'blank' ? 'exercises.typeBlank'
          : p.type === 'calculation' ? 'exercises.typeCalc'
            : 'exercises.typeSelection';
      const type = el('span', 'pe-item-type pe-type-' + (p.type || 'selection'), this.t(typeKey));
      const preview = el('span', 'pe-item-preview', (i + 1) + '. ' + (p.prompt || this.t('problemEditor.untitled')));
      row.appendChild(type);
      row.appendChild(preview);
      row.onclick = (function (idx) {
        return function () {
          self._selected = idx;
          self._render();
        };
      })(i);
      this._list.appendChild(row);
    }

    this._renderForm(this._pack.problems[this._selected], this._selected);
  }

  _renderForm(p, idx) {
    const self = this;
    const card = el('div', 'pe-form-card');

    const top = el('div', 'pe-form-top');
    top.appendChild(el('div', 'pe-form-kicker', this.t('problemEditor.problemN', { n: String(idx + 1) })));
    const move = el('div', 'pe-move');
    const up = el('button', 'pe-icon-btn', '↑');
    up.type = 'button';
    up.title = this.t('problemEditor.moveUp');
    up.onclick = function () { self._move(idx, -1); };
    const down = el('button', 'pe-icon-btn', '↓');
    down.type = 'button';
    down.title = this.t('problemEditor.moveDown');
    down.onclick = function () { self._move(idx, 1); };
    const del = el('button', 'pe-icon-btn pe-danger', this.t('problemEditor.delete'));
    del.type = 'button';
    del.onclick = function () { self._removeProblem(idx); };
    move.appendChild(up);
    move.appendChild(down);
    move.appendChild(del);
    top.appendChild(move);
    card.appendChild(top);

    const typeRow = el('div', 'pe-field');
    typeRow.appendChild(el('label', null, this.t('problemEditor.type')));
    const chips = el('div', 'pe-chips');
    for (let t = 0; t < TYPES.length; t++) {
      const type = TYPES[t];
      const key =
        type === 'blank' ? 'exercises.typeBlank'
          : type === 'calculation' ? 'exercises.typeCalc'
            : 'exercises.typeSelection';
      const b = el('button', 'pe-chip' + (p.type === type ? ' active' : ''), this.t(key));
      b.type = 'button';
      b.onclick = (function (nextType) {
        return function () {
          self._changeType(idx, nextType);
        };
      })(type);
      chips.appendChild(b);
    }
    typeRow.appendChild(chips);
    card.appendChild(typeRow);

    const promptField = el('div', 'pe-field');
    promptField.appendChild(el('label', null, this.t('problemEditor.prompt')));
    const prompt = el('textarea', 'pe-input pe-textarea');
    prompt.rows = 4;
    prompt.value = p.prompt || '';
    prompt.placeholder = this.t('problemEditor.promptHint');
    prompt.oninput = function () {
      p.prompt = prompt.value;
      self._markDirty();
      const items = self._list.querySelectorAll('.pe-item-preview');
      if (items[idx]) {
        items[idx].textContent = (idx + 1) + '. ' + (p.prompt || self.t('problemEditor.untitled'));
      }
    };
    promptField.appendChild(prompt);
    card.appendChild(promptField);

    if (p.type === 'selection') this._selectionFields(card, p);
    else if (p.type === 'blank') this._blankFields(card, p);
    else this._calcFields(card, p);

    const expField = el('div', 'pe-field');
    expField.appendChild(el('label', null, this.t('problemEditor.explain')));
    const exp = el('textarea', 'pe-input pe-textarea pe-explain');
    exp.rows = 3;
    exp.value = p.explain || '';
    exp.placeholder = this.t('problemEditor.explainHint');
    exp.oninput = function () {
      p.explain = exp.value;
      self._markDirty();
    };
    expField.appendChild(exp);
    card.appendChild(expField);

    this._form.appendChild(card);
  }

  _changeType(idx, type) {
    const old = this._pack.problems[idx];
    const next = emptyProblem(type);
    next.id = old.id || next.id;
    next.prompt = old.prompt || '';
    next.explain = old.explain || '';
    this._pack.problems[idx] = next;
    this._render();
    this._markDirty();
  }

  _selectionFields(card, p) {
    const self = this;
    if (!p.choices || !p.choices.length) p.choices = ['', ''];
    const field = el('div', 'pe-field');
    field.appendChild(el('label', null, this.t('problemEditor.choices')));
    const list = el('div', 'pe-choices');
    for (let i = 0; i < p.choices.length; i++) {
      const row = el('div', 'pe-choice-row');
      const radio = el('input');
      radio.type = 'radio';
      radio.name = 'pe-correct';
      radio.setAttribute('aria-label', this.t('problemEditor.choiceN', { n: String(i + 1) }));
      radio.checked = Number(p.answer) === i;
      radio.onchange = (function (idx) {
        return function () {
          p.answer = idx;
          self._markDirty();
        };
      })(i);
      const input = el('input', 'pe-input');
      input.type = 'text';
      input.value = p.choices[i] || '';
      input.placeholder = this.t('problemEditor.choiceN', { n: String(i + 1) });
      input.oninput = (function (idx, elInput) {
        return function () {
          p.choices[idx] = elInput.value;
          self._markDirty();
        };
      })(i, input);
      const rm = el('button', 'pe-icon-btn', '✕');
      rm.type = 'button';
      rm.onclick = (function (idx) {
        return function () {
          if (p.choices.length <= 2) return;
          p.choices.splice(idx, 1);
          if (p.answer >= p.choices.length) p.answer = p.choices.length - 1;
          self._render();
          self._markDirty();
        };
      })(i);
      row.appendChild(radio);
      row.appendChild(input);
      row.appendChild(rm);
      list.appendChild(row);
    }
    field.appendChild(list);
    const add = el('button', 'pe-btn pe-btn-ghost', this.t('problemEditor.addChoice'));
    add.type = 'button';
    add.onclick = function () {
      p.choices.push('');
      self._render();
      self._markDirty();
    };
    field.appendChild(add);
    field.appendChild(el('p', 'pe-help', this.t('problemEditor.correctHint')));
    card.appendChild(field);
  }

  _blankFields(card, p) {
    const self = this;
    const field = el('div', 'pe-field');
    field.appendChild(el('label', null, this.t('problemEditor.blankAnswer')));
    const input = el('input', 'pe-input');
    input.type = 'text';
    input.value = p.answer != null ? String(p.answer) : '';
    input.placeholder = this.t('problemEditor.blankAnswerHint');
    input.oninput = function () {
      p.answer = input.value;
      self._markDirty();
    };
    field.appendChild(input);
    card.appendChild(field);

    const acc = el('div', 'pe-field');
    acc.appendChild(el('label', null, this.t('problemEditor.accept')));
    const extra = el('input', 'pe-input');
    extra.type = 'text';
    extra.value = (p.accept || []).join(', ');
    extra.placeholder = this.t('problemEditor.acceptHint');
    extra.oninput = function () {
      const parts = extra.value.split(',');
      const out = [];
      for (let i = 0; i < parts.length; i++) {
        const s = parts[i].replace(/^\s+|\s+$/g, '');
        if (s) out.push(s);
      }
      p.accept = out;
      self._markDirty();
    };
    acc.appendChild(extra);
    card.appendChild(acc);
  }

  _calcFields(card, p) {
    const self = this;
    const grid = el('div', 'pe-grid3');

    function numField(label, key, placeholder) {
      const wrap = el('div', 'pe-field');
      wrap.appendChild(el('label', null, label));
      const input = el('input', 'pe-input');
      input.type = 'number';
      input.step = 'any';
      input.value = p[key] != null ? String(p[key]) : '';
      input.placeholder = placeholder;
      input.oninput = function () {
        const n = parseFloat(input.value);
        p[key] = isNaN(n) ? 0 : n;
        self._markDirty();
      };
      wrap.appendChild(input);
      return wrap;
    }

    grid.appendChild(numField(this.t('problemEditor.calcAnswer'), 'answer', '0'));
    grid.appendChild(numField(this.t('problemEditor.tolerance'), 'tolerance', '0'));

    const unitWrap = el('div', 'pe-field');
    unitWrap.appendChild(el('label', null, this.t('problemEditor.unit')));
    const unit = el('input', 'pe-input');
    unit.type = 'text';
    unit.value = p.unit || '';
    unit.placeholder = 'eV, m/s…';
    unit.oninput = function () {
      p.unit = unit.value;
      self._markDirty();
    };
    unitWrap.appendChild(unit);
    grid.appendChild(unitWrap);
    card.appendChild(grid);
  }

  _save() {
    const mod = this.currentModule();
    if (!mod || !this._pack) return;
    const self = this;
    this._setStatus('', this.t('problemEditor.saving'));
    fetch('/api/exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moduleId: mod.id,
        title: this._titleInput ? this._titleInput.value : this._pack.title,
        problems: this._pack.problems,
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res || !res.ok) {
          self._setStatus('err', (res && res.error) || self.t('problemEditor.saveFail'));
          return;
        }
        if (res.pack) self._pack = res.pack;
        self._savedSnap = snapshot(self._pack);
        self._markDirty();
        if (self.shell.search && typeof self.shell.search.invalidateExercises === 'function') {
          self.shell.search.invalidateExercises(mod.id);
        }
        self._setStatus('ok', self.t('problemEditor.saved'));
      })
      .catch(function () {
        self._setStatus('err', self.t('problemEditor.saveFail'));
      });
  }
}
