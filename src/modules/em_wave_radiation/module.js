import { EmWaveRadiationScene2D } from './scene2d.js';
import { EmWaveRadiationScene3D } from './scene3d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import { wavelength, farFieldDistance, poyntingFar } from './physics.js';

class EmWaveRadiationInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      frequency: 1e8,
      amplitude: 0.8,
      showNearFar: 1,
    };
  }

  T(k, v) { return this.t('modules.em_wave_radiation.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-emrad');
    this.viewport = el('div', 'viewport emrad-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel emrad-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.em_wave_radiation'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildTeachCard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new EmWaveRadiationScene2D(host);
        s.setParams(self._sceneParams());
        return s;
      },
      create3D: function (host) {
        const s = new EmWaveRadiationScene3D(host);
        s.setParams(self._sceneParams());
        s.setActive(true);
        s.applyTips(loadModuleTips('modules.em_wave_radiation', self.t));
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
      frequency: this.state.frequency,
      amplitude: this.state.amplitude,
      showNearFar: this.state.showNearFar,
    };
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    paramSlider(card, {
      label: this.T('controls.frequency'),
      min: 3e7, max: 3e8, step: 1e6, value: this.state.frequency, unit: ' Hz',
      decimals: 0,
      help: this.T('controls.frequencyHelp'),
      onInput: function (v) {
        self.state.frequency = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.amplitude'),
      min: 0.1, max: 1.5, step: 0.05, value: this.state.amplitude, unit: '',
      decimals: 2,
      help: this.T('controls.amplitudeHelp'),
      onInput: function (v) {
        self.state.amplitude = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.showNearFar'),
      min: 0, max: 1, step: 1, value: this.state.showNearFar, unit: '',
      decimals: 0,
      help: this.T('controls.showNearFarHelp'),
      onInput: function (v) {
        self.state.showNearFar = v;
        self._refresh();
      },
    });

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _buildTeachCard() {
    const card = el('div', 'card emrad-teach');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    this._teachBody = el('div', 'emrad-feat-list');
    card.appendChild(this._teachBody);
    return card;
  }

  _refresh() {
    this.dual.setParams(this._sceneParams());
    const lam = wavelength(this.state.frequency);
    const rff = farFieldDistance(this.state.frequency);
    const S = poyntingFar(this.state.amplitude, this.state.frequency, rff, Math.PI / 2);
    const rows = [
      [this.T('controls.frequency'), (this.state.frequency / 1e6).toFixed(0) + ' MHz'],
      [this.T('info.wavelength'), (lam).toFixed(2) + ' m'],
      [this.T('info.rFar'), rff.toFixed(2) + ' m'],
      [this.T('info.Speak'), S.toExponential(2) + ' (arb.)'],
    ];
    this._infoHost.replaceWith(infoTable(rows));
    this._infoHost = this.panel.querySelector('.info') || this._infoHost;

    this._teachBody.innerHTML = '';
    const keys = ['t1', 't2', 't3', 't4'];
    for (let i = 0; i < keys.length; i++) {
      const row = el('div', 'emrad-feat');
      row.appendChild(el('div', 'emrad-feat-body', this.T('teach.' + keys[i])));
      this._teachBody.appendChild(row);
    }
  }

  unmount() {
    window.removeEventListener('resize', this._resize);
    if (this.dual && typeof this.dual.dispose === 'function') this.dual.dispose();
  }
}

export default {
  id: 'em_wave_radiation',
  icon: '📶',
  navKey: 'modules.em_wave_radiation.navTitle',
  titleKey: 'modules.em_wave_radiation.title',
  descKey: 'modules.em_wave_radiation.desc',
  create: function (ctx) { return new EmWaveRadiationInstance(ctx); },
};
