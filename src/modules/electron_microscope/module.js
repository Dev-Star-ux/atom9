import { ElectronMicroscope2D } from './scene2d.js';
import { ElectronMicroscopeScene3D } from './scene3d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import { electronWavelength, rayleighResolution, LIGHT_WAVELENGTH_M } from './physics.js';

class ElectronMicroscopeInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { voltage: 20000, NA: 0.02, NAlight: 1.0 };
  }

  T(k, v) { return this.t('modules.electron_microscope.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-tem');
    this.viewport = el('div', 'viewport tem-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel tem-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.electron_microscope'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildTeachCard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new ElectronMicroscope2D(host);
        s.setParams(self._sceneParams());
        return s;
      },
      create3D: function (host) {
        const s = new ElectronMicroscopeScene3D(host);
        s.setParams(self._sceneParams());
        s.applyTips(loadModuleTips('modules.electron_microscope', self.t));
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
      voltage: this.state.voltage,
      NA: this.state.NA,
      NAlight: this.state.NAlight,
    };
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    paramSlider(card, {
      label: this.T('controls.voltage'),
      min: 1000, max: 200000, step: 1000, value: this.state.voltage, unit: ' V',
      help: this.T('controls.voltageHelp'),
      onInput: function (v) { self.state.voltage = v; self._refresh(); },
    });
    paramSlider(card, {
      label: this.T('controls.na'),
      min: 0.005, max: 0.05, step: 0.001, value: this.state.NA, decimals: 3,
      help: this.T('controls.naHelp'),
      onInput: function (v) { self.state.NA = v; self._refresh(); },
    });

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _buildTeachCard() {
    const card = el('div', 'card tem-teach');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    this._teachBody = el('div', 'emx-feat-list');
    card.appendChild(this._teachBody);
    return card;
  }

  _refresh() {
    this.scene.setParams(this._sceneParams());
    const lambdaE = electronWavelength(this.state.voltage);
    const dE = rayleighResolution(lambdaE, this.state.NA);
    const dL = rayleighResolution(LIGHT_WAVELENGTH_M, this.state.NAlight);
    const rows = [
      [this.T('info.wavelength'), (lambdaE * 1e12).toFixed(2) + ' pm'],
      [this.T('info.resolution'), (dE * 1e9).toFixed(2) + ' nm'],
      [this.T('info.opticalLimit'), (dL * 1e6).toFixed(2) + ' µm'],
      [this.T('info.improvement'), (dL / dE).toFixed(0) + '× finer than light'],
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
  id: 'electron_microscope',
  icon: '🔬',
  navKey: 'modules.electron_microscope.navTitle',
  titleKey: 'modules.electron_microscope.title',
  descKey: 'modules.electron_microscope.desc',
  create: function (ctx) { return new ElectronMicroscopeInstance(ctx); },
};
