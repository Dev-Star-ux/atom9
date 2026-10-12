import { FusionScene } from './scene3d.js';
import { Fusion2D } from './scene2d.js';
import { el, principleCard, paramSlider, aiHowBlock, infoTable } from '../common/ui.js';
import { createAIPanelWithHow } from '../common/aiPanel.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import { FusionTempFitter } from './fit.js';
import { fusionProbability, statusFusion, Q_VALUE_MEV, keVFromTempMK, plainFusion } from './physics.js';

class FusionInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { tempMK: 200, confinement: 75 };
    this.fit = new FusionTempFitter();
    this.searching = false;
    this.hasData = false;
    this._tick = this._tick.bind(this);
  }

  T(k, v) { return this.t('modules.nuclear_fusion.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear');
    this.viewport = el('div', 'viewport nfu-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel nfu-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.nuclear_fusion'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new Fusion2D(host);
        s.setParams(self.state);
        s.setActive(true);
        return s;
      },
      create3D: function (host) {
        const s = new FusionScene(host);
        s.setParams(self.state);
        s.applyTips(loadModuleTips('modules.nuclear_fusion', self.t));
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

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));
    paramSlider(card, {
      label: this.T('controls.temp'), unit: ' MK', min: 20, max: 600, step: 5,
      value: this.state.tempMK, decimals: 0, help: this.T('controls.tempHelp'),
      onInput: function (v) { self.state.tempMK = v; self._refresh(); },
    });
    paramSlider(card, {
      label: this.T('controls.confinement'), unit: ' %', min: 10, max: 100, step: 1,
      value: this.state.confinement, decimals: 0, help: this.T('controls.confinementHelp'),
      onInput: function (v) { self.state.confinement = v; self._refresh(); },
    });

    const row = el('div', 'qc-actions');
    const pulse = el('button', 'btn', this.T('controls.pulse'));
    pulse.onclick = function () {
      if (self.dual && self.dual.scene2d) {
        self.dual.scene2d.setParams({ resetPulse: true });
      }
    };
    const hot = el('button', 'btn primary', this.T('controls.ignite'));
    hot.onclick = function () {
      self.state.tempMK = 450;
      self.state.confinement = 90;
      self._syncSliders();
      self._refresh();
    };
    row.appendChild(pulse);
    row.appendChild(hot);
    card.appendChild(row);

    this._info = infoTable([]);
    card.appendChild(this._info);
    card.appendChild(el('p', 'param-help', this.T('note')));
    return card;
  }

  _syncSliders() {
    const card = this.panel.querySelector('.card:not(.ai)');
    if (!card) return;
    const inputs = card.querySelectorAll('input[type=range]');
    if (inputs[0]) { inputs[0].value = this.state.tempMK; inputs[0].dispatchEvent(new Event('input')); }
    if (inputs[1]) { inputs[1].value = this.state.confinement; inputs[1].dispatchEvent(new Event('input')); }
  }

  _refresh() {
    if (this.dual) this.dual.setParams(this.state);
    const p = fusionProbability(this.state.tempMK, this.state.confinement);
    const next = infoTable([
      [this.T('info.kev'), keVFromTempMK(this.state.tempMK).toFixed(1) + ' keV'],
      [this.T('info.prob'), (p * 100).toFixed(0) + ' %'],
      [this.T('info.q'), Q_VALUE_MEV + ' MeV'],
      [this.T('info.status'), this.T('status.' + statusFusion(p))],
      [this.T('info.meaning'), plainFusion(p)],
    ]);
    this._info.replaceWith(next);
    this._info = this.panel.querySelector('.card:not(.ai) .info');
  }

  _buildAICard() {
    const self = this;
    this._ai = createAIPanelWithHow(this.t, 'modules.nuclear_fusion', {
      onCollect: function ({ logger }) { self._collect({ logger }); },
      onToggleFind: function ({ logger }) { self._toggle({ logger }); },
      readouts: [
        { key: 'est', label: this.T('ai.estimate') },
        { key: 'err', label: this.T('ai.error') },
      ],
      trueLine: this.T('ai.true') + ': T where P≈50%',
      showLossPlot: false,
    }, aiHowBlock);
    this._findBtn = this._ai.findBtn;
    return this._ai.card;
  }

  _collect({ logger } = {}) {
    this.fit.generateData(0.05, 22, logger);
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
    if (this.dual) this.dual.tick(0.04);
    if (this.searching && this.hasData) {
      this.fit.step();
      this._updateAI();
      if (this.fit.errorPct < 5 && this.fit.iter > 8) this._toggle({ logger: this._ai.logger });
    }
  }

  _updateAI() {
    if (!this.hasData) return;
    this._ai.setReadout('est', Math.round(this.fit.estimate) + ' MK');
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
  id: 'nuclear_fusion',
  icon: '🌟',
  navKey: 'modules.nuclear_fusion.navTitle',
  titleKey: 'modules.nuclear_fusion.title',
  descKey: 'modules.nuclear_fusion.desc',
  create: function (ctx) { return new FusionInstance(ctx); },
};
