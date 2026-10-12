import { GlowDischargeScene2D } from './scene2d.js';
import { GlowDischargeScene3D } from './scene3d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import {
  paschenVoltage,
  isGlowing,
  A_DEFAULT,
  B_DEFAULT,
  GAMMA_DEFAULT,
} from './physics.js';

class GlowDischargeInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      pressureTorr: 1,
      spacingCm: 5,
      V: 400,
    };
  }

  T(k, v) { return this.t('modules.glow_discharge.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-glw');
    this.viewport = el('div', 'viewport glw-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel glw-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.glow_discharge'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildTeachCard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new GlowDischargeScene2D(host);
        s.setParams(self._sceneParams());
        return s;
      },
      create3D: function (host) {
        const s = new GlowDischargeScene3D(host);
        s.setParams(self._sceneParams());
        s.applyTips(loadModuleTips('modules.glow_discharge', self.t));
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
      V: this.state.V,
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
      min: 1, max: 20, step: 0.2, value: this.state.spacingCm, unit: ' cm',
      decimals: 1,
      help: this.T('controls.spacingHelp'),
      onInput: function (v) {
        self.state.spacingCm = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.voltage'),
      min: 50, max: 2000, step: 10, value: this.state.V, unit: ' V',
      help: this.T('controls.voltageHelp'),
      onInput: function (v) {
        self.state.V = v;
        self._refresh();
      },
    });

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _buildTeachCard() {
    const card = el('div', 'card glw-teach');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    this._teachBody = el('div', 'glw-feat-list');
    card.appendChild(this._teachBody);
    return card;
  }

  _refresh() {
    this.dual.setParams(this._sceneParams());
    const pd = this.state.pressureTorr * this.state.spacingCm;
    const Vb = paschenVoltage(pd, A_DEFAULT, B_DEFAULT, GAMMA_DEFAULT);
    const glowing = isGlowing(this.state.V, pd, A_DEFAULT, B_DEFAULT, GAMMA_DEFAULT);
    const rows = [
      [this.T('info.pd'), pd.toFixed(2) + ' Torr·cm'],
      [this.T('info.Vb'), isFinite(Vb) && Vb < 1e8 ? Vb.toFixed(0) + ' V' : '—'],
      [this.T('info.glowing'), glowing ? this.T('info.yes') : this.T('info.no')],
    ];
    this._infoHost.replaceWith(infoTable(rows));
    this._infoHost = this.panel.querySelector('.info') || this._infoHost;

    this._teachBody.innerHTML = '';
    const keys = ['t1', 't2', 't3', 't4'];
    for (let i = 0; i < keys.length; i++) {
      const row = el('div', 'glw-feat');
      row.appendChild(el('div', 'glw-feat-body', this.T('teach.' + keys[i])));
      this._teachBody.appendChild(row);
    }
  }

  unmount() {
    window.removeEventListener('resize', this._resize);
    if (this.dual && typeof this.dual.dispose === 'function') this.dual.dispose();
  }
}

export default {
  id: 'glow_discharge',
  icon: '💜',
  navKey: 'modules.glow_discharge.navTitle',
  titleKey: 'modules.glow_discharge.title',
  descKey: 'modules.glow_discharge.desc',
  create: function (ctx) { return new GlowDischargeInstance(ctx); },
};
