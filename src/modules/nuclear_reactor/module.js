import { NuclearReactorScene } from './scene3d.js';
import { NuclearReactor2D } from './scene2d.js';
import { el, principleCard, paramSlider, aiHowBlock, infoTable } from '../common/ui.js';
import { createAIPanelWithHow } from '../common/aiPanel.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import { ReactorRodFitter } from './fit.js';
import { stepReactor, statusLabel, P_RATED_MW } from './physics.js';

class NuclearReactorInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      rodInsertion: 0.35,
      coolantFlow: 70,
      demandMw: 250,
      powerMw: 180,
      tempC: 310,
    };
    this.out = stepReactor(this.state, 0.5);
    this.fit = new ReactorRodFitter();
    this.searching = false;
    this.hasData = false;
    this._tick = this._tick.bind(this);
  }

  T(k, v) {
    return this.t('modules.nuclear_reactor.' + k, v);
  }

  mount(root) {
    const self = this;
    root.classList.add('module-orbital');
    this.viewport = el('div', 'viewport nr-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel');
    this.panel.appendChild(principleCard(this.t, 'modules.nuclear_reactor'));
    this.panel.appendChild(this._buildHowCard());
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '3d',
      create2D: function (host) {
        const s = new NuclearReactor2D(host);
        s.setParams(self._sceneParams());
        return s;
      },
      create3D: function (host) {
        const s = new NuclearReactorScene(host);
        s.setParams(self._sceneParams());
        s.setActive(true);
        s.applyTips(loadModuleTips('modules.nuclear_reactor', self.t));
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
    return {
      rodInsertion: this.state.rodInsertion,
      coolantFlow: this.state.coolantFlow,
      demandMw: this.state.demandMw,
      powerMw: this.out.powerMw,
      electricMw: this.out.electricMw,
      tempC: this.out.tempC,
      trip: this.out.trip,
    };
  }

  _buildHowCard() {
    const card = el('div', 'card nr-how-card');
    card.appendChild(el('div', 'card-title', this.T('how.title')));
    card.appendChild(el('p', 'param-help', this.T('how.body')));
    const list = el('ul', 'nr-how-list');
    ['a', 'b', 'c', 'd'].forEach((k) => {
      list.appendChild(el('li', null, this.T('how.' + k)));
    });
    card.appendChild(list);
    return card;
  }

  _buildParamCard() {
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));
    paramSlider(card, {
      label: this.T('controls.rods'),
      unit: ' % in',
      min: 0,
      max: 100,
      step: 1,
      value: this.state.rodInsertion * 100,
      decimals: 0,
      help: this.T('controls.rodsHelp'),
      onInput: (v) => {
        this.state.rodInsertion = v / 100;
        this._refresh();
      },
    });
    paramSlider(card, {
      label: this.T('controls.flow'),
      unit: ' %',
      min: 10,
      max: 100,
      step: 1,
      value: this.state.coolantFlow,
      decimals: 0,
      help: this.T('controls.flowHelp'),
      onInput: (v) => {
        this.state.coolantFlow = v;
        this._refresh();
      },
    });
    paramSlider(card, {
      label: this.T('controls.demand'),
      unit: ' MW',
      min: 50,
      max: 400,
      step: 5,
      value: this.state.demandMw,
      decimals: 0,
      help: this.T('controls.demandHelp'),
      onInput: (v) => {
        this.state.demandMw = v;
        this._refresh();
      },
    });
    this._info = infoTable([]);
    card.appendChild(this._info);
    card.appendChild(el('p', 'param-help', this.T('note')));
    return card;
  }

  _refresh() {
    if (this.dual) this.dual.setParams(this._sceneParams());
    const st = statusLabel(this.out);
    const rows = [
      [this.T('info.thermal'), Math.round(this.out.thermalMw) + ' MW'],
      [this.T('info.electric'), Math.round(this.out.electricMw) + ' MW'],
      [this.T('info.temp'), Math.round(this.out.tempC) + ' °C'],
      [this.T('info.match'), Math.round(this.out.match * 100) + ' %'],
      [this.T('info.status'), this.T('status.' + st)],
    ];
    const key = rows.map(function (r) { return r[1]; }).join('|');
    if (key === this._infoKey) return;
    this._infoKey = key;
    const next = infoTable(rows);
    this._info.replaceWith(next);
    this._info = this.panel.querySelector('.card:not(.ai) .info');
  }

  _buildAICard() {
    this._ai = createAIPanelWithHow(this.t, 'modules.nuclear_reactor', {
      onCollect: ({ logger }) => this._collect({ logger }),
      onToggleFind: ({ logger }) => this._toggle({ logger }),
      readouts: [
        { key: 'est', label: this.T('ai.estimate') },
        { key: 'err', label: this.T('ai.error') },
      ],
      trueLine: this.T('ai.true') + ': α ≈ 1.35',
      showLossPlot: false,
    }, aiHowBlock);
    this._findBtn = this._ai.findBtn;
    return this._ai.card;
  }

  _collect({ logger } = {}) {
    this.fit.generateData(0.04, 22, logger);
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
    this.out = stepReactor({
      rodInsertion: this.state.rodInsertion,
      coolantFlow: this.state.coolantFlow,
      demandMw: this.state.demandMw,
      powerMw: this.out.powerMw,
      tempC: this.out.tempC,
    }, 0.05);
    this.state.powerMw = this.out.powerMw;
    this.state.tempC = this.out.tempC;
    if (this.dual) {
      this.dual.setParams(this._sceneParams());
      this.dual.tick(0.05);
    }
    this._refresh();

    if (this.searching && this.hasData) {
      this.fit.step();
      this._updateAI();
      if (this.fit.errorPct < 3 && this.fit.iter > 8) this._toggle({ logger: this._ai.logger });
    }
  }

  _updateAI() {
    if (!this.hasData) return;
    this._ai.setReadout('est', 'α ≈ ' + this.fit.estimate.toFixed(2));
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
  id: 'nuclear_reactor',
  icon: '🏭',
  navKey: 'modules.nuclear_reactor.navTitle',
  titleKey: 'modules.nuclear_reactor.title',
  descKey: 'modules.nuclear_reactor.desc',
  create(ctx) {
    return new NuclearReactorInstance(ctx);
  },
};
