import { DoubleSlitScene } from './scene3d.js';
import { DoubleSlit2D } from './scene2d.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { freqToNm } from '../common/wavePhysics.js';
import { SlitSepFitter } from './fit.js';
import { intensityProfile } from './physics.js';
import { el, principleCard, paramSlider, aiHowBlock, infoTable, sceneLegend } from '../common/ui.js';
import { createAIPanelWithHow } from '../common/aiPanel.js';
import { loadModuleTips } from '../common/sceneChrome.js';

class DoubleSlitInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { freq: 7, slitSep: 80, distance: 1 };
    this.fit = new SlitSepFitter();
    this.searching = false;
    this.hasData = false;
    this._tick = this._tick.bind(this);
  }
  T(k, v) { return this.t('modules.double_slit.' + k, v); }

  mount(root) {
    root.classList.add('module-orbital');
    this.viewport = el('div', 'viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel');
    this.panel.appendChild(principleCard(this.t, 'modules.double_slit'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);

    sceneLegend(this.viewport, this.t('common.legend'), [
      { color: '#38bdf8', label: this.T('labels.slits') },
      { color: '#fbbf24', label: this.T('labels.screen') },
      { color: '#22d3ee', label: 'I(y)' },
    ]);

    const self = this;
    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new DoubleSlit2D(host);
        s.setParams(self.state);
        return s;
      },
      create3D: function (host) {
        const s = new DoubleSlitScene(host);
        s.setParams(self.state);
        if (typeof s.applyTips === 'function') {
          s.applyTips(loadModuleTips('modules.double_slit', self.t));
        }
        return s;
      },
    });
    this._chrome = wireDualPause(this.viewport, this.dual, this.t);
    this._resize = function () { self.dual.resize(); };
    window.addEventListener('resize', this._resize);
    this._refresh();
    this._interval = setInterval(this._tick, 40);
  }

  _buildParamCard() {
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));
    paramSlider(card, {
      label: this.T('controls.frequency'), unit: ' ×10¹⁴ Hz',
      min: 3, max: 15, step: 0.1, value: this.state.freq, decimals: 1,
      help: this.T('controls.frequencyHelp'),
      onInput: (v) => { this.state.freq = v; this._refresh(); },
    });
    paramSlider(card, {
      label: this.T('controls.separation'), unit: ' µm',
      min: 30, max: 150, step: 1, value: this.state.slitSep, decimals: 0,
      help: this.T('controls.separationHelp'),
      onInput: (v) => { this.state.slitSep = v; this._refresh(); },
    });
    paramSlider(card, {
      label: this.T('controls.distance'), unit: ' m',
      min: 0.5, max: 2.5, step: 0.1, value: this.state.distance, decimals: 1,
      help: this.T('controls.distanceHelp'),
      onInput: (v) => { this.state.distance = v; this._refresh(); },
    });
    this._info = infoTable([]);
    card.appendChild(this._info);
    return card;
  }

  _refresh() {
    this.dual.setParams(this.state);
    const lamNm = freqToNm(this.state.freq);
    const profile = intensityProfile(this.state.freq, this.state.slitSep, this.state.distance);
    const fringe = profile.fringe;
    this._info.replaceWith(infoTable([
      [this.T('readouts.wavelength'), lamNm.toFixed(0) + ' nm'],
      [this.T('readouts.fringe'), fringe > 0 ? (fringe * 1e3).toFixed(2) + ' mm' : '—'],
    ]));
    this._info = this.panel.querySelector('.card:not(.ai) .info');
  }

  _buildAICard() {
    this._ai = createAIPanelWithHow(this.t, 'modules.double_slit', {
      onCollect: ({ logger }) => this._collect({ logger }),
      onToggleFind: ({ logger }) => this._toggle({ logger }),
      readouts: [
        { key: 'est', label: this.T('ai.estimate') },
        { key: 'err', label: this.T('ai.error') },
      ],
      showLossPlot: true,
      trueLine: this.T('ai.true') + ': ' + this.state.slitSep + ' µm',
    }, aiHowBlock);
    this._findBtn = this._ai.findBtn;
    return this._ai.card;
  }

  _collect({ logger }) {
    this.fit.generateData(this.state.freq, this.state.slitSep, this.state.distance, undefined, undefined, logger);
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
    if (logger) logger.info(this.searching ? 'Grid search started' : 'Search paused');
  }

  _tick() {
    if (this._chrome.paused) return;
    this.dual.setParams(this.state);
    this.dual.tick(0.04);
    if (this.searching && this.hasData) {
      this.fit.step();
      this._updateAI();
      if (this.fit.errorPct < 2 && this.fit.iter > 8) {
        if (this._ai.logger) this._ai.logger.ok('Converged: d≈' + (this.fit.estimate * 1e6).toFixed(1) + ' µm');
        this._toggle({ logger: this._ai.logger });
      }
    }
  }

  _updateAI() {
    if (!this.hasData) return;
    this._ai.setReadout('est', (this.fit.estimate * 1e6).toFixed(1) + ' µm');
    this._ai.setReadout('err', this.fit.errorPct.toFixed(2) + '%');
    this._ai.pushLoss(this.fit.lastLoss);
    this._ai.refreshLogs();
  }

  unmount() {
    this.searching = false;
    if (this._interval) clearInterval(this._interval);
    window.removeEventListener('resize', this._resize);
    if (this.dual) this.dual.dispose();
  }
}

export default {
  id: 'double_slit',
  icon: '║',
  navKey: 'modules.double_slit.navTitle',
  titleKey: 'modules.double_slit.title',
  descKey: 'modules.double_slit.desc',
  create(ctx) { return new DoubleSlitInstance(ctx); },
};
