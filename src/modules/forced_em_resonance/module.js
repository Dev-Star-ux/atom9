import { ForcedEmResonanceScene2D } from './scene2d.js';
import { ForcedEmResonanceScene3D } from './scene3d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import { f0, currentAmp, qualityFactor, impedance } from './physics.js';

class ForcedEmResonanceInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      V: 10,
      R: 10,
      L: 0.05,
      C: 1e-6,
      f: 700,
    };
  }

  T(k, v) { return this.t('modules.forced_em_resonance.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-femr');
    this.viewport = el('div', 'viewport femr-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel femr-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.forced_em_resonance'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildTeachCard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new ForcedEmResonanceScene2D(host);
        s.setParams(self._sceneParams());
        return s;
      },
      create3D: function (host) {
        const s = new ForcedEmResonanceScene3D(host);
        s.setParams(self._sceneParams());
        s.setActive(true);
        s.applyTips(loadModuleTips('modules.forced_em_resonance', self.t));
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
      R: this.state.R,
      L: this.state.L,
      C: this.state.C,
      f: this.state.f,
    };
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    paramSlider(card, {
      label: this.T('controls.V'),
      min: 1, max: 50, step: 0.5, value: this.state.V, unit: ' V',
      decimals: 1,
      help: this.T('controls.VHelp'),
      onInput: function (v) {
        self.state.V = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.R'),
      min: 1, max: 100, step: 1, value: this.state.R, unit: ' Ω',
      decimals: 0,
      help: this.T('controls.RHelp'),
      onInput: function (v) {
        self.state.R = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.L'),
      min: 0.01, max: 0.2, step: 0.005, value: this.state.L, unit: ' H',
      decimals: 3,
      help: this.T('controls.LHelp'),
      onInput: function (v) {
        self.state.L = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.C'),
      min: 0.2, max: 5, step: 0.05, value: this.state.C * 1e6, unit: ' µF',
      decimals: 2,
      help: this.T('controls.CHelp'),
      onInput: function (v) {
        self.state.C = v * 1e-6;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.f'),
      min: 100, max: 2000, step: 10, value: this.state.f, unit: ' Hz',
      decimals: 0,
      help: this.T('controls.fHelp'),
      onInput: function (v) {
        self.state.f = v;
        self._refresh();
      },
    });

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _buildTeachCard() {
    const card = el('div', 'card femr-teach');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    this._teachBody = el('div', 'cor-feat-list');
    card.appendChild(this._teachBody);
    return card;
  }

  _refresh() {
    this.dual.setParams(this._sceneParams());
    const fres = f0(this.state.L, this.state.C);
    const w = 2 * Math.PI * this.state.f;
    const I = currentAmp(this.state.V, this.state.R, w, this.state.L, this.state.C);
    const Z = impedance(this.state.R, w, this.state.L, this.state.C);
    const Q = qualityFactor(this.state.L, this.state.C, this.state.R);
    const rows = [
      [this.T('info.f0'), fres.toFixed(1) + ' Hz'],
      [this.T('info.I'), I.toFixed(4) + ' A'],
      [this.T('info.Z'), Z.toFixed(2) + ' Ω'],
      [this.T('info.Q'), Q.toFixed(2)],
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
  id: 'forced_em_resonance',
  icon: '📡',
  navKey: 'modules.forced_em_resonance.navTitle',
  titleKey: 'modules.forced_em_resonance.title',
  descKey: 'modules.forced_em_resonance.desc',
  create: function (ctx) { return new ForcedEmResonanceInstance(ctx); },
};
