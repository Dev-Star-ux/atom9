import { CoronaDischargeScene2D } from './scene2d.js';
import { CoronaDischargeScene3D } from './scene3d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import { peekOnsetField, tipField, coronaActive } from './physics.js';

class CoronaDischargeInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      V: 20,
      r: 0.05,
      d: 10,
      delta: 1.0,
    };
  }

  T(k, v) { return this.t('modules.corona_discharge.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-cor');
    this.viewport = el('div', 'viewport cor-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel cor-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.corona_discharge'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildTeachCard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new CoronaDischargeScene2D(host);
        s.setParams(self._sceneParams());
        return s;
      },
      create3D: function (host) {
        const s = new CoronaDischargeScene3D(host);
        s.setParams(self._sceneParams());
        s.setActive(true);
        s.applyTips(loadModuleTips('modules.corona_discharge', self.t));
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
      V: this.state.V,
      r: this.state.r,
      d: this.state.d,
      delta: this.state.delta,
    };
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    paramSlider(card, {
      label: this.T('controls.V'),
      min: 1, max: 100, step: 0.5, value: this.state.V, unit: ' kV',
      decimals: 1,
      help: this.T('controls.VHelp'),
      onInput: function (v) {
        self.state.V = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.r'),
      min: 0.01, max: 1, step: 0.01, value: this.state.r, unit: ' cm',
      decimals: 2,
      help: this.T('controls.rHelp'),
      onInput: function (v) {
        self.state.r = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.d'),
      min: 1, max: 50, step: 0.5, value: this.state.d, unit: ' cm',
      decimals: 1,
      help: this.T('controls.dHelp'),
      onInput: function (v) {
        self.state.d = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.delta'),
      min: 0.5, max: 1.5, step: 0.01, value: this.state.delta, unit: '',
      decimals: 2,
      help: this.T('controls.deltaHelp'),
      onInput: function (v) {
        self.state.delta = v;
        self._refresh();
      },
    });

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _buildTeachCard() {
    const card = el('div', 'card cor-teach');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    this._teachBody = el('div', 'cor-feat-list');
    card.appendChild(this._teachBody);
    return card;
  }

  _refresh() {
    this.dual.setParams(this._sceneParams());
    const Etip = tipField(this.state.V, this.state.r, this.state.d);
    const Eon = peekOnsetField(this.state.r, this.state.delta);
    const active = coronaActive(this.state.V, this.state.r, this.state.d, this.state.delta);
    const rows = [
      [this.T('info.Etip'), Etip.toFixed(2) + ' kV/cm'],
      [this.T('info.Eonset'), Eon.toFixed(2) + ' kV/cm'],
      [this.T('info.status'), active ? this.T('info.active') : this.T('info.inactive')],
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
  id: 'corona_discharge',
  icon: '💫',
  navKey: 'modules.corona_discharge.navTitle',
  titleKey: 'modules.corona_discharge.title',
  descKey: 'modules.corona_discharge.desc',
  create: function (ctx) { return new CoronaDischargeInstance(ctx); },
};
