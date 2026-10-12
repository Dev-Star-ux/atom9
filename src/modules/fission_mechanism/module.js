import { FissionMechanismScene2D } from './scene2d.js';
import { FissionMechanismScene3D } from './scene3d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import { TARGETS, getTarget, canFission, fissionQ, NU_BAR } from './physics.js';

class FissionMechanismInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { targetId: 'u235', neutronMeV: 0.025, speed: 1 };
  }
  T(k, v) { return this.t('modules.fission_mechanism.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear');
    this.viewport = el('div', 'viewport fm-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel');
    this.panel.appendChild(principleCard(this.t, 'modules.fission_mechanism'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._teach());
    this._rail = el('div', 'panel-rail');
    this._rail.appendChild(this.panel);
    root.appendChild(this._rail);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new FissionMechanismScene2D(host);
        s.setParams(self.state);
        s.setActive(true);
        return s;
      },
      create3D: function (host) {
        const s = new FissionMechanismScene3D(host);
        s.setParams(self.state);
        s.setActive(true);
        s.applyTips(loadModuleTips('modules.fission_mechanism', self.t));
        if (s.camera) {
          bindSceneTips(self.viewport, {
            camera: s.camera,
            domElement: s.renderer.domElement,
            getPickables: function () { return s.getPickables(); },
          });
        }
        return s;
      },
      onModeChange: function (mode, scenes) {
        const s2 = scenes && scenes.scene2d;
        const s3 = scenes && scenes.scene3d;
        if (s2 && s2.setActive) s2.setActive(mode === '2d');
        if (s3 && s3.setActive) {
          s3.setActive(mode === '3d');
          if (mode === '3d') s3.setParams(self.state);
        }
      },
    });
    this.scene = this.dual;
    wireDualPause(this.viewport, this.dual, this.t);
    this._resize = function () { self.dual.resize(); };
    window.addEventListener('resize', this._resize);
    this.dual.resize();
    this._refresh();
    this._interval = setInterval(function () {
      if (self.dual) self.dual.tick(0.04);
    }, 40);
    setTimeout(function () { if (self.dual) self.dual.resize(); }, 80);
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));
    const row = el('div', 'param');
    row.appendChild(el('label', null, this.T('controls.target')));
    const chips = el('div', 'chips');
    this._chips = {};
    TARGETS.forEach(function (tg) {
      const b = el('button', 'chip' + (self.state.targetId === tg.id ? ' active' : ''), self.T('controls.targets.' + tg.id));
      b.onclick = function () {
        self.state.targetId = tg.id;
        Object.keys(self._chips).forEach(function (id) {
          self._chips[id].classList.toggle('active', id === tg.id);
        });
        self._refresh();
      };
      self._chips[tg.id] = b;
      chips.appendChild(b);
    });
    row.appendChild(chips);
    card.appendChild(row);

    this._en = paramSlider(card, {
      label: this.T('controls.energy'), min: 0.001, max: 14, step: 0.001,
      value: this.state.neutronMeV, unit: ' MeV', decimals: 3,
      help: this.T('controls.energyHelp'),
      onInput: function (v) { self.state.neutronMeV = v; self._refresh(); },
    });
    paramSlider(card, {
      label: this.T('controls.speed'), min: 0.25, max: 2.5, step: 0.05,
      value: this.state.speed, unit: '×', decimals: 2,
      help: this.T('controls.speedHelp'),
      onInput: function (v) { self.state.speed = v; self._refresh(); },
    });
    const btns = el('div', 'qc-actions');
    const reset = el('button', 'btn', this.T('controls.reset'));
    reset.onclick = function () { self.dual.setParams({ reset: true }); };
    const thermal = el('button', 'btn', this.T('controls.thermal'));
    thermal.onclick = function () {
      self.state.neutronMeV = 0.025;
      self._en.set(0.025);
      self._refresh();
    };
    const fast = el('button', 'btn primary', this.T('controls.fast'));
    fast.onclick = function () {
      self.state.neutronMeV = 2;
      self._en.set(2);
      self._refresh();
    };
    btns.append(reset, thermal, fast);
    card.appendChild(btns);
    this._infoHost = el('div', 'eq-info');
    card.appendChild(this._infoHost);
    this._refresh();
    return card;
  }

  _teach() {
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    ['t1', 't2', 't3', 't4'].forEach((k) => {
      card.appendChild(el('p', 'param-help', this.T('teach.' + k)));
    });
    return card;
  }

  _refresh() {
    if (this.dual) this.dual.setParams(this.state);
    if (!this._infoHost) return;
    const tg = getTarget(this.state.targetId);
    const ok = canFission(tg, this.state.neutronMeV);
    this._infoHost.replaceChildren(infoTable([
      [this.T('info.target'), this.T('controls.targets.' + tg.id)],
      [this.T('info.barrier'), tg.barrierMeV.toFixed(0) + ' MeV'],
      [this.T('info.thermal'), tg.thermal ? this.T('info.yes') : this.T('info.no')],
      [this.T('info.path'), ok ? this.T('info.open') : this.T('info.closed')],
      [this.T('info.q'), fissionQ(tg.a).toFixed(0) + ' MeV'],
      [this.T('info.nu'), String(NU_BAR)],
    ]));
  }

  unmount() {
    if (this._interval) clearInterval(this._interval);
    window.removeEventListener('resize', this._resize);
    if (this.dual) this.dual.dispose();
  }
}

export default {
  id: 'fission_mechanism',
  icon: '⬡',
  navKey: 'modules.fission_mechanism.navTitle',
  titleKey: 'modules.fission_mechanism.title',
  descKey: 'modules.fission_mechanism.desc',
  create: function (ctx) { return new FissionMechanismInstance(ctx); },
};
