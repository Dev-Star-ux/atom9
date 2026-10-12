import { Diamagnetism2D } from './scene2d.js';
import { DiamagnetismScene3D } from './scene3d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import { findMaterial, forcePerVolume, equilibriumHeight, MATERIALS } from './physics.js';

const VIEWS = [
  { id: 'levitate', key: 'levitate' },
  { id: 'balance', key: 'balance' },
  { id: 'bars', key: 'bars' },
];

class DiamagnetismInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { materialId: 'bismuth', B: 1.0, dBdz: 20, view: 'levitate' };
  }

  T(k, v) { return this.t('modules.diamagnetism.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-dia');
    this.viewport = el('div', 'viewport dia-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel dia-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.diamagnetism'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildTeachCard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new Diamagnetism2D(host);
        s.setParams(self._sceneParams());
        return s;
      },
      create3D: function (host) {
        const s = new DiamagnetismScene3D(host);
        s.setParams(self._sceneParams());
        s.applyTips(loadModuleTips('modules.diamagnetism', self.t));
        if (s.camera && s.renderer && s.renderer.domElement) {
          bindSceneTips(self.viewport, {
            camera: s.camera,
            domElement: s.renderer.domElement,
            getPickables: function () {
              return typeof s.getPickables === 'function' ? s.getPickables() : [];
            },
          });
        }
        return s;
      },
      onModeChange: function (mode, scenes) {
        const s3 = scenes && scenes.scene3d;
        if (s3 && typeof s3.setActive === 'function') {
          s3.setActive(mode === '3d');
          if (mode === '3d') s3.setParams(self._sceneParams());
        }
      },
    });
    this.scene = this.dual;
    wireDualPause(this.viewport, this.dual, this.t);
    this._resize = function () { self.dual.resize(); };
    window.addEventListener('resize', this._resize);
    this.dual.resize();
    if (this.dual.scene3d && typeof this.dual.scene3d.setActive === 'function') {
      this.dual.scene3d.setActive(this.dual.mode === '3d');
    }
    this._refresh();
  }

  _sceneParams() {
    return {
      materialId: this.state.materialId,
      B: this.state.B,
      dBdz: this.state.dBdz,
      view: this.state.view,
    };
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    card.appendChild(el('div', 'field-label', this.T('controls.material')));
    const chips = el('div', 'chips');
    MATERIALS.forEach(function (m) {
      const b = el('button', 'chip' + (self.state.materialId === m.id ? ' active' : ''), m.name);
      b.onclick = function () {
        self.state.materialId = m.id;
        chips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
        b.classList.add('active');
        self._refresh();
      };
      chips.appendChild(b);
    });
    card.appendChild(chips);

    card.appendChild(el('div', 'field-label', this.T('controls.view')));
    const viewChips = el('div', 'chips');
    VIEWS.forEach(function (v) {
      const b = el('button', 'chip' + (self.state.view === v.id ? ' active' : ''), self.T('controls.views.' + v.key));
      b.onclick = function () {
        self.state.view = v.id;
        viewChips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
        b.classList.add('active');
        self._refresh();
      };
      viewChips.appendChild(b);
    });
    card.appendChild(viewChips);

    paramSlider(card, {
      label: this.T('controls.field'),
      min: 0.1, max: 3, step: 0.05, value: this.state.B, unit: ' T', decimals: 2,
      onInput: function (v) { self.state.B = v; self._refresh(); },
    });
    paramSlider(card, {
      label: this.T('controls.gradient'),
      min: 2, max: 60, step: 1, value: this.state.dBdz, unit: ' T/m',
      onInput: function (v) { self.state.dBdz = v; self._refresh(); },
    });

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _buildTeachCard() {
    const card = el('div', 'card dia-teach');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    this._teachBody = el('div', 'emx-feat-list');
    card.appendChild(this._teachBody);
    return card;
  }

  _refresh() {
    this.scene.setParams(this._sceneParams());
    const m = findMaterial(this.state.materialId);
    const F = forcePerVolume(m.chi, this.state.B, this.state.dBdz);
    const zEq = equilibriumHeight(m.chi, this.state.B, this.state.dBdz);
    const rows = [
      [this.T('info.material'), m.name],
      [this.T('info.chi'), m.chi.toExponential(2)],
      [this.T('info.force'), F.toExponential(2) + ' N/m³'],
      [this.T('info.behavior'), F < 0 ? this.T('info.repelled') : this.T('info.attracted')],
      [this.T('info.equilibrium'), zEq > 0 ? (zEq * 1000).toFixed(1) + ' mm' : this.T('info.noEquilibrium')],
    ];
    this._infoHost.replaceWith(infoTable(rows));
    this._infoHost = this.panel.querySelector('.info') || this._infoHost;

    this._teachBody.innerHTML = '';
    ['t1', 't2', 't3'].forEach((k) => {
      const row = el('div', 'emx-feat');
      row.appendChild(el('div', 'emx-feat-body', this.T('teach.' + k)));
      this._teachBody.appendChild(row);
    });
  }

  unmount() {
    window.removeEventListener('resize', this._resize);
    if (this.dual && typeof this.dual.dispose === 'function') this.dual.dispose();
  }
}

export default {
  id: 'diamagnetism',
  icon: '🪨',
  navKey: 'modules.diamagnetism.navTitle',
  titleKey: 'modules.diamagnetism.title',
  descKey: 'modules.diamagnetism.desc',
  create: function (ctx) { return new DiamagnetismInstance(ctx); },
};
