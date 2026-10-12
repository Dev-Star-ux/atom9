import { HydrogenSpectrumScene } from './scene3d.js';
import { HydrogenSpectrum2D } from './scene2d.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { el, principleCard, paramSlider, aiHowBlock, sceneLegend } from '../common/ui.js';
import { createAIPanelWithHow } from '../common/aiPanel.js';
import { loadModuleTips } from '../common/sceneChrome.js';
import { RydbergFitter } from './fit.js';
import {
  R_H,
  SERIES,
  hydrogenWavelengthNm,
  transitionEnergyEV,
} from './physics.js';

class HydrogenSpectrumInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { series: 'balmer', n1: 2, n2: 3, pulse: 0 };
    this.fit = new RydbergFitter();
    this.searching = false;
    this.hasData = false;
    this._tick = this._tick.bind(this);
  }

  T(k, v) {
    return this.t('modules.hydrogen_spectrum.' + k, v);
  }

  mount(root) {
    root.classList.add('module-orbital');
    this.viewport = el('div', 'viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel');
    this.panel.appendChild(principleCard(this.t, 'modules.hydrogen_spectrum'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);

    sceneLegend(this.viewport, this.t('common.legend'), [
      { color: '#ef4444', label: this.T('legend.nucleus') },
      { color: '#38bdf8', label: this.T('legend.levels') },
      { color: '#fbbf24', label: this.T('legend.photon') },
      { color: '#a78bfa', label: this.T('legend.spectrum') },
    ]);

    const self = this;
    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new HydrogenSpectrum2D(host);
        s.setParams(self.state);
        return s;
      },
      create3D: function (host) {
        const s = new HydrogenSpectrumScene(host);
        s.setParams(self.state);
        if (typeof s.applyTips === 'function') {
          s.applyTips(loadModuleTips('modules.hydrogen_spectrum', self.t));
        }
        return s;
      },
    });
    this.scene = this.dual;
    this._chrome = wireDualPause(this.viewport, this.dual, this.t);
    this._resize = function () { self.dual.resize(); };
    window.addEventListener('resize', this._resize);
    this._refresh();
    this._interval = setInterval(this._tick, 40);
  }

  _buildParamCard() {
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));
    card.appendChild(el('div', 'field-label', this.T('controls.series')));
    this._serBox = el('div', 'chips');
    for (let i = 0; i < SERIES.length; i++) {
      const key = SERIES[i][0];
      const n1 = SERIES[i][1];
      const b = el('button', 'chip' + (key === this.state.series ? ' active' : ''), this.T('series.' + key));
      const self = this;
      b.onclick = function () {
        self.state.series = key;
        self.state.n1 = n1;
        if (self.state.n2 <= self.state.n1) self.state.n2 = self.state.n1 + 1;
        for (let j = 0; j < self._serBox.children.length; j++) {
          self._serBox.children[j].classList.toggle('active', self._serBox.children[j] === b);
        }
        self._refresh();
      };
      this._serBox.appendChild(b);
    }
    card.appendChild(this._serBox);
    paramSlider(card, {
      label: this.T('controls.upperLevel'),
      unit: '',
      min: 2,
      max: 7,
      step: 1,
      value: this.state.n2,
      decimals: 0,
      help: this.T('controls.upperLevelHelp'),
      onInput: (v) => {
        this.state.n2 = Math.max(this.state.n1 + 1, Math.round(v));
        this._refresh();
      },
    });
    this._info = el('table', 'info');
    card.appendChild(this._info);
    return card;
  }

  _buildAICard() {
    this._ai = createAIPanelWithHow(this.t, 'modules.hydrogen_spectrum', {
      onCollect: ({ logger }) => this._collect({ logger: logger }),
      onToggleFind: ({ logger }) => this._toggle({ logger: logger }),
      readouts: [
        { key: 'est', label: this.T('ai.estimate') },
        { key: 'err', label: this.T('ai.error') },
      ],
      trueLine: this.T('ai.true') + ': ' + (R_H / 1e7).toFixed(6) + ' ×10⁷ m⁻¹',
    }, aiHowBlock);
    this._findBtn = this._ai.findBtn;
    return this._ai.card;
  }

  _collect(opts) {
    const logger = opts && opts.logger;
    this.fit.generateData(undefined, logger);
    this.hasData = true;
    this.searching = false;
    this._findBtn.disabled = false;
    this._findBtn.textContent = this.T('ai.find');
    this._updateAI();
  }

  _toggle(opts) {
    const logger = opts && opts.logger;
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
    const lam = hydrogenWavelengthNm(this.state.n1, this.state.n2);
    const E = transitionEnergyEV(this.state.n1, this.state.n2);
    const rows = [
      [this.T('info.wavelength'), lam > 0 ? lam.toFixed(1) + ' nm' : '—'],
      [this.T('info.photon'), E > 0 ? E.toFixed(2) + ' eV' : '—'],
      [this.T('info.transition'), 'n₂=' + this.state.n2 + ' → n₁=' + this.state.n1],
    ];
    this._info.innerHTML = '';
    for (let i = 0; i < rows.length; i++) {
      const tr = el('tr');
      tr.appendChild(el('td', 'k', rows[i][0]));
      tr.appendChild(el('td', 'v', rows[i][1]));
      this._info.appendChild(tr);
    }
  }

  _tick() {
    if (this._chrome && this._chrome.paused) return;
    this.state.pulse = (this.state.pulse + 0.016 * 1.2) % 1;
    this.dual.setParams(this.state);
    this.dual.tick(0.04);
    if (this.searching && this.hasData) {
      this.fit.step();
      this._updateAI();
      if (this.fit.errorPct < 0.5 && this.fit.iter > 8) {
        if (this._ai.logger) {
          this._ai.logger.ok(
            'Converged: R_H≈' + (this.fit.estimate / 1e7).toFixed(6) + ' ×10⁷ m⁻¹, error ' + this.fit.errorPct.toFixed(2) + '%'
          );
        }
        this._toggle({ logger: this._ai.logger });
      }
    }
  }

  _updateAI() {
    if (!this.hasData) return;
    this._ai.setReadout('est', (this.fit.estimate / 1e7).toFixed(6) + ' ×10⁷ m⁻¹');
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
  id: 'hydrogen_spectrum',
  icon: '🌈',
  navKey: 'modules.hydrogen_spectrum.navTitle',
  titleKey: 'modules.hydrogen_spectrum.title',
  descKey: 'modules.hydrogen_spectrum.desc',
  create(ctx) {
    return new HydrogenSpectrumInstance(ctx);
  },
};
