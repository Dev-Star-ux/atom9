/** Shared 2D math-physics lab — simulator + optional calculator mode. */
import { el, principleCard, infoTable } from './ui.js';
import { wireCanvasExperiment } from './sceneChrome.js';
import { getCalculator } from './mathCalculatorDefs.js';
import { renderCalcOutput } from './mathCalcRender.js';

export function exportMathLab(opts) {
  const modKey = 'modules.' + opts.id;
  return {
    id: opts.id,
    icon: opts.icon || '∫',
    group: opts.group || 'math_physics',
    navKey: modKey + '.navTitle',
    titleKey: modKey + '.title',
    descKey: modKey + '.desc',
    create: function (ctx) { return new MathLabInstance(ctx, opts, modKey); },
  };
}

class MathLabInstance {
  constructor(ctx, opts, modKey) {
    this.t = ctx.t;
    this.opts = opts;
    this.modKey = modKey;
    this.state = Object.assign({ viewMode: 'simulator' }, opts.initialState || {});
    this.calcDef = opts.calculator || getCalculator(opts.id);
    this.calcInputs = {};
  }

  T(k, v) { return this.t(this.modKey + '.' + k, v); }
  Tc(k, v) { return this.t('common.mathLab.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-math');
    this.viewport = el('div', 'viewport mp-viewport');
    this.viewport.appendChild(el('div', 'hint mp-hint', this.T('hint')));
    root.appendChild(this.viewport);

    this.panel = el('div', 'panel mp-panel');
    this.panel.appendChild(principleCard(this.t, this.modKey));
    if (this.calcDef) this.panel.appendChild(this._buildModeToggle());
    if (typeof this.opts.buildPanel === 'function') {
      this.opts.buildPanel(this);
    }
    root.appendChild(this.panel);

    this.scene = new this.opts.Scene2D(this.viewport);
    this.scene.setParams(this.state);
    wireCanvasExperiment(this.viewport, this.scene, { t: this.t });

    if (this.calcDef) {
      this._calcWrap = el('div', 'mp-calc-wrap hidden');
      this.viewport.appendChild(this._calcWrap);
      this._buildCalculatorUI();
    }

    this._resize = function () { self._onResize(); };
    window.addEventListener('resize', this._resize);
    this._onResize();
    this._refresh(true);
    this._applyViewMode();
  }

  _buildModeToggle() {
    const self = this;
    const card = el('div', 'card mp-mode-card');
    card.appendChild(el('div', 'card-title', this.Tc('viewMode')));
    const chips = el('div', 'chips');
    [
      { id: 'simulator', label: this.Tc('simulator') },
      { id: 'calculator', label: this.Tc('calculator') },
    ].forEach(function (m) {
      const b = el('button', 'chip' + (self.state.viewMode === m.id ? ' active' : ''), m.label);
      b.onclick = function () {
        self.state.viewMode = m.id;
        chips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
        b.classList.add('active');
        self._applyViewMode();
      };
      chips.appendChild(b);
    });
    card.appendChild(chips);
    return card;
  }

  _buildCalculatorUI() {
    const self = this;
    const def = this.calcDef;
    this._calcWrap.innerHTML = '';
    const inner = el('div', 'mp-calc-inner');
    inner.appendChild(el('div', 'mp-calc-title', this.Tc('calcTitle')));
    inner.appendChild(el('p', 'mp-calc-desc', this.Tc('calcDesc')));

    const form = el('div', 'mp-calc-form');
    def.fields.forEach(function (field) {
      const row = el('div', 'mp-calc-field');
      row.appendChild(el('label', 'mp-calc-label', field.label));
      let input;
      if (field.type === 'select') {
        input = el('select', 'mp-calc-input');
        (field.options || []).forEach(function (opt) {
          const o = el('option', '', opt.label);
          o.value = opt.value;
          input.appendChild(o);
        });
        input.value = field.default;
      } else {
        input = el('input', 'mp-calc-input');
        input.type = 'number';
        if (field.min != null) input.min = String(field.min);
        if (field.max != null) input.max = String(field.max);
        if (field.step != null) input.step = String(field.step);
        input.value = String(field.default != null ? field.default : 0);
      }
      if (field.unit && field.type !== 'select') {
        const wrap = el('div', 'mp-calc-input-row');
        wrap.appendChild(input);
        wrap.appendChild(el('span', 'mp-calc-unit', field.unit));
        row.appendChild(wrap);
      } else {
        row.appendChild(input);
      }
      input.dataset.key = field.key;
      self._bindCalcInput(input, field);
      form.appendChild(row);
      self.calcInputs[field.key] = input;
    });
    inner.appendChild(form);

    this._calcOutHost = el('div', 'mp-calc-output');
    inner.appendChild(this._calcOutHost);
    this._calcWrap.appendChild(inner);
    this._updateCalculator();
  }

  _bindCalcInput(input, field) {
    const self = this;
    const run = function () { self._updateCalculator(); };
    input.oninput = run;
    input.onchange = run;
  }

  _calcValues() {
    const vals = {};
    const def = this.calcDef;
    if (!def) return vals;
    def.fields.forEach(function (field) {
      const input = this.calcInputs[field.key];
      if (!input) return;
      if (field.type === 'select') vals[field.key] = input.value;
      else {
        const num = parseFloat(input.value);
        vals[field.key] = Number.isFinite(num) ? num : (field.default != null ? field.default : 0);
      }
    }, this);
    return vals;
  }

  _updateCalculator() {
    if (!this.calcDef || !this._calcOutHost) return;
    const vals = this._calcValues();
    let result;
    try {
      result = this.calcDef.compute(vals, this.state);
    } catch (e) {
      result = { rows: [['Error', String(e.message || e)]], note: '' };
    }
    const rows = result.rows || [];
    if (!result.rows && !result.steps && !result.trace) {
      result.rows = rows.length ? rows : [['Status', 'No output']];
    }
    renderCalcOutput(this._calcOutHost, result, (k, vars) => this.t(k, vars));
  }

  _applyViewMode() {
    const calc = this.state.viewMode === 'calculator' && this.calcDef;
    if (this._calcWrap) this._calcWrap.classList.toggle('hidden', !calc);
    if (this.viewport) this.viewport.classList.toggle('mp-calc-active', !!calc);
    if (!calc && this.scene && typeof this.scene.resize === 'function') {
      this.scene.resize();
    }
    if (calc) this._updateCalculator();
  }

  _onResize() {
    if (this.state.viewMode !== 'calculator' && this.scene && typeof this.scene.resize === 'function') {
      this.scene.resize();
    }
  }

  _refresh(reset) {
    if (this.scene) {
      this.scene.setParams(Object.assign({}, this.state, { reset: !!reset }));
    }
    if (typeof this.opts.getInfoRows === 'function' && this._infoHost) {
      this._infoHost.replaceWith(infoTable(this.opts.getInfoRows.call(this, this)));
      this._infoHost = this.panel.querySelector('.info') || this._infoHost;
    }
    if (this.state.viewMode === 'calculator') this._updateCalculator();
  }

  unmount() {
    window.removeEventListener('resize', this._resize);
    if (this.scene) this.scene.dispose();
  }
}
