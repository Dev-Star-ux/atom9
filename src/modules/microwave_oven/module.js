import { MicrowaveOvenScene2D } from './scene2d.js';
import { MicrowaveOvenScene3D } from './scene3d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import { freeSpaceWavelength, cavityWavelength, heatingPower, magnetronFreq } from './physics.js';

class MicrowaveOvenInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      power: 800,
      modeIndex: 3,
      turntable: 1,
      waterFrac: 0.7,
      cavityL: 0.35,
    };
  }

  T(k, v) { return this.t('modules.microwave_oven.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-mwo');
    this.viewport = el('div', 'viewport mwo-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel mwo-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.microwave_oven'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildTeachCard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new MicrowaveOvenScene2D(host);
        s.setParams(self._sceneParams());
        return s;
      },
      create3D: function (host) {
        const s = new MicrowaveOvenScene3D(host);
        s.setParams(self._sceneParams());
        s.setActive(true);
        s.applyTips(loadModuleTips('modules.microwave_oven', self.t));
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
      power: this.state.power,
      modeIndex: this.state.modeIndex,
      turntable: this.state.turntable,
      waterFrac: this.state.waterFrac,
      cavityL: this.state.cavityL,
    };
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    paramSlider(card, {
      label: this.T('controls.power'),
      min: 100, max: 1200, step: 50, value: this.state.power, unit: ' W',
      decimals: 0,
      help: this.T('controls.powerHelp'),
      onInput: function (v) {
        self.state.power = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.modeIndex'),
      min: 1, max: 6, step: 1, value: this.state.modeIndex, unit: '',
      decimals: 0,
      help: this.T('controls.modeIndexHelp'),
      onInput: function (v) {
        self.state.modeIndex = v;
        self._refresh();
      },
    });

    const ttWrap = el('div', 'param');
    const ttTop = el('div', 'row');
    ttTop.appendChild(el('label', null, this.T('controls.turntable')));
    this._ttVal = el('span', 'val', this.state.turntable > 0.5 ? this.T('controls.turntableOn') : this.T('controls.turntableOff'));
    ttTop.appendChild(this._ttVal);
    ttWrap.appendChild(ttTop);
    const ttBtns = el('div', 'row');
    const btnOn = el('button', 'view-toggle-btn' + (this.state.turntable > 0.5 ? ' active' : ''), this.T('controls.turntableOn'));
    const btnOff = el('button', 'view-toggle-btn' + (this.state.turntable <= 0.5 ? ' active' : ''), this.T('controls.turntableOff'));
    btnOn.type = 'button';
    btnOff.type = 'button';
    btnOn.onclick = function () {
      self.state.turntable = 1;
      self._refresh();
    };
    btnOff.onclick = function () {
      self.state.turntable = 0;
      self._refresh();
    };
    ttBtns.appendChild(btnOn);
    ttBtns.appendChild(btnOff);
    ttWrap.appendChild(ttBtns);
    ttWrap.appendChild(el('div', 'param-help', this.T('controls.turntableHelp')));
    card.appendChild(ttWrap);
    this._ttBtnOn = btnOn;
    this._ttBtnOff = btnOff;

    paramSlider(card, {
      label: this.T('controls.waterFrac'),
      min: 0, max: 1, step: 0.05, value: this.state.waterFrac, unit: '',
      decimals: 2,
      help: this.T('controls.waterFracHelp'),
      onInput: function (v) {
        self.state.waterFrac = v;
        self._refresh();
      },
    });

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _buildTeachCard() {
    const card = el('div', 'card mwo-teach');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    this._teachBody = el('div', 'mwo-feat-list');
    card.appendChild(this._teachBody);
    return card;
  }

  _refresh() {
    this.dual.setParams(this._sceneParams());
    const lam = freeSpaceWavelength(magnetronFreq());
    const lamC = cavityWavelength(this.state.cavityL, this.state.modeIndex);
    const P = heatingPower(this.state.power, 1.0, 0.7, this.state.waterFrac);
    const ttOn = this.state.turntable > 0.5;
    if (this._ttVal) {
      this._ttVal.textContent = ttOn ? this.T('controls.turntableOn') : this.T('controls.turntableOff');
    }
    if (this._ttBtnOn && this._ttBtnOff) {
      this._ttBtnOn.className = 'view-toggle-btn' + (ttOn ? ' active' : '');
      this._ttBtnOff.className = 'view-toggle-btn' + (!ttOn ? ' active' : '');
    }
    const rows = [
      [this.T('info.freq'), '2.45 GHz'],
      [this.T('info.lambda'), (lam * 100).toFixed(1) + ' cm'],
      [this.T('info.lamC'), (lamC * 100).toFixed(1) + ' cm'],
      [this.T('info.heat'), P.toFixed(0) + ' (arb.)'],
      [this.T('info.water'), (this.state.waterFrac * 100).toFixed(0) + ' %'],
      [this.T('info.turntable'), ttOn ? this.T('controls.turntableOn') : this.T('controls.turntableOff')],
    ];
    this._infoHost.replaceWith(infoTable(rows));
    this._infoHost = this.panel.querySelector('.info') || this._infoHost;

    this._teachBody.innerHTML = '';
    const keys = ['t1', 't2', 't3', 't4'];
    for (let i = 0; i < keys.length; i++) {
      const row = el('div', 'mwo-feat');
      row.appendChild(el('div', 'mwo-feat-body', this.T('teach.' + keys[i])));
      this._teachBody.appendChild(row);
    }
  }

  unmount() {
    window.removeEventListener('resize', this._resize);
    if (this.dual && typeof this.dual.dispose === 'function') this.dual.dispose();
  }
}

export default {
  id: 'microwave_oven',
  icon: '🍲',
  navKey: 'modules.microwave_oven.navTitle',
  titleKey: 'modules.microwave_oven.title',
  descKey: 'modules.microwave_oven.desc',
  create: function (ctx) { return new MicrowaveOvenInstance(ctx); },
};
