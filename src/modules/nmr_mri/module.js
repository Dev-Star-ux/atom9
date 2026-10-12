import { NmrMri2D } from './scene2d.js';
import { NmrMri3D } from './scene3d.js';
import { T2Fitter } from './fit.js';
import {
  equilibrium,
  applyPulse,
  blochStep,
  tissuePreset,
  larmorMHz,
  fidSignal,
  TISSUES,
} from './physics.js';
import { el, principleCard, paramSlider, aiHowBlock, infoTable } from '../common/ui.js';
import { createAIPanelWithHow } from '../common/aiPanel.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';

class NmrMriInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      tissueKey: 'water',
      B0: 1.5,
      T1: 1.0,
      T2: 0.5,
      M0: 1.0,
    };
    this.M = equilibrium(1);
    this.time = 0;
    this.fidHistory = [];
    this.running = false;
    this.dt = 0.012;
    this.fit = new T2Fitter();
    this.searching = false;
    this.hasData = false;
    this._tick = this._tick.bind(this);
  }

  T(k, v) {
    return this.t('modules.nmr_mri.' + k, v);
  }

  mount(root) {
    const self = this;
    root.classList.add('module-nmr');
    this.viewport = el('div', 'viewport nmr-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel nmr-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.nmr_mri'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new NmrMri2D(host);
        s.setParams(self._sceneParams());
        s.setActive(true);
        return s;
      },
      create3D: function (host) {
        const s = new NmrMri3D(host);
        s.setParams(self._sceneParams());
        s.applyTips(loadModuleTips('modules.nmr_mri', self.t));
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
    this._interval = setInterval(this._tick, 40);
  }

  _sceneParams() {
    return {
      M: this.M,
      M0: this.state.M0,
      B0: this.state.B0,
      T1: this.state.T1,
      T2: this.state.T2,
      time: this.time,
      fidHistory: this.fidHistory,
      fitPts: this.hasData ? this.fit.data : null,
    };
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    card.appendChild(el('div', 'field-label', this.T('controls.tissue')));
    this._tissueBox = el('div', 'chips');
    Object.keys(TISSUES).forEach(function (key) {
      const tk = TISSUES[key];
      const b = el('button', 'chip' + (key === self.state.tissueKey ? ' active' : ''), tk.name);
      b.onclick = function () {
        self.state.tissueKey = key;
        const pr = tissuePreset(key);
        self.state.T1 = pr.T1;
        self.state.T2 = pr.T2;
        self.state.M0 = pr.M0;
        self._syncTissueChips();
        self._syncSliders();
        self._resetEquilibrium();
        self._refresh();
      };
      self._tissueBox.appendChild(b);
    });
    card.appendChild(this._tissueBox);

    card.appendChild(el('div', 'field-label', this.T('controls.pulses')));
    const pulseRow = el('div', 'qc-actions');
    [
      { deg: 90, label: this.T('controls.pulse90') },
      { deg: 180, label: this.T('controls.pulse180') },
    ].forEach(function (p) {
      const btn = el('button', 'btn', p.label);
      btn.onclick = function () {
        self.M = applyPulse(self.M, p.deg);
        self.running = true;
        if (self.fidHistory.length === 0) self.time = 0;
        self._refresh();
      };
      pulseRow.appendChild(btn);
    });
    const resetBtn = el('button', 'btn', this.T('controls.reset'));
    resetBtn.onclick = function () { self._resetEquilibrium(); self._refresh(); };
    pulseRow.appendChild(resetBtn);
    card.appendChild(pulseRow);

    this._b0Host = el('div', '');
    card.appendChild(this._b0Host);
    paramSlider(this._b0Host, {
      label: this.T('controls.b0'),
      unit: ' T',
      min: 0.5,
      max: 3.0,
      step: 0.05,
      value: this.state.B0,
      decimals: 2,
      help: this.T('controls.b0Help'),
      onInput: function (v) {
        self.state.B0 = v;
        self._refresh();
      },
    });

    this._t1Host = el('div', '');
    card.appendChild(this._t1Host);
    paramSlider(this._t1Host, {
      label: this.T('controls.t1'),
      unit: ' s',
      min: 0.05,
      max: 3.0,
      step: 0.05,
      value: this.state.T1,
      decimals: 2,
      help: this.T('controls.t1Help'),
      onInput: function (v) {
        self.state.T1 = v;
        self._refresh();
      },
    });

    this._t2Host = el('div', '');
    card.appendChild(this._t2Host);
    paramSlider(this._t2Host, {
      label: this.T('controls.t2'),
      unit: ' s',
      min: 0.02,
      max: 2.0,
      step: 0.02,
      value: this.state.T2,
      decimals: 2,
      help: this.T('controls.t2Help'),
      onInput: function (v) {
        self.state.T2 = v;
        self._refresh();
      },
    });

    this._info = infoTable([]);
    card.appendChild(this._info);
    card.appendChild(el('p', 'param-help', this.T('note')));
    return card;
  }

  _syncTissueChips() {
    const self = this;
    const keys = Object.keys(TISSUES);
    for (let i = 0; i < this._tissueBox.children.length; i++) {
      this._tissueBox.children[i].classList.toggle('active', keys[i] === self.state.tissueKey);
    }
  }

  _syncSliders() {
    const hosts = [this._b0Host, this._t1Host, this._t2Host];
    for (let i = 0; i < hosts.length; i++) {
      const inp = hosts[i].querySelector('input[type=range]');
      if (!inp) continue;
      if (hosts[i] === this._b0Host) inp.value = this.state.B0;
      if (hosts[i] === this._t1Host) inp.value = this.state.T1;
      if (hosts[i] === this._t2Host) inp.value = this.state.T2;
      inp.dispatchEvent(new Event('input'));
    }
  }

  _resetEquilibrium() {
    this.M = equilibrium(this.state.M0);
    this.time = 0;
    this.fidHistory = [];
    this.running = false;
  }

  _buildAICard() {
    const self = this;
    this._ai = createAIPanelWithHow(this.t, 'modules.nmr_mri', {
      onCollect: function ({ logger }) {
        self.fit.generateData(self.state.T2, 0.05, logger);
        self.hasData = true;
        self._findBtn.disabled = false;
        self._refresh();
        self._updateAI();
      },
      onToggleFind: function ({ logger }) {
        self.searching = !self.searching;
        self._findBtn.textContent = self.searching
          ? self.t('common.aiStop')
          : self.T('ai.find');
        if (logger) logger.info(self.searching ? 'Grid search started' : 'Search paused');
      },
      readouts: [
        { key: 'estimate', label: this.T('ai.estimate') },
        { key: 'errorPct', label: this.T('ai.error') },
      ],
      trueLine: this.T('ai.true') + ': (from tissue T2)',
      showLossPlot: true,
    }, aiHowBlock);
    this._findBtn = this._ai.findBtn;
    return this._ai.card;
  }

  _updateAI() {
    if (!this.hasData) return;
    this._ai.setReadout('estimate', this.fit.estimate.toFixed(3) + ' s');
    this._ai.setReadout('errorPct', this.fit.errorPct.toFixed(1) + '%');
    this._ai.pushLoss(this.fit.lastLoss);
    this._ai.refreshLogs();
  }

  _tick() {
    if (this.searching && this.hasData) {
      this.fit.step();
      this._updateAI();
      if (this.fit.errorPct < 2 && this.fit.iter > 8) {
        this.searching = false;
        this._findBtn.textContent = this.T('ai.find');
      }
    }

    if (this.running && !this.dual.paused) {
      this.M = blochStep(this.M, this.dt, this.state.B0, this.state.T1, this.state.T2, this.state.M0);
      this.time += this.dt;
      const s = fidSignal(this.M);
      this.fidHistory.push({ t: this.time, s: s });
      if (this.fidHistory.length > 400) this.fidHistory.shift();
      if (s < 0.02 && this.time > this.state.T2 * 3) this.running = false;
      this._refresh();
    }
  }

  _refresh() {
    const f = larmorMHz(this.state.B0);
    const next = infoTable([
      [this.T('readouts.larmor'), f.toFixed(2) + ' MHz'],
      [this.T('readouts.mz'), this.M.z.toFixed(3)],
      [this.T('readouts.mtrans'), fidSignal(this.M).toFixed(3)],
      [this.T('readouts.time'), this.time.toFixed(2) + ' s'],
    ]);
    this._info.replaceWith(next);
    this._info = this.panel.querySelector('.card:not(.ai) .info');
    this.dual.setParams(this._sceneParams());
  }

  unmount() {
    clearInterval(this._interval);
    window.removeEventListener('resize', this._resize);
    if (this.dual && typeof this.dual.dispose === 'function') this.dual.dispose();
  }
}

export default {
  id: 'nmr_mri',
  icon: '🧠',
  navKey: 'modules.nmr_mri.navTitle',
  titleKey: 'modules.nmr_mri.title',
  descKey: 'modules.nmr_mri.desc',
  create: function (ctx) {
    const inst = new NmrMriInstance(ctx);
    return {
      mount: function (root) { inst.mount(root); },
      unmount: function () { inst.unmount(); },
    };
  },
};
