import { EddyCurrentsScene2D } from './scene2d.js';
import { EddyCurrentsScene3D } from './scene3d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import { eddyPower, brakeForce, inducedE } from './physics.js';

class EddyCurrentsInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      B: 0.5,
      thickness: 2,
      sigma: 1,
      speed: 1,
    };
  }

  T(k, v) { return this.t('modules.eddy_currents.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-edc');
    this.viewport = el('div', 'viewport edc-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel edc-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.eddy_currents'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildTeachCard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new EddyCurrentsScene2D(host);
        s.setParams(self._sceneParams());
        return s;
      },
      create3D: function (host) {
        const s = new EddyCurrentsScene3D(host);
        s.setParams(self._sceneParams());
        s.setActive(true);
        s.applyTips(loadModuleTips('modules.eddy_currents', self.t));
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
      B: this.state.B,
      thickness: this.state.thickness,
      sigma: this.state.sigma,
      speed: this.state.speed,
    };
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    paramSlider(card, {
      label: this.T('controls.B'),
      min: 0.05, max: 2, step: 0.05, value: this.state.B, unit: ' T',
      decimals: 2,
      help: this.T('controls.BHelp'),
      onInput: function (v) {
        self.state.B = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.thickness'),
      min: 0.5, max: 8, step: 0.1, value: this.state.thickness, unit: ' mm',
      decimals: 1,
      help: this.T('controls.thicknessHelp'),
      onInput: function (v) {
        self.state.thickness = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.sigma'),
      min: 0.1, max: 5, step: 0.1, value: this.state.sigma, unit: '',
      decimals: 1,
      help: this.T('controls.sigmaHelp'),
      onInput: function (v) {
        self.state.sigma = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.speed'),
      min: 0, max: 5, step: 0.05, value: this.state.speed, unit: ' m/s',
      decimals: 2,
      help: this.T('controls.speedHelp'),
      onInput: function (v) {
        self.state.speed = v;
        self._refresh();
      },
    });

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _buildTeachCard() {
    const card = el('div', 'card edc-teach');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    this._teachBody = el('div', 'cor-feat-list');
    card.appendChild(this._teachBody);
    return card;
  }

  _refresh() {
    this.dual.setParams(this._sceneParams());
    const E = inducedE(this.state.B, this.state.speed);
    const P = eddyPower(this.state.B, this.state.speed, this.state.thickness, this.state.sigma);
    const F = brakeForce(this.state.B, this.state.speed, this.state.thickness, this.state.sigma);
    const rows = [
      [this.T('info.Eind'), E.toFixed(3) + ' (arb)'],
      [this.T('info.power'), P.toFixed(3) + ' (arb)'],
      [this.T('info.Fbrake'), F.toFixed(3) + ' (arb)'],
    ];
    this._infoHost.replaceWith(infoTable(rows));
    this._infoHost = this.panel.querySelector('.info') || this._infoHost;

    this._teachBody.innerHTML = '';
    const keys = ['t1', 't2', 't3', 't4'];
    for (let i = 0; i < keys.length; i++) {
      const row = el('div', 'cor-feat');
      row.appendChild(el('div', 'cor-feat-body', this.T('teach.' + keys[i])));
      this._teachBody.appendChild(row);
    }
  }

  unmount() {
    window.removeEventListener('resize', this._resize);
    if (this.dual && typeof this.dual.dispose === 'function') this.dual.dispose();
  }
}

export default {
  id: 'eddy_currents',
  icon: '🔄',
  navKey: 'modules.eddy_currents.navTitle',
  titleKey: 'modules.eddy_currents.title',
  descKey: 'modules.eddy_currents.desc',
  create: function (ctx) { return new EddyCurrentsInstance(ctx); },
};
