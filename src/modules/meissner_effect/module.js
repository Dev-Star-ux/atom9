import { MeissnerScene2D } from './scene2d.js';
import { Meissner3D } from './scene3d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import {
  isSuperconducting,
  fieldInside,
  levitationForceEstimate,
} from './physics.js';

class MeissnerInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      tempK: 70,
      tcK: 92,
      B0mT: 20,
      lambdaNm: 150,
      heightMm: 5,
    };
  }

  T(k, v) { return this.t('modules.meissner_effect.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-mei');
    this.viewport = el('div', 'viewport mei-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel mei-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.meissner_effect'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildTeachCard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new MeissnerScene2D(host);
        s.setParams(self._sceneParams());
        s.setPaused(false);
        return s;
      },
      create3D: function (host) {
        const s = new Meissner3D(host);
        s.setParams(self._sceneParams());
        s.applyTips(loadModuleTips('modules.meissner_effect', self.t));
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
      tempK: this.state.tempK,
      tcK: this.state.tcK,
      B0mT: this.state.B0mT,
      lambdaNm: this.state.lambdaNm,
      heightMm: this.state.heightMm,
    };
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    paramSlider(card, {
      label: this.T('controls.tempK'),
      min: 4, max: 150, step: 1, value: this.state.tempK, unit: ' K',
      help: this.T('controls.tempKHelp'),
      onInput: function (v) {
        self.state.tempK = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.tcK'),
      min: 20, max: 120, step: 1, value: this.state.tcK, unit: ' K',
      help: this.T('controls.tcKHelp'),
      onInput: function (v) {
        self.state.tcK = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.B0mT'),
      min: 1, max: 100, step: 1, value: this.state.B0mT, unit: ' mT',
      onInput: function (v) {
        self.state.B0mT = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.lambdaNm'),
      min: 20, max: 500, step: 5, value: this.state.lambdaNm, unit: ' nm',
      help: this.T('controls.lambdaNmHelp'),
      onInput: function (v) {
        self.state.lambdaNm = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.heightMm'),
      min: 0, max: 20, step: 0.5, value: this.state.heightMm, unit: ' mm',
      decimals: 1,
      help: this.T('controls.heightMmHelp'),
      onInput: function (v) {
        self.state.heightMm = v;
        self._refresh();
      },
    });

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _buildTeachCard() {
    const card = el('div', 'card mei-teach');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    this._teachBody = el('div', 'mei-feat-list');
    card.appendChild(this._teachBody);
    return card;
  }

  _refresh() {
    this.dual.setParams(this._sceneParams());
    const sc = isSuperconducting(this.state.tempK, this.state.tcK);
    const surfaceB = fieldInside(0, this.state.B0mT, this.state.lambdaNm, sc);
    const force = levitationForceEstimate(this.state.B0mT, this.state.heightMm, sc);
    const rows = [
      [this.T('info.state'), sc ? this.T('info.superconducting') : this.T('info.normal')],
      [this.T('info.surfaceB'), surfaceB.toFixed(2) + ' mT'],
      [this.T('info.force'), force.toFixed(2)],
    ];
    this._infoHost.replaceWith(infoTable(rows));
    this._infoHost = this.panel.querySelector('.info') || this._infoHost;

    this._teachBody.innerHTML = '';
    const keys = ['t1', 't2', 't3', 't4'];
    for (let i = 0; i < keys.length; i++) {
      const row = el('div', 'mei-feat');
      row.appendChild(el('div', 'mei-feat-body', this.T('teach.' + keys[i])));
      this._teachBody.appendChild(row);
    }
  }

  unmount() {
    window.removeEventListener('resize', this._resize);
    if (this.dual && typeof this.dual.dispose === 'function') this.dual.dispose();
  }
}

export default {
  id: 'meissner_effect',
  icon: '🧊',
  navKey: 'modules.meissner_effect.navTitle',
  titleKey: 'modules.meissner_effect.title',
  descKey: 'modules.meissner_effect.desc',
  create: function (ctx) { return new MeissnerInstance(ctx); },
};
