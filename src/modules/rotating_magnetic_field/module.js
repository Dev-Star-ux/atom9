import { RotatingMagneticFieldScene2D } from './scene2d.js';
import { RotatingMagneticFieldScene3D } from './scene3d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import { idealMagnitude } from './physics.js';

class RotatingMagneticFieldInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      freq: 50,
      B0: 1,
      showComponents: 1,
    };
  }

  T(k, v) { return this.t('modules.rotating_magnetic_field.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-rmf');
    this.viewport = el('div', 'viewport rmf-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel rmf-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.rotating_magnetic_field'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildTeachCard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new RotatingMagneticFieldScene2D(host);
        s.setParams(self._sceneParams());
        return s;
      },
      create3D: function (host) {
        const s = new RotatingMagneticFieldScene3D(host);
        s.setParams(self._sceneParams());
        s.setActive(true);
        s.applyTips(loadModuleTips('modules.rotating_magnetic_field', self.t));
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
      freq: this.state.freq,
      B0: this.state.B0,
      showComponents: this.state.showComponents,
    };
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    paramSlider(card, {
      label: this.T('controls.freq'),
      min: 10, max: 100, step: 1, value: this.state.freq, unit: ' Hz',
      decimals: 0,
      help: this.T('controls.freqHelp'),
      onInput: function (v) {
        self.state.freq = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.B0'),
      min: 0.2, max: 2, step: 0.05, value: this.state.B0, unit: ' T',
      decimals: 2,
      help: this.T('controls.B0Help'),
      onInput: function (v) {
        self.state.B0 = v;
        self._refresh();
      },
    });

    card.appendChild(el('div', 'field-label', this.T('controls.showComponents')));
    const chips = el('div', 'chips');
    const opts = [
      { id: 1, key: 'compOn' },
      { id: 0, key: 'compOff' },
    ];
    this._compChips = chips;
    opts.forEach(function (o) {
      const b = el(
        'button',
        'chip' + (self.state.showComponents === o.id ? ' active' : ''),
        self.T('controls.' + o.key)
      );
      b.onclick = function () {
        self.state.showComponents = o.id;
        chips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
        b.classList.add('active');
        self._refresh();
      };
      chips.appendChild(b);
    });
    card.appendChild(chips);
    card.appendChild(el('div', 'param-help', this.T('controls.showComponentsHelp')));

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _buildTeachCard() {
    const card = el('div', 'card rmf-teach');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    this._teachBody = el('div', 'cor-feat-list');
    card.appendChild(this._teachBody);
    return card;
  }

  _refresh() {
    this.dual.setParams(this._sceneParams());
    const Brot = idealMagnitude(this.state.B0);
    const rows = [
      [this.T('info.B0'), this.state.B0.toFixed(2) + ' T'],
      [this.T('info.Brot'), Brot.toFixed(2) + ' T (= 1.5 B₀)'],
      [this.T('info.freq'), this.state.freq.toFixed(0) + ' Hz'],
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
  id: 'rotating_magnetic_field',
  icon: '🌀',
  navKey: 'modules.rotating_magnetic_field.navTitle',
  titleKey: 'modules.rotating_magnetic_field.title',
  descKey: 'modules.rotating_magnetic_field.desc',
  create: function (ctx) { return new RotatingMagneticFieldInstance(ctx); },
};
