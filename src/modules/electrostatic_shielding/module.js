import { ElectrostaticShielding2D } from './scene2d.js';
import { ElectrostaticShielding3D } from './scene3d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import {
  MATERIALS,
  shieldingFactor,
  interiorField,
  shieldingEffectivenessDB,
} from './physics.js';

class ElectrostaticShieldingInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      E0: 5,
      cageOn: true,
      materialId: 'conductor',
      holeMm: 5,
    };
  }

  T(k, v) { return this.t('modules.electrostatic_shielding.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-esh');
    this.viewport = el('div', 'viewport esh-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel esh-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.electrostatic_shielding'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildTeachCard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new ElectrostaticShielding2D(host);
        s.setParams(self._sceneParams());
        s.setActive && s.setActive(true);
        return s;
      },
      create3D: function (host) {
        const s = new ElectrostaticShielding3D(host);
        s.setParams(self._sceneParams());
        s.applyTips(loadModuleTips('modules.electrostatic_shielding', self.t));
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
      E0: this.state.E0,
      cageOn: this.state.cageOn,
      materialId: this.state.materialId,
      holeMm: this.state.holeMm,
    };
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    card.appendChild(el('div', 'field-label', this.T('controls.cage')));
    const cageChips = el('div', 'chips');
    const cageBtn = el('button', 'chip' + (self.state.cageOn ? ' active' : ''), this.T('controls.cageOn'));
    cageBtn.onclick = function () {
      self.state.cageOn = !self.state.cageOn;
      cageBtn.classList.toggle('active', self.state.cageOn);
      cageBtn.textContent = self.state.cageOn ? self.T('controls.cageOn') : self.T('controls.cageOff');
      self._refresh();
    };
    cageChips.appendChild(cageBtn);
    card.appendChild(cageChips);

    card.appendChild(el('div', 'field-label', this.T('controls.material')));
    const matChips = el('div', 'chips');
    MATERIALS.forEach(function (m) {
      const b = el('button', 'chip' + (self.state.materialId === m.id ? ' active' : ''), m.name);
      b.onclick = function () {
        self.state.materialId = m.id;
        matChips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
        b.classList.add('active');
        self._refresh();
      };
      matChips.appendChild(b);
    });
    card.appendChild(matChips);

    paramSlider(card, {
      label: this.T('controls.E0'),
      min: 0.5, max: 20, step: 0.1, value: this.state.E0, unit: ' kV/m',
      decimals: 1,
      help: this.T('controls.E0Help'),
      onInput: function (v) {
        self.state.E0 = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.holeMm'),
      min: 0.5, max: 50, step: 0.5, value: this.state.holeMm, unit: ' mm',
      decimals: 1,
      help: this.T('controls.holeMmHelp'),
      onInput: function (v) {
        self.state.holeMm = v;
        self._refresh();
      },
    });

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _buildTeachCard() {
    const card = el('div', 'card esh-teach');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    this._teachBody = el('div', 'esh-feat-list');
    card.appendChild(this._teachBody);
    return card;
  }

  _refresh() {
    this.dual.setParams(this._sceneParams());
    const Ein = interiorField(this.state.E0, this.state.materialId, this.state.holeMm, this.state.cageOn);
    const SE = shieldingEffectivenessDB(this.state.E0, Ein);
    const S = shieldingFactor(this.state.materialId, this.state.holeMm);
    const rows = [
      [this.T('info.S'), S >= 1e5 ? '≈∞' : S.toFixed(1)],
      [this.T('info.Ein'), Ein.toExponential(2) + ' kV/m'],
      [this.T('info.SE'), SE.toFixed(1) + ' dB'],
    ];
    this._infoHost.replaceWith(infoTable(rows));
    this._infoHost = this.panel.querySelector('.info') || this._infoHost;

    this._teachBody.innerHTML = '';
    const keys = ['t1', 't2', 't3', 't4'];
    for (let i = 0; i < keys.length; i++) {
      const row = el('div', 'esh-feat');
      row.appendChild(el('div', 'esh-feat-body', this.T('teach.' + keys[i])));
      this._teachBody.appendChild(row);
    }
  }

  unmount() {
    window.removeEventListener('resize', this._resize);
    if (this.dual && typeof this.dual.dispose === 'function') this.dual.dispose();
  }
}

export default {
  id: 'electrostatic_shielding',
  icon: '📦',
  navKey: 'modules.electrostatic_shielding.navTitle',
  titleKey: 'modules.electrostatic_shielding.title',
  descKey: 'modules.electrostatic_shielding.desc',
  create: function (ctx) { return new ElectrostaticShieldingInstance(ctx); },
};
