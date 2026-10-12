import { AcPowerFactorScene2D } from './scene2d.js';
import { AcPowerFactorScene3D } from './scene3d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import {
  realPower, reactivePower, apparentPower, powerFactor, degToRad,
} from './physics.js';

class AcPowerFactorInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      Vrms: 120,
      Irms: 10,
      phiDeg: 36,
    };
  }

  T(k, v) { return this.t('modules.ac_power_factor.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-acpf');
    this.viewport = el('div', 'viewport acpf-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel acpf-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.ac_power_factor'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildTeachCard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new AcPowerFactorScene2D(host);
        s.setParams(self._sceneParams());
        return s;
      },
      create3D: function (host) {
        const s = new AcPowerFactorScene3D(host);
        s.setParams(self._sceneParams());
        s.setActive(true);
        s.applyTips(loadModuleTips('modules.ac_power_factor', self.t));
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
      Vrms: this.state.Vrms,
      Irms: this.state.Irms,
      phiDeg: this.state.phiDeg,
    };
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    paramSlider(card, {
      label: this.T('controls.Vrms'),
      min: 50, max: 240, step: 1, value: this.state.Vrms, unit: ' V',
      decimals: 0,
      help: this.T('controls.VrmsHelp'),
      onInput: function (v) {
        self.state.Vrms = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.Irms'),
      min: 1, max: 50, step: 0.5, value: this.state.Irms, unit: ' A',
      decimals: 1,
      help: this.T('controls.IrmsHelp'),
      onInput: function (v) {
        self.state.Irms = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.phi'),
      min: 0, max: 80, step: 1, value: this.state.phiDeg, unit: '° lag',
      decimals: 0,
      help: this.T('controls.phiHelp'),
      onInput: function (v) {
        self.state.phiDeg = v;
        self._refresh();
      },
    });

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _buildTeachCard() {
    const card = el('div', 'card acpf-teach');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    this._teachBody = el('div', 'cor-feat-list');
    card.appendChild(this._teachBody);
    return card;
  }

  _refresh() {
    this.dual.setParams(this._sceneParams());
    const phi = degToRad(this.state.phiDeg);
    const P = realPower(this.state.Vrms, this.state.Irms, phi);
    const Q = reactivePower(this.state.Vrms, this.state.Irms, phi);
    const S = apparentPower(this.state.Vrms, this.state.Irms);
    const pf = powerFactor(this.state.Vrms, this.state.Irms, phi);
    const rows = [
      [this.T('info.P'), P.toFixed(1) + ' W'],
      [this.T('info.Q'), Q.toFixed(1) + ' VAR'],
      [this.T('info.S'), S.toFixed(1) + ' VA'],
      [this.T('info.pf'), pf.toFixed(3) + ' lagging'],
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
  id: 'ac_power_factor',
  icon: 'φ',
  navKey: 'modules.ac_power_factor.navTitle',
  titleKey: 'modules.ac_power_factor.title',
  descKey: 'modules.ac_power_factor.desc',
  create: function (ctx) { return new AcPowerFactorInstance(ctx); },
};
