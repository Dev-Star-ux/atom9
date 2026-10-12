import { Rutherford2D } from './scene2d.js';
import { ScatterScene } from './scene3d.js';
import { ScatterFitter } from './scatterfit.js';
import { ELEMENTS, closestApproach, fractionBeyond } from './physics.js';
import { el, principleCard, paramSlider, aiHowBlock, infoTable, sceneLegend } from '../common/ui.js';
import { createAIPanelWithHow } from '../common/aiPanel.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';

class RutherfordInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      Z: 79,
      E: 2,
      atomModel: 'nuclear',
      showTraces: true,
      showCenter: true,
    };
    this.fit = new ScatterFitter();
    this.training = false;
    this.hasData = false;
    this._mode = '2d';
    this._tick = this._tick.bind(this);
  }

  T(k, v) {
    return this.t('modules.rutherford.' + k, v);
  }

  mount(root) {
    const self = this;
    root.classList.add('module-rutherford');
    this.viewport = el('div', 'viewport ru-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel ru-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.rutherford'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);

    sceneLegend(this.viewport, this.t('common.legend'), [
      { color: '#ffd24a', label: this.T('legend.nucleus') },
      { color: '#7dd3fc', label: this.T('legend.alpha') },
      { color: '#38bdf8', label: this.T('legend.trail') },
    ]);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new Rutherford2D(host);
        s.setParams(self._sceneParams2d());
        s.setActive(true);
        return s;
      },
      create3D: function (host) {
        const s = new ScatterScene(host);
        s.setParams(self.state.Z, self.state.E, self._targetName());
        s.applyTips(loadModuleTips('modules.rutherford', self.t));
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
        self._mode = mode;
        const s2 = scenes && scenes.scene2d;
        const s3 = scenes && scenes.scene3d;
        if (s2 && typeof s2.setActive === 'function') s2.setActive(mode === '2d');
        if (s3 && typeof s3.setActive === 'function') s3.setActive(mode === '3d');
        if (mode === '2d' && s2) s2.setParams(self._sceneParams2d());
        if (mode === '3d' && s3) s3.setParams(self.state.Z, self.state.E, self._targetName());
        self._updateModeUI(mode);
      },
    });
    this.scene = this.dual;
    wireDualPause(this.viewport, this.dual, this.t);
    this._resize = function () { self.dual.resize(); };
    window.addEventListener('resize', this._resize);
    this.dual.resize();
    this._updateModeUI('2d');
    this._refresh();
    this.fit.init().then(function () {
      self._ai.setReadout('backend', self.fit.backendName.toUpperCase());
    });
    this._interval = setInterval(this._tick, 33);
  }

  _targetName() {
    const el2 = ELEMENTS.find(function (e) { return e.Z === this.state.Z; }.bind(this));
    return el2 ? el2.name : 'Z=' + this.state.Z;
  }

  _sceneParams2d() {
    return {
      Z: this.state.Z,
      E: this.state.E,
      targetName: this._targetName(),
      atomModel: this.state.atomModel,
      showTraces: this.state.showTraces,
      showCenter: this.state.showCenter,
    };
  }

  _updateModeUI(mode) {
    if (this._mode2d) this._mode2d.style.display = mode === '2d' ? '' : 'none';
    if (this._mode3d) this._mode3d.style.display = mode === '3d' ? '' : 'none';
    if (this.viewport) {
      this.viewport.classList.toggle('ru-mode-3d-active', mode === '3d');
    }
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    this._mode2d = el('div', 'ru-mode-block ru-mode-2d');

    this._mode2d.appendChild(el('div', 'field-label', this.T('controls.atomModel')));
    this._modelBox = el('div', 'chips');
    [
      { id: 'plum', label: this.T('controls.plumPudding') },
      { id: 'nuclear', label: this.T('controls.nuclearAtom') },
    ].forEach(function (opt) {
      const b = el('button', 'chip' + (opt.id === self.state.atomModel ? ' active' : ''), opt.label);
      b.onclick = function () {
        self.state.atomModel = opt.id;
        for (let i = 0; i < self._modelBox.children.length; i++) {
          self._modelBox.children[i].classList.toggle('active', self._modelBox.children[i] === b);
        }
        self._onParams(true);
      };
      self._modelBox.appendChild(b);
    });
    this._mode2d.appendChild(this._modelBox);

    card.appendChild(this._mode2d);

    card.appendChild(el('div', 'field-label', this.T('controls.target')));
    this._elBox = el('div', 'chips');
    ELEMENTS.forEach(function (e) {
      const b = el('button', 'chip' + (e.Z === self.state.Z ? ' active' : ''), e.name);
      b.onclick = function () {
        self.state.Z = e.Z;
        self._onParams(true);
      };
      self._elBox.appendChild(b);
    });
    card.appendChild(this._elBox);

    paramSlider(card, {
      label: this.T('controls.energy'),
      unit: ' (model)',
      min: 1,
      max: 5,
      step: 0.25,
      value: this.state.E,
      decimals: 2,
      help: this.T('controls.energyHelp'),
      onInput: function (v) {
        self.state.E = v;
        self._onParams(false);
      },
    });

    this._mode2d.appendChild(el('div', 'field-label', this.T('controls.display')));
    this._dispBox = el('div', 'chips');
    [
      { key: 'showTraces', label: this.T('controls.traces') },
      { key: 'showCenter', label: this.T('controls.center') },
    ].forEach(function (opt) {
      const on = self.state[opt.key];
      const b = el('button', 'chip' + (on ? ' active' : ''), opt.label);
      b.onclick = function () {
        self.state[opt.key] = !self.state[opt.key];
        b.classList.toggle('active', self.state[opt.key]);
        if (self.dual) self.dual.setParams(self._sceneParams2d());
      };
      self._dispBox.appendChild(b);
    });
    this._mode2d.appendChild(this._dispBox);

    const actRow = el('div', 'qc-actions');
    const fireBtn = el('button', 'btn', this.T('controls.fireAlpha'));
    fireBtn.onclick = function () {
      if (self.dual && self.dual.scene2d && typeof self.dual.scene2d.fireOne === 'function') {
        self.dual.scene2d.fireOne();
      }
    };
    const resetBtn = el('button', 'btn', this.T('controls.resetBeam'));
    resetBtn.onclick = function () { self._onParams(true); };
    actRow.appendChild(fireBtn);
    actRow.appendChild(resetBtn);
    this._mode2d.appendChild(actRow);

    this._mode3d = el('div', 'ru-mode-block ru-mode-3d');
    this._mode3d.style.display = 'none';
    this._mode3d.appendChild(el('p', 'param-help', this.T('controls.view3dHelp')));
    card.appendChild(this._mode3d);

    this._info = infoTable([]);
    card.appendChild(this._info);
    card.appendChild(el('p', 'param-help', this.T('note')));
    return card;
  }

  _onParams(respawn) {
    const name = this._targetName();
    for (let i = 0; i < this._elBox.children.length; i++) {
      this._elBox.children[i].classList.toggle('active', this._elBox.children[i].textContent === name);
    }
    if (this.dual) {
      const p2 = this._sceneParams2d();
      if (respawn) p2._respawn = true;
      this.dual.setParams(p2);
      if (this.dual.scene3d) {
        this.dual.scene3d.setParams(this.state.Z, this.state.E, name);
      }
    }
    this._refresh();
    this.hasData = false;
    this.training = false;
    this._ai.findBtn.disabled = true;
    this._ai.findBtn.textContent = this.T('ai.measure');
    this._ai.findBtn.classList.remove('primary');
    this._ai.setReadout('est', '—');
    this._ai.setReadout('err', '—');
    this._ai.lossHistory.length = 0;
    this._drawPlot();
  }

  _refresh() {
    const Z = this.state.Z;
    const E = this.state.E;
    const next = infoTable([
      [this.T('controls.charge'), 'Z = ' + Z],
      [this.T('controls.closest'), closestApproach(Z, E).toFixed(2) + ' (units)'],
      [this.T('controls.backscatter'), (fractionBeyond(90, Z, E, 8) * 100).toFixed(2) + ' %'],
    ]);
    this._info.replaceWith(next);
    this._info = this.panel.querySelector('.card:not(.ai) .info');
  }

  _buildAICard() {
    const self = this;
    this._ai = createAIPanelWithHow(this.t, 'modules.rutherford', {
      onCollect: function ({ logger }) { self._collect({ logger }); },
      onToggleFind: function ({ logger }) { self._toggle({ logger }); },
      readouts: [
        { key: 'est', label: this.T('ai.estimate') },
        { key: 'err', label: this.T('ai.error') },
        { key: 'backend', label: this.T('ai.backend') },
      ],
      showLossPlot: true,
      plotHeight: 150,
      legendHtml: '<span class="ex">' + this.T('ai.fit') + '</span><span class="pr">' + this.T('ai.data') + '</span>',
    }, aiHowBlock);
    this._ai.findBtn.textContent = this.T('ai.measure');
    return this._ai.card;
  }

  _collect({ logger } = {}) {
    if (!this.fit.backendName) return;
    this.fit.generateData(this.state.Z, 0.06, logger);
    this.hasData = true;
    this._ai.lossHistory.length = 0;
    this._ai.findBtn.disabled = false;
    this._drawPlot();
    this._update();
    this._ai.refreshLogs();
  }

  _toggle({ logger } = {}) {
    if (!this.hasData) return;
    this.training = !this.training;
    this._ai.findBtn.textContent = this.training ? this.T('ai.stop') : this.T('ai.measure');
    this._ai.findBtn.classList.toggle('primary', !this.training);
    if (logger) logger.info(this.training ? 'Gradient descent started' : 'Training paused');
  }

  _tick() {
    if (this.dual && this.dual.paused) return;
    if (this.dual) this.dual.tick(0.033);
    if (this.training && this.hasData) {
      this.fit.step(4, this._ai.logger);
      this._update();
      this._drawPlot();
      if (this.fit.errorPct < 0.4 && this.fit.epoch > 150) {
        if (this._ai.logger) {
          this._ai.logger.ok('Converged: Z≈' + this.fit.zEstimate.toFixed(1) + ', error ' + this.fit.errorPct.toFixed(2) + '%');
        }
        this._toggle({ logger: this._ai.logger });
      }
    }
  }

  _update() {
    if (!this.hasData) return;
    this._ai.setReadout('est', 'Z ≈ ' + this.fit.zEstimate.toFixed(1));
    this._ai.setReadout('err', this.fit.errorPct.toFixed(2) + '%');
    this._ai.pushLoss(this.fit.lastLoss);
    this._ai.refreshLogs();
  }

  _drawPlot() {
    const plot = this._ai.plotCanvas;
    if (!plot) return;
    const c = plot.getContext('2d');
    const W = plot.width;
    const H = plot.height;
    const pad = 10;
    c.fillStyle = '#0a1122';
    c.fillRect(0, 0, W, H);
    if (!this.hasData) return;
    const data = this.fit.data;
    const curve = this.fit.fittedCurve(80);
    const all = data.map(function (d) { return Math.log(d.N); }).concat(curve.map(function (d) { return Math.log(d.N); }));
    const ymin = Math.min.apply(null, all);
    const ymax = Math.max.apply(null, all);
    const yspan = ymax - ymin || 1;
    const X = function (theta) { return pad + (W - 2 * pad) * (theta - 15) / 150; };
    const Y = function (N) { return H - pad - (H - 2 * pad) * (Math.log(N) - ymin) / yspan; };
    c.strokeStyle = '#22d3ee';
    c.lineWidth = 2.2;
    c.beginPath();
    curve.forEach(function (d, i) {
      const x = X(d.theta);
      const y = Y(d.N);
      if (i) c.lineTo(x, y);
      else c.moveTo(x, y);
    });
    c.stroke();
    c.fillStyle = '#f472b6';
    for (let j = 0; j < data.length; j++) {
      const d = data[j];
      c.beginPath();
      c.arc(X(d.theta), Y(d.N), 2.4, 0, 6.28);
      c.fill();
    }
  }

  unmount() {
    this.training = false;
    if (this._interval) clearInterval(this._interval);
    if (this._resize) window.removeEventListener('resize', this._resize);
    if (this.dual) this.dual.dispose();
    if (this.fit) this.fit.dispose();
  }
}

export default {
  id: 'rutherford',
  icon: '☢',
  navKey: 'modules.rutherford.navTitle',
  titleKey: 'modules.rutherford.title',
  descKey: 'modules.rutherford.desc',
  create: function (ctx) {
    return new RutherfordInstance(ctx);
  },
};
