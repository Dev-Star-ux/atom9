import { FissionScene } from './scene3d.js';
import { Fission2D } from './scene2d.js';
import { el, principleCard, paramSlider, aiHowBlock, infoTable } from '../common/ui.js';
import { createAIPanelWithHow } from '../common/aiPanel.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import { CriticalEnrichmentFitter } from './fit.js';
import { fissionMultiplication, criticalityLabel, plainStatus, ENRICHMENT_PRESETS } from './physics.js';

class FissionInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { enrichment: 45 };
    this.fit = new CriticalEnrichmentFitter();
    this.searching = false;
    this.hasData = false;
    this._tick = this._tick.bind(this);
  }

  T(k, v) { return this.t('modules.nuclear_fission.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear');
    this.viewport = el('div', 'viewport nf-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel nf-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.nuclear_fission'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new Fission2D(host);
        s.setParams(self.state);
        s.setActive(true);
        return s;
      },
      create3D: function (host) {
        const s = new FissionScene(host);
        s.setParams(self.state);
        s.applyTips(loadModuleTips('modules.nuclear_fission', self.t));
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

    card.appendChild(el('div', 'field-label', this.T('controls.presets')));
    this._presetBox = el('div', 'chips');
    ENRICHMENT_PRESETS.forEach(function (pr) {
      const b = el('button', 'chip' + (pr.pct === self.state.enrichment ? ' active' : ''), pr.name);
      b.onclick = function () {
        self.state.enrichment = pr.pct;
        self._syncPresetChips();
        self._onParams(true);
      };
      self._presetBox.appendChild(b);
    });
    card.appendChild(this._presetBox);

    paramSlider(card, {
      label: this.T('controls.enrichment'), unit: ' %', min: 5, max: 95, step: 1,
      value: this.state.enrichment, decimals: 0, help: this.T('controls.enrichmentHelp'),
      onInput: function (v) {
        self.state.enrichment = v;
        self._syncPresetChips();
        self._refresh(false);
      },
    });

    const row = el('div', 'qc-actions');
    const fire = el('button', 'btn primary', this.T('controls.fire'));
    fire.type = 'button';
    fire.onclick = function () { self._fireNeutron(); };
    const reset = el('button', 'btn', this.T('controls.reset'));
    reset.type = 'button';
    reset.onclick = function () { self._onParams(true); };
    row.appendChild(fire);
    row.appendChild(reset);
    card.appendChild(row);

    this._info = infoTable([]);
    card.appendChild(this._info);
    card.appendChild(el('p', 'param-help', this.T('note')));
    return card;
  }

  _syncPresetChips() {
    const e = this.state.enrichment;
    const chips = this._presetBox.children;
    for (let i = 0; i < ENRICHMENT_PRESETS.length; i++) {
      chips[i].classList.toggle('active', ENRICHMENT_PRESETS[i].pct === e);
    }
  }

  _fireNeutron() {
    if (!this.dual) return;
    if (this.dual.scene2d && typeof this.dual.scene2d.injectNeutron === 'function') {
      this.dual.scene2d.injectNeutron(true);
    }
    if (this.dual.scene3d && typeof this.dual.scene3d.injectNeutron === 'function') {
      this.dual.scene3d.injectNeutron();
    }
  }

  _onParams(reset) {
    if (this.dual) this.dual.setParams({ enrichment: this.state.enrichment, reset: !!reset });
    this._refresh(false);
    this.hasData = false;
    this.searching = false;
    this._ai.findBtn.disabled = true;
    this._ai.findBtn.textContent = this.T('ai.find');
    this._updateAI();
  }

  _refresh(pushOnly) {
    if (this.dual && !pushOnly) this.dual.setParams({ enrichment: this.state.enrichment });
    const k = fissionMultiplication(this.state.enrichment);
    const next = infoTable([
      [this.T('info.k'), k.toFixed(3)],
      [this.T('info.status'), this.T('status.' + criticalityLabel(k))],
      [this.T('info.meaning'), plainStatus(k)],
    ]);
    this._info.replaceWith(next);
    this._info = this.panel.querySelector('.card:not(.ai) .info');
  }

  _buildAICard() {
    const self = this;
    this._ai = createAIPanelWithHow(this.t, 'modules.nuclear_fission', {
      onCollect: function ({ logger }) { self._collect({ logger }); },
      onToggleFind: function ({ logger }) { self._toggle({ logger }); },
      readouts: [
        { key: 'est', label: this.T('ai.estimate') },
        { key: 'err', label: this.T('ai.error') },
      ],
      trueLine: this.T('ai.true') + ': find enrichment for k≈1',
      showLossPlot: false,
    }, aiHowBlock);
    this._findBtn = this._ai.findBtn;
    return this._ai.card;
  }

  _collect({ logger } = {}) {
    this.fit.generateData(0.04, 20, logger);
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
      if (this.fit.errorPct < 4 && this.fit.iter > 8) this._toggle({ logger: this._ai.logger });
    }
  }

  _updateAI() {
    if (!this.hasData) return;
    this._ai.setReadout('est', this.fit.estimate.toFixed(1) + ' %');
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
  id: 'nuclear_fission',
  icon: '✴️',
  navKey: 'modules.nuclear_fission.navTitle',
  titleKey: 'modules.nuclear_fission.title',
  descKey: 'modules.nuclear_fission.desc',
  create: function (ctx) { return new FissionInstance(ctx); },
};
