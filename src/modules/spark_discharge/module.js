import { SparkDischargeScene2D } from './scene2d.js';
import { SparkDischargeScene3D } from './scene3d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import {
  paschenVoltage,
  chargeTimeToBreakdown,
  sparkFrequency,
} from './physics.js';

class SparkDischargeInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      pressureTorr: 1,
      spacingCm: 2,
      Vsupply: 600,
      R: 1e6,
      C: 1e-8,
    };
  }

  T(k, v) { return this.t('modules.spark_discharge.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-spk');
    this.viewport = el('div', 'viewport spk-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel spk-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.spark_discharge'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildTeachCard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new SparkDischargeScene2D(host);
        s.setParams(self._sceneParams());
        return s;
      },
      create3D: function (host) {
        const s = new SparkDischargeScene3D(host);
        s.setParams(self._sceneParams());
        s.applyTips(loadModuleTips('modules.spark_discharge', self.t));
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
    this._resize = function () { self.dual.resize(); };
    window.addEventListener('resize', this._resize);
    this.dual.resize();
    this._refresh();
  }

  _sceneParams() {
    return {
      pressureTorr: this.state.pressureTorr,
      spacingCm: this.state.spacingCm,
      Vsupply: this.state.Vsupply,
      R: this.state.R,
      C: this.state.C,
    };
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    paramSlider(card, {
      label: this.T('controls.pressure'),
      min: 0.1, max: 20, step: 0.1, value: this.state.pressureTorr, unit: ' Torr',
      decimals: 1,
      help: this.T('controls.pressureHelp'),
      onInput: function (v) {
        self.state.pressureTorr = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.spacing'),
      min: 0.5, max: 10, step: 0.1, value: this.state.spacingCm, unit: ' cm',
      decimals: 1,
      help: this.T('controls.spacingHelp'),
      onInput: function (v) {
        self.state.spacingCm = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.Vsupply'),
      min: 100, max: 2000, step: 10, value: this.state.Vsupply, unit: ' V',
      help: this.T('controls.VsupplyHelp'),
      onInput: function (v) {
        self.state.Vsupply = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.R'),
      min: 0.1, max: 10, step: 0.05, value: this.state.R / 1e6, unit: ' MΩ',
      decimals: 2,
      help: this.T('controls.RHelp'),
      onInput: function (v) {
        self.state.R = v * 1e6;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.C'),
      min: 1, max: 100, step: 1, value: this.state.C * 1e9, unit: ' nF',
      decimals: 0,
      help: this.T('controls.CHelp'),
      onInput: function (v) {
        self.state.C = v * 1e-9;
        self._refresh();
      },
    });

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _buildTeachCard() {
    const card = el('div', 'card spk-teach');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    this._teachBody = el('div', 'spk-feat-list');
    card.appendChild(this._teachBody);
    return card;
  }

  _refresh() {
    this.dual.setParams(this._sceneParams());
    const pd = this.state.pressureTorr * this.state.spacingCm;
    const Vb = paschenVoltage(pd);
    const tCharge = chargeTimeToBreakdown(this.state.R, this.state.C, this.state.Vsupply, Vb);
    const freq = sparkFrequency(this.state.R, this.state.C, this.state.Vsupply, Vb);
    const rows = [
      [this.T('info.pd'), pd.toFixed(2) + ' Torr·cm'],
      [this.T('info.Vb'), Vb < 1e8 ? Vb.toFixed(0) + ' V' : '—'],
      [this.T('info.tCharge'), isFinite(tCharge) ? (tCharge * 1e3).toFixed(3) + ' ms' : '∞ (never fires)'],
      [this.T('info.freq'), freq > 0 ? freq.toFixed(2) + ' Hz' : '0 Hz'],
    ];
    this._infoHost.replaceWith(infoTable(rows));
    this._infoHost = this.panel.querySelector('.info') || this._infoHost;

    this._teachBody.innerHTML = '';
    const keys = ['t1', 't2', 't3', 't4'];
    for (let i = 0; i < keys.length; i++) {
      const row = el('div', 'spk-feat');
      row.appendChild(el('div', 'spk-feat-body', this.T('teach.' + keys[i])));
      this._teachBody.appendChild(row);
    }
  }

  unmount() {
    window.removeEventListener('resize', this._resize);
    if (this.dual && typeof this.dual.dispose === 'function') this.dual.dispose();
  }
}

export default {
  id: 'spark_discharge',
  icon: '🌩️',
  navKey: 'modules.spark_discharge.navTitle',
  titleKey: 'modules.spark_discharge.title',
  descKey: 'modules.spark_discharge.desc',
  create: function (ctx) { return new SparkDischargeInstance(ctx); },
};
