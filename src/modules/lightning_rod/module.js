import { LightningRodScene2D } from './scene2d.js';
import { LightningRodScene3D } from './scene3d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import { strikingDistance, protectionRadius } from './physics.js';

class LightningRodInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      h: 8,
      I: 10,
    };
  }

  T(k, v) { return this.t('modules.lightning_rod.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-ltr');
    this.viewport = el('div', 'viewport ltr-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel ltr-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.lightning_rod'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildTeachCard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new LightningRodScene2D(host);
        s.setParams(self._sceneParams());
        return s;
      },
      create3D: function (host) {
        const s = new LightningRodScene3D(host);
        s.setParams(self._sceneParams());
        s.applyTips(loadModuleTips('modules.lightning_rod', self.t));
        s.setActive(true);
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
      h: this.state.h,
      I: this.state.I,
    };
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    paramSlider(card, {
      label: this.T('controls.h'),
      min: 1, max: 30, step: 0.5, value: this.state.h, unit: ' m',
      decimals: 1,
      help: this.T('controls.hHelp'),
      onInput: function (v) {
        self.state.h = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.I'),
      min: 2, max: 200, step: 1, value: this.state.I, unit: ' kA',
      help: this.T('controls.IHelp'),
      onInput: function (v) {
        self.state.I = v;
        self._refresh();
      },
    });

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _buildTeachCard() {
    const card = el('div', 'card ltr-teach');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    this._teachBody = el('div', 'ltr-feat-list');
    card.appendChild(this._teachBody);
    return card;
  }

  _refresh() {
    this.dual.setParams(this._sceneParams());
    const rs = strikingDistance(this.state.I);
    const Rp = protectionRadius(this.state.h, rs);
    const rows = [
      [this.T('info.rs'), rs.toFixed(1) + ' m'],
      [this.T('info.Rp'), Rp.toFixed(1) + ' m'],
    ];
    this._infoHost.replaceWith(infoTable(rows));
    this._infoHost = this.panel.querySelector('.info') || this._infoHost;

    this._teachBody.innerHTML = '';
    const keys = ['t1', 't2', 't3', 't4'];
    for (let i = 0; i < keys.length; i++) {
      const row = el('div', 'ltr-feat');
      row.appendChild(el('div', 'ltr-feat-body', this.T('teach.' + keys[i])));
      this._teachBody.appendChild(row);
    }
  }

  unmount() {
    window.removeEventListener('resize', this._resize);
    if (this.dual && typeof this.dual.dispose === 'function') this.dual.dispose();
  }
}

export default {
  id: 'lightning_rod',
  icon: '🌩',
  navKey: 'modules.lightning_rod.navTitle',
  titleKey: 'modules.lightning_rod.title',
  descKey: 'modules.lightning_rod.desc',
  create: function (ctx) { return new LightningRodInstance(ctx); },
};
