import { PrecipitatorScene2D } from './scene2d.js';
import { PrecipitatorScene3D } from './scene3d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import {
  fieldVm,
  driftVelocity,
  gasFlow,
  collectionEfficiency,
} from './physics.js';

class PrecipitatorInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      voltageKV: 40,
      particleRadiusUm: 2,
      gasVelocityMs: 1.5,
      plateSpacingCm: 20,
      plateAreaM2: 4,
      ductCrossSectionM2: 0.5,
      fieldOn: true,
    };
  }

  T(k, v) { return this.t('modules.electrostatic_precipitator.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-epc');
    this.viewport = el('div', 'viewport epc-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel epc-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.electrostatic_precipitator'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildTeachCard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new PrecipitatorScene2D(host);
        s.setParams(self._sceneParams());
        return s;
      },
      create3D: function (host) {
        const s = new PrecipitatorScene3D(host);
        s.setParams(self._sceneParams());
        s.applyTips(loadModuleTips('modules.electrostatic_precipitator', self.t));
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
        const s2 = scenes && scenes.scene2d;
        const s3 = scenes && scenes.scene3d;
        if (s2 && typeof s2.setActive === 'function') s2.setActive(mode === '2d');
        if (s3 && typeof s3.setActive === 'function') {
          s3.setActive(mode === '3d');
          if (mode === '3d') s3.setParams(self._sceneParams());
        }
      },
    });
    this.scene = this.dual;
    wireDualPause(this.viewport, this.dual, this.t);
    this._buildFieldToolbar();
    this._resize = function () { self.dual.resize(); };
    window.addEventListener('resize', this._resize);
    this.dual.resize();
    this._refresh();
  }

  _sceneParams() {
    return {
      voltageKV: this.state.voltageKV,
      particleRadiusUm: this.state.particleRadiusUm,
      gasVelocityMs: this.state.gasVelocityMs,
      plateSpacingCm: this.state.plateSpacingCm,
      plateAreaM2: this.state.plateAreaM2,
      ductCrossSectionM2: this.state.ductCrossSectionM2,
      fieldOn: this.state.fieldOn,
    };
  }

  /** On / Off / Reset toolbar — same idea as the reference simulation's
   *  power switch, placed right next to the Pause button. */
  _buildFieldToolbar() {
    const self = this;
    const bar = el('div', 'esp-toolbar');

    const onBtn = el('button', 'esp-toolbar-btn' + (this.state.fieldOn ? ' active-on' : ''), this.T('controls.on'));
    const offBtn = el('button', 'esp-toolbar-btn' + (!this.state.fieldOn ? ' active-off' : ''), this.T('controls.off'));
    const resetBtn = el('button', 'esp-toolbar-btn', this.T('controls.reset'));

    function syncButtons() {
      onBtn.classList.toggle('active-on', self.state.fieldOn);
      offBtn.classList.toggle('active-off', !self.state.fieldOn);
    }

    onBtn.onclick = function () {
      self.state.fieldOn = true;
      syncButtons();
      self._refresh();
    };
    offBtn.onclick = function () {
      self.state.fieldOn = false;
      syncButtons();
      self._refresh();
    };
    resetBtn.onclick = function () {
      const s2 = self.dual.scene2d;
      const s3 = self.dual.scene3d;
      if (s2 && typeof s2.reset === 'function') s2.reset();
      if (s3 && typeof s3.reset === 'function') s3.reset();
    };

    bar.appendChild(onBtn);
    bar.appendChild(offBtn);
    bar.appendChild(resetBtn);
    this.viewport.appendChild(bar);
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    paramSlider(card, {
      label: this.T('controls.voltageKV'),
      min: 10, max: 80, step: 1, value: this.state.voltageKV, unit: ' kV',
      help: this.T('controls.voltageHelp'),
      onInput: function (v) {
        self.state.voltageKV = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.particleRadiusUm'),
      min: 0.1, max: 20, step: 0.1, value: this.state.particleRadiusUm, unit: ' µm',
      decimals: 1,
      help: this.T('controls.radiusHelp'),
      onInput: function (v) {
        self.state.particleRadiusUm = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.gasVelocityMs'),
      min: 0.2, max: 5, step: 0.1, value: this.state.gasVelocityMs, unit: ' m/s',
      decimals: 1,
      help: this.T('controls.velocityHelp'),
      onInput: function (v) {
        self.state.gasVelocityMs = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.plateSpacingCm'),
      min: 5, max: 40, step: 1, value: this.state.plateSpacingCm, unit: ' cm',
      help: this.T('controls.spacingHelp'),
      onInput: function (v) {
        self.state.plateSpacingCm = v;
        self._refresh();
      },
    });

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _buildTeachCard() {
    const card = el('div', 'card epc-teach');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    this._teachBody = el('div', 'epc-feat-list');
    card.appendChild(this._teachBody);
    return card;
  }

  _refresh() {
    this.dual.setParams(this._sceneParams());
    const fieldOn = this.state.fieldOn;
    const E = fieldOn ? fieldVm(this.state.voltageKV, this.state.plateSpacingCm) : 0;
    const w = fieldOn ? driftVelocity(this.state.voltageKV, this.state.plateSpacingCm, this.state.particleRadiusUm) : 0;
    const Q = gasFlow(this.state.gasVelocityMs, this.state.ductCrossSectionM2);
    const eta = fieldOn ? collectionEfficiency(w, this.state.plateAreaM2, Q) : 0;
    const rows = [
      [this.T('info.status'), fieldOn ? this.T('info.statusOn') : this.T('info.statusOff')],
      [this.T('info.field'), (E / 1000).toFixed(2) + ' kV/m'],
      [this.T('info.drift'), (w * 1000).toFixed(2) + ' mm/s'],
      [this.T('info.flow'), Q.toFixed(2) + ' m³/s'],
      [this.T('info.efficiency'), (100 * eta).toFixed(1) + '%'],
    ];
    this._infoHost.replaceWith(infoTable(rows));
    this._infoHost = this.panel.querySelector('.info') || this._infoHost;

    this._teachBody.innerHTML = '';
    const keys = ['t1', 't2', 't3', 't4'];
    for (let i = 0; i < keys.length; i++) {
      const row = el('div', 'epc-feat');
      row.appendChild(el('div', 'epc-feat-body', this.T('teach.' + keys[i])));
      this._teachBody.appendChild(row);
    }
  }

  unmount() {
    window.removeEventListener('resize', this._resize);
    if (this.dual && typeof this.dual.dispose === 'function') this.dual.dispose();
  }
}

export default {
  id: 'electrostatic_precipitator',
  icon: '💨',
  navKey: 'modules.electrostatic_precipitator.navTitle',
  titleKey: 'modules.electrostatic_precipitator.title',
  descKey: 'modules.electrostatic_precipitator.desc',
  create: function (ctx) { return new PrecipitatorInstance(ctx); },
};
