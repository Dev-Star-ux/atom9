import { Geiger2D } from './scene2d.js';
import { Geiger3D } from './scene3d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { countRateBq, SOURCES } from './physics.js';

class GeigerInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { sourceId: 'cs137', distance: 0.5, shieldMm: 0, shieldMat: 'none' };
    this._tick = this._tick.bind(this);
  }

  T(k, v) { return this.t('modules.geiger_counter.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear');
    this.viewport = el('div', 'viewport gc-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel gc-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.geiger_counter'));
    this.panel.appendChild(this._buildParamCard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new Geiger2D(host);
        s.setParams(self.state);
        s.setActive(true);
        return s;
      },
      create3D: function (host) {
        const s = new Geiger3D(host);
        s.setParams(self.state);
        return s;
      },
      onModeChange: function (mode, scenes) {
        const s2 = scenes && scenes.scene2d;
        const s3 = scenes && scenes.scene3d;
        if (s2 && typeof s2.setActive === 'function') s2.setActive(mode === '2d');
        if (s3 && typeof s3.setActive === 'function') s3.setActive(mode === '3d');
      },
    });
    wireDualPause(this.viewport, this.dual, this.t);
    this._resize = function () { self.dual.resize(); };
    window.addEventListener('resize', this._resize);
    this.dual.resize();
    this._refresh();
    this._interval = setInterval(this._tick, 80);
  }

  _tick() {
    const s2 = this.dual.scene2d;
    if (s2 && typeof s2.tick === 'function') s2.tick(0.08);
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));
    card.appendChild(el('div', 'field-label', this.T('controls.source')));
    const chips = el('div', 'chips');
    SOURCES.forEach(function (src) {
      const b = el('button', 'chip' + (self.state.sourceId === src.id ? ' active' : ''), src.name);
      b.onclick = function () {
        self.state.sourceId = src.id;
        chips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
        b.classList.add('active');
        self._refresh();
      };
      chips.appendChild(b);
    });
    card.appendChild(chips);
    paramSlider(card, {
      label: this.T('controls.distance'),
      min: 0.1, max: 2, step: 0.05, value: this.state.distance, unit: 'm',
      onInput: function (v) { self.state.distance = v; self._refresh(); },
    });
    paramSlider(card, {
      label: this.T('controls.shield'),
      min: 0, max: 30, step: 1, value: this.state.shieldMm, unit: 'mm',
      onInput: function (v) { self.state.shieldMm = v; self.state.shieldMat = v > 0 ? 'lead' : 'none'; self._refresh(); },
    });
    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _refresh() {
    this.dual.setParams(this.state);
    const src = SOURCES.find(function (s) { return s.id === this.state.sourceId; }.bind(this)) || SOURCES[0];
    const rate = countRateBq(src.activity, this.state.distance, this.state.shieldMm, this.state.shieldMat);
    const rows = [
      [this.T('info.rate'), rate.toFixed(0) + ' cps (model)'],
      [this.T('info.distance'), this.state.distance.toFixed(2) + ' m'],
      [this.T('info.shield'), this.state.shieldMm + ' mm'],
    ];
    this._infoHost.replaceWith(infoTable(rows));
    this._infoHost = this.panel.querySelector('.info-table') || this._infoHost;
  }

  unmount() {
    clearInterval(this._interval);
    window.removeEventListener('resize', this._resize);
    if (this.dual) this.dual.dispose();
  }
}

export default {
  id: 'geiger_counter',
  icon: '📟',
  navKey: 'modules.geiger_counter.navTitle',
  titleKey: 'modules.geiger_counter.title',
  descKey: 'modules.geiger_counter.desc',
  create: function (ctx) { return new GeigerInstance(ctx); },
};
