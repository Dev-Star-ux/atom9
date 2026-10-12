import { FaradayDiscScene2D } from './scene2d.js';
import { FaradayDiscScene3D } from './scene3d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import { emf, current } from './physics.js';

class FaradayDiscInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      B: 0.5,
      omega: 50,
      R: 0.1,
      Rload: 10,
    };
  }

  T(k, v) { return this.t('modules.faraday_disc.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-fdisc');
    this.viewport = el('div', 'viewport fdisc-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel fdisc-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.faraday_disc'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildTeachCard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new FaradayDiscScene2D(host);
        s.setParams(self._sceneParams());
        return s;
      },
      create3D: function (host) {
        const s = new FaradayDiscScene3D(host);
        s.setParams(self._sceneParams());
        s.setActive(true);
        s.applyTips(loadModuleTips('modules.faraday_disc', self.t));
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
      omega: this.state.omega,
      R: this.state.R,
      Rload: this.state.Rload,
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
      label: this.T('controls.omega'),
      min: 0, max: 200, step: 1, value: this.state.omega, unit: ' rad/s',
      decimals: 0,
      help: this.T('controls.omegaHelp'),
      onInput: function (v) {
        self.state.omega = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.R'),
      min: 0.02, max: 0.3, step: 0.01, value: this.state.R, unit: ' m',
      decimals: 2,
      help: this.T('controls.RHelp'),
      onInput: function (v) {
        self.state.R = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.Rload'),
      min: 1, max: 100, step: 1, value: this.state.Rload, unit: ' Ω',
      decimals: 0,
      help: this.T('controls.RloadHelp'),
      onInput: function (v) {
        self.state.Rload = v;
        self._refresh();
      },
    });

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _buildTeachCard() {
    const card = el('div', 'card fdisc-teach');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    this._teachBody = el('div', 'cor-feat-list');
    card.appendChild(this._teachBody);
    return card;
  }

  _refresh() {
    this.dual.setParams(this._sceneParams());
    const eps = emf(this.state.B, this.state.omega, this.state.R);
    const I = current(this.state.B, this.state.omega, this.state.R, this.state.Rload);
    const rows = [
      [this.T('info.emf'), eps.toFixed(4) + ' V'],
      [this.T('info.I'), I.toFixed(4) + ' A'],
      [this.T('info.formula'), 'ε = ½ B ω R²'],
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
  id: 'faraday_disc',
  icon: '💿',
  navKey: 'modules.faraday_disc.navTitle',
  titleKey: 'modules.faraday_disc.title',
  descKey: 'modules.faraday_disc.desc',
  create: function (ctx) { return new FaradayDiscInstance(ctx); },
};
