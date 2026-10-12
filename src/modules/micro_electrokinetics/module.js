import { MicroEK2D } from './scene2d.js';
import { MicroEK3D } from './scene3d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import {
  MODES,
  smoluchowskiVelocity,
  dielectrophoreticForce,
  WATER_VISCOSITY_PAS,
} from './physics.js';

class MicroEKInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      mode: 'electrophoresis',
      fieldVm: 1e5,
      zetaMv: -50,
      particleRadiusUm: 1,
      epsR: 78,
      cmFactor: 0.3,
    };
  }

  T(k, v) { return this.t('modules.micro_electrokinetics.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-mek');
    this.viewport = el('div', 'viewport mek-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel mek-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.micro_electrokinetics'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildTeachCard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new MicroEK2D(host);
        s.setParams(self._sceneParams());
        return s;
      },
      create3D: function (host) {
        const s = new MicroEK3D(host);
        s.setParams(self._sceneParams());
        s.setActive(true);
        s.applyTips(loadModuleTips('modules.micro_electrokinetics', self.t));
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
      mode: this.state.mode,
      fieldVm: this.state.fieldVm,
      zetaMv: this.state.zetaMv,
      particleRadiusUm: this.state.particleRadiusUm,
      epsR: this.state.epsR,
      cmFactor: this.state.cmFactor,
    };
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    card.appendChild(el('div', 'field-label', this.T('controls.mode')));
    const modeChips = el('div', 'chips');
    MODES.forEach(function (m) {
      const b = el('button', 'chip' + (self.state.mode === m.id ? ' active' : ''), self.T('controls.modes.' + m.id));
      b.onclick = function () {
        self.state.mode = m.id;
        modeChips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
        b.classList.add('active');
        self._rebuildSliders();
        self._refresh();
      };
      modeChips.appendChild(b);
    });
    card.appendChild(modeChips);

    this._sliderHost = el('div', '');
    card.appendChild(this._sliderHost);
    this._paramCard = card;
    this._buildSliders();

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _buildSliders() {
    const self = this;
    const host = this._sliderHost;
    host.innerHTML = '';
    const mode = this.state.mode;

    if (mode === 'electrophoresis' || mode === 'electroosmosis') {
      paramSlider(host, {
        label: this.T('controls.field'),
        min: 1e3, max: 1e6, step: 1e3, value: this.state.fieldVm, unit: ' V/m',
        decimals: 0,
        help: this.T('controls.fieldHelp'),
        onInput: function (v) { self.state.fieldVm = v; self._refresh(); },
      });
      paramSlider(host, {
        label: mode === 'electrophoresis' ? this.T('controls.zetaParticle') : this.T('controls.zetaWall'),
        min: -100, max: 100, step: 1, value: this.state.zetaMv, unit: ' mV',
        decimals: 0,
        help: this.T('controls.zetaHelp'),
        onInput: function (v) { self.state.zetaMv = v; self._refresh(); },
      });
    } else {
      paramSlider(host, {
        label: this.T('controls.cmFactor'),
        min: -0.5, max: 1, step: 0.01, value: this.state.cmFactor, unit: '',
        decimals: 2,
        help: this.T('controls.cmFactorHelp'),
        onInput: function (v) { self.state.cmFactor = v; self._refresh(); },
      });
      paramSlider(host, {
        label: this.T('controls.radius'),
        min: 0.1, max: 20, step: 0.1, value: this.state.particleRadiusUm, unit: ' µm',
        decimals: 1,
        help: this.T('controls.radiusHelp'),
        onInput: function (v) { self.state.particleRadiusUm = v; self._refresh(); },
      });
    }
  }

  _rebuildSliders() {
    this._buildSliders();
  }

  _buildTeachCard() {
    const card = el('div', 'card mek-teach');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    this._teachBody = el('div', 'mek-feat-list');
    card.appendChild(this._teachBody);
    return card;
  }

  _refresh() {
    this.dual.setParams(this._sceneParams());
    const rows = [];

    if (this.state.mode === 'dielectrophoresis') {
      const gradE2 = 1e17;
      const F = dielectrophoreticForce(this.state.particleRadiusUm, this.state.epsR, this.state.cmFactor, gradE2);
      rows.push([this.T('info.force'), F.toExponential(2) + ' N']);
      rows.push([this.T('info.direction'), this.state.cmFactor >= 0 ? this.T('info.positive') : this.T('info.negative')]);
    } else {
      const v = smoluchowskiVelocity(this.state.epsR, this.state.zetaMv, this.state.fieldVm, WATER_VISCOSITY_PAS);
      rows.push([this.T('info.velocity'), v.toExponential(2) + ' m/s']);
    }

    this._infoHost.replaceWith(infoTable(rows));
    this._infoHost = this._paramCard.querySelector('.info') || this._infoHost;

    this._teachBody.innerHTML = '';
    const keys = ['t1', 't2', 't3', 't4'];
    for (let i = 0; i < keys.length; i++) {
      const row = el('div', 'mek-feat');
      row.appendChild(el('div', 'mek-feat-body', this.T('teach.' + keys[i])));
      this._teachBody.appendChild(row);
    }
  }

  unmount() {
    window.removeEventListener('resize', this._resize);
    if (this.dual && typeof this.dual.dispose === 'function') this.dual.dispose();
  }
}

export default {
  id: 'micro_electrokinetics',
  icon: '💧',
  navKey: 'modules.micro_electrokinetics.navTitle',
  titleKey: 'modules.micro_electrokinetics.title',
  descKey: 'modules.micro_electrokinetics.desc',
  create: function (ctx) { return new MicroEKInstance(ctx); },
};
