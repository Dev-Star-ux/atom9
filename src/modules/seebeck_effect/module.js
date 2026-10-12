import { Seebeck2D } from './scene2d.js';
import { SeebeckScene3D } from './scene3d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import { seebeckEMF, findPair, MATERIAL_PAIRS } from './physics.js';

class SeebeckInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { Th: 373, Tc: 293, pairId: 'cuConstantan' };
  }

  T(k, v) { return this.t('modules.seebeck_effect.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-seeb');
    this.viewport = el('div', 'viewport seeb-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel seeb-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.seebeck_effect'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildTeachCard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new Seebeck2D(host);
        s.setParams(self._sceneParams());
        return s;
      },
      create3D: function (host) {
        const s = new SeebeckScene3D(host);
        s.setParams(self._sceneParams());
        s.applyTips(loadModuleTips('modules.seebeck_effect', self.t));
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
      Th: this.state.Th,
      Tc: this.state.Tc,
      pairId: this.state.pairId,
    };
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    card.appendChild(el('div', 'field-label', this.T('controls.pair')));
    const chips = el('div', 'chips');
    MATERIAL_PAIRS.forEach(function (p) {
      const b = el('button', 'chip' + (self.state.pairId === p.id ? ' active' : ''), p.name);
      b.onclick = function () {
        self.state.pairId = p.id;
        chips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
        b.classList.add('active');
        self._refresh();
      };
      chips.appendChild(b);
    });
    card.appendChild(chips);

    paramSlider(card, {
      label: this.T('controls.th'),
      min: 293, max: 473, step: 1, value: this.state.Th, unit: ' K',
      onInput: function (v) { self.state.Th = Math.max(v, self.state.Tc); self._refresh(); },
    });
    paramSlider(card, {
      label: this.T('controls.tc'),
      min: 253, max: 373, step: 1, value: this.state.Tc, unit: ' K',
      onInput: function (v) { self.state.Tc = Math.min(v, self.state.Th); self._refresh(); },
    });

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _buildTeachCard() {
    const card = el('div', 'card seeb-teach');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    this._teachBody = el('div', 'emx-feat-list');
    card.appendChild(this._teachBody);
    return card;
  }

  _refresh() {
    this.scene.setParams(this._sceneParams());
    const pair = findPair(this.state.pairId);
    const emfMv = 1000 * seebeckEMF(pair.S, this.state.Th, this.state.Tc);
    const rows = [
      [this.T('info.pair'), pair.name],
      [this.T('info.dT'), (this.state.Th - this.state.Tc).toFixed(0) + ' K'],
      [this.T('info.emf'), emfMv.toFixed(3) + ' mV'],
      [this.T('info.coeff'), (pair.S * 1e6).toFixed(0) + ' µV/K'],
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
  id: 'seebeck_effect',
  icon: '🌡️',
  navKey: 'modules.seebeck_effect.navTitle',
  titleKey: 'modules.seebeck_effect.title',
  descKey: 'modules.seebeck_effect.desc',
  create: function (ctx) { return new SeebeckInstance(ctx); },
};
