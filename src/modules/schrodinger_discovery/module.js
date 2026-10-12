import { SchrodingerDiscoveryScene } from './scene3d.js';
import { BoxAFitter } from './fit.js';
import { DEFAULT_A, POTENTIALS, STATES } from './physics.js';
import { el, principleCard, paramSlider, aiHowBlock, sceneLegend } from '../common/ui.js';
import { createAIPanelWithHow } from '../common/aiPanel.js';

class SchrodingerDiscoveryInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      potential: 'barrier',
      initial: 'gaussian',
      V0: 80,
      position: 0.28,
      velocity: 55,
      variance: 0.045,
      level: 1,
      running: false,
    };
    this.fit = new BoxAFitter();
    this.searching = false;
    this.hasData = false;
    this._tick = this._tick.bind(this);
  }

  T(k, v) { return this.t('modules.schrodinger_discovery.' + k, v); }

  mount(root) {
    root.classList.add('module-orbital');
    this.viewport = el('div', 'viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);

    this.panel = el('div', 'panel');
    this.panel.appendChild(principleCard(this.t, 'modules.schrodinger_discovery'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);

    sceneLegend(this.viewport, this.t('common.legend'), [
      { color: '#38bdf8', label: this.T('legend.amp') },
      { color: '#f472b6', label: this.T('legend.phase') },
      { color: '#94a3b8', label: this.T('legend.pot') },
    ]);

    this.scene = new SchrodingerDiscoveryScene(this.viewport);
    this.scene.setParams(this.state);

    // Simple pause wiring without Three.js chrome dependency for canvas scene
    this._paused = false;
    const pauseBtn = el('button', 'viewport-btn pause-btn', this.t('common.pause'));
    pauseBtn.onclick = () => {
      this._paused = !this._paused;
      this.scene.setPaused(this._paused);
      pauseBtn.textContent = this._paused ? this.t('common.resume') : this.t('common.pause');
    };
    this.viewport.appendChild(pauseBtn);
    this._chrome = { paused: false };
    Object.defineProperty(this._chrome, 'paused', {
      get: () => this._paused,
      set: (v) => { this._paused = v; },
    });

    this._resize = () => this.scene.resize();
    window.addEventListener('resize', this._resize);
    this._interval = setInterval(this._tick, 40);
  }

  _chipGroup(parent, label, options, key, i18nPrefix) {
    parent.appendChild(el('div', 'field-label', label));
    const box = el('div', 'chips');
    const self = this;
    for (let i = 0; i < options.length; i++) {
      const id = options[i];
      const b = el('button', 'chip' + (id === this.state[key] ? ' active' : ''), this.T(i18nPrefix + '.' + id));
      b.onclick = (function (optId, btn) {
        return function () {
          self.state[key] = optId;
          for (let j = 0; j < box.children.length; j++) {
            box.children[j].classList.toggle('active', box.children[j] === btn);
          }
          self._apply();
        };
      })(id, b);
      box.appendChild(b);
    }
    parent.appendChild(box);
    return box;
  }

  _buildParamCard() {
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    this._chipGroup(card, this.T('controls.potential'), POTENTIALS, 'potential', 'controls.potentials');
    this._chipGroup(card, this.T('controls.initial'), STATES, 'initial', 'controls.states');

    paramSlider(card, {
      label: this.T('controls.height'), unit: '', min: 10, max: 200, step: 5,
      value: this.state.V0, decimals: 0, help: this.T('controls.heightHelp'),
      onInput: (v) => { this.state.V0 = v; this._apply(); },
    });
    paramSlider(card, {
      label: this.T('controls.position'), unit: '', min: 0.15, max: 0.85, step: 0.01,
      value: this.state.position, decimals: 2,
      onInput: (v) => { this.state.position = v; this._apply(); },
    });
    paramSlider(card, {
      label: this.T('controls.velocity'), unit: '', min: -80, max: 80, step: 1,
      value: this.state.velocity, decimals: 0,
      onInput: (v) => { this.state.velocity = v; this._apply(); },
    });
    paramSlider(card, {
      label: this.T('controls.variance'), unit: '', min: 0.02, max: 0.12, step: 0.005,
      value: this.state.variance, decimals: 3,
      onInput: (v) => { this.state.variance = v; this._apply(); },
    });
    paramSlider(card, {
      label: this.T('controls.level'), unit: '', min: 1, max: 5, step: 1,
      value: this.state.level, decimals: 0,
      onInput: (v) => { this.state.level = Math.round(v); this._apply(); },
    });

    const bar = el('div', 'sim-toolbar');
    this._runBtn = el('button', 'btn primary', this.T('controls.run'));
    this._runBtn.onclick = () => {
      const on = this.scene.toggleRun();
      this.state.running = on;
      this._runBtn.classList.toggle('primary', on);
    };
    const resetBtn = el('button', 'btn', this.T('controls.reset'));
    resetBtn.onclick = () => {
      this.state.running = false;
      this.scene.running = false;
      this.scene.reset();
      this._runBtn.classList.add('primary');
    };
    bar.appendChild(this._runBtn);
    bar.appendChild(resetBtn);
    card.appendChild(bar);
    return card;
  }

  _apply() {
    if (this.scene) this.scene.setParams(this.state);
  }

  _buildAICard() {
    this._ai = createAIPanelWithHow(this.t, 'modules.schrodinger_discovery', {
      onCollect: ({ logger }) => this._collect({ logger }),
      onToggleFind: ({ logger }) => this._toggle({ logger }),
      readouts: [
        { key: 'est', label: this.T('ai.estimate') },
        { key: 'err', label: this.T('ai.error') },
      ],
      showLossPlot: true,
      trueLine: this.T('ai.true') + ': ' + (DEFAULT_A * 1e9).toFixed(2) + ' nm',
    }, aiHowBlock);
    this._findBtn = this._ai.findBtn;
    return this._ai.card;
  }

  _collect({ logger }) {
    this.fit.generateData(1, 2, DEFAULT_A, undefined, logger);
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
    if (this._paused) return;
    if (this.searching && this.hasData) {
      this.fit.step();
      this._updateAI();
      if (this.fit.errorPct < 2 && this.fit.iter > 8) {
        if (this._ai.logger) {
          this._ai.logger.ok('Converged: a≈' + (this.fit.estimate * 1e9).toFixed(2) + ' nm');
        }
        this._toggle({ logger: this._ai.logger });
      }
    }
  }

  _updateAI() {
    if (!this.hasData) return;
    this._ai.setReadout('est', (this.fit.estimate * 1e9).toFixed(2) + ' nm');
    this._ai.setReadout('err', this.fit.errorPct.toFixed(2) + '%');
    this._ai.pushLoss(this.fit.lastLoss);
    this._ai.refreshLogs();
  }

  unmount() {
    this.searching = false;
    if (this._interval) clearInterval(this._interval);
    window.removeEventListener('resize', this._resize);
    if (this.scene) this.scene.dispose();
  }
}

export default {
  id: 'schrodinger_discovery',
  icon: 'ψ',
  navKey: 'modules.schrodinger_discovery.navTitle',
  titleKey: 'modules.schrodinger_discovery.title',
  descKey: 'modules.schrodinger_discovery.desc',
  create(ctx) { return new SchrodingerDiscoveryInstance(ctx); },
};
