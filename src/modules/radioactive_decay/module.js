import { DecayScene } from './scene3d.js';
import { Decay2D } from './scene2d.js';
import { el, principleCard, paramSlider, aiHowBlock, infoTable } from '../common/ui.js';
import { createAIPanelWithHow } from '../common/aiPanel.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import { HalfLifeFitter } from './fit.js';
import {
  decayConstantFromHalfLife, remainingCount, remainingFraction, plainDecay, activity,
  ISOTOPES, N0_PRESETS, getIsotope,
} from './physics.js';

class DecayInstance {
  constructor(ctx) {
    this.t = ctx.t;
    const iso = getIsotope('c14');
    this.state = {
      n0: 10000,
      halfLife: iso.halfLife,
      halfLifeReal: iso.halfLifeReal,
      isotopeId: iso.id,
      isotopeName: iso.name,
      decayMode: iso.decay,
    };
    this.fit = new HalfLifeFitter();
    this.searching = false;
    this.hasData = false;
    this._t = 0;
    this._tick = this._tick.bind(this);
  }

  T(k, v) { return this.t('modules.radioactive_decay.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear');
    this.viewport = el('div', 'viewport rd-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel rd-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.radioactive_decay'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new Decay2D(host);
        s.setParams(self._sceneParams(true));
        s.setActive(true);
        return s;
      },
      create3D: function (host) {
        const s = new DecayScene(host);
        s.setParams(self.state);
        s.applyTips(loadModuleTips('modules.radioactive_decay', self.t));
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
    wireDualPause(this.viewport, this.dual, this.t);
    this._resize = function () { self.dual.resize(); };
    window.addEventListener('resize', this._resize);
    this.dual.resize();
    this._refresh();
    this._interval = setInterval(this._tick, 40);
  }

  _sceneParams(reset) {
    return {
      n0: this.state.n0,
      halfLife: this.state.halfLife,
      halfLifeReal: this.state.halfLifeReal,
      isotopeName: this.state.isotopeName,
      decayMode: this.state.decayMode,
      reset: !!reset,
    };
  }

  _liveSampleN() {
    if (!this.dual) return null;
    const mode = this.dual.mode;
    const s = mode === '3d' ? this.dual.scene3d : this.dual.scene2d;
    if (s && typeof s.aliveCount === 'function') return s.aliveCount();
    if (s && typeof s._aliveCount === 'function') return s._aliveCount();
    if (s && typeof s._alive === 'number') return s._alive;
    return null;
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    card.appendChild(el('div', 'field-label', this.T('controls.isotope')));
    this._isoBox = el('div', 'chips');
    ISOTOPES.forEach(function (iso) {
      const b = el('button', 'chip' + (iso.id === self.state.isotopeId ? ' active' : ''), iso.name);
      b.title = iso.halfLifeReal + ' · lab clock ' + iso.halfLife + ' s';
      b.onclick = function () {
        self.state.isotopeId = iso.id;
        self.state.isotopeName = iso.name;
        self.state.halfLife = iso.halfLife;
        self.state.halfLifeReal = iso.halfLifeReal;
        self.state.decayMode = iso.decay;
        self._t = 0;
        self._syncIsoChips();
        self._syncHalfLifeSlider();
        if (self.dual) self.dual.setParams(self._sceneParams(true));
        self._refresh();
      };
      self._isoBox.appendChild(b);
    });
    card.appendChild(this._isoBox);

    card.appendChild(el('div', 'field-label', this.T('controls.n0')));
    this._n0Box = el('div', 'chips');
    N0_PRESETS.forEach(function (n) {
      const b = el('button', 'chip' + (n === self.state.n0 ? ' active' : ''), String(n));
      b.onclick = function () {
        self.state.n0 = n;
        self._t = 0;
        self._syncN0Chips();
        self._syncN0Slider();
        if (self.dual) self.dual.setParams(self._sceneParams(true));
        self._refresh();
      };
      self._n0Box.appendChild(b);
    });
    card.appendChild(this._n0Box);
    card.appendChild(el('p', 'param-help', this.T('controls.n0Help')));

    this._n0Host = el('div', '');
    card.appendChild(this._n0Host);
    this._buildN0Slider();

    this._hlHost = el('div', '');
    card.appendChild(this._hlHost);
    this._buildHalfLifeSlider();

    const reset = el('button', 'btn primary', this.T('controls.reset'));
    reset.type = 'button';
    reset.style.marginTop = '8px';
    reset.onclick = function () {
      self._t = 0;
      if (self.dual) self.dual.setParams(self._sceneParams(true));
      self._refresh();
    };
    card.appendChild(reset);

    this._info = infoTable([]);
    card.appendChild(this._info);
    card.appendChild(el('p', 'param-help', this.T('note')));
    return card;
  }

  _buildN0Slider() {
    const self = this;
    this._n0Host.innerHTML = '';
    paramSlider(this._n0Host, {
      label: this.T('controls.n0Fine'), unit: '', min: 100, max: 10000, step: 100,
      value: this.state.n0, decimals: 0, help: this.T('controls.n0FineHelp'),
      onInput: function (v) {
        self.state.n0 = v;
        self._t = 0;
        self._syncN0Chips();
        if (self.dual) self.dual.setParams(self._sceneParams(true));
        self._refresh();
      },
    });
  }

  _syncN0Slider() {
    this._buildN0Slider();
  }

  _syncN0Chips() {
    if (!this._n0Box) return;
    for (let i = 0; i < N0_PRESETS.length; i++) {
      this._n0Box.children[i].classList.toggle('active', N0_PRESETS[i] === this.state.n0);
    }
  }

  _buildHalfLifeSlider() {
    const self = this;
    this._hlHost.innerHTML = '';
    paramSlider(this._hlHost, {
      label: this.T('controls.halfLife'), unit: ' s', min: 2, max: 30, step: 0.5,
      value: this.state.halfLife, decimals: 1, help: this.T('controls.halfLifeHelp'),
      onInput: function (v) {
        self.state.halfLife = v;
        self._refresh();
      },
    });
    const real = el('p', 'param-help rd-real-hl',
      this.T('controls.halfLifeReal') + ': ' + this.state.halfLifeReal);
    this._hlHost.appendChild(real);
  }

  _syncHalfLifeSlider() {
    this._buildHalfLifeSlider();
  }

  _syncIsoChips() {
    for (let i = 0; i < ISOTOPES.length; i++) {
      this._isoBox.children[i].classList.toggle('active', ISOTOPES[i].id === this.state.isotopeId);
    }
  }

  _refresh() {
    if (this.dual) this.dual.setParams(this._sceneParams(false));
    const lam = decayConstantFromHalfLife(this.state.halfLife);
    const ideal = remainingCount(this.state.n0, this._t, this.state.halfLife);
    const frac = remainingFraction(this._t, this.state.halfLife);
    const sample = this._liveSampleN();
    const next = infoTable([
      [this.T('info.isotope'), this.state.isotopeName + ' (' + this.state.decayMode + ')'],
      [this.T('info.halfLifeReal'), this.state.halfLifeReal],
      [this.T('info.lambda'), lam.toFixed(3) + ' /s (lab)'],
      [this.T('info.nSample'), sample != null ? String(sample) : '—'],
      [this.T('info.n'), Math.round(ideal) + ' (ideal)'],
      [this.T('info.activity'), activity(sample != null ? sample : ideal, this.state.halfLife).toFixed(1) + ' /s'],
      [this.T('info.time'), this._t.toFixed(1) + ' s (lab)'],
      [this.T('info.meaning'), plainDecay(frac)],
    ]);
    this._info.replaceWith(next);
    this._info = this.panel.querySelector('.card:not(.ai) .info');
  }

  _buildAICard() {
    const self = this;
    this._ai = createAIPanelWithHow(this.t, 'modules.radioactive_decay', {
      onCollect: function ({ logger }) { self._collect({ logger }); },
      onToggleFind: function ({ logger }) { self._toggle({ logger }); },
      readouts: [
        { key: 'est', label: this.T('ai.estimate') },
        { key: 'err', label: this.T('ai.error') },
      ],
      trueLine: this.T('ai.true') + ': ' + this.state.halfLife.toFixed(1) + ' s',
      showLossPlot: false,
    }, aiHowBlock);
    this._findBtn = this._ai.findBtn;
    return this._ai.card;
  }

  _collect({ logger } = {}) {
    this.fit.generateData(this.state.halfLife, 0.05, 24, logger);
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
    if (logger) logger.info(this.searching ? 'Search started' : 'Search paused');
  }

  _tick() {
    if (this.dual && this.dual.paused) return;
    this._t += 0.04;
    if (this.dual) this.dual.tick(0.04);
    if (this._t % 0.4 < 0.05) this._refresh();
    if (this.searching && this.hasData) {
      this.fit.step();
      this._updateAI();
      if (this.fit.errorPct < 3 && this.fit.iter > 8) this._toggle({ logger: this._ai.logger });
    }
  }

  _updateAI() {
    if (!this.hasData) return;
    this._ai.setReadout('est', this.fit.estimate.toFixed(2) + ' s');
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
  id: 'radioactive_decay',
  icon: '⏳',
  navKey: 'modules.radioactive_decay.navTitle',
  titleKey: 'modules.radioactive_decay.title',
  descKey: 'modules.radioactive_decay.desc',
  create: function (ctx) { return new DecayInstance(ctx); },
};
