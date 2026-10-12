import { Hall2D } from './scene2d.js';
import { HallScene3D } from './scene3d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import { hallVoltageSigned, hallCoefficient, CARRIER_TYPES } from './physics.js';

class HallInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { I: 1.0, B: 0.5, n: 8.5e28, t: 0.0005, carrier: 'n' };
  }

  T(k, v) { return this.t('modules.hall_effect.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-hall');
    this.viewport = el('div', 'viewport hall-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel hall-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.hall_effect'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildTeachCard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new Hall2D(host);
        s.setParams(self._sceneParams());
        return s;
      },
      create3D: function (host) {
        const s = new HallScene3D(host);
        s.setParams(self._sceneParams());
        s.applyTips(loadModuleTips('modules.hall_effect', self.t));
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
      B: this.state.B,
      n: this.state.n,
      t: this.state.t,
      carrier: this.state.carrier,
    };
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    card.appendChild(el('div', 'field-label', this.T('controls.carrier')));
    const chips = el('div', 'chips');
    CARRIER_TYPES.forEach(function (c) {
      const b = el('button', 'chip' + (self.state.carrier === c.id ? ' active' : ''), c.name);
      b.onclick = function () {
        self.state.carrier = c.id;
        chips.querySelectorAll('.chip').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        self._refresh();
      };
      chips.appendChild(b);
    });
    card.appendChild(chips);

    paramSlider(card, {
      label: this.T('controls.current'),
      min: 0.1, max: 5, step: 0.1, value: this.state.I, unit: ' A', decimals: 1,
      onInput: function (v) { self.state.I = v; self._refresh(); },
    });
    paramSlider(card, {
      label: this.T('controls.field'),
      min: 0, max: 3, step: 0.05, value: this.state.B, unit: ' T', decimals: 2,
      onInput: function (v) { self.state.B = v; self._refresh(); },
    });
    paramSlider(card, {
      label: this.T('controls.thickness'),
      min: 0.0001, max: 0.002, step: 0.0001, value: this.state.t, unit: ' m', decimals: 4,
      onInput: function (v) { self.state.t = v; self._refresh(); },
    });

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _buildTeachCard() {
    const card = el('div', 'card hall-teach');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    this._teachBody = el('div', 'emx-feat-list');
    card.appendChild(this._teachBody);
    return card;
  }

  _refresh() {
    this.scene.setParams(this.state);
    const vh = hallVoltageSigned(this.state.I, this.state.B, this.state.n, this.state.t, this.state.carrier);
    const rows = [
      [this.T('info.carrier'), CARRIER_TYPES.find((c) => c.id === this.state.carrier).name],
      [this.T('info.vh'), (vh >= 0 ? '+' : '') + (vh * 1e6).toFixed(3) + ' µV'],
      [this.T('info.rh'), hallCoefficient(this.state.n).toExponential(3) + ' m³/C'],
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
  id: 'hall_effect',
  icon: 'H',
  navKey: 'modules.hall_effect.navTitle',
  titleKey: 'modules.hall_effect.title',
  descKey: 'modules.hall_effect.desc',
  create: function (ctx) { return new HallInstance(ctx); },
};
