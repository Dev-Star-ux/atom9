import { Moderator2D } from './scene2d.js';
import { Moderator3D } from './scene3d.js';
import { el, principleCard, infoTable } from '../common/ui.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { MODERATORS, collisionsToThermal } from './physics.js';

class ModeratorInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { moderatorId: 'graphite' };
    this._tick = this._tick.bind(this);
  }

  T(k, v) { return this.t('modules.neutron_moderator.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear');
    this.viewport = el('div', 'viewport nm-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel nm-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.neutron_moderator'));
    this.panel.appendChild(this._buildParamCard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new Moderator2D(host);
        s.setParams(self.state);
        s.setActive(true);
        return s;
      },
      create3D: function (host) {
        return new Moderator3D(host);
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
    this._interval = setInterval(this._tick, 50);
  }

  _tick() {
    const s2 = this.dual.scene2d;
    if (s2 && typeof s2.tick === 'function') s2.tick(0.05);
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));
    card.appendChild(el('div', 'field-label', this.T('controls.moderator')));
    const chips = el('div', 'chips');
    MODERATORS.forEach(function (m) {
      const b = el('button', 'chip' + (self.state.moderatorId === m.id ? ' active' : ''), m.name);
      b.onclick = function () {
        self.state.moderatorId = m.id;
        chips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
        b.classList.add('active');
        self._refresh(true);
      };
      chips.appendChild(b);
    });
    card.appendChild(chips);
    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _refresh(reset) {
    this.dual.setParams(Object.assign({}, this.state, { reset: !!reset }));
    const m = MODERATORS.find(function (x) { return x.id === this.state.moderatorId; }.bind(this)) || MODERATORS[0];
    const r = collisionsToThermal(2e6, m);
    const rows = [
      [this.T('info.moderator'), m.name],
      [this.T('info.collisions'), String(r.n)],
      [this.T('info.thermalE'), '0.025 eV target'],
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
  id: 'neutron_moderator',
  icon: '🪵',
  navKey: 'neutron_moderator',
  titleKey: 'modules.neutron_moderator.title',
  descKey: 'modules.neutron_moderator.desc',
  create: function (ctx) { return new ModeratorInstance(ctx); },
};
