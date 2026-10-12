import { DeBroglieScene } from './scene3d.js';
import { DeBroglie2D } from './scene2d.js';
import { DeBroglieFitter } from './dbfit.js';
import {
  H,
  PARTICLES,
  particleList,
  wavelengthPmAt,
  momentum,
  wavelengthRegime,
  formatWavelength,
  keEVFromVelocity,
  velocityFromKeEV,
} from './physics.js';
import { el, principleCard, paramSlider, aiHowBlock, infoTable } from '../common/ui.js';
import { createAIPanelWithHow } from '../common/aiPanel.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';

class DeBroglieInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      particleKey: 'electron',
      velocity: 2e6,
      axis: 'velocity',
      relativistic: false,
    };
    this.fit = new DeBroglieFitter();
    this.searching = false;
    this.hasData = false;
    this._tick = this._tick.bind(this);
  }

  T(k, v) {
    return this.t('modules.de_broglie.' + k, v);
  }

  mount(root) {
    const self = this;
    root.classList.add('module-orbital');
    this.viewport = el('div', 'viewport db-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel');
    this.panel.appendChild(principleCard(this.t, 'modules.de_broglie'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new DeBroglie2D(host);
        s.setParams(self._sceneParams());
        s.setActive(true);
        return s;
      },
      create3D: function (host) {
        const s = new DeBroglieScene(host);
        s.setParams(self._sceneParams());
        s.applyTips(loadModuleTips('modules.de_broglie', self.t));
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
    this._chrome = wireDualPause(this.viewport, this.dual, this.t);
    this._resize = function () { self.dual.resize(); };
    window.addEventListener('resize', this._resize);
    this.dual.resize();
    this._refresh();
    this._interval = setInterval(this._tick, 50);
  }

  _sceneParams() {
    const p = {
      particleKey: this.state.particleKey,
      velocity: this.state.velocity,
      axis: this.state.axis,
      relativistic: this.state.relativistic,
      fitPts: this.hasData ? this.fit.data : null,
      fitModel: null,
    };
    return p;
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    card.appendChild(el('div', 'field-label', this.T('controls.particle')));
    this._partBox = el('div', 'chips');
    particleList().forEach(function (key) {
      const p = PARTICLES[key];
      const b = el('button', 'chip' + (key === self.state.particleKey ? ' active' : ''), p.name);
      b.onclick = function () {
        self.state.particleKey = key;
        for (let i = 0; i < self._partBox.children.length; i++) {
          self._partBox.children[i].classList.toggle('active', self._partBox.children[i] === b);
        }
        self.hasData = false;
        self._findBtn.disabled = true;
        self._syncSliders();
        self._refresh();
      };
      self._partBox.appendChild(b);
    });
    card.appendChild(this._partBox);

    // Axis: velocity | energy (MatterWaveX)
    card.appendChild(el('div', 'field-label', this.T('controls.axis')));
    this._axisBox = el('div', 'chips');
    [
      { id: 'velocity', label: this.T('controls.axisVelocity') },
      { id: 'energy', label: this.T('controls.axisEnergy') },
    ].forEach(function (opt) {
      const b = el('button', 'chip' + (opt.id === self.state.axis ? ' active' : ''), opt.label);
      b.onclick = function () {
        self.state.axis = opt.id;
        for (let i = 0; i < self._axisBox.children.length; i++) {
          self._axisBox.children[i].classList.toggle('active', self._axisBox.children[i] === b);
        }
        self._syncSliders();
        self._refresh();
      };
      self._axisBox.appendChild(b);
    });
    card.appendChild(this._axisBox);

    // Relativistic toggle
    card.appendChild(el('div', 'field-label', this.T('controls.mode')));
    this._modeBox = el('div', 'chips');
    [
      { id: false, label: this.T('controls.nonrel') },
      { id: true, label: this.T('controls.rel') },
    ].forEach(function (opt) {
      const b = el(
        'button',
        'chip' + (opt.id === self.state.relativistic ? ' active' : ''),
        opt.label
      );
      b.onclick = function () {
        self.state.relativistic = opt.id;
        for (let i = 0; i < self._modeBox.children.length; i++) {
          self._modeBox.children[i].classList.toggle('active', self._modeBox.children[i] === b);
        }
        self._refresh();
      };
      self._modeBox.appendChild(b);
    });
    card.appendChild(this._modeBox);

    this._velHost = el('div', 'db-slider-host');
    card.appendChild(this._velHost);
    this._buildVelocitySlider();

    this._keHost = el('div', 'db-slider-host');
    card.appendChild(this._keHost);
    this._buildKeSlider();
    this._syncSliders();

    this._info = infoTable([]);
    card.appendChild(this._info);
    card.appendChild(el('p', 'param-help', this.T('note')));
    return card;
  }

  _buildVelocitySlider() {
    this._velHost.innerHTML = '';
    paramSlider(this._velHost, {
      label: this.T('controls.velocity'),
      unit: ' ×10⁶ m/s',
      min: 0.1,
      max: 10,
      step: 0.1,
      value: this.state.velocity / 1e6,
      decimals: 1,
      help: this.T('controls.velocityHelp'),
      onInput: (v) => {
        this.state.velocity = v * 1e6;
        this._refresh();
      },
    });
  }

  _buildKeSlider() {
    this._keHost.innerHTML = '';
    const mass = PARTICLES[this.state.particleKey].mass;
    let ke = keEVFromVelocity(mass, this.state.velocity);
    ke = Math.max(0.1, Math.min(1000, ke));
    paramSlider(this._keHost, {
      label: this.T('controls.energy'),
      unit: ' eV',
      min: 0.1,
      max: 1000,
      step: 0.1,
      value: ke,
      decimals: 1,
      help: this.T('controls.energyHelp'),
      onInput: (v) => {
        this.state.velocity = velocityFromKeEV(PARTICLES[this.state.particleKey].mass, v);
        this._refresh();
      },
    });
  }

  _syncSliders() {
    if (this.state.axis === 'energy') {
      this._velHost.style.display = 'none';
      this._keHost.style.display = '';
      this._buildKeSlider();
    } else {
      this._keHost.style.display = 'none';
      this._velHost.style.display = '';
      this._buildVelocitySlider();
    }
  }

  _refresh() {
    if (this.dual) this.dual.setParams(this._sceneParams());
    const mass = PARTICLES[this.state.particleKey].mass;
    const v = this.state.velocity;
    const p = momentum(mass, v);
    const lamPm = wavelengthPmAt(mass, v, this.state.relativistic);
    const regime = wavelengthRegime(lamPm);
    const ke = keEVFromVelocity(mass, v);
    const next = infoTable([
      [this.T('info.mass'), mass.toExponential(3) + ' kg'],
      [this.T('info.momentum'), p.toExponential(2) + ' kg·m/s'],
      [this.T('info.wavelength'), formatWavelength(lamPm)],
      [this.T('info.energy'), ke >= 1000 ? (ke / 1000).toFixed(2) + ' keV' : ke.toFixed(2) + ' eV'],
      [this.T('info.regime'), this.T('regime.' + regime)],
    ]);
    this._info.replaceWith(next);
    this._info = this.panel.querySelector('.card:not(.ai) .info');
  }

  _buildAICard() {
    this._ai = createAIPanelWithHow(this.t, 'modules.de_broglie', {
      onCollect: ({ logger }) => this._collect({ logger }),
      onToggleFind: ({ logger }) => this._toggle({ logger }),
      readouts: [
        { key: 'est', label: this.T('ai.estimate') },
        { key: 'err', label: this.T('ai.error') },
      ],
      trueLine: this.T('ai.true') + ': ' + H.toExponential(3) + ' J·s',
      showLossPlot: false,
    }, aiHowBlock);
    this._findBtn = this._ai.findBtn;
    return this._ai.card;
  }

  _collect({ logger } = {}) {
    const m = PARTICLES[this.state.particleKey].mass;
    this.fit.generateData(m, 0.04, 24, logger);
    this.hasData = true;
    this.searching = false;
    this._findBtn.disabled = false;
    this._findBtn.textContent = this.T('ai.find');
    this._refresh();
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
    if (this.dual) this.dual.tick(0.05);
    if (this.searching && this.hasData) {
      this.fit.step();
      this._updateAI();
      if (this.dual) this.dual.setParams(this._sceneParams());
      if (this.fit.errorPct < 0.5 && this.fit.iter > 6) this._toggle({ logger: this._ai.logger });
    }
  }

  _updateAI() {
    if (!this.hasData) return;
    this._ai.setReadout('est', this.fit.estimate.toExponential(3) + ' J·s');
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
  id: 'de_broglie',
  icon: 'ℏ',
  navKey: 'modules.de_broglie.navTitle',
  titleKey: 'modules.de_broglie.title',
  descKey: 'modules.de_broglie.desc',
  create(ctx) {
    return new DeBroglieInstance(ctx);
  },
};
