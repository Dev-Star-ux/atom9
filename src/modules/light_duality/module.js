import { LightDualityScene } from './scene3d.js';
import { LightDuality2D } from './scene2d.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { DualityHFitter } from './fit.js';
import {
  MODES,
  freqToNm,
  photonEnergyEV,
  hitProbability,
} from './physics.js';
import { el, principleCard, paramSlider, aiHowBlock, infoTable, sceneLegend } from '../common/ui.js';
import { createAIPanelWithHow } from '../common/aiPanel.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';

class LightDualityInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { mode: 'wave', freq: 7, intensity: 60, slitSep: 80, phase: 0 };
    this.fit = new DualityHFitter();
    this.searching = false;
    this.hasData = false;
    this._tick = this._tick.bind(this);
  }

  T(k, v) {
    return this.t('modules.light_duality.' + k, v);
  }

  mount(root) {
    const self = this;
    root.classList.add('module-orbital');
    this.viewport = el('div', 'viewport pe-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel');
    this.panel.appendChild(principleCard(this.t, 'modules.light_duality'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);

    sceneLegend(this.viewport, this.t('common.legend'), [
      { color: '#38bdf8', label: this.T('labels.slits') },
      { color: '#fbbf24', label: this.T('labels.photons') },
      { color: '#f87171', label: this.T('labels.detectors') },
      { color: '#22d3ee', label: 'I(y)' },
    ]);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new LightDuality2D(host);
        s.setParams(self.state);
        if (typeof s.setActive === 'function') s.setActive(true);
        return s;
      },
      create3D: function (host) {
        const s = new LightDualityScene(host);
        s.setParams(self.state);
        if (typeof s.applyTips === 'function') {
          s.applyTips(loadModuleTips('modules.light_duality', self.t));
        }
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
        if (s3 && typeof s3.setActive === 'function') s3.setActive(mode === '3d');
      },
    });
    this.scene = this.dual;
    this._chrome = wireDualPause(this.viewport, this.dual, this.t);
    this._resize = function () { self.dual.resize(); };
    window.addEventListener('resize', this._resize);
    this.dual.resize();
    this._refresh();
    this._interval = setInterval(this._tick, 40);
  }

  _buildParamCard() {
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));
    card.appendChild(el('div', 'field-label', this.T('controls.experiment')));
    this._modeBox = el('div', 'chips');
    for (let i = 0; i < MODES.length; i++) {
      const m = MODES[i];
      const b = el('button', 'chip' + (m === this.state.mode ? ' active' : ''), this.T('modes.' + m));
      const self = this;
      b.onclick = function () {
        self.state.mode = m;
        for (let j = 0; j < self._modeBox.children.length; j++) {
          self._modeBox.children[j].classList.toggle('active', self._modeBox.children[j] === b);
        }
        self._refresh();
      };
      this._modeBox.appendChild(b);
    }
    card.appendChild(this._modeBox);

    paramSlider(card, {
      label: this.T('controls.frequency'),
      unit: ' ×10¹⁴Hz',
      min: 3,
      max: 15,
      step: 0.1,
      value: this.state.freq,
      decimals: 1,
      help: this.T('controls.frequencyHelp'),
      onInput: (v) => {
        this.state.freq = v;
        this._refresh();
      },
    });
    paramSlider(card, {
      label: this.T('controls.separation'),
      unit: ' µm',
      min: 30,
      max: 150,
      step: 1,
      value: this.state.slitSep,
      decimals: 0,
      help: this.T('controls.separationHelp'),
      onInput: (v) => {
        this.state.slitSep = v;
        this._refresh();
      },
    });
    paramSlider(card, {
      label: this.T('controls.intensity'),
      unit: '%',
      min: 5,
      max: 100,
      step: 1,
      value: this.state.intensity,
      decimals: 0,
      help: this.T('controls.intensityHelp'),
      onInput: (v) => {
        this.state.intensity = v;
        this._refresh();
      },
    });
    this._info = infoTable([]);
    card.appendChild(this._info);
    return card;
  }

  _buildAICard() {
    this._ai = createAIPanelWithHow(this.t, 'modules.light_duality', {
      onCollect: ({ logger }) => this._collect({ logger }),
      onToggleFind: ({ logger }) => this._toggle({ logger }),
      readouts: [
        { key: 'est', label: this.T('ai.estimate') },
        { key: 'err', label: this.T('ai.error') },
      ],
      trueLine: this.T('ai.true') + ': 6.626 ×10⁻³⁴ J·s',
    }, aiHowBlock);
    this._findBtn = this._ai.findBtn;
    return this._ai.card;
  }

  _collect({ logger }) {
    this.fit.generateData(undefined, logger);
    this.hasData = true;
    this.searching = false;
    this._findBtn.disabled = false;
    this._findBtn.textContent = this.T('ai.find');
    this._updateAI();
  }

  _toggle({ logger }) {
    if (!this.hasData) return;
    this.searching = !this.searching;
    this._findBtn.textContent = this.searching ? this.T('ai.stop') : this.T('ai.find');
    if (logger) {
      if (this.searching) logger.info('Grid search started');
      else logger.info('Search paused');
    }
  }

  _refresh() {
    this.dual.setParams(this.state);
    const nm = freqToNm(this.state.freq);
    const E = photonEnergyEV(this.state.freq);
    const centre = hitProbability(0, this.state.mode, this.state.freq, this.state.slitSep);
    const rows = [
      [this.T('info.behaviour'), this.T('info.' + this.state.mode + 'Behaviour')],
      [this.T('info.evidence'), this.T('info.' + this.state.mode + 'Evidence')],
      [this.T('readouts.wavelength'), nm.toFixed(0) + ' nm'],
      [this.T('readouts.energy'), E.toFixed(2) + ' eV'],
      [this.T('readouts.centre'), centre.toFixed(2)],
    ];
    const next = infoTable(rows);
    this._info.replaceWith(next);
    this._info = next;
  }

  _tick() {
    if (this._chrome && this._chrome.paused) return;
    this.dual.setParams(this.state);
    this.dual.tick(0.04);
    this.state.phase = (this.state.phase + 0.016 * 3) % (2 * Math.PI);
    if (this.searching && this.hasData) {
      this.fit.step();
      this._updateAI();
      if (this.fit.errorPct < 1 && this.fit.iter > 8) {
        if (this._ai.logger) {
          this._ai.logger.ok(
            'Converged: h≈' + (this.fit.estimate * 1e34).toFixed(2) + ' ×10⁻³⁴ J·s, error ' + this.fit.errorPct.toFixed(2) + '%'
          );
        }
        this._toggle({ logger: this._ai.logger });
      }
    }
  }

  _updateAI() {
    if (!this.hasData) return;
    this._ai.setReadout('est', (this.fit.estimate * 1e34).toFixed(2) + ' ×10⁻³⁴ J·s');
    this._ai.setReadout('err', this.fit.errorPct.toFixed(2) + '%');
    this._ai.pushLoss(this.fit.lastLoss);
    this._ai.refreshLogs();
  }

  unmount() {
    this.searching = false;
    if (this._interval) clearInterval(this._interval);
    window.removeEventListener('resize', this._resize);
    if (this.dual && this.dual.dispose) this.dual.dispose();
  }
}

export default {
  id: 'light_duality',
  icon: '◐',
  navKey: 'modules.light_duality.navTitle',
  titleKey: 'modules.light_duality.title',
  descKey: 'modules.light_duality.desc',
  create: function (ctx) {
    return new LightDualityInstance(ctx);
  },
};
