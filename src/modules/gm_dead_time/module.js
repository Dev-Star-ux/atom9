import { GmDeadTime2D } from './scene2d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { wireCanvasExperiment } from '../common/sceneChrome.js';
import { observedRate, lostFraction, deadTimeCorrection, plateauRate, regionName } from './physics.js';

class GmDeadTimeInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      view: 'deadtime',
      trueRate: 8000,
      deadTimeUs: 100,
      voltage: 1000,
      sourceStrength: 1,
    };
  }

  T(k, v) { return this.t('modules.gm_dead_time.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-gmd');
    this.viewport = el('div', 'viewport gmd-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel gmd-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.gm_dead_time'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildTeachCard());
    root.appendChild(this.panel);

    this.scene = new GmDeadTime2D(this.viewport);
    this.scene.setParams(this.state);
    wireCanvasExperiment(this.viewport, this.scene, { t: this.t });
    this._resize = function () { self.scene.resize(); };
    window.addEventListener('resize', this._resize);
    this.scene.resize();
    this._refresh();
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    card.appendChild(el('div', 'field-label', this.T('controls.view')));
    const chips = el('div', 'chips');
    ['deadtime', 'energy', 'plateau'].forEach(function (v) {
      const b = el('button', 'chip' + (self.state.view === v ? ' active' : ''), self.T('controls.views.' + v));
      b.onclick = function () {
        self.state.view = v;
        chips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
        b.classList.add('active');
        self.scene.setParams(Object.assign({}, self.state, { reset: true }));
        self._refresh();
      };
      chips.appendChild(b);
    });
    card.appendChild(chips);

    this._deadSliders = el('div', '');
    paramSlider(this._deadSliders, {
      label: this.T('controls.trueRate'),
      min: 500, max: 20000, step: 100, value: this.state.trueRate, unit: ' /s',
      onInput: function (v) { self.state.trueRate = v; self._refresh(); },
    });
    paramSlider(this._deadSliders, {
      label: this.T('controls.deadTime'),
      min: 20, max: 400, step: 10, value: this.state.deadTimeUs, unit: ' µs',
      onInput: function (v) { self.state.deadTimeUs = v; self._refresh(); },
    });
    card.appendChild(this._deadSliders);

    this._platSliders = el('div', '');
    paramSlider(this._platSliders, {
      label: this.T('controls.voltage'),
      min: 350, max: 1450, step: 10, value: this.state.voltage, unit: ' V',
      onInput: function (v) { self.state.voltage = v; self._refresh(); },
    });
    paramSlider(this._platSliders, {
      label: this.T('controls.source'),
      min: 0.3, max: 2, step: 0.1, value: this.state.sourceStrength, unit: '×',
      decimals: 1,
      onInput: function (v) { self.state.sourceStrength = v; self._refresh(); },
    });
    card.appendChild(this._platSliders);

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _buildTeachCard() {
    const card = el('div', 'card gmd-teach');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    this._teachBody = el('div', 'gmd-teach-list');
    card.appendChild(this._teachBody);
    return card;
  }

  _refresh() {
    this.scene.setParams(this.state);
    const view = this.state.view;
    this._deadSliders.style.display = view === 'deadtime' ? '' : 'none';
    this._platSliders.style.display = view === 'plateau' ? '' : 'none';

    let rows;
    if (view === 'deadtime') {
      const n = observedRate(this.state.trueRate, this.state.deadTimeUs);
      const lost = lostFraction(this.state.trueRate, this.state.deadTimeUs);
      const mCorr = deadTimeCorrection(n, this.state.deadTimeUs);
      rows = [
        [this.T('info.true'), Math.round(this.state.trueRate) + ' s⁻¹'],
        [this.T('info.observed'), n.toFixed(0) + ' s⁻¹'],
        [this.T('info.lost'), (100 * lost).toFixed(1) + '%'],
        [this.T('info.tau'), this.state.deadTimeUs + ' µs'],
        [this.T('info.corrected'), isFinite(mCorr) ? mCorr.toFixed(0) + ' s⁻¹' : '—'],
      ];
    } else if (view === 'energy') {
      rows = [
        [this.T('info.mode'), this.T('controls.views.energy')],
        [this.T('info.spectrum'), this.T('info.noSpectrum')],
      ];
    } else {
      const r = plateauRate(this.state.voltage, this.state.sourceStrength);
      rows = [
        [this.T('info.hv'), Math.round(this.state.voltage) + ' V'],
        [this.T('info.region'), this.T('regions.' + regionName(this.state.voltage))],
        [this.T('info.platRate'), r.toFixed(0) + ' (arb.)'],
      ];
    }
    this._infoHost.replaceWith(infoTable(rows));
    this._infoHost = this.panel.querySelector('.info') || this._infoHost;

    this._teachBody.innerHTML = '';
    const keys = view === 'deadtime'
      ? ['dead1', 'dead2', 'dead3']
      : view === 'energy'
        ? ['en1', 'en2', 'en3']
        : ['pl1', 'pl2', 'pl3'];
    for (let i = 0; i < keys.length; i++) {
      const row = el('div', 'gmd-feat');
      row.appendChild(el('div', 'gmd-feat-body', this.T('teach.' + keys[i])));
      this._teachBody.appendChild(row);
    }
  }

  unmount() {
    window.removeEventListener('resize', this._resize);
    if (this.scene) this.scene.dispose();
  }
}

export default {
  id: 'gm_dead_time',
  icon: '⏲️',
  navKey: 'modules.gm_dead_time.navTitle',
  titleKey: 'modules.gm_dead_time.title',
  descKey: 'modules.gm_dead_time.desc',
  create: function (ctx) { return new GmDeadTimeInstance(ctx); },
};
