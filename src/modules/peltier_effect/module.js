import { Peltier2D } from './scene2d.js';
import { PeltierScene3D } from './scene3d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import { coldSideHeat, TEC_DEFAULTS } from './physics.js';

class PeltierInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { I: 1.5, T0: 293, thermalMass: 6 };
  }

  T(k, v) { return this.t('modules.peltier_effect.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-pelt');
    this.viewport = el('div', 'viewport pelt-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel pelt-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.peltier_effect'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildTeachCard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new Peltier2D(host);
        s.setParams(self._sceneParams());
        return s;
      },
      create3D: function (host) {
        const s = new PeltierScene3D(host);
        s.setParams(self._sceneParams());
        s.applyTips(loadModuleTips('modules.peltier_effect', self.t));
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
    this._refresh();
  }

  _sceneParams() {
    return {
      I: this.state.I,
      T0: this.state.T0,
      thermalMass: this.state.thermalMass,
    };
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    paramSlider(card, {
      label: this.T('controls.current'),
      min: -3, max: 3, step: 0.05, value: this.state.I, unit: ' A', decimals: 2,
      help: this.T('controls.currentHelp'),
      onInput: function (v) { self.state.I = v; self.scene.setParams({ I: v }); self._refresh(); },
    });
    const resetBtn = el('button', 'chip', this.T('controls.reset'));
    resetBtn.onclick = function () { self.scene.setParams({ reset: true }); };
    card.appendChild(resetBtn);

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _buildTeachCard() {
    const card = el('div', 'card pelt-teach');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    this._teachBody = el('div', 'emx-feat-list');
    card.appendChild(this._teachBody);
    return card;
  }

  _refresh() {
    const Qc = coldSideHeat(this.state.I, TEC_DEFAULTS.S, this.state.T0, TEC_DEFAULTS.Rm, TEC_DEFAULTS.K, 0);
    const rows = [
      [this.T('info.current'), this.state.I.toFixed(2) + ' A'],
      [this.T('info.direction'), this.state.I >= 0 ? this.T('info.cooling') : this.T('info.heating')],
      [this.T('info.piCoeff'), (TEC_DEFAULTS.S * this.state.T0).toFixed(2) + ' V'],
      [this.T('info.qc'), Qc.toFixed(2) + ' W (at ΔT=0)'],
    ];
    this._infoHost.replaceWith(infoTable(rows));
    this._infoHost = this.panel.querySelector('.info') || this._infoHost;

    this._teachBody.innerHTML = '';
    ['t1', 't2', 't3', 't4'].forEach((k) => {
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
  id: 'peltier_effect',
  icon: '❄️',
  navKey: 'modules.peltier_effect.navTitle',
  titleKey: 'modules.peltier_effect.title',
  descKey: 'modules.peltier_effect.desc',
  create: function (ctx) { return new PeltierInstance(ctx); },
};
