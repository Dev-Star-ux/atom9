import { ElectrolysisScene2D } from './scene2d.js';
import { ElectrolysisScene3D } from './scene3d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import {
  molesDeposited,
  massDepositedGrams,
  F_CONST,
  Z_CU,
  M_CU,
} from './physics.js';

class ElectrolysisInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      I: 0.5,
      t: 600,
    };
  }

  T(k, v) { return this.t('modules.electrolysis_copper.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-elc');
    this.viewport = el('div', 'viewport elc-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel elc-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.electrolysis_copper'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildTeachCard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new ElectrolysisScene2D(host);
        s.setParams(self._sceneParams());
        return s;
      },
      create3D: function (host) {
        const s = new ElectrolysisScene3D(host);
        s.setParams(self._sceneParams());
        s.applyTips(loadModuleTips('modules.electrolysis_copper', self.t));
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
      t: this.state.t,
    };
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    paramSlider(card, {
      label: this.T('controls.current'),
      min: 0.05, max: 5, step: 0.05, value: this.state.I, unit: ' A',
      decimals: 2,
      help: this.T('controls.currentHelp'),
      onInput: function (v) {
        self.state.I = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.time'),
      min: 10, max: 3600, step: 10, value: this.state.t, unit: ' s',
      decimals: 0,
      help: this.T('controls.timeHelp'),
      onInput: function (v) {
        self.state.t = v;
        self._refresh();
      },
    });

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _buildTeachCard() {
    const card = el('div', 'card elc-teach');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    this._teachBody = el('div', 'elc-feat-list');
    card.appendChild(this._teachBody);
    return card;
  }

  _refresh() {
    this.scene.setParams(this.state);
    const n = molesDeposited(this.state.I, this.state.t, Z_CU, F_CONST);
    const m = massDepositedGrams(this.state.I, this.state.t, M_CU, Z_CU, F_CONST);
    const rows = [
      [this.T('info.moles'), n.toExponential(3) + ' mol'],
      [this.T('info.mass'), m.toFixed(4) + ' g'],
      [this.T('info.cathode'), this.T('info.cathodeRxn')],
      [this.T('info.anode'), this.T('info.anodeRxn')],
    ];
    this._infoHost.replaceWith(infoTable(rows));
    this._infoHost = this.panel.querySelector('.info') || this._infoHost;

    this._teachBody.innerHTML = '';
    const keys = ['t1', 't2', 't3', 't4'];
    for (let i = 0; i < keys.length; i++) {
      const row = el('div', 'elc-feat');
      row.appendChild(el('div', 'elc-feat-body', this.T('teach.' + keys[i])));
      this._teachBody.appendChild(row);
    }
  }

  unmount() {
    window.removeEventListener('resize', this._resize);
    if (this.dual && typeof this.dual.dispose === 'function') this.dual.dispose();
  }
}

export default {
  id: 'electrolysis_copper',
  icon: '🔋',
  navKey: 'modules.electrolysis_copper.navTitle',
  titleKey: 'modules.electrolysis_copper.title',
  descKey: 'modules.electrolysis_copper.desc',
  create: function (ctx) { return new ElectrolysisInstance(ctx); },
};
