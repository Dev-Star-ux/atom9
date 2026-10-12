import { XrayWaveScene } from './scene3d.js';
import { XrayWave2D } from './scene2d.js';
import { el, principleCard, paramSlider, aiHowBlock, infoTable } from '../common/ui.js';
import { createAIPanelWithHow } from '../common/aiPanel.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import { BraggSpacingFitter } from './fit.js';
import { braggSummary } from './physics.js';

class XrayWaveInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { lam: 100, d: 200, theta: 30 };
    this.fit = new BraggSpacingFitter();
    this.searching = false;
    this.hasData = false;
    this._tick = this._tick.bind(this);
  }

  T(k, v) {
    return this.t('modules.xray_wave.' + k, v);
  }

  mount(root) {
    const self = this;
    root.classList.add('module-orbital');
    this.viewport = el('div', 'viewport xw-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel');
    this.panel.appendChild(principleCard(this.t, 'modules.xray_wave'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new XrayWave2D(host);
        s.setParams(self.state);
        s.setActive(true);
        return s;
      },
      create3D: function (host) {
        const s = new XrayWaveScene(host);
        s.setParams(self.state);
        s.applyTips(loadModuleTips('modules.xray_wave', self.t));
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
    paramSlider(card, {
      label: this.T('controls.wavelength'),
      unit: ' pm',
      min: 50,
      max: 250,
      step: 1,
      value: this.state.lam,
      decimals: 0,
      help: this.T('controls.wavelengthHelp'),
      onInput: (v) => {
        this.state.lam = v;
        this._refresh();
      },
    });
    paramSlider(card, {
      label: this.T('controls.spacing'),
      unit: ' pm',
      min: 100,
      max: 400,
      step: 1,
      value: this.state.d,
      decimals: 0,
      help: this.T('controls.spacingHelp'),
      onInput: (v) => {
        this.state.d = v;
        this._refresh();
      },
    });
    paramSlider(card, {
      label: this.T('controls.angle'),
      unit: '°',
      min: 5,
      max: 80,
      step: 0.5,
      value: this.state.theta,
      decimals: 1,
      help: this.T('controls.angleHelp'),
      onInput: (v) => {
        this.state.theta = v;
        this._refresh();
      },
    });
    this._info = infoTable([]);
    card.appendChild(this._info);
    card.appendChild(el('p', 'param-help', this.T('note')));
    return card;
  }

  _refresh() {
    if (this.dual) this.dual.setParams(this.state);
    const s = braggSummary(this.state.lam, this.state.d, this.state.theta);
    const next = infoTable([
      [this.T('controls.order'), 'n ≈ ' + s.order],
      [this.T('controls.pathDiff'), 'δ / λ = ' + s.pathLam.toFixed(2)],
      [this.T('controls.delta'), s.deltaPm.toFixed(1) + ' pm'],
      [this.T('controls.peak1'), s.peak1 != null ? s.peak1.toFixed(1) + '°' : '—'],
      [
        this.T('controls.result'),
        s.bright ? this.T('result.constructive') : this.T('result.destructive'),
      ],
    ]);
    this._info.replaceWith(next);
    this._info = this.panel.querySelector('.card:not(.ai) .info');
  }

  _buildAICard() {
    this._ai = createAIPanelWithHow(this.t, 'modules.xray_wave', {
      onCollect: ({ logger }) => this._collect({ logger }),
      onToggleFind: ({ logger }) => this._toggle({ logger }),
      readouts: [
        { key: 'est', label: this.T('ai.estimate') },
        { key: 'err', label: this.T('ai.error') },
      ],
      trueLine: this.T('ai.true') + ': ' + this.state.d.toFixed(0) + ' pm',
      showLossPlot: false,
    }, aiHowBlock);
    this._findBtn = this._ai.findBtn;
    return this._ai.card;
  }

  _collect({ logger } = {}) {
    this.fit.generateData(this.state.d, 0.03, 24, logger);
    this.hasData = true;
    this.searching = false;
    this._findBtn.disabled = false;
    this._findBtn.textContent = this.T('ai.find');
    this._updateAI();
  }

  _toggle({ logger } = {}) {
    if (!this.hasData) return;
    this.searching = !this.searching;
    this._findBtn.textContent = this.searching ? this.T('ai.stop') : this.T('ai.find');
    if (logger) logger.info(this.searching ? 'Grid search started' : 'Search paused');
  }

  _tick() {
    if (this._chrome && this._chrome.paused) return;
    if (this.dual) this.dual.tick(0.04);
    if (this.searching && this.hasData) {
      this.fit.step();
      this._updateAI();
      if (this.fit.errorPct < 1 && this.fit.iter > 8) this._toggle({ logger: this._ai.logger });
    }
  }

  _updateAI() {
    if (!this.hasData) return;
    this._ai.setReadout('est', this.fit.estimate.toFixed(1) + ' pm');
    this._ai.setReadout('err', this.fit.errorPct.toFixed(2) + '%');
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
  id: 'xray_wave',
  icon: 'χ',
  navKey: 'modules.xray_wave.navTitle',
  titleKey: 'modules.xray_wave.title',
  descKey: 'modules.xray_wave.desc',
  create(ctx) {
    return new XrayWaveInstance(ctx);
  },
};
