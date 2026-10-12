import { EsrEpr2D } from './scene2d.js';
import { EsrEpr3D } from './scene3d.js';
import { GFitter } from './fit.js';
import { peakPositions, resonanceFieldMT, G_FREE } from './physics.js';
import { el, principleCard, paramSlider, aiHowBlock, infoTable } from '../common/ui.js';
import { createAIPanelWithHow } from '../common/aiPanel.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';

class EsrEprInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      g: G_FREE,
      A: 2.5,
      hyperfineN: 1,
      linewidth: 0.35,
      freqGHz: 9.5,
      lineShape: 'lorentz',
    };
    this.fit = new GFitter();
    this.searching = false;
    this.hasData = false;
    this._tick = this._tick.bind(this);
  }

  T(k, v) {
    return this.t('modules.esr_epr.' + k, v);
  }

  mount(root) {
    const self = this;
    root.classList.add('module-epr');
    this.viewport = el('div', 'viewport epr-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel epr-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.esr_epr'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new EsrEpr2D(host);
        s.setParams(self._sceneParams());
        s.setActive(true);
        return s;
      },
      create3D: function (host) {
        const s = new EsrEpr3D(host);
        s.setParams(self._sceneParams());
        s.applyTips(loadModuleTips('modules.esr_epr', self.t));
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
    this._interval = setInterval(this._tick, 80);
  }

  _sceneParams() {
    return {
      g: this.state.g,
      A: this.state.A,
      hyperfineN: this.state.hyperfineN,
      linewidth: this.state.linewidth,
      freqGHz: this.state.freqGHz,
      lineShape: this.state.lineShape,
      fitEstimate: this.hasData ? this.fit.estimate : null,
    };
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    paramSlider(card, {
      label: this.T('controls.g'),
      unit: '',
      min: 1.98,
      max: 2.06,
      step: 0.0005,
      value: this.state.g,
      decimals: 4,
      help: this.T('controls.gHelp'),
      onInput: function (v) {
        self.state.g = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.a'),
      unit: ' mT',
      min: 0,
      max: 8,
      step: 0.1,
      value: this.state.A,
      decimals: 1,
      help: this.T('controls.aHelp'),
      onInput: function (v) {
        self.state.A = v;
        self._refresh();
      },
    });

    card.appendChild(el('div', 'field-label', this.T('controls.nuclei')));
    this._hfBox = el('div', 'chips');
    [0, 1, 2, 3].forEach(function (n) {
      const lbl = n === 0 ? self.T('controls.noHf') : n + ' × I=½';
      const b = el('button', 'chip' + (n === self.state.hyperfineN ? ' active' : ''), lbl);
      b.onclick = function () {
        self.state.hyperfineN = n;
        for (let i = 0; i < self._hfBox.children.length; i++) {
          self._hfBox.children[i].classList.toggle('active', self._hfBox.children[i] === b);
        }
        self._refresh();
      };
      self._hfBox.appendChild(b);
    });
    card.appendChild(this._hfBox);

    paramSlider(card, {
      label: this.T('controls.linewidth'),
      unit: ' mT',
      min: 0.1,
      max: 1.2,
      step: 0.05,
      value: this.state.linewidth,
      decimals: 2,
      help: this.T('controls.linewidthHelp'),
      onInput: function (v) {
        self.state.linewidth = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.freq'),
      unit: ' GHz',
      min: 9.0,
      max: 10.0,
      step: 0.05,
      value: this.state.freqGHz,
      decimals: 2,
      help: this.T('controls.freqHelp'),
      onInput: function (v) {
        self.state.freqGHz = v;
        self._refresh();
      },
    });

    card.appendChild(el('div', 'field-label', this.T('controls.shape')));
    this._shapeBox = el('div', 'chips');
    ['lorentz', 'gauss'].forEach(function (sh) {
      const b = el('button', 'chip' + (sh === self.state.lineShape ? ' active' : ''), sh);
      b.onclick = function () {
        self.state.lineShape = sh;
        for (let i = 0; i < self._shapeBox.children.length; i++) {
          self._shapeBox.children[i].classList.toggle('active', self._shapeBox.children[i] === b);
        }
        self._refresh();
      };
      self._shapeBox.appendChild(b);
    });
    card.appendChild(this._shapeBox);

    this._info = infoTable([]);
    card.appendChild(this._info);
    card.appendChild(el('p', 'param-help', this.T('note')));
    return card;
  }

  _buildAICard() {
    const self = this;
    this._ai = createAIPanelWithHow(this.t, 'modules.esr_epr', {
      onCollect: function ({ logger }) {
        self.fit.generateData(self.state.g, self.state.freqGHz, 0.12, logger);
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
      trueLine: this.T('ai.true') + ': g ≈ ' + G_FREE,
      showLossPlot: true,
    }, aiHowBlock);
    this._findBtn = this._ai.findBtn;
    return this._ai.card;
  }

  _updateAI() {
    if (!this.hasData) return;
    this._ai.setReadout('estimate', this.fit.estimate.toFixed(4));
    this._ai.setReadout('errorPct', this.fit.errorPct.toFixed(2) + '%');
    this._ai.pushLoss(this.fit.lastLoss);
    this._ai.refreshLogs();
  }

  _tick() {
    if (this.searching && this.hasData) {
      this.fit.step();
      this._updateAI();
      this.dual.setParams(this._sceneParams());
      if (this.fit.errorPct < 0.05 && this.fit.iter > 8) {
        this.searching = false;
        this._findBtn.textContent = this.T('ai.find');
      }
    }
  }

  _refresh() {
    const B0 = resonanceFieldMT(this.state.g, this.state.freqGHz);
    const peaks = peakPositions(this.state.g, this.state.A, this.state.hyperfineN, this.state.freqGHz);
    const next = infoTable([
      [this.T('readouts.b0'), B0.toFixed(2) + ' mT'],
      [this.T('readouts.lines'), String(peaks.length)],
      [this.T('readouts.split'), this.state.A.toFixed(2) + ' mT'],
      [this.T('readouts.peaks'), peaks.map(function (p) { return p.toFixed(1); }).join(', ')],
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
  id: 'esr_epr',
  icon: 'e',
  navKey: 'modules.esr_epr.navTitle',
  titleKey: 'modules.esr_epr.title',
  descKey: 'modules.esr_epr.desc',
  create: function (ctx) {
    const inst = new EsrEprInstance(ctx);
    return {
      mount: function (root) { inst.mount(root); },
      unmount: function () { inst.unmount(); },
    };
  },
};
