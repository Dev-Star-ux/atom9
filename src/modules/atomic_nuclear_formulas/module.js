import { el, principleCard } from '../common/ui.js';
import { equationEl } from '../common/latex.js';
import { FORMULA_SECTIONS } from './formulas.js';

class AtomicNuclearFormulasInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.filter = 'all';
  }

  T(k, v) {
    return this.t('modules.atomic_nuclear_formulas.' + k, v);
  }

  mount(root) {
    const self = this;
    root.classList.add('module-orbital', 'module-formulas');
    this.viewport = el('div', 'viewport anf-viewport');
    root.appendChild(this.viewport);

    this.panel = el('div', 'panel anf-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.atomic_nuclear_formulas'));
    this.panel.appendChild(this._buildFilterCard());
    root.appendChild(this.panel);

    this._scroll = el('div', 'anf-scroll');
    this.viewport.appendChild(this._scroll);
    this._render();

    this._onKey = function (e) {
      if (e.key === 'Escape') self.filter = 'all';
    };
  }

  _buildFilterCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.topics')));
    card.appendChild(el('p', 'param-help', this.T('controls.topicsHelp')));
    const chips = el('div', 'chips anf-chips');
    const options = [{ id: 'all', label: this.T('controls.all') }].concat(
      FORMULA_SECTIONS.map(function (s) {
        return { id: s.id, label: s.title };
      })
    );
    this._chipBtns = {};
    options.forEach(function (opt) {
      const b = el('button', 'chip' + (self.filter === opt.id ? ' active' : ''), opt.label);
      b.type = 'button';
      b.onclick = function () {
        self.filter = opt.id;
        Object.keys(self._chipBtns).forEach(function (id) {
          self._chipBtns[id].classList.toggle('active', id === opt.id);
        });
        self._render();
        if (opt.id !== 'all') {
          const target = self._scroll.querySelector('[data-section="' + opt.id + '"]');
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          self._scroll.scrollTop = 0;
        }
      };
      chips.appendChild(b);
      self._chipBtns[opt.id] = b;
    });
    card.appendChild(chips);
    return card;
  }

  _render() {
    const self = this;
    this._scroll.innerHTML = '';
    this._scroll.appendChild(el('div', 'anf-page-title', this.T('title')));
    this._scroll.appendChild(el('p', 'anf-page-desc', this.T('pageDesc')));

    FORMULA_SECTIONS.forEach(function (sec) {
      if (self.filter !== 'all' && self.filter !== sec.id) return;
      const section = el('section', 'anf-section');
      section.dataset.section = sec.id;
      section.appendChild(el('h2', 'anf-section-title', sec.title));

      sec.entries.forEach(function (entry) {
        const card = el('article', 'anf-entry');
        card.appendChild(el('h3', 'anf-entry-title', entry.title));
        card.appendChild(el('p', 'anf-entry-principle', entry.principle));
        const eqs = el('div', 'anf-equations');
        (entry.equations || []).forEach(function (tex) {
          eqs.appendChild(equationEl(tex, 'equation anf-eq'));
        });
        card.appendChild(eqs);
        if (entry.note) card.appendChild(el('p', 'anf-entry-note', entry.note));
        section.appendChild(card);
      });
      self._scroll.appendChild(section);
    });
  }

  unmount() {
    this._scroll = null;
  }
}

export default {
  id: 'atomic_nuclear_formulas',
  icon: 'Σ',
  group: 'nuclear',
  navKey: 'modules.atomic_nuclear_formulas.navTitle',
  titleKey: 'modules.atomic_nuclear_formulas.title',
  descKey: 'modules.atomic_nuclear_formulas.desc',
  create: function (ctx) {
    return new AtomicNuclearFormulasInstance(ctx);
  },
};
