import { Pet2D } from './scene2d.js';
import { Pet3D } from './scene3d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { TRACERS, remainingFraction } from './physics.js';

class PetTracerInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { tracerId: 'f18', tMin: 0 };
  }

  T(k, v) { return this.t('modules.pet_tracer.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear');
    this.viewport = el('div', 'viewport pet-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel pet-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.pet_tracer'));
    this.panel.appendChild(this._buildParamCard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new Pet2D(host);
        s.setParams(self.state);
        s.setActive(true);
        return s;
      },
      create3D: function (host) {
        const s = new Pet3D(host);
        s.setParams(self.state);
        return s;
      },
      onModeChange: function (mode, scenes) {
        const s2 = scenes && scenes.scene2d;
        if (s2 && typeof s2.setActive === 'function') s2.setActive(mode === '2d');
      },
    });
    wireDualPause(this.viewport, this.dual, this.t);
    this._resize = function () { self.dual.resize(); };
    window.addEventListener('resize', this._resize);
    this.dual.resize();
    this._refresh();
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));
    card.appendChild(el('div', 'field-label', this.T('controls.tracer')));
    const chips = el('div', 'chips');
    TRACERS.forEach(function (tr) {
      const b = el('button', 'chip' + (self.state.tracerId === tr.id ? ' active' : ''), tr.name);
      b.onclick = function () {
        self.state.tracerId = tr.id;
        chips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
        b.classList.add('active');
        self._refresh();
      };
      chips.appendChild(b);
    });
    card.appendChild(chips);
    paramSlider(card, {
      label: this.T('controls.time'),
      min: 0, max: 330, step: 5, value: this.state.tMin, unit: 'min',
      onInput: function (v) { self.state.tMin = v; self._refresh(); },
    });
    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _refresh() {
    this.dual.setParams(this.state);
    const tr = TRACERS.find(function (x) { return x.id === this.state.tracerId; }.bind(this)) || TRACERS[0];
    const frac = remainingFraction(this.state.tMin, tr.halfLifeMin);
    const rows = [
      [this.T('info.tracer'), tr.name],
      [this.T('info.halfLife'), tr.halfLifeMin + ' min'],
      [this.T('info.remaining'), (frac * 100).toFixed(1) + '%'],
    ];
    this._infoHost.replaceWith(infoTable(rows));
    this._infoHost = this.panel.querySelector('.info-table') || this._infoHost;
  }

  unmount() {
    window.removeEventListener('resize', this._resize);
    if (this.dual) this.dual.dispose();
  }
}

export default {
  id: 'pet_tracer',
  icon: '🏥',
  navKey: 'pet_tracer',
  titleKey: 'modules.pet_tracer.title',
  descKey: 'modules.pet_tracer.desc',
  create: function (ctx) { return new PetTracerInstance(ctx); },
};
