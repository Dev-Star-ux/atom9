import { PnJunction2D } from './scene2d.js';
import { PnJunctionScene3D } from './scene3d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import { diodeCurrent, thermalVoltage, depletionWidthFrac } from './physics.js';

class PnJunctionInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      view: 'junction',
      Vf: 0.6,
      Is: 1e-12,
      n: 1.5,
      T: 300,
      amp: 5,
      freq: 1,
      mode: 'half',
      smooth: false,
      loadR: 1000,
    };
  }

  T(k, v) { return this.t('modules.pn_junction.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-pnj');
    this.viewport = el('div', 'viewport pnj-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel pnj-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.pn_junction'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildTeachCard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new PnJunction2D(host);
        s.setParams(self.state);
        return s;
      },
      create3D: function (host) {
        const s = new PnJunctionScene3D(host);
        s.setParams(self.state);
        s.applyTips(loadModuleTips('modules.pn_junction', self.t));
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
          if (mode === '3d') s3.setParams(self.state);
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

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    card.appendChild(el('div', 'field-label', this.T('controls.view')));
    const chips = el('div', 'chips');
    ['junction', 'iv', 'rectifier'].forEach(function (v) {
      const b = el('button', 'chip' + (self.state.view === v ? ' active' : ''), self.T('controls.views.' + v));
      b.onclick = function () {
        self.state.view = v;
        chips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
        b.classList.add('active');
        self.scene.setParams(Object.assign({}, self.state, { reset: true }));
        self._refresh();
      };
      chips.appendChild(b);
    });
    card.appendChild(chips);

    this._ivSliders = el('div', '');
    paramSlider(this._ivSliders, {
      label: this.T('controls.vf'),
      min: -2, max: 0.85, step: 0.01, value: this.state.Vf, unit: ' V', decimals: 2,
      onInput: function (v) { self.state.Vf = v; self._refresh(); },
    });
    paramSlider(this._ivSliders, {
      label: this.T('controls.temp'),
      min: 250, max: 400, step: 5, value: this.state.T, unit: ' K',
      onInput: function (v) { self.state.T = v; self._refresh(); },
    });
    card.appendChild(this._ivSliders);

    this._rectControls = el('div', '');
    card.appendChild(this._rectControls);
    card.appendChild(el('div', 'field-label', this.T('controls.mode')));
    const modeChips = el('div', 'chips');
    ['half', 'full'].forEach(function (v) {
      const b = el('button', 'chip' + (self.state.mode === v ? ' active' : ''), self.T('controls.modes.' + v));
      b.onclick = function () {
        self.state.mode = v;
        modeChips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
        b.classList.add('active');
        self._refresh();
      };
      modeChips.appendChild(b);
    });
    this._rectControls.appendChild(el('div', 'field-label', this.T('controls.mode')));
    this._rectControls.appendChild(modeChips);

    paramSlider(this._rectControls, {
      label: this.T('controls.amp'),
      min: 1, max: 12, step: 0.5, value: this.state.amp, unit: ' V', decimals: 1,
      onInput: function (v) { self.state.amp = v; self._refresh(); },
    });
    paramSlider(this._rectControls, {
      label: this.T('controls.freq'),
      min: 0.2, max: 5, step: 0.1, value: this.state.freq, unit: ' Hz', decimals: 1,
      onInput: function (v) { self.state.freq = v; self._refresh(); },
    });

    const smoothRow = el('label', 'checkbox-row');
    const cb = el('input'); cb.type = 'checkbox'; cb.checked = this.state.smooth;
    cb.onchange = function () { self.state.smooth = cb.checked; self._refresh(); };
    smoothRow.appendChild(cb);
    smoothRow.appendChild(el('span', null, this.T('controls.smooth')));
    this._rectControls.appendChild(smoothRow);

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _buildTeachCard() {
    const card = el('div', 'card pnj-teach');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    this._teachBody = el('div', 'emx-feat-list');
    card.appendChild(this._teachBody);
    return card;
  }

  _refresh() {
    this.scene.setParams(this.state);
    const view = this.state.view;
    this._ivSliders.style.display = (view === 'iv' || view === 'junction') ? '' : 'none';
    this._rectControls.style.display = view === 'rectifier' ? '' : 'none';

    let rows;
    if (view === 'iv' || view === 'junction') {
      const mA = 1000 * diodeCurrent(this.state.Vf, this.state.Is, this.state.n, this.state.T);
      const df = depletionWidthFrac(this.state.Vf);
      rows = [
        [this.T('info.vf'), this.state.Vf.toFixed(2) + ' V'],
        [this.T('info.current'), mA.toFixed(3) + ' mA'],
        [this.T('info.vt'), (1000 * thermalVoltage(this.state.T)).toFixed(1) + ' mV'],
        [this.T('info.regime'), this.state.Vf > 0.55 ? this.T('info.forward') : (this.state.Vf < -0.1 ? this.T('info.reverse') : this.T('info.knee'))],
      ];
      if (view === 'junction') {
        rows.push([this.T('info.depletion'), Math.round(df * 100) + '%']);
      }
    } else {
      rows = [
        [this.T('info.mode'), this.T('controls.modes.' + this.state.mode)],
        [this.T('info.ripple'), this.state.smooth ? this.T('info.rippleLow') : this.T('info.rippleHigh')],
        [this.T('info.dcOut'), (this.state.mode === 'half' ? this.state.amp / Math.PI : 2 * this.state.amp / Math.PI).toFixed(2) + ' V (avg)'],
      ];
    }
    this._infoHost.replaceWith(infoTable(rows));
    this._infoHost = this.panel.querySelector('.info') || this._infoHost;

    this._teachBody.innerHTML = '';
    const keys = view === 'junction' ? ['j1', 'j2', 'j3'] : (view === 'iv' ? ['iv1', 'iv2', 'iv3'] : ['r1', 'r2', 'r3']);
    for (let i = 0; i < keys.length; i++) {
      const row = el('div', 'emx-feat');
      row.appendChild(el('div', 'emx-feat-body', this.T('teach.' + keys[i])));
      this._teachBody.appendChild(row);
    }
  }

  unmount() {
    window.removeEventListener('resize', this._resize);
    if (this.dual && typeof this.dual.dispose === 'function') this.dual.dispose();
  }
}

export default {
  id: 'pn_junction',
  icon: '▷',
  navKey: 'modules.pn_junction.navTitle',
  titleKey: 'modules.pn_junction.title',
  descKey: 'modules.pn_junction.desc',
  create: function (ctx) { return new PnJunctionInstance(ctx); },
};
