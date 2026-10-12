import { StealthTechnologyScene2D } from './scene2d.js';
import { StealthTechnologyScene3D } from './scene3d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import {
  SHAPE_TYPES, getShape, stealthSigmaEff, conventionalSigma, wavelength,
  diffractionHint, reductionRatio, formatSigmaM2, CONV_SIGMA_M2,
} from './physics.js';

class StealthTechnologyInstance {
  constructor(ctx) {
    this.t = ctx.t;
    const sh = getShape('faceted');
    this.state = {
      shapeId: sh.id,
      shaping: sh.shaping,
      absorb: 0,
      frequency: 1e10,
      sigma0: CONV_SIGMA_M2,
    };
  }

  T(k, v) { return this.t('modules.stealth_technology.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-stealth');
    this.viewport = el('div', 'viewport stealth-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel stealth-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.stealth_technology'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildTeachCard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new StealthTechnologyScene2D(host);
        s.setParams(self._sceneParams());
        return s;
      },
      create3D: function (host) {
        const s = new StealthTechnologyScene3D(host);
        s.setParams(self._sceneParams());
        s.setActive(true);
        s.applyTips(loadModuleTips('modules.stealth_technology', self.t));
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
      shapeId: this.state.shapeId,
      shaping: this.state.shaping,
      absorb: this.state.absorb,
      frequency: this.state.frequency,
      sigma0: this.state.sigma0,
    };
  }

  _selectShape(id) {
    const sh = getShape(id);
    this.state.shapeId = sh.id;
    this.state.shaping = sh.shaping;
    if (this._shapeChips) {
      for (const key of Object.keys(this._shapeChips)) {
        this._shapeChips[key].classList.toggle('active', key === sh.id);
      }
    }
    this._refresh();
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    const shapeRow = el('div', 'param');
    shapeRow.appendChild(el('label', null, this.T('controls.shape')));
    const chipWrap = el('div', 'chips');
    this._shapeChips = {};
    for (let i = 0; i < SHAPE_TYPES.length; i++) {
      const id = SHAPE_TYPES[i].id;
      const btn = el(
        'button',
        'chip' + (this.state.shapeId === id ? ' active' : ''),
        this.T('controls.shapes.' + id),
      );
      btn.onclick = (function (shapeId) {
        return function () { self._selectShape(shapeId); };
      })(id);
      this._shapeChips[id] = btn;
      chipWrap.appendChild(btn);
    }
    shapeRow.appendChild(chipWrap);
    const help = el('div', 'param-help', this.T('controls.shapeHelp'));
    shapeRow.appendChild(help);
    card.appendChild(shapeRow);

    paramSlider(card, {
      label: this.T('controls.absorb'),
      min: 0, max: 1, step: 0.01, value: this.state.absorb, unit: '',
      decimals: 2,
      help: this.T('controls.absorbHelp'),
      onInput: function (v) {
        self.state.absorb = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.frequency'),
      min: 1e9, max: 2e10, step: 1e8, value: this.state.frequency, unit: ' Hz',
      decimals: 0,
      help: this.T('controls.frequencyHelp'),
      onInput: function (v) {
        self.state.frequency = v;
        self._refresh();
      },
    });

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _buildTeachCard() {
    const card = el('div', 'card stealth-teach');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    this._teachBody = el('div', 'stealth-feat-list');
    card.appendChild(this._teachBody);
    return card;
  }

  _refresh() {
    this.dual.setParams(this._sceneParams());
    const sh = getShape(this.state.shapeId);
    const conv = conventionalSigma(this.state.sigma0);
    const ste = stealthSigmaEff(this.state.shapeId, this.state.absorb, this.state.frequency);
    const ratio = reductionRatio(
      this.state.sigma0, this.state.shaping, this.state.absorb,
      this.state.shapeId, this.state.frequency,
    );
    const lam = wavelength(this.state.frequency);
    const dif = diffractionHint(this.state.frequency);
    const rows = [
      [this.T('info.shape'), this.T('controls.shapes.' + sh.id)],
      [this.T('info.sigmaCatalog'), formatSigmaM2(sh.sigmaM2)],
      [this.T('controls.frequency'), (this.state.frequency / 1e9).toFixed(1) + ' GHz'],
      [this.T('controls.absorb'), (this.state.absorb * 100).toFixed(0) + ' %'],
      [this.T('info.sigmaConv'), formatSigmaM2(conv)],
      [this.T('info.sigmaStealth'), formatSigmaM2(ste)],
      [this.T('info.ratio'), (ratio * 100).toFixed(3) + ' %'],
      [this.T('info.lambda'), (lam * 100).toFixed(2) + ' cm'],
      [this.T('info.diffraction'), (dif * 100).toFixed(0) + ' %'],
    ];
    this._infoHost.replaceWith(infoTable(rows));
    this._infoHost = this.panel.querySelector('.info') || this._infoHost;

    this._teachBody.innerHTML = '';
    const keys = ['t1', 't2', 't3', 't4'];
    for (let i = 0; i < keys.length; i++) {
      const row = el('div', 'stealth-feat');
      row.appendChild(el('div', 'stealth-feat-body', this.T('teach.' + keys[i])));
      this._teachBody.appendChild(row);
    }
  }

  unmount() {
    window.removeEventListener('resize', this._resize);
    if (this.dual && typeof this.dual.dispose === 'function') this.dual.dispose();
  }
}

export default {
  id: 'stealth_technology',
  icon: '🛩️',
  navKey: 'modules.stealth_technology.navTitle',
  titleKey: 'modules.stealth_technology.title',
  descKey: 'modules.stealth_technology.desc',
  create: function (ctx) { return new StealthTechnologyInstance(ctx); },
};
