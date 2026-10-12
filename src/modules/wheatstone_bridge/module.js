import { WheatstoneScene2D } from './scene2d.js';
import { WheatstoneScene3D } from './scene3d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import {
  solvedRx, solvedR3, bridgeVoltage, isBalanced,
  galvanometerCurrentMA, sensitivityMAPerOhm,
} from './physics.js';

const GALVANOMETER_OHM = 50; // typical moving-coil galvanometer resistance

const PRESETS = [
  { id: 'equalArms', R1: 100, R2: 100, R3: 100, Rx: 100, V: 6 },
  { id: 'unbalanced', R1: 100, R2: 220, R3: 150, Rx: 470, V: 6 },
  { id: 'strainGauge', R1: 120, R2: 120, R3: 120, Rx: 121, V: 9 },
  { id: 'highVoltage', R1: 220, R2: 220, R3: 330, Rx: 330, V: 24 },
];

class WheatstoneInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      R1: 100,
      R2: 100,
      R3: 150,
      Rx: 150,
      V: 6,
    };
    this._autoBalancing = false;
  }

  T(k, v) { return this.t('modules.wheatstone_bridge.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-wsb');
    this.viewport = el('div', 'viewport wsb-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel wsb-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.wheatstone_bridge'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildTeachCard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new WheatstoneScene2D(host);
        s.setParams(self._sceneParams());
        return s;
      },
      create3D: function (host) {
        const s = new WheatstoneScene3D(host);
        s.setParams(self._sceneParams());
        s.applyTips(loadModuleTips('modules.wheatstone_bridge', self.t));
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
      R1: this.state.R1,
      R2: this.state.R2,
      R3: this.state.R3,
      Rx: this.state.Rx,
      V: this.state.V,
    };
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    card.appendChild(el('div', 'field-label', this.T('controls.presets')));
    const presetChips = el('div', 'chips');
    PRESETS.forEach(function (p) {
      const b = el('button', 'chip', self.T('controls.preset_' + p.id));
      b.onclick = function () {
        self._stopAutoBalance();
        self.state.R1 = p.R1;
        self.state.R2 = p.R2;
        self.state.R3 = p.R3;
        self.state.Rx = p.Rx;
        self.state.V = p.V;
        self._sliders.R1.set(p.R1);
        self._sliders.R2.set(p.R2);
        self._sliders.R3.set(p.R3);
        self._sliders.Rx.set(p.Rx);
        self._sliders.V.set(p.V);
        self._refresh();
      };
      presetChips.appendChild(b);
    });
    card.appendChild(presetChips);

    this._sliders = {};
    this._sliders.R1 = paramSlider(card, {
      label: this.T('controls.R1'),
      min: 10, max: 1000, step: 5, value: this.state.R1, unit: ' Ω',
      help: this.T('controls.R1Help'),
      onInput: function (v) {
        self._stopAutoBalance();
        self.state.R1 = v;
        self._refresh();
      },
    });

    this._sliders.R2 = paramSlider(card, {
      label: this.T('controls.R2'),
      min: 10, max: 1000, step: 5, value: this.state.R2, unit: ' Ω',
      help: this.T('controls.R2Help'),
      onInput: function (v) {
        self._stopAutoBalance();
        self.state.R2 = v;
        self._refresh();
      },
    });

    this._sliders.R3 = paramSlider(card, {
      label: this.T('controls.R3'),
      min: 10, max: 1000, step: 5, value: this.state.R3, unit: ' Ω',
      help: this.T('controls.R3Help'),
      onInput: function (v) {
        self._stopAutoBalance();
        self.state.R3 = v;
        self._refresh();
      },
    });

    this._sliders.Rx = paramSlider(card, {
      label: this.T('controls.Rx'),
      min: 10, max: 1000, step: 5, value: this.state.Rx, unit: ' Ω',
      help: this.T('controls.RxHelp'),
      onInput: function (v) {
        self._stopAutoBalance();
        self.state.Rx = v;
        self._refresh();
      },
    });

    this._sliders.V = paramSlider(card, {
      label: this.T('controls.V'),
      min: 1, max: 24, step: 0.5, value: this.state.V, unit: ' V',
      decimals: 1,
      help: this.T('controls.VHelp'),
      onInput: function (v) {
        self.state.V = v;
        self._refresh();
      },
    });

    this._autoBtn = el('button', 'chip wsb-auto-btn', this.T('controls.autoBalance'));
    this._autoBtn.onclick = function () { self._toggleAutoBalance(); };
    card.appendChild(this._autoBtn);

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  /** Steps R3 (the "adjustable known" arm) toward the value that nulls
   *  the bridge, animated over a couple of seconds — same idea as an
   *  auto-balance mode on a real bridge instrument. */
  _toggleAutoBalance() {
    if (this._autoBalancing) { this._stopAutoBalance(); return; }
    this._autoBalancing = true;
    this._autoBtn.textContent = this.T('controls.autoBalancing');
    this._autoBtn.classList.add('active');
    const self = this;
    this._autoTimer = setInterval(function () {
      const target = solvedR3(self.state.R1, self.state.R2, self.state.Rx);
      if (!isFinite(target)) { self._stopAutoBalance(); return; }
      const diff = target - self.state.R3;
      if (Math.abs(diff) < 0.5) {
        self.state.R3 = target;
        self._sliders.R3.set(self.state.R3);
        self._refresh();
        self._stopAutoBalance();
        return;
      }
      self.state.R3 += diff * 0.25;
      self._sliders.R3.set(self.state.R3);
      self._refresh();
    }, 60);
  }

  _stopAutoBalance() {
    if (this._autoTimer) { clearInterval(this._autoTimer); this._autoTimer = null; }
    this._autoBalancing = false;
    if (this._autoBtn) {
      this._autoBtn.textContent = this.T('controls.autoBalance');
      this._autoBtn.classList.remove('active');
    }
  }

  _buildTeachCard() {
    const card = el('div', 'card wsb-teach');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    this._teachBody = el('div', 'wsb-feat-list');
    card.appendChild(this._teachBody);
    return card;
  }

  _refresh() {
    this.dual.setParams(this._sceneParams());
    const s = this.state;
    const Vg = bridgeVoltage(s.R1, s.R2, s.R3, s.Rx, s.V);
    const bal = isBalanced(s.R1, s.R2, s.R3, s.Rx, 0.01);
    const rxSolved = solvedRx(s.R1, s.R2, s.R3);
    const Ig = galvanometerCurrentMA(s.R1, s.R2, s.R3, s.Rx, s.V, GALVANOMETER_OHM);
    const sens = sensitivityMAPerOhm(s.R1, s.R2, s.R3, s.Rx, s.V, GALVANOMETER_OHM);
    const rows = [
      [this.T('info.Vg'), (Vg * 1000).toFixed(2) + ' mV'],
      [this.T('info.Ig'), Ig.toFixed(3) + ' mA'],
      [this.T('info.sensitivity'), sens.toExponential(2) + ' mA/Ω'],
      [this.T('info.balance'), bal ? this.T('info.balancedYes') : this.T('info.balancedNo')],
      [this.T('info.solvedRx'), isFinite(rxSolved) ? rxSolved.toFixed(1) + ' Ω' : '—'],
    ];
    this._infoHost.replaceWith(infoTable(rows));
    this._infoHost = this.panel.querySelector('.info') || this._infoHost;

    this._teachBody.innerHTML = '';
    const keys = ['t1', 't2', 't3', 't4'];
    for (let i = 0; i < keys.length; i++) {
      const row = el('div', 'wsb-feat');
      row.appendChild(el('div', 'wsb-feat-body', this.T('teach.' + keys[i])));
      this._teachBody.appendChild(row);
    }
  }

  unmount() {
    this._stopAutoBalance();
    window.removeEventListener('resize', this._resize);
    if (this.dual && typeof this.dual.dispose === 'function') this.dual.dispose();
  }
}

export default {
  id: 'wheatstone_bridge',
  icon: '⚖',
  navKey: 'modules.wheatstone_bridge.navTitle',
  titleKey: 'modules.wheatstone_bridge.title',
  descKey: 'modules.wheatstone_bridge.desc',
  create: function (ctx) { return new WheatstoneInstance(ctx); },
};
